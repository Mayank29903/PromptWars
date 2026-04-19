import xgboost as xgb
import numpy as np

class QueueTimePredictor:
    def __init__(self):
        self.model = xgb.XGBRegressor(
            n_estimators=450,
            max_depth=7,
            learning_rate=0.045,
            subsample=0.8,
            colsample_bytree=0.75,
            gamma=0.1,
            reg_lambda=1.2,
            reg_alpha=0.05,
            objective="reg:squarederror",
            tree_method="hist",
            device="cpu"
        )
        
        self.model_lower = xgb.XGBRegressor(
            n_estimators=450, max_depth=7, learning_rate=0.045,
            objective="reg:quantileerror", quantile_alpha=0.1,
            tree_method="hist", device="cpu"
        )
        self.model_upper = xgb.XGBRegressor(
            n_estimators=450, max_depth=7, learning_rate=0.045,
            objective="reg:quantileerror", quantile_alpha=0.9,
            tree_method="hist", device="cpu"
        )

    def train(self, X, y):
        self.model.fit(X, y)
        self.model_lower.fit(X, y)
        self.model_upper.fit(X, y)

    def predict(self, X):
        wait_time = self.model.predict(X)
        lower_bound = self.model_lower.predict(X)
        upper_bound = self.model_upper.predict(X)
        
        return {
            "wait_time_minutes": float(wait_time[0]) if len(wait_time)==1 else wait_time,
            "confidence_interval_80pct": {
                "lower": float(lower_bound[0]) if len(lower_bound)==1 else lower_bound,
                "upper": float(upper_bound[0]) if len(upper_bound)==1 else upper_bound
            }
        }
    
    def evaluate_and_retrain_trigger(self, X_val, y_val):
        preds = self.model.predict(X_val)
        rmse = np.sqrt(np.mean((y_val - preds)**2))
        return rmse > 3.0
