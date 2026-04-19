import numpy as np

class VenueKalmanFilter:
    def __init__(self):
        self.x = np.zeros(5)
        self.P = np.eye(5) * 100.0
        
        dt = 1.0 
        self.F = np.array([
            [1, 0, dt, 0, 0],
            [0, 1, 0, dt, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ])
        
        self.Q = np.eye(5) * 0.1 
        self.Q[4, 4] = 0.5
        
        self.H_ble = np.array([
            [1, 0, 0, 0, 0],
            [0, 1, 0, 0, 0]
        ])
        self.R_ble = np.diag([3.0, 3.0])

        self.H_cv = np.array([[0, 0, 0, 0, 1]])
        self.R_cv = np.array([[0.8]])

        self.H_wifi = np.array([[0, 0, 0, 0, 1]])
        self.R_wifi = np.array([[4.0]])

    def predict(self):
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q

    def update(self, z, H, R):
        y = z - (H @ self.x)
        S = H @ self.P @ H.T + R
        K = self.P @ H.T @ np.linalg.inv(S)
        self.x = self.x + (K @ y)
        I = np.eye(self.P.shape[0])
        self.P = (I - K @ H) @ self.P

    def update_ble(self, x_meas, y_meas):
        z = np.array([x_meas, y_meas])
        self.update(z, self.H_ble, self.R_ble)

    def update_cv(self, person_count):
        z = np.array([person_count])
        self.update(z, self.H_cv, self.R_cv)

    def update_wifi(self, presence_count):
        z = np.array([presence_count])
        self.update(z, self.H_wifi, self.R_wifi)

    def fuse_sensors(self, ble_pos=None, cv_count=None, wifi_count=None):
        self.predict()
        
        if ble_pos is not None:
            self.update_ble(ble_pos[0], ble_pos[1])
            
        if cv_count is not None:
            self.update_cv(cv_count)
            
        if wifi_count is not None:
            self.update_wifi(wifi_count)
            
        pos_cov = self.P[0:2, 0:2]
        eigenvalues, eigenvectors = np.linalg.eig(pos_cov)
        
        return {
            "x": float(self.x[0]),
            "y": float(self.x[1]),
            "person_count": max(0, int(round(self.x[4]))),
            "uncertainty_ellipse": {
                "eigenvalues": eigenvalues.tolist(),
                "eigenvectors": eigenvectors.tolist()
            }
        }
