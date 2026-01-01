-- 기존 contacts 테이블 백업
CREATE TABLE IF NOT EXISTS contacts_backup AS SELECT * FROM contacts;

-- 기존 contacts 테이블 삭제
DROP TABLE IF EXISTS contacts;

-- 새로운 스키마로 contacts 테이블 재생성
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  brandName TEXT,
  subCategory TEXT,
  industry TEXT,
  address TEXT,
  phone TEXT,
  phone2 TEXT,
  email TEXT,
  homepage TEXT,
  bankAccount TEXT,
  licenseFile TEXT,
  staffList TEXT,      -- JSON 배열 저장
  attachments TEXT,    -- JSON 배열 저장
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
CREATE INDEX IF NOT EXISTS idx_contacts_brandName ON contacts(brandName);
CREATE INDEX IF NOT EXISTS idx_contacts_subCategory ON contacts(subCategory);
CREATE INDEX IF NOT EXISTS idx_contacts_industry ON contacts(industry);

-- 기존 데이터가 있다면 변환하여 복원 (staffList를 JSON 배열로 변환)
-- 이 마이그레이션 후에는 기존 데이터가 손실되므로, 새로 입력해야 합니다.
-- 필요시 백업 데이터를 수동으로 변환하여 복원할 수 있습니다.
