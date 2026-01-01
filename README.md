# 거상커넥트 (Geosang Connect)

**프랜차이즈 및 자영업자 대상 통합 비즈니스 네트워크 관리 시스템**

## 📋 프로젝트 개요

거상커넥트는 간판 제작 전문가를 위한 통합 비즈니스 관리 플랫폼입니다.
- 조직 인원 관리
- 외주팀 관리  
- 거래처 관리 (매입/매출)
- 프랜차이즈 네트워크 관리

## 🏗️ 기술 스택

### Frontend
- **React 18** + TypeScript
- **TailwindCSS** - 스타일링
- **Lucide React** - 아이콘
- **Vite** - 빌드 도구

### Backend
- **Hono** - Edge framework
- **Cloudflare D1** - SQLite 데이터베이스
- **Cloudflare Pages** - 서버리스 배포

## 🗄️ 데이터베이스 구조

### 주요 테이블
- `auth_users` - 사용자 인증
- `contacts` - 연락처 정보
- `staff` - 직원 정보
- `departments` - 부서 설정
- `industries` - 업종 설정
- `outsource_types` - 외주 타입 설정

## 🚀 로컬 개발

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
# .env 파일 생성
cp .env.example .env

# .env 파일을 열어서 API 키 설정
# VITE_GEMINI_API_KEY=your-actual-api-key-here
```

**⚠️ 중요**: Gemini API 키는 [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급받을 수 있습니다.

### 3. D1 데이터베이스 설정
```bash
# 로컬 D1 마이그레이션
npm run db:migrate:local
```

### 4. 개발 서버 실행
```bash
# Worker 빌드
npm run build:worker

# 클라이언트 개발 서버 (별도 터미널)
npm run dev:client

# Worker 개발 서버 (별도 터미널)  
npm run dev:worker
```

## 📦 프로덕션 배포

### 1. D1 데이터베이스 생성
```bash
npm run db:create
# 출력된 database_id를 wrangler.jsonc에 업데이트
```

### 2. 프로덕션 마이그레이션
```bash
npm run db:migrate:prod
```

### 3. 배포
```bash
npm run deploy
```

## 🔐 초기 로그인 정보

- **아이디**: admin
- **비밀번호**: geosang777

## 📁 프로젝트 구조

```
webapp/
├── src/
│   ├── worker/          # Hono API 백엔드
│   │   ├── index.ts    # API 라우트
│   │   └── types.ts    # 타입 정의
│   ├── App.tsx         # React 메인 앱
│   ├── api.ts          # API 클라이언트
│   ├── types.ts        # Frontend 타입
│   └── main.tsx        # React 엔트리
├── migrations/         # D1 마이그레이션
├── dist/
│   ├── worker/        # 빌드된 Worker
│   └── public/        # 빌드된 클라이언트
├── vite.config.ts
├── wrangler.jsonc
└── package.json
```

## ✨ 주요 기능

### ✅ 인증 시스템
- 로그인/로그아웃
- 다중 사용자 관리
- 관리자 권한 제어

### ✅ 연락처 관리
- 8개 카테고리 분류
- 직원 정보 관리
- 검색 및 필터링
- CRUD 작업

### ✅ 파일 업로드 & OCR 자동 분석
- **📊 엑셀 파일 지원**: XLSX, XLS, CSV 자동 파싱
- **📄 PDF 파일 지원**: PDF 메타데이터 추출
- **📸 이미지 OCR**: JPG, PNG, WEBP 텍스트 자동 추출 (Gemini 2.0)
- **🤖 자동 문서 분류**: 견적서, 발주서, 거래명세서, 영수증, 시안 자동 감지
- **💾 AI 드라이브 자동 저장**: `/거상워크플로우/{브랜드명_지점명}/{문서타입}/` 구조로 자동 저장
- **📋 지점명 정규화**: 센텀점, 부산센텀점, 센텀 → 모두 같은 폴더로 통합

### 지원 파일 형식
| 파일 타입 | 확장자 | 처리 방식 |
|----------|--------|----------|
| 엑셀 | `.xlsx`, `.xls`, `.csv` | 데이터 파싱 + 자동 분류 |
| PDF | `.pdf` | 메타데이터 추출 + 파일명 분류 |
| 이미지 | `.jpg`, `.png`, `.webp` | Gemini OCR + 자동 분류 |

### 문서 타입 자동 분류
- **견적서**: 파일명에 '견적', 'quote' 포함 또는 OCR 자동 감지
- **발주서**: 파일명에 '발주', 'order' 포함
- **거래명세서**: 파일명에 '거래', '명세', 'invoice' 포함
- **영수증/배송비**: 파일명에 '영수증', '배송', '퀵', 'receipt' 포함
- **디자인 시안**: 파일명에 '시안', '디자인', 'design' 포함

### ✅ 설정 관리
- 부서 커스터마이징
- 업종 커스터마이징
- 외주 타입 커스터마이징

## 🛠️ 유지보수

### 데이터베이스 콘솔
```bash
# 로컬
npm run db:console:local -- "SELECT * FROM contacts"

# 프로덕션
npm run db:console:prod -- "SELECT * FROM contacts"
```

## 📝 라이선스

Private - 거상컴퍼니 전용

---

**개발자**: AI Assistant
**업데이트**: 2025-12-26
