const { sendDailySummaryEmails } = require('./emailService');

let timerRef = null;

function nextDelayMs({ hour, minute, timeZone }) {
  const now = new Date();
  const nowInTz = new Date(now.toLocaleString('en-US', { timeZone }));
  const target = new Date(nowInTz);
  target.setHours(hour, minute, 0, 0);
  if (target <= nowInTz) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - nowInTz.getTime();
}

function startDailyEmailScheduler() {
  const timeZone = process.env.TZ || 'Asia/Ho_Chi_Minh';
  const hour = Number(process.env.DAILY_EMAIL_HOUR || 7);
  const minute = Number(process.env.DAILY_EMAIL_MINUTE || 0);

  const scheduleNext = () => {
    const delay = Math.max(1000, nextDelayMs({ hour, minute, timeZone }));
    timerRef = setTimeout(async () => {
      try {
        await sendDailySummaryEmails({ timeZone });
      } catch (error) {
        console.error('Failed to run daily email scheduler', error.message);
      } finally {
        scheduleNext();
      }
    }, delay);
  };

  scheduleNext();
}

function stopDailyEmailScheduler() {
  if (timerRef) {
    clearTimeout(timerRef);
    timerRef = null;
  }
}

module.exports = {
  startDailyEmailScheduler,
  stopDailyEmailScheduler
};
