# Contributing to ANTIGRAVITY

First and foremost, thank you for considering contributing to ANTIGRAVITY. This project is not just a hackathon dashboard — its mission is to prevent stadium tragedies using predictive AI and autonomous orchestration. Our life-safety mission depends on a robust, highly scrutinized, and fast codebase. Your contributions help make large-scale crowd events safer for everyone.

## Getting Started

To get the project running locally:

```bash
git clone https://github.com/your-org/antigravity.git
cd antigravity

# Copy environment variables
cp .env.example .env

# Install Node dependencies
pnpm install

# Build containers and boot the demo
make demo
```

Running `make demo` is the easiest way to verify your setup is fully working, as it provisions PostgreSQL, Redis, Kafka, and all 8 microservices, followed by a data seed.

## Project Structure

ANTIGRAVITY is a Turborepo monorepo encompassing the following key services:

- **api-gateway**: Fastify REST API that handles auth, user orchestration, and Prisma database connections.
- **realtime-service**: Node.js Socket.IO server that bridges Kafka event streams to delta-compressed WebSockets for the UI.
- **safety-service**: Python/FastAPI service processing live sensor data to compute Fruin crush risk scores and orchestrating emergency protocols.
- **fan-pulse-service**: Gamification engine that computes and validates points, utilizing anti-gaming ML to prevent exploit abuse.
- **predict-engine**: Mesa Agent-Based Simulation (ABS) and Google OR-Tools optimization for 48-hour crowd forecasting and staff scheduling.
- **ml-service**: PyTorch and XGBoost inference service exposing all 5 predictive ML models via REST.
- **edge-processor**: Node.js service simulating local venue hardware (beacons, cameras) and publishing smoothed data into Kafka.
- **notification-service**: Dedicated consumer routing highly critical Kafka warnings into push notifications.

## How to Add a New Zone Type

1. Add the new zone type to the `ZoneType` enum in `services/api-gateway/prisma/schema.prisma`.
2. Run `npx prisma migrate dev` within `services/api-gateway` to apply it to the database.
3. Update `ZONE_CELL_COUNTS` in `services/predict-engine/src/abs_simulation.py` so the Monte Carlo engine knows the scale.
4. Update the `ZONES` array in `services/edge-processor/src/index.js` to begin generating simulated sensor telemetry.

## How to Add a New FanPulse Action

1. Add the new action to the `ACTION_DEFINITIONS` dict in `services/fan-pulse-service/src/schemas.py`, including its `base_points` and a `description`.
2. Add validation logic to `services/fan-pulse-service/src/anti_gaming.py` if the action heavily relies on location parameters.
3. Update the `LOCATION_ACTIONS` tuple in the same file if the action requires the user to be physically present at a certain coordinate to gain points.

## Code Style

- **Node.js**: The repository uses ESLint configured to strict standards. Ensure you run `pnpm lint` and that it passes. The configuration can be found at `.eslintrc.js`.
- **Python**: We follow standard **PEP 8** style guidelines using 4-space indentation. 

## Testing

You must ensure that tests pass across the stack before submitting changes:

```bash
# Run Node.js tests (Vitest)
pnpm test

# Run Python tests
cd services/safety-service && python -m pytest tests/ -v
cd services/fan-pulse-service && python -m pytest tests/ -v
cd services/predict-engine && python -m pytest tests/ -v
```

All 26 unit tests must pass. You can run all platform tests simply with `make test`.

## Submitting a PR

When you are ready to propose your changes:

1. **Fork the repository** to your own GitHub account.
2. **Create a feature branch** named `feature/your-brief-description` or `bugfix/issue-description`.
3. **Ensure all tests pass** by running `make test`.
4. **Determine health state** by ensuring `make health` outputs `OK` for all components.
5. **Open a Pull Request** against the `main` branch. Provide a detailed description of what changed, why it changed, and specify which microservice(s) the PR affects.
