import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
  },
  jwt: {
    secret: required('JWT_SECRET')
  },
  redis: {
    url: required('REDIS_URL')
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || '*').split(',')
  }
};
