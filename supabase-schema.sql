-- ================================================
-- شغّل هذا الـ SQL في Supabase > SQL Editor
-- ================================================

-- جدول الطالبات
CREATE TABLE students (
  id           SERIAL PRIMARY KEY,
  full_name    TEXT NOT NULL,
  student_id   TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  phone        TEXT UNIQUE NOT NULL,
  block        TEXT NOT NULL,
  room_number  TEXT NOT NULL,
  registered_at TIMESTAMP DEFAULT NOW()
);

-- جدول الردود الأسبوعية
CREATE TABLE responses (
  id          SERIAL PRIMARY KEY,
  phone       TEXT NOT NULL,
  week_key    TEXT NOT NULL,         -- مثال: 2025-W10
  answer      TEXT NOT NULL,         -- 'yes' أو 'no'
  answered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(phone, week_key)            -- رد واحد لكل طالبة في كل أسبوع
);

-- ================================================
-- حماية البيانات (Row Level Security)
-- ================================================
ALTER TABLE students  ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- السيرفر (service_role) يقدر يقرأ ويكتب كل شي
CREATE POLICY "service full access students"
  ON students FOR ALL USING (true);

CREATE POLICY "service full access responses"
  ON responses FOR ALL USING (true);
