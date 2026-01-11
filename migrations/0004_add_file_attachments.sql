-- 시공일당과 크레인 관리용 파일 첨부 컬럼 추가
-- contacts 테이블에 idCardFile (주민등록증 사본)과 bankBookFile (통장 사본) 컬럼 추가

-- 주민등록증 사본 파일 정보 (JSON 형식: {url, name, mimeType, size, uploadedAt})
ALTER TABLE contacts ADD COLUMN idCardFile TEXT;

-- 통장 사본 파일 정보 (JSON 형식: {url, name, mimeType, size, uploadedAt})
ALTER TABLE contacts ADD COLUMN bankBookFile TEXT;

-- 기존 데이터에 NULL 값 설정 (이미 자동으로 NULL이지만 명시)
UPDATE contacts SET idCardFile = NULL, bankBookFile = NULL WHERE idCardFile IS NULL;
