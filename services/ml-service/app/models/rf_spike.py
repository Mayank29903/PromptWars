from sklearn.ensemble import RandomForestClassifier

class RFSpikePredictor:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=8,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42
        )
        self.threshold = 0.65
        
    def train(self, X, y):
        self.model.fit(X, y)
        
    def predict(self, X):
        probs = self.model.predict_proba(X)[:, 1]
        
        results = []
        for p in probs:
            expected_minutes = max(1, min(10, int((1.0 - p) * 15))) 
            results.append({
                "spike_probability": float(p),
                "is_spike_predicted": p >= self.threshold,
                "spike_expected_in_minutes": expected_minutes
            })
        return results if len(results) > 1 else results[0]
