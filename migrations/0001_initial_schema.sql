-- 거래처 및 조직도 테이블 (contacts)
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  companyName TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT NOT NULL,
  department TEXT,
  position TEXT,
  industry TEXT,
  businessType TEXT,
  features TEXT,
  region TEXT,
  franchiseBrand TEXT,
  storeName TEXT,
  storeAddress TEXT,
  contractDate TEXT,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 승인된 사용자 테이블 (authorized_users)
CREATE TABLE IF NOT EXISTS authorized_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인건비 청구 테이블 (labor_claims)
CREATE TABLE IF NOT EXISTS labor_claims (
  id TEXT PRIMARY KEY,
  workerId TEXT NOT NULL,
  workerName TEXT NOT NULL,
  projectName TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  days INTEGER NOT NULL,
  dailyRate INTEGER NOT NULL,
  totalAmount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  approvedBy TEXT,
  approvedAt TEXT,
  paidAt TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workerId) REFERENCES contacts(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_department ON contacts(department);
CREATE INDEX IF NOT EXISTS idx_contacts_region ON contacts(region);
CREATE INDEX IF NOT EXISTS idx_authorized_users_username ON authorized_users(username);
CREATE INDEX IF NOT EXISTS idx_labor_claims_workerId ON labor_claims(workerId);
CREATE INDEX IF NOT EXISTS idx_labor_claims_status ON labor_claims(status);
CREATE INDEX IF NOT EXISTS idx_labor_claims_startDate ON labor_claims(startDate);

-- 기본 관리자 계정 삽입
INSERT OR IGNORE INTO authorized_users (id, name, username, password)
VALUES ('admin', '마스터 관리자', 'admin', 'geosang777');
