import json
import sys
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from datetime import datetime

class CustomerSegmentationEngine:
    def __init__(self, n_clusters=3):
        """
        Initializes the engine with the desired number of clusters.
        """
        self.n_clusters = n_clusters
        self.scaler = StandardScaler()

    def load_and_prep_data(self, input_data):
        """
        Loads the data from a dictionary and prepares it for clustering.
        """
        df = pd.DataFrame(input_data['members'])
        if df.empty:
            raise ValueError("Member data is empty.")
        
        # Ensure numerical columns exist, mapping from database fields and forcing numeric
        df['average_price'] = pd.to_numeric(df.get('average_price', 0), errors='coerce').fillna(0)
        df['average_spend'] = pd.to_numeric(df.get('average_spend', 0), errors='coerce').fillna(0)
        
        # Use average_spend if average_price is missing or 0
        df['average_price'] = df['average_price'].mask(df['average_price'] == 0, df['average_spend'])
        
        df['points_balance'] = pd.to_numeric(df.get('points_balance', 0), errors='coerce').fillna(0)
        
        # Handle 'Recency' (days since last stay)
        if 'last_stay_at' in df.columns:
            df['last_stay_at'] = pd.to_datetime(df['last_stay_at'], errors='coerce')
            # Calculate days since last stay from 'now'
            # If date is missing, assume a long time ago (e.g. 365 days)
            now = pd.Timestamp.now()
            df['recency'] = (now - df['last_stay_at']).dt.days
            df['recency'] = df['recency'].fillna(365) # Fallback for new members
        else:
            # Default to a neutral value if column doesn't exist yet
            df['recency'] = 0

        return df

    def perform_clustering(self, df):
        """
        Performs K-Means clustering on the given dataframe.
        Features: Monetary (average_price), Frequency (points_balance), Recency (days since stay)
        """
        # Feature selection
        # We invert recency because lower days means a better customer in typical RFM
        features_list = ['average_price', 'points_balance']
        if 'last_stay_at' in df.columns:
            # Scale recency separately or transform it
            # We use 1/(recency + 1) or similar, but for K-Means we can just scale it.
            # Note: Higher recency is worse, so we can use (max_recency - recency)
            max_r = df['recency'].max()
            df['recency_score'] = max_r - df['recency']
            features_list.append('recency_score')

        features = df[features_list]
        
        # Scaling
        scaled_features = self.scaler.fit_transform(features)

        # Dynamic cluster count
        n_samples = len(df)
        actual_clusters = min(self.n_clusters, n_samples)
        
        if actual_clusters < 1:
            return json.dumps({"segmented_customers": []})

        # K-Means clustering
        kmeans = KMeans(n_clusters=actual_clusters, random_state=42, n_init=10)
        df['cluster'] = kmeans.fit_predict(scaled_features)

        # Map clusters to categories
        def map_cluster_to_category(cluster):
            if actual_clusters == 1:
                return "Valued Guest"
            if actual_clusters == 2:
                return "Budget" if cluster == 0 else "Premium"
            
            if cluster == 0:
                return "Budget"
            elif cluster == 1:
                return "Standard"
            else:
                return "Premium"

        df['category'] = df['cluster'].apply(map_cluster_to_category)

        # Prepare result
        output_cols = ['id', 'average_price', 'points_balance', 'category']
        if 'last_stay_at' in df.columns:
            output_cols.append('recency')
            
        result = df[output_cols].to_dict(orient='records')
        return json.dumps({"segmented_customers": result})

if __name__ == "__main__":
    try:
        # Read from stdin
        input_data = json.load(sys.stdin)
        
        engine = CustomerSegmentationEngine()
        historical_df = engine.load_and_prep_data(input_data)
        result_json = engine.perform_clustering(historical_df)
        print(result_json)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
