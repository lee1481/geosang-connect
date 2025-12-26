-- 인증 사용자 테이블
CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 초기 관리자 계정 (비밀번호: geosang777)
INSERT INTO auth_users (id, name, username, password_hash) 
VALUES ('admin', '마스터 관리자', 'admin', '$2a$10$rHNVEYKZQq1nqJ7wXGJ8qeZFxKxJK7b8N3i6Jq0j5YnQj1jQj2jQj');

-- 연락처 테이블
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  brand_name TEXT,
  industry TEXT,
  sub_category TEXT,
  address TEXT,
  phone TEXT,
  phone2 TEXT,
  email TEXT,
  homepage TEXT,
  bank_account TEXT,
  license_file_data TEXT,
  license_file_name TEXT,
  license_file_mime_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 직원 테이블
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  phone TEXT,
  email TEXT,
  department TEXT,
  rating INTEGER DEFAULT 5,
  region TEXT,
  bank_account TEXT,
  resident_number TEXT,
  features TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- 부서 설정
CREATE TABLE IF NOT EXISTS departments (
  name TEXT PRIMARY KEY
);

INSERT INTO departments (name) VALUES 
  ('총무팀'), ('관리팀'), ('디자인팀'), ('시공팀'), 
  ('감리팀'), ('영업팀'), ('제작팀'), ('마케팅팀');

-- 업종 설정
CREATE TABLE IF NOT EXISTS industries (
  name TEXT PRIMARY KEY
);

INSERT INTO industries (name) VALUES 
  ('프랜차이즈'), ('기업'), ('요식업'), ('공장'), ('부동산/건설'), 
  ('미용/헬스'), ('병원/약국'), ('학원'), ('교육업'), ('인테리어');

-- 외주 타입 설정
CREATE TABLE IF NOT EXISTS outsource_types (
  name TEXT PRIMARY KEY
);

INSERT INTO outsource_types (name) VALUES 
  ('시공일당'), ('크레인');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
CREATE INDEX IF NOT EXISTS idx_staff_contact_id ON staff(contact_id);
