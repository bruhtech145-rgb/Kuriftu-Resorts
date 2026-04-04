import json
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

class CustomerSegmentationEngine:
    def __init__(self, n_clusters=3):
        """
        Initialize the segmentation engine.
        :param n_clusters: The number of customer tiers we want to create (e.g., 3 for Budget, Standard, Premium).
        """
        self.n_clusters = n_clusters
        self.model = None
        self.scaler = StandardScaler()

    def load_and_prep_data(self, json_data):
        """
        Parses the JSON data and formats it for K-Means clustering.
        """
        # Parse JSON into a Python dictionary, then to a Pandas DataFrame
        data = json.loads(json_data)
        df = pd.DataFrame(data['members'])
        
        # Fill any missing points_balance with 0 to prevent math errors
        df['points_balance'] = df['points_balance'].fillna(0)
        
        return df

    def perform_clustering(self, df):
        """
        Trains the K-Means model on the data, assigns clusters, and maps them to human-readable categories.
        """
        print("Training Customer Segmentation AI Model...")
        
        # 1. Select the features for clustering
        features = df[['average_price', 'points_balance']]
        
        # 2. Scale the data so large point balances don't overpower smaller price values
        scaled_features = self.scaler.fit_transform(features)
        
        # 3. Apply K-Means
        self.model = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        df['cluster'] = self.model.fit_predict(scaled_features)
        
        # 4. Smart Labeling Algorithm
        # Group by the new 'cluster' label and find the average spend for each group
        cluster_means = df.groupby('cluster')['average_price'].mean().sort_values()
        
        # Extract the cluster IDs sorted from lowest spend to highest spend
        sorted_clusters = cluster_means.index.tolist()
        
        # Map the arbitrary cluster numbers to our business logic tiers
        category_mapping = {
            sorted_clusters[0]: "Level 1 - Budget",    # Lowest average price
            sorted_clusters[1]: "Level 2 - Standard",  # Medium average price
            sorted_clusters[2]: "Level 3 - Premium"    # Highest average price
        }
        
        # Apply the labels to a new 'category' column
        df['category'] = df['cluster'].map(category_mapping)
        print("Model training and segmentation complete. ✅")
        
        # Format the output dataframe back into a clean JSON response
        output_data = df[['id', 'average_price', 'points_balance', 'category']].to_dict(orient='records')
        return json.dumps({"segmented_customers": output_data}, indent=4)

# ==========================================
# 🚀 HACKATHON DEMO / TESTING BLOCK
# ==========================================
if __name__ == "__main__":
    # 1. Mock JSON Data (Simulating the 'members' table payload from your backend API)
    mock_json_input = """
    {
        "members": [
            {"id": "usr_001", "average_price": 45.0, "points_balance": 100},
            {"id": "usr_002", "average_price": 250.0, "points_balance": 5000},
            {"id": "usr_003", "average_price": 55.0, "points_balance": 150},
            {"id": "usr_004", "average_price": 120.0, "points_balance": 1200},
            {"id": "usr_005", "average_price": 300.0, "points_balance": 8000},
            {"id": "usr_006", "average_price": 110.0, "points_balance": 900},
            {"id": "usr_007", "average_price": 40.0, "points_balance": 50},
            {"id": "usr_008", "average_price": 135.0, "points_balance": 1500},
            {"id": "usr_009", "average_price": 280.0, "points_balance": 6500}
        ]
    }
    """

    # 2. Initialize the Engine
    engine = CustomerSegmentationEngine(n_clusters=3)

    # 3. Load Data
    historical_df = engine.load_and_prep_data(mock_json_input)

    # 4. Train the AI Model and get the JSON output
    result_json = engine.perform_clustering(historical_df)
    
    # 5. Print results
    print("\n📊 --- GUZO AI: CUSTOMER SEGMENTATION RESULTS ---")
    print(result_json)