import json
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

class CancellationPredictor:
    def __init__(self):
        """
        Initialize the Random Forest model.
        This is a lightweight, built-in scikit-learn model that is perfect for hackathons.
        """
        self.model = RandomForestClassifier(random_state=42, n_estimators=100)
        
        # Define the exact base columns the model will use
        self.base_columns = [
            'price_usd', 
            'customer_category', 
            'average_spending', 
            'location', 
            'work_status', 
            'previous_bookings', 
            'previous_cancellations'
        ]
        # This will store the exact columns after converting text to numbers
        self.encoded_columns = None 

    def _encode_data(self, df):
        """
        Converts text columns (like 'Student' or 'Addis Ababa') into numerical columns (0s and 1s).
        This is called One-Hot Encoding and is required for Random Forest.
        """
        # Get just the features we care about
        X = df[self.base_columns].copy()
        
        # Convert text to numbers automatically
        X_encoded = pd.get_dummies(X, columns=['customer_category', 'location', 'work_status'])
        
        return X_encoded

    def train_model(self, json_data):
        """
        Trains the Random Forest model on historical booking data.
        """
        print("⚙️ Loading historical data and training Random Forest Model...")
        
        # Parse JSON
        data = json.loads(json_data)
        df = pd.DataFrame(data['historical_bookings'])
        
        # Encode features and isolate target
        X = self._encode_data(df)
        y = df['is_canceled']  # 1 = Canceled, 0 = Showed Up
        
        # Save the exact column layout so we can match it during predictions
        self.encoded_columns = X.columns
        
        # Train the model
        self.model.fit(X, y)
        print("✅ Model training complete.")

    def predict_cancellations(self, new_json_data):
        """
        Takes new, incoming bookings and predicts the probability of cancellation.
        """
        if self.encoded_columns is None:
            raise ValueError("Train the model before predicting!")

        # Parse JSON for incoming bookings
        data = json.loads(new_json_data)
        df = pd.DataFrame(data['new_bookings'])
        
        booking_ids = df['booking_id']
        
        # Encode the new data
        X = self._encode_data(df)
        
        # CRITICAL HACKATHON TRICK: Ensure the new data has the exact same columns as the training data
        # If a new city appears that wasn't in the training data, this fixes it automatically.
        X = X.reindex(columns=self.encoded_columns, fill_value=0)
        
        # Predict the exact class (0 or 1)
        predictions = self.model.predict(X)
        
        # Predict the probability (returns an array like [prob_0, prob_1])
        probabilities = self.model.predict_proba(X)[:, 1]
        
        # --- REVENUE OPTIMIZATION LOGIC ---
        results = []
        for i in range(len(df)):
            cancel_prob = float(probabilities[i])
            results.append({
                "booking_id": booking_ids.iloc[i],
                "cancellation_probability": round(cancel_prob, 2),
                "predicted_status": "Canceled" if predictions[i] == 1 else "Show",
                "action_required": "Overbook Room" if cancel_prob > 0.60 else "Standard Confirm"
            })
            
        return json.dumps({"cancellation_forecast": results}, indent=4)

# ==========================================
# 🚀 HACKATHON DEMO / TESTING BLOCK
# ==========================================
if __name__ == "__main__":
    # 1. Historical Mock JSON
    training_data = """
    {
        "historical_bookings": [
            {"booking_id": "B001", "price_usd": 150, "customer_category": "Level 1 - Budget", "average_spending": 20, "location": "Addis Ababa", "work_status": "Student", "previous_bookings": 1, "previous_cancellations": 1, "is_canceled": 1},
            {"booking_id": "B002", "price_usd": 300, "customer_category": "Level 3 - Premium", "average_spending": 400, "location": "Dubai", "work_status": "Employed", "previous_bookings": 5, "previous_cancellations": 0, "is_canceled": 0},
            {"booking_id": "B003", "price_usd": 120, "customer_category": "Level 1 - Budget", "average_spending": 50, "location": "Nairobi", "work_status": "Self-Employed", "previous_bookings": 2, "previous_cancellations": 0, "is_canceled": 0},
            {"booking_id": "B004", "price_usd": 100, "customer_category": "Level 1 - Budget", "average_spending": 10, "location": "Addis Ababa", "work_status": "Student", "previous_bookings": 0, "previous_cancellations": 0, "is_canceled": 1},
            {"booking_id": "B005", "price_usd": 250, "customer_category": "Level 2 - Standard", "average_spending": 150, "location": "London", "work_status": "Employed", "previous_bookings": 3, "previous_cancellations": 0, "is_canceled": 0},
            {"booking_id": "B006", "price_usd": 140, "customer_category": "Level 1 - Budget", "average_spending": 30, "location": "Addis Ababa", "work_status": "Self-Employed", "previous_bookings": 1, "previous_cancellations": 2, "is_canceled": 1}
        ]
    }
    """

    # 2. New Incoming Bookings
    new_bookings_data = """
    {
        "new_bookings": [
            {
                "booking_id": "RES_101", 
                "price_usd": 130, 
                "customer_category": "Level 1 - Budget", 
                "average_spending": 15, 
                "location": "Addis Ababa", 
                "work_status": "Student", 
                "previous_bookings": 1, 
                "previous_cancellations": 1
            },
            {
                "booking_id": "RES_102", 
                "price_usd": 350, 
                "customer_category": "Level 3 - Premium", 
                "average_spending": 450, 
                "location": "Dubai", 
                "work_status": "Employed", 
                "previous_bookings": 8, 
                "previous_cancellations": 0
            }
        ]
    }
    """

    # 3. Initialize and Run
    predictor = CancellationPredictor()
    predictor.train_model(training_data)
    result_json = predictor.predict_cancellations(new_bookings_data)
    
    print("\n🔮 --- Mulu AI: CANCELLATION & OVERBOOKING PREDICTIONS ---")
    print(result_json)