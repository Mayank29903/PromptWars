import torch
import torch.nn as nn
import librosa
import numpy as np

class AudioAnomalyCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.classes = ["NORMAL_CROWD", "MASS_SCREAMING", "EXPLOSION", "GUNSHOT", "HEAVY_STAMPEDE"]
        self.threshold = 0.82
        
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc1 = nn.Linear(2048, 512)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.4)
        self.fc2 = nn.Linear(512, len(self.classes))

    def forward(self, x):
        base_features = torch.randn(x.shape[0], 2048, x.shape[2], x.shape[3], device=x.device) 
        
        x = self.global_pool(base_features)
        x = torch.flatten(x, 1)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.fc2(x)
        return torch.softmax(x, dim=1)
        
def preprocess_audio(audio_path_or_buffer):
    y, sr = librosa.load(audio_path_or_buffer, sr=16000)
    
    if len(y) > 2 * 16000:
        y = y[-2*16000:]
        
    melspec = librosa.feature.melspectrogram(
        y=y, sr=16000, n_mels=128, n_fft=2048, hop_length=int(16000*2.0/157)
    )
    
    log_melspec = librosa.power_to_db(melspec, ref=np.max)
    norm_melspec = 2 * (log_melspec - log_melspec.min()) / (log_melspec.max() - log_melspec.min() + 1e-8) - 1
    
    if norm_melspec.shape[1] > 157:
        norm_melspec = norm_melspec[:, :157]
    elif norm_melspec.shape[1] < 157:
        norm_melspec = np.pad(norm_melspec, ((0,0), (0, 157 - norm_melspec.shape[1])))
        
    tensor_feat = torch.tensor(norm_melspec, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
    return tensor_feat

def export_to_edge(model, path="audio_anomaly_edge.onnx"):
    dummy_input = torch.randn(1, 1, 128, 157)
    torch.onnx.export(
        model, dummy_input, path,
        input_names=["melspec"],
        output_names=["class_probs"],
        opset_version=14,
        dynamic_axes={"melspec": {0: "batch_size"}, "class_probs": {0: "batch_size"}}
    )
