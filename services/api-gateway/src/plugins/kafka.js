import fp from 'fastify-plugin';
import { Kafka, Partitioners } from 'kafkajs';
import { config } from '../config.js';

const TOPICS = [
  'crowd.zone.state', 'queue.point.updates', 'safety.alert.stream',
  'fan.behavior.events', 'ops.staff.positions', 'ble.beacon.readings', 'cv.person.detections'
];

async function kafkaPlugin(fastify) {
  const kafka = new Kafka({ clientId: 'api-gateway', brokers: config.kafka.brokers });
  const producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });

  await producer.connect();
  fastify.log.info('Kafka producer connected');

  fastify.decorate('kafka', kafka);
  fastify.decorate('kafkaProducer', producer);
  fastify.decorate('publishEvent', async (topic, key, value) => {
    try {
      await producer.send({
        topic,
        messages: [{ key, value: JSON.stringify(value), timestamp: Date.now().toString() }]
      });
    } catch (err) {
      fastify.log.error(`Kafka publish failure to ${topic}:`, err);
    }
  });

  fastify.addHook('onClose', async () => {
    await producer.disconnect();
  });
}

export default fp(kafkaPlugin, { name: 'kafka' });
