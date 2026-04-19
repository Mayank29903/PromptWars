# ═══════════════════════════════════════════════════════════════════════
#  ANTIGRAVITY — One-Command Demo Toolkit
#  Usage:  make up      → boots everything
#          make health  → checks all endpoints
#          make seed    → populates demo data
#          make demo    → full demo startup
#          make down    → stops everything
# ═══════════════════════════════════════════════════════════════════════

COMPOSE = docker compose -f docker-compose.dev.yml

.PHONY: up down health seed demo logs explain test

# ── Boot all services ─────────────────────────────────────────────────
up:
	@echo "🚀 Starting ANTIGRAVITY platform..."
	$(COMPOSE) up -d --build
	@echo "⏳ Waiting 15s for services to stabilize..."
	@sleep 15
	@$(MAKE) health

# ── Stop everything ───────────────────────────────────────────────────
down:
	@echo "🛑 Shutting down ANTIGRAVITY..."
	$(COMPOSE) down

# ── Health check all endpoints ────────────────────────────────────────
health:
	@echo ""
	@echo "════════════════════════════════════════"
	@echo "  ANTIGRAVITY HEALTH CHECK"
	@echo "════════════════════════════════════════"
	@curl -sf http://localhost:3000/health > /dev/null 2>&1 && echo "✅ API Gateway      (3000)  OK" || echo "❌ API Gateway      (3000)  FAIL"
	@curl -sf http://localhost:3001/health > /dev/null 2>&1 && echo "✅ Real-Time        (3001)  OK" || echo "❌ Real-Time        (3001)  FAIL"
	@curl -sf http://localhost:8000/health > /dev/null 2>&1 && echo "✅ ML Service       (8000)  OK" || echo "❌ ML Service       (8000)  FAIL"
	@curl -sf http://localhost:8001/health > /dev/null 2>&1 && echo "✅ SafetyNet        (8001)  OK" || echo "❌ SafetyNet        (8001)  FAIL"
	@curl -sf http://localhost:8002/health > /dev/null 2>&1 && echo "✅ FanPulse         (8002)  OK" || echo "❌ FanPulse         (8002)  FAIL"
	@curl -sf http://localhost:8003/health > /dev/null 2>&1 && echo "✅ PredictEngine    (8003)  OK" || echo "❌ PredictEngine    (8003)  FAIL"
	@curl -sf http://localhost:3002/health > /dev/null 2>&1 && echo "✅ Edge Processor   (3002)  OK" || echo "❌ Edge Processor   (3002)  FAIL"
	@curl -sf http://localhost:3003/health > /dev/null 2>&1 && echo "✅ Notifications    (3003)  OK" || echo "❌ Notifications    (3003)  FAIL"
	@echo "════════════════════════════════════════"
	@echo ""

# ── Seed demo data ────────────────────────────────────────────────────
seed:
	@echo "🌱 Running database migrations..."
	$(COMPOSE) exec api-gateway npx prisma migrate deploy
	@echo "🌱 Running Prisma seed..."
	$(COMPOSE) exec api-gateway npx prisma db seed
	@echo "🌱 Running PredictEngine seed (venues, fans, Redis state)..."
	$(COMPOSE) exec predict-engine python -m src.seed_generator
	@echo "✅ Demo data seeded."

# ── Full demo startup ────────────────────────────────────────────────
demo: up seed
	@echo ""
	@echo "════════════════════════════════════════════════════════════"
	@echo "  🎯 ANTIGRAVITY DEMO READY"
	@echo "════════════════════════════════════════════════════════════"
	@echo ""
	@echo "  Dashboard:  http://localhost:5173"
	@echo "  API Docs:   http://localhost:3000/documentation"
	@echo ""
	@echo "  ── Demo Scenarios ──"
	@echo ""
	@echo "  1. Crush Detection (fire 3x for CRITICAL):"
	@echo "     curl -X POST http://localhost:8001/api/v1/safety/simulate-alert \\"
	@echo "       -H 'Content-Type: application/json' \\"
	@echo "       -d '{\"zone_id\":\"east-stand\",\"venue_id\":\"manchester-arena\",\"current_density\":6.5,\"avg_velocity_mps\":0.2,\"floor\":1}'"
	@echo ""
	@echo "  2. ML Crowd Prediction:"
	@echo "     curl http://localhost:8000/ml/crowd/predict?horizon=15"
	@echo ""
	@echo "  3. Queue Wait Time:"
	@echo "     curl -X POST http://localhost:8000/ml/queue/predict \\"
	@echo "       -H 'Content-Type: application/json' \\"
	@echo "       -d '{\"current_queue_visible_length\":20,\"virtual_queue_backlog_count\":12,\"active_server_count\":4,\"historical_service_rate_p50\":3.0,\"hour\":20,\"minutes_to_halftime\":10,\"rivalry_index\":0.95}'"
	@echo ""
	@echo "  4. 48hr Simulation:"
	@echo "     curl -X POST http://localhost:8003/api/v1/predict/simulation \\"
	@echo "       -H 'Content-Type: application/json' \\"
	@echo "       -d '{\"event_id\":\"evt-premier-league-finals-001\",\"n_runs\":10,\"n_agents\":1000}'"
	@echo ""
	@echo "════════════════════════════════════════════════════════════"

# ── Tail logs ─────────────────────────────────────────────────────────
logs:
	$(COMPOSE) logs -f --tail=50

# ── Explainability Endpoints ──────────────────────────────────────────
explain:
	@echo "Crush Risk Explainability:"
	curl "http://localhost:8000/ml/predict/explain-crush?density=6.5&velocity=0.2&convergence=0.8&acceleration=0.6"
	@echo "\n\nQueue Prediction Explainability:"
	curl "http://localhost:8000/ml/predict/explain-queue?queue_length=20&servers=4&halftime_minutes=5&rivalry=0.95"
	@echo "\n\nModel Card (Responsible AI):"
	curl http://localhost:8000/ml/predict/model-card

# ── Run Tests ─────────────────────────────────────────────────────────
test:
	@echo "Running tests across Python and Node.js codebases..."
	cd services/safety-service && python -m pytest tests/ -v
	cd services/fan-pulse-service && python -m pytest tests/ -v
	cd services/predict-engine && python -m pytest tests/ -v
	pnpm test
