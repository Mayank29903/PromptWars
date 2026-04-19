import torch
import torch.nn as nn
import cv2
import numpy as np


class PanicDetector1DCNN(nn.Module):
    PANIC_THRESHOLD = 0.72

    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv1d(5, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm1d(32)
        self.relu = nn.ReLU()

        self.conv2 = nn.Conv1d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm1d(64)

        self.conv3 = nn.Conv1d(64, 128, kernel_size=3, padding=1)

        self.pool = nn.AdaptiveAvgPool1d(1)

        self.fc1 = nn.Linear(128, 64)
        self.dropout = nn.Dropout(0.3)
        self.fc2 = nn.Linear(64, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.relu(self.bn1(self.conv1(x)))
        x = self.relu(self.bn2(self.conv2(x)))
        x = self.relu(self.conv3(x))
        x = self.pool(x)
        x = torch.flatten(x, 1)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.sigmoid(self.fc2(x))
        return x

    def predict_from_features(self, features: list) -> float:
        """
        Run panic inference on an arbitrary feature list.
        Reshapes features to (1, 1, len(features)), pads channels to 5
        via repeat, runs forward pass, returns panic_probability float 0-1.

        Does not require real audio data — works on any numeric list.
        """
        if not features:
            return 0.0

        t = torch.tensor(features, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
        # Model expects 5 input channels — repeat channel dim to match
        if t.shape[1] < 5:
            t = t.repeat(1, 5, 1)
        else:
            t = t[:, :5, :]

        was_training = self.training
        self.eval()
        with torch.no_grad():
            out = self.forward(t)
        if was_training:
            self.train()

        panic_probability = float(out.squeeze().item())
        return panic_probability


def preprocess_frames_to_features(frames):
    import scipy.stats
    features = []

    for i in range(1, len(frames)):
        prev_gray = cv2.cvtColor(frames[i-1], cv2.COLOR_BGR2GRAY)
        gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)

        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, gray, None,
            pyr_scale=0.5, levels=3, winsize=15,
            iterations=3, poly_n=5, poly_sigma=1.2, flags=0
        )

        mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])

        mean_magnitude = np.mean(mag)
        direction_variance = np.var(ang)
        dominant_angle = np.degrees(np.arctan2(np.mean(flow[..., 1]), np.mean(flow[..., 0])))

        reversal_ratio = np.sum((np.degrees(ang) - dominant_angle) > 135) / max(ang.size, 1)
        iqr_speed = scipy.stats.iqr(mag.flatten())

        features.append([mean_magnitude, direction_variance, dominant_angle, reversal_ratio, iqr_speed])

    while len(features) < 150:
        features.append(features[-1] if features else [0]*5)

    features = np.array(features[:150])
    return torch.tensor(features.T, dtype=torch.float32).unsqueeze(0)
