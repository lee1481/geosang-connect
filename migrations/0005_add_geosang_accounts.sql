-- 거상 계정 등록 테이블 생성
CREATE TABLE IF NOT EXISTS geosang_accounts (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  email TEXT,
  address TEXT,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_geosang_accounts_company ON geosang_accounts(company_name);
CREATE INDEX IF NOT EXISTS idx_geosang_accounts_username ON geosang_accounts(username);
