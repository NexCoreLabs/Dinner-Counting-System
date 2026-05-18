// src/bot.js
// WhatsApp messaging through Twilio.

require('dotenv').config();
const twilio = require('twilio');
const db = require('./db');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886',
  TWILIO_CONTENT_SID
} = process.env;

const client = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

function normalizeForTwilio(phone) {
  if (!phone) return '';
  const value = String(phone).trim();
  if (value.startsWith('whatsapp:')) return value;

  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('968')) return `whatsapp:+${digits}`;
  return `whatsapp:+968${digits}`;
}

function normalizeForDb(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.startsWith('968') ? digits.slice(3) : digits;
}

async function sendMessage(phone, body, contentVariables) {
  if (!client) {
    console.error('Twilio is not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env');
    return false;
  }

  const to = normalizeForTwilio(phone);

  try {
    const payload = {
      from: TWILIO_WHATSAPP_FROM,
      to
    };

    if (TWILIO_CONTENT_SID) {
      payload.contentSid = TWILIO_CONTENT_SID;
      payload.contentVariables = JSON.stringify(contentVariables || { 1: 'this week', 2: '8pm' });
    } else {
      payload.body = body;
    }

    const message = await client.messages.create(payload);
    console.log(`Sent WhatsApp message to ${to}: ${message.sid}`);
    return true;
  } catch (err) {
    console.error(`Failed to send WhatsApp message to ${to}:`, err.message);
    return false;
  }
}

async function sendWeeklyPoll() {
  const students = await db.getAllStudents();
  console.log(`Sending weekly poll to ${students.length} students...`);

  const message =
`🍽️ استبيان وجبة العشاء - سكن جامعة السلطان قابوس

هل ستكونين في السكن لتناول العشاء يوم الخميس والجمعة؟

أرسلي:
1 - نعم
2 - لا

يرجى الرد قبل الساعة 8 مساءً.`;

  let sent = 0;
  for (const student of students) {
    const ok = await sendMessage(student.phone, message);
    if (ok) sent++;
    await delay(1000);
  }

  console.log(`Sent ${sent} of ${students.length} weekly poll messages`);
}

async function sendReminders() {
  const noResponders = await db.getNoResponders();
  if (noResponders.length === 0) {
    console.log('Everyone has replied. No reminders needed.');
    return;
  }

  console.log(`Sending reminders to ${noResponders.length} students...`);

  const message =
`⏰ تذكير - سكن جامعة السلطان قابوس

لم نستلم ردك بعد بخصوص وجبة العشاء.

أرسلي:
1 - نعم
2 - لا`;

  for (const student of noResponders) {
    await sendMessage(student.phone, message);
    await delay(1000);
  }
}

async function sendReportToAdmin() {
  const report = await db.generateReport();
  const adminPhone = process.env.ADMIN_PHONE;

  if (!adminPhone) {
    console.warn('ADMIN_PHONE is not set in .env');
    return report;
  }

  const message =
`📊 تقرير وجبة العشاء الأسبوعي
الأسبوع: ${report.week}

إجمالي الطالبات: ${report.total}
✅ حضور: ${report.attending}
❌ عدم حضور: ${report.notAttending}
⚠️ لم ترد: ${report.noResponse}

التقدير الإجمالي للوجبات: ${report.estimatedMeals}`;

  await sendMessage(adminPhone, message);
  console.log('Sent report to admin');
  return report;
}

async function handleReply(from, body) {
  const dbPhone = normalizeForDb(from);
  const reply = String(body || '').trim();

  if (reply === '1') {
    await db.saveResponse(dbPhone, 'yes');
    await sendMessage(from, '✅ شكراً! تم تسجيل حضورك لوجبة العشاء.');
  } else if (reply === '2') {
    await db.saveResponse(dbPhone, 'no');
    await sendMessage(from, '✅ تم تسجيل ردك. شكراً لك.');
  } else {
    await sendMessage(from, '❓ لم نفهم ردك. يرجى الرد بـ 1 تعني نعم أو 2 تعني لا.');
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  sendWeeklyPoll,
  sendReminders,
  sendReportToAdmin,
  handleReply,
  normalizeForDb,
  normalizeForTwilio
};
