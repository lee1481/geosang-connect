-- 인건비 청구 테이블 스키마 업데이트
-- 기존 컬럼과 새로운 필드 구조에 맞게 변경

-- 1. 기존 테이블 백업
CREATE TABLE IF NOT EXISTS labor_claims_backup AS SELECT * FROM labor_claims;

-- 2. 기존 테이블 삭제
DROP TABLE IF EXISTS labor_claims;

-- 3. 새로운 스키마로 테이블 재생성
CREATE TABLE labor_claims (
  id TEXT PRIMARY KEY,
  workerId TEXT,
  workerName TEXT,
  workerPhone TEXT,
  date TEXT,
  sites TEXT,
  totalAmount REAL,
  breakdown TEXT,
  status TEXT DEFAULT 'pending',
  memo TEXT,
  approvedBy TEXT,
  approvedAt TEXT,
  paidAt TEXT,
  createdAt TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_labor_claims_workerId ON labor_claims(workerId);
CREATE INDEX IF NOT EXISTS idx_labor_claims_status ON labor_claims(status);
CREATE INDEX IF NOT EXISTS idx_labor_claims_date ON labor_claims(date);
