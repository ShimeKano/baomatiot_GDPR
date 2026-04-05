const mqtt = require('mqtt');
const { ingestSensorRecord } = require('./sensorService');
const { getUserIdByToken } = require('./deviceTokenService');
const { ingestTelemetry } = require('./telemetryService');

let client = null;

function tryParseMessage(message) {
  try {
    return JSON.parse(message.toString());
  } catch (error) {
    return null;
  }
}

function handleMessage(_topic, message) {
  const payload = tryParseMessage(message);
  if (!payload || typeof payload !== 'object') {
    return;
  }

  // Device-token based telemetry (new Wokwi path)
  if (typeof payload.deviceToken === 'string' && payload.deviceToken) {
    const userId = getUserIdByToken(payload.deviceToken);
    if (!userId) {
      console.error('MQTT telemetry: unknown deviceToken, message discarded');
      return;
    }
    const result = ingestTelemetry(userId, payload);
    if (result.error) {
      console.error('MQTT telemetry ingest error', result.error);
    }
    return;
  }

  // Legacy path: payload contains userId + deviceId
  const result = ingestSensorRecord(payload, 'mqtt');
  if (result.error) {
    console.error('MQTT ingest error', result.error);
  }
}

function startMqttSubscriber() {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org';
  const topic = process.env.MQTT_TELEMETRY_TOPIC || 'iot/gdpr/telemetry';

  client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000
  });

  client.on('connect', () => {
    console.log(`MQTT connected to ${brokerUrl}, subscribing to ${topic}`);
    client.subscribe(topic, (error) => {
      if (error) {
        console.error('MQTT subscribe error', error.message);
      }
    });

    // Also subscribe legacy topic if configured separately
    const legacyTopic = process.env.MQTT_TOPIC;
    if (legacyTopic && legacyTopic !== topic) {
      client.subscribe(legacyTopic, (error) => {
        if (error) {
          console.error('MQTT legacy subscribe error', error.message);
        }
      });
    }
  });

  client.on('message', handleMessage);

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
