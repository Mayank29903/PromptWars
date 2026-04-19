import torch
import torch.nn as nn

class CrowdFlowLSTM(nn.Module):
    def __init__(self, n_zones=9):
        super(CrowdFlowLSTM, self).__init__()
        self.n_zones = n_zones
        
        self.lstm = nn.LSTM(input_size=24, hidden_size=128, num_layers=3, batch_first=True, dropout=0.25, bidirectional=True)
        self.attention = nn.MultiheadAttention(embed_dim=256, num_heads=8, batch_first=True)
        self.layer_norm = nn.LayerNorm(256)
        
        self.fc_5min = nn.Linear(256, n_zones)
        self.fc_10min = nn.Linear(256, n_zones)
        self.fc_30min = nn.Linear(256, n_zones)

    def forward(self, x):
        lstm_out, (hn, cn) = self.lstm(x)
        last_hidden = lstm_out[:, -1:, :]
        
        attn_out, _ = self.attention(query=last_hidden, key=lstm_out, value=lstm_out)
        attn_out = attn_out.squeeze(1)
        
        norm_out = self.layer_norm(attn_out)
        
        pred_5min = self.fc_5min(norm_out)
        pred_10min = self.fc_10min(norm_out)
        pred_30min = self.fc_30min(norm_out)
        
        return {
            "pred_5min": pred_5min,
            "pred_10min": pred_10min,
            "pred_30min": pred_30min
        }

def get_training_objects(model):
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    loss_fn = nn.HuberLoss(delta=1.0)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=10, factor=0.5)
    return optimizer, loss_fn, scheduler
