import 'dotenv/config';

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  database: { url: required('DATABASE_URL') },
  redis: { url: required('REDIS_URL') },
  kafka: { brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') },
  jwt: {
    secret: required('JWT_SECRET'),
    accessTTL: parseInt(process.env.JWT_ACCESS_TTL || '900', 10),
    refreshTTL: parseInt(process.env.JWT_REFRESH_TTL || '604800', 10)
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10)
  },
  services: {
    ml:       process.env.ML_SERVICE_URL       || 'http://localhost:8000',
    realtime: process.env.REALTIME_SERVICE_URL || 'http://localhost:3001',
    safety:   process.env.SAFETY_SERVICE_URL   || 'http://localhost:8001',
    predict:  process.env.PREDICT_SERVICE_URL  || 'http://localhost:8003'
  },
  gemini: {
    key: process.env.GEMINI_API_KEY || ''
  }
};
