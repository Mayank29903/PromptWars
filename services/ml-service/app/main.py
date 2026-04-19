from fastapi import FastAPI
from app.routers import crowd, queue, safety, predict

app = FastAPI(title="ANTIGRAVITY ML Service", version="3.0", description="Core Intelligence Layer")

app.include_router(crowd.router, prefix="/ml/crowd", tags=["Crowd"])
app.include_router(queue.router, prefix="/ml/queue", tags=["Queue"])
app.include_router(safety.router, prefix="/ml/safety", tags=["Safety"])
app.include_router(predict.router, prefix="/ml/predict", tags=["Predict"])

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ML Service"}
