import numpy as np

class VenueFeaturePipeline:
    def __init__(self):
        pass

    def compute_crowd_features(self, raw_densities, history_buffer):
        curr = np.array(raw_densities)
        normalized = curr / np.max([curr.max(), 4.5])
        
        trend = np.zeros_like(curr)
        volatility = np.zeros_like(curr)
        
        if history_buffer and len(history_buffer) > 0:
            histarr = np.array(history_buffer)
            trend = curr - histarr[-1]
            volatility = np.std(histarr, axis=0) if len(histarr) >= 5 else np.zeros_like(curr)
            
        return {
            "normalized": normalized.tolist(),
            "trend": trend.tolist(),
            "volatility": volatility.tolist()
        }

    def compute_queue_features(self, current_queue_state, arrival_pred=0.0):
        features = [
            current_queue_state.get("current_queue_visible_length", 0),
            current_queue_state.get("virtual_queue_backlog_count", 0),
            current_queue_state.get("active_server_count", 1),
            current_queue_state.get("historical_service_rate_p50", 3.0),
            current_queue_state.get("historical_service_rate_p90", 2.0),
            *self.compute_time_features(current_queue_state.get("hour", 12))[:2],
            current_queue_state.get("minutes_to_halftime", 45),
            current_queue_state.get("minutes_since_goal", -1),
            current_queue_state.get("weather_temperature", 20.0),
            arrival_pred,
            *self.compute_time_features(day=current_queue_state.get("day", 1))[2:],
            current_queue_state.get("rivalry_index", 0.5)
        ]
        return features

    def compute_time_features(self, hour=12, day=1):
        time_sin = np.sin(2 * np.pi * hour / 24)
        time_cos = np.cos(2 * np.pi * hour / 24)
        
        day_sin = np.sin(2 * np.pi * day / 7)
        day_cos = np.cos(2 * np.pi * day / 7)
        
        return [time_sin, time_cos, day_sin, day_cos]

    def compute_rival_features(self, rivalry_index, expected_att, max_cap):
        return {
            "rivalry_index": rivalry_index,
            "hype_score": rivalry_index * 1.5,
            "expected_attendance_ratio": expected_att / max(max_cap, 1)
        }
