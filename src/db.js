// src/db.js
// قاعدة البيانات — Supabase

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role key عشان يتجاوز RLS
);

// ── الأسبوع الحالي ────────────────────────────────
function getWeekKey() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week  = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ══════════════════════════════════════════════════
// الطالبات
// ══════════════════════════════════════════════════

async function getAllStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('full_name');

  if (error) throw error;
  return data;
}

async function addStudent({ fullName, studentId, phone, block, roomNum }) {
  const { error } = await supabase
    .from('students')
    .insert({
      full_name:   fullName,
      student_id:  studentId,
      email:       `s${studentId}@student.squ.edu.om`,
      phone:       phone,
      block:       block,
      room_number: roomNum
    });

  if (error) {
    // رقم جامعي مكرر
    if (error.code === '23505') {
      return { success: false, message: 'الرقم الجامعي أو الجوال مسجل مسبقاً' };
    }
    throw error;
  }
  return { success: true };
}

// ══════════════════════════════════════════════════
// الردود
// ══════════════════════════════════════════════════

async function saveResponse(phone, answer) {
  const week = getWeekKey();

  // upsert — يحدّث إذا موجود، يضيف إذا ما موجود
  const { error } = await supabase
    .from('responses')
    .upsert({ phone, week_key: week, answer, answered_at: new Date() },
             { onConflict: 'phone,week_key' });

  if (error) throw error;
}

async function getResponsesForWeek(week = getWeekKey()) {
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('week_key', week);

  if (error) throw error;
  return data;
}

async function getNoResponders() {
  const week      = getWeekKey();
  const students  = await getAllStudents();
  const responses = await getResponsesForWeek(week);
  const responded = new Set(responses.map(r => r.phone));
  return students.filter(s => !responded.has(s.phone));
}

// ══════════════════════════════════════════════════
// التقرير
// ══════════════════════════════════════════════════

async function generateReport() {
  const week      = getWeekKey();
  const students  = await getAllStudents();
  const responses = await getResponsesForWeek(week);

  const attending    = responses.filter(r => r.answer === 'yes');
  const notAttending = responses.filter(r => r.answer === 'no');
  const noResponse   = students.filter(
    s => !responses.find(r => r.phone === s.phone)
  );

  return {
    week,
    total:          students.length,
    attending:      attending.length,
    notAttending:   notAttending.length,
    noResponse:     noResponse.length,
    estimatedMeals: attending.length + noResponse.length,
  };
}

module.exports = {
  getAllStudents,
  addStudent,
  saveResponse,
  getResponsesForWeek,
  getNoResponders,
  generateReport,
  getWeekKey
};
