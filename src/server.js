// src/server.js
// السيرفر الرئيسي

require('dotenv').config();
const path      = require('path');
const express   = require('express');
const scheduler = require('./scheduler');
const bot       = require('./bot');
const db        = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

app.post('/webhook', async (req, res) => {
  try {
    const from = req.body.From;   // whatsapp:+96891234567
    const body = req.body.Body;   // message text

    console.log(`📩 Received message from ${from}: "${body}"`);

    if (from && body) {
      await bot.handleReply(from, body);
    }

    res.status(200).send('<Response></Response>');
  } catch (err) {
    console.error('Failed to handle Twilio webhook:', err);
    res.status(200).send('<Response></Response>');
  }
});

// ══════════════════════════════════════════════════
// API — إضافة طالبة (من فورم التسجيل)
// ══════════════════════════════════════════════════
app.post('/api/register', async (req, res) => {
  const { fullName, studentId, phone, block, roomNum } = req.body;

  // تحقق بسيط
  if (!fullName || !studentId || !phone || !block || !roomNum) {
    return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
  }

  const result = await db.addStudent({
    fullName,
    studentId,
    phone,
    block,
    roomNum
  });

  res.json(result);
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const report = await db.generateReport();
    const students = await db.getAllStudents();
    const responses = await db.getResponsesForWeek();
    res.json({ success: true, report, students, responses });
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
  }
});

// ══════════════════════════════════════════════════
// API — جلب التقرير (للإدارة)
// ══════════════════════════════════════════════════
app.get('/api/report', async (req, res) => {
  const report = await db.generateReport();
  res.json(report);
});

// ══════════════════════════════════════════════════
// API — جلب قائمة الطالبات
// ══════════════════════════════════════════════════
app.get('/api/students', async (req, res) => {
  const students = await db.getAllStudents();
  res.json({ count: students.length, students });
});

// ══════════════════════════════════════════════════
// اختبار يدوي — إرسال الاستبيان الآن (للتجربة)
// ══════════════════════════════════════════════════
app.post('/api/test/send-poll', async (req, res) => {
  await bot.sendWeeklyPoll();
  res.json({ success: true, message: 'تم إرسال الاستبيان' });
});

app.post('/api/test/send-reminders', async (req, res) => {
  await bot.sendReminders();
  res.json({ success: true, message: 'تم إرسال التذكيرات' });
});

// ══════════════════════════════════════════════════
// تشغيل السيرفر
// ══════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n🚀 السيرفر يعمل على المنفذ ${PORT}`);
  console.log(`🔗 Webhook URL: http://your-domain.com/webhook\n`);
  scheduler.start();
});
