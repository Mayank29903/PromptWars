import { Kafka } from 'kafkajs';
import { config } from '../config.js';

export const kafka = new Kafka({
  clientId: 'antigravity-realtime',
  brokers: config.kafka.brokers,
  retry: { initialRetryTime: 300, retries: 10 }
});

export async function createConsumer(groupId) {
  const consumer = kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000
  });
  await consumer.connect();
  console.log(`[Kafka] Consumer connected: ${groupId}`);
  return consumer;
}
