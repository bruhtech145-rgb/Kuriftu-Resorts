import json
import sys
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

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
        The data should be in the form of a list of dictionaries with 'id', 'average_price', and 'points_balance'.
        """
        df = pd.DataFrame(input_data['members'])
        if df.empty:
            raise ValueError("Member data is empty.")
        return df

    def perform_clustering(self, df):
        """
        Performs K-Means clustering on the given dataframe.
        """
        # Feature selection
        features = df[['average_price', 'points_balance']]
        
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
        result = df[['id', 'average_price', 'points_balance', 'category']].to_dict(orient='records')
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
