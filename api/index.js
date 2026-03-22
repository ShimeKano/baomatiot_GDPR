require('dotenv').config();

const app = require('./app');
const { startMqttSubscriber } = require('./services/mqttService');
const { startDailyEmailScheduler } = require('./services/schedulerService');

const port = Number(process.env.PORT || 4280);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

startMqttSubscriber();
startDailyEmailScheduler();
