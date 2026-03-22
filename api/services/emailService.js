const nodemailer = require('nodemailer');
const { readData, writeData } = require('./store');
const { dateKeyInTimeZone, summarizeDailyByUser } = require('./sensorService');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

function hasEmailBeenSent(data, userId, dayKey) {
  return data.dailyEmailLogs.some((entry) => entry.userId === userId && entry.dayKey === dayKey);
}

function markEmailSent(data, userId, dayKey) {
  data.dailyEmailLogs.push({
    userId,
    dayKey,
    sentAt: new Date().toISOString()
  });
}

async function sendDailySummaryEmails({ now = new Date(), timeZone = 'Asia/Ho_Chi_Minh', force = false } = {}) {
  const data = readData();
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const dayKey = dateKeyInTimeZone(now, timeZone);

  const results = [];

  for (const user of data.users) {
    if (!force && hasEmailBeenSent(data, user.id, dayKey)) {
      results.push({ userId: user.id, email: user.email, status: 'skipped_already_sent' });
      continue;
    }

    const summary = summarizeDailyByUser(user.id, dayKey, timeZone);

    if (!transporter || !from) {
      if (!force) {
        markEmailSent(data, user.id, dayKey);
      }
      results.push({ userId: user.id, email: user.email, status: 'logged_without_smtp', summary });
      continue;
    }

    const text = [
      `Daily sensor summary for ${dayKey}`,
      `Records: ${summary.count}`,
      `Avg Temperature: ${summary.averages.temperature ?? 'N/A'}`,
      `Avg Heart Rate: ${summary.averages.heartRate ?? 'N/A'}`,
      `Avg SpO2: ${summary.averages.spo2 ?? 'N/A'}`
    ].join('\n');

    await transporter.sendMail({
      from,
      to: user.email,
      subject: `Daily IoT healthcare summary (${dayKey})`,
      text
    });

    if (!force) {
      markEmailSent(data, user.id, dayKey);
    }

    results.push({ userId: user.id, email: user.email, status: 'sent', summary });
  }

  writeData(data);
  return { dayKey, results };
}

module.exports = {
  sendDailySummaryEmails
};
