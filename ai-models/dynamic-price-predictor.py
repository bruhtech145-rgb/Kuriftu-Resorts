import json
import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta

class DynamicPricingEngine:
    def __init__(self, base_room_price=100.0):
        """
        Initialize the pricing engine.
        :param base_room_price: The standard price of the room in USD (or ETB).
        """
        self.base_room_price = base_room_price
        self.model = None
        
    def _get_ethiopian_holidays(self):
        """
        Creates a DataFrame of major Ethiopian holidays for the Prophet model.
        This localizes the AI and proves you built it specifically for this hackathon context!
        """
        holidays = pd.DataFrame({
          'holiday': 'ethiopian_festivals',
          'ds': pd.to_datetime([
              '2023-09-12', '2024-09-11', '2025-09-11', '2026-09-11', # Enkutatash (New Year)
              '2023-09-28', '2024-09-27', '2025-09-27', '2026-09-27', # Meskel
              '2024-01-20', '2025-01-19', '2026-01-20', '2027-01-19', # Timkat
              '2024-01-07', '2025-01-07', '2026-01-07', '2027-01-07'  # Genna (Christmas)
          ]),
          'lower_window': -2, # Consider 2 days before the holiday as peak
          'upper_window': 1,  # Consider 1 day after the holiday as peak
        })
        return holidays

    def load_and_prep_data(self, json_data):
        """
        Parses the JSON data and formats it for Prophet.
        Prophet requires a 'ds' column (dates) and a 'y' column (target variable).
        Here, our target 'y' is the historical occupancy rate or demand.
        """
        # Parse JSON into a Python dictionary, then to a Pandas DataFrame
        data = json.loads(json_data)
        df = pd.DataFrame(data['historical_data'])
        
        # Rename columns to match Prophet's requirements
        df = df.rename(columns={'date': 'ds', 'occupancy_rate': 'y'})
        df['ds'] = pd.to_datetime(df['ds'])
        
        return df

    def train_model(self, df):
        """
        Trains the Prophet model on the historical data.
        """
        print("Training Dynamic Pricing AI Model...")
        
        ethiopian_holidays = self._get_ethiopian_holidays()
        
        # Initialize Prophet with holidays
        self.model = Prophet(holidays=ethiopian_holidays, yearly_seasonality=True, weekly_seasonality=True)
        
        # Fit the model
        self.model.fit(df)
        print("Model training complete. ✅")

    def forecast_and_price(self, days_ahead=7):
        """
        Predicts future demand and calculates the dynamic price based on that demand.
        """
        if self.model is None:
            raise ValueError("Model must be trained before forecasting.")

        # Create future dates
        future_dates = self.model.make_future_dataframe(periods=days_ahead)
        
        # Predict future demand/occupancy
        forecast = self.model.predict(future_dates)
        
        # Extract the relevant future predictions (tail of the dataframe)
        future_forecast = forecast[['ds', 'yhat', 'holidays']].tail(days_ahead).copy()
        
        # --- DYNAMIC PRICING ALGORITHM ---
        # yhat represents predicted demand. 
        # Let's say baseline demand is 0.5 (50% occupancy). 
        # For every 10% above baseline, we increase price by 5%.
        # If it's a holiday, we add an automatic 20% premium.
        
        baseline_demand = 0.50 
        
        dynamic_prices = []
        for index, row in future_forecast.iterrows():
            demand = row['yhat']
            is_holiday = abs(row['holidays']) > 0 # Prophet outputs a non-zero value if it's a holiday impact
            
            # Base logic: Demand driven multiplier
            demand_multiplier = 1.0 + max(0, (demand - baseline_demand) * 0.5) 
            
            # Holiday logic: Surge pricing
            holiday_multiplier = 1.2 if is_holiday else 1.0
            
            # Final price calculation
            final_price = self.base_room_price * demand_multiplier * holiday_multiplier
            
            dynamic_prices.append({
                "date": row['ds'].strftime('%Y-%m-%d'),
                "predicted_demand": round(demand, 2),
                "is_holiday": bool(is_holiday),
                "recommended_price_usd": round(final_price, 2)
            })
            
        return json.dumps({"forecasted_prices": dynamic_prices}, indent=4)

if __name__ == "__main__":
    # 1. Mock JSON Data (Imagine this comes from the resort's database API)
    # few weeks of historical occupancy (0.0 to 1.0 scale)
    mock_json_input = """
    {
        "resort_id": "Lalibela_Lodge_01",
        "historical_data": [
            {"date": "2026-03-20", "occupancy_rate": 0.45},
            {"date": "2026-03-21", "occupancy_rate": 0.60},
            {"date": "2026-03-22", "occupancy_rate": 0.55},
            {"date": "2026-03-23", "occupancy_rate": 0.40},
            {"date": "2026-03-24", "occupancy_rate": 0.35},
            {"date": "2026-03-25", "occupancy_rate": 0.30},
            {"date": "2026-03-26", "occupancy_rate": 0.45},
            {"date": "2026-03-27", "occupancy_rate": 0.65},
            {"date": "2026-03-28", "occupancy_rate": 0.70},
            {"date": "2026-03-29", "occupancy_rate": 0.60},
            {"date": "2026-03-30", "occupancy_rate": 0.45},
            {"date": "2026-03-31", "occupancy_rate": 0.40},
            {"date": "2026-04-01", "occupancy_rate": 0.42},
            {"date": "2026-04-02", "occupancy_rate": 0.50},
            {"date": "2026-04-03", "occupancy_rate": 0.65}
        ]
    }
    """

    # 2. Initialize the Engine with a base price of $100/night
    engine = DynamicPricingEngine(base_room_price=100.0)

    # 3. Load Data
    historical_df = engine.load_and_prep_data(mock_json_input)

    # 4. Train the AI Model
    engine.train_model(historical_df)

    # 5. Generate Prices for the next 7 days and output as JSON
    # (In a real app, your FastAPI backend would return this JSON to your frontend dashboard)
    result_json = engine.forecast_and_price(days_ahead=7)
    
    print("\n📊 --- Mulu AI: DYNAMIC PRICING FORECAST ---")
    print(result_json)