const mqtt = require('mqtt');
const { ingestSensorRecord } = require('./sensorService');

let client = null;

function tryParseMessage(message) {
  try {
    return JSON.parse(message.toString());
  } catch (error) {
    return null;
  }
}

function startMqttSubscriber() {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  const topic = process.env.MQTT_TOPIC;

  if (!brokerUrl || !topic) {
    return null;
  }

  client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined
  });

  client.on('connect', () => {
    client.subscribe(topic, (error) => {
      if (error) {
        console.error('MQTT subscribe error', error.message);
      }
    });
  });

  client.on('message', (_topic, message) => {
    const payload = tryParseMessage(message);
    if (!payload) {
      return;
    }
    const result = ingestSensorRecord(payload, 'mqtt');
    if (result.error) {
      console.error('MQTT ingest error', result.error);
    }
  });

  client.on('error', (error) => {
    console.error('MQTT client error', error.message);
  });

  return client;
}

function stopMqttSubscriber() {
  if (client) {
    client.end(true);
    client = null;
  }
}

module.exports = {
  startMqttSubscriber,
  stopMqttSubscriber
};
