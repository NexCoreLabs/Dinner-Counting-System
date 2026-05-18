// src/scheduler.js
// الجدول الزمني الأوتوماتيكي للبوت

const cron = require('node-cron');
const bot  = require('./bot');

// عُمان UTC+4 → نطرح 4 ساعات عشان نحول لـ UTC
// مثال: 10 صباحاً عُمان = 6 صباحاً UTC

function start() {
  console.log('⏰ تشغيل الجدول الزمني...');

  // ── كل أربعاء الساعة 10 صباحاً (عُمان) ──
  // إرسال الاستبيان الأسبوعي
  cron.schedule('0 6 * * 3', async () => {
    console.log('\n🗓️ أربعاء 10ص — إرسال الاستبيان...');
    await bot.sendWeeklyPoll();
  }, { timezone: 'Asia/Muscat' });

  // ── كل أربعاء الساعة 8 مساءً (عُمان) ──
  // تذكير للي ما ردوا
  cron.schedule('0 20 * * 3', async () => {
    console.log('\n⏰ أربعاء 8م — إرسال التذكيرات...');
    await bot.sendReminders();
  }, { timezone: 'Asia/Muscat' });

  // ── كل خميس الساعة 10 صباحاً (عُمان) ──
  // إرسال التقرير النهائي للإدارة
  cron.schedule('0 10 * * 4', async () => {
    console.log('\n📊 خميس 10ص — إرسال التقرير...');
    const ADMIN_PHONE = process.env.ADMIN_PHONE;
    if (ADMIN_PHONE) {
      await bot.sendReportToAdmin(ADMIN_PHONE);
    } else {
      console.warn('⚠️ ADMIN_PHONE غير محدد في .env');
    }
  }, { timezone: 'Asia/Muscat' });

  console.log('✅ الجدول الزمني يعمل:');
  console.log('   📤 أربعاء 10ص  — إرسال الاستبيان');
  console.log('   ⏰ أربعاء 8م   — تذكير للي ما ردوا');
  console.log('   📊 خميس  10ص  — تقرير للإدارة');
}

module.exports = { start };
