# 거상커넥트 (Geosang Connect)

**프랜차이즈 및 자영업자 대상 통합 비즈니스 네트워크 관리 시스템**

## 📋 프로젝트 개요

거상커넥트는 간판 제작 전문가를 위한 통합 비즈니스 관리 플랫폼입니다.
- 조직 인원 관리
- 외주팀 관리  
- 거래처 관리 (매입/매출)
- 프랜차이즈 네트워크 관리

## 🌐 웹앱 접속

**👉 [거상커넥트 프로덕션](https://gs-connect.pages.dev)**

- **프로덕션 URL**: https://gs-connect.pages.dev
- **GitHub 저장소**: https://github.com/lee1481/geosang-connect
- **GitHub Actions**: https://github.com/lee1481/geosang-connect/actions
- **Cloudflare 계정**: Designsoul2007@gmail.com
- **프로젝트명**: gs-connect

## 🔐 관리자 로그인 정보

- **아이디**: gsd2026
- **비밀번호**: gsd1481

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

## ✨ 주요 기능

### ✅ 인증 시스템
- 로그인/로그아웃
- 다중 사용자 관리
- 관리자 권한 제어

### ✅ 8개 카테고리 연락처 관리
1. **거상 조직도** - 내부 직원 관리
2. **외주팀 관리** - 외주 협력업체 관리
3. **💰 인건비 청구** - 외주 인건비 정산 (**✨ 상태 변경 DB 저장 완료**)
4. **매입 거래처** - 자재/서비스 공급업체
5. **프랜차이즈 본사** - 프랜차이즈 본사 정보
6. **프랜차이즈 지점** - 가맹점 네트워크
7. **인테리어** - 인테리어 업체
8. **요식업(개인)** - 개인 요식업 고객
9. **기타 거래처** - 기타 비즈니스 파트너

### ✅ 인건비 청구 관리 (최근 수정)
- **승인/지급완료 버튼**: 상태 변경 시 D1 데이터베이스에 자동 저장
- **상태 영구 보존**: 페이지 새로고침 후에도 상태 유지
- **승인자 기록**: 승인 시 승인자와 승인 시간 자동 기록
- **지급일 기록**: 지급완료 시 지급 시간 자동 기록
- **낙관적 UI 업데이트**: 즉각적인 화면 반영 + 백엔드 DB 저장

### ✅ UI 개선 (2024-01-21)
- **카드 메뉴 간소화**: 사업자등록증 다운로드 버튼 제거 (중복 기능 정리)
- **깔끔한 인터페이스**: 필수 버튼(수정/삭제)만 유지하여 UI 혼잡도 감소
- **첨부파일 관리**: 첨부파일 다운로드는 hover 메뉴를 통해 접근 가능
- **권한 개선**: 일반회원도 수정 버튼 사용 가능 (삭제는 관리자 전용 유지)

### ✅ 스마트 정보 입력
- **📸 명함 업로드**: 명함 사진을 업로드하면 자동으로 정보 추출
- **📄 사업자등록증 업로드**: 사업자등록증 OCR로 회사 정보 자동 입력
- **🤖 Gemini AI OCR**: 최신 AI 기술로 정확한 텍스트 추출
- **📎 회사 사업자등록증 관리**: 
  - 회사별 사업자등록증 업로드
  - 실시간 미리보기 기능
  - 다운로드 및 재업로드 지원
  - 이미지/PDF 파일 지원 (최대 10MB)
  - Base64 인코딩하여 DB 저장

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

### 4. 개발 서버 실행 (샌드박스 환경)
```bash
# 빌드
npm run build

# PM2로 서버 시작
pm2 start ecosystem.config.cjs

# 서버 테스트
curl http://localhost:3000
```

### 5. 로컬 머신 개발
```bash
# 클라이언트 개발 서버
npm run dev

# 별도 터미널에서 Worker 개발 서버  
npm run dev:worker
```

## 📦 프로덕션 배포

### 🚀 자동 배포 (GitHub Actions)

**main 브랜치에 push하면 자동으로 Cloudflare Pages에 배포됩니다!**

#### GitHub Secrets 설정 (최초 1회만)

1. **GitHub 저장소 접속**: https://github.com/lee1481/geosang-connect
2. **Settings** → **Secrets and variables** → **Actions** 클릭
3. **New repository secret** 클릭하여 다음 2개 추가:

| Secret 이름 | 값 | 설명 |
|-------------|-----|------|
| `CLOUDFLARE_API_TOKEN` | (Cloudflare API 토큰) | [토큰 생성하기](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | `cf68fabab0b28a441384bf980965f412` | Cloudflare 계정 ID |

#### Cloudflare API 토큰 생성 방법

1. https://dash.cloudflare.com/profile/api-tokens 접속
2. **Create Token** 클릭
3. **"Edit Cloudflare Workers"** 템플릿 선택
4. **권한 추가**:
   - ✅ Account → Cloudflare Pages → Edit
   - ✅ Account → D1 → Edit
   - ✅ Account → R2 → Edit
   - ✅ Account → Account Settings → Read
   - ✅ Account → Membership → Read
   - ✅ User → User Details → Read
5. **Account Resources**: Include - All accounts
6. **Create Token** → 생성된 토큰 복사
7. GitHub Secrets에 `CLOUDFLARE_API_TOKEN`으로 저장

#### 자동 배포 워크플로우

```bash
# 코드 수정 후
git add .
git commit -m "feat: 새 기능 추가"
git push origin main

# ⬇️ 자동으로 실행됩니다:
# 1. GitHub Actions 트리거
# 2. Node.js 환경 설정
# 3. 의존성 설치
# 4. 프로젝트 빌드
# 5. Cloudflare Pages 배포
# 6. 배포 완료! ✅
```

#### 배포 상태 확인

- **GitHub Actions**: https://github.com/lee1481/geosang-connect/actions
- 각 커밋마다 자동으로 배포 워크플로우가 실행됩니다
- 배포 성공 시 ✅ 체크 표시
- 배포 실패 시 ❌ 에러 표시 및 로그 확인 가능

---

### 🔧 수동 배포 (필요시)

#### 1. D1 데이터베이스 생성
```bash
# 프로덕션 데이터베이스 생성
npx wrangler d1 create webapp-production

# 출력된 database_id를 wrangler.jsonc에 업데이트
```

#### 2. 프로덕션 마이그레이션
```bash
npm run db:migrate:prod
```

#### 3. Cloudflare Pages 배포
```bash
# 빌드 및 배포
npm run deploy

# 또는 수동 배포
npm run build
npx wrangler pages deploy dist/public --project-name gs-connect
```

## 📁 프로젝트 구조

```
webapp/
├── src/
│   ├── App.tsx              # React 메인 앱
│   ├── api.ts               # API 클라이언트
│   ├── types.ts             # Frontend 타입
│   ├── main.tsx             # React 엔트리
│   └── geminiService.ts     # Gemini OCR 서비스
├── functions/
│   └── [[path]].ts          # Cloudflare Pages 함수 (Hono 백엔드)
├── migrations/              # D1 마이그레이션
│   └── 0001_*.sql          # 데이터베이스 스키마
├── public/                  # 정적 파일
├── dist/
│   └── public/             # 빌드된 파일
│       ├── _worker.js      # 빌드된 Worker
│       └── assets/         # 빌드된 클라이언트 에셋
├── ecosystem.config.cjs     # PM2 설정 (샌드박스용)
├── vite.config.ts          # Vite 설정
├── wrangler.jsonc          # Cloudflare 설정
├── package.json            # 의존성 및 스크립트
└── README.md               # 프로젝트 문서
```

## 🛠️ 유용한 명령어

### 개발
```bash
npm run dev              # 로컬 개발 서버 (클라이언트만)
npm run build            # 프로덕션 빌드
npm run preview          # 빌드 미리보기
```

### 데이터베이스
```bash
npm run db:migrate:local       # 로컬 마이그레이션
npm run db:migrate:prod        # 프로덕션 마이그레이션
npm run db:console:local       # 로컬 DB 콘솔
npm run db:console:prod        # 프로덕션 DB 콘솔
npm run db:seed                # 테스트 데이터 추가
npm run db:reset               # 로컬 DB 초기화
```

### 배포
```bash
npm run deploy           # Cloudflare Pages 배포
npm run deploy:prod      # 명시적 프로덕션 배포
```

### Git
```bash
npm run git:init         # Git 저장소 초기화
npm run git:status       # Git 상태 확인
npm run git:log          # Git 로그 확인
npm run git:commit       # 커밋 (메시지 추가 필요)
```

### PM2 (샌드박스 환경)
```bash
pm2 list                 # 실행 중인 프로세스 목록
pm2 logs webapp --nostream   # 로그 확인
pm2 restart webapp       # 재시작
pm2 delete webapp        # 프로세스 삭제
```

## 🔧 최근 수정 사항

### 2026-01-13 (최신) - GitHub Actions 자동 배포 시스템 구축 🚀

#### ✅ CI/CD 자동화 완료
- **GitHub Actions 워크플로우 구축**
  - main 브랜치 push 시 자동 배포
  - 빌드 → 테스트 → Cloudflare Pages 배포 자동화
  - 배포 상태 실시간 확인 가능
  
- **배포 프로세스**
  1. 코드 수정 및 커밋
  2. GitHub에 push
  3. GitHub Actions 자동 실행
  4. 의존성 설치 (npm ci)
  5. 프로젝트 빌드 (npm run build)
  6. Cloudflare Pages 배포
  7. 배포 완료 (약 1-2분 소요)

- **GitHub Secrets 설정**
  - `CLOUDFLARE_API_TOKEN`: Cloudflare API 인증
  - `CLOUDFLARE_ACCOUNT_ID`: 계정 ID
  
- **배포 확인**
  - GitHub Actions: https://github.com/lee1481/geosang-connect/actions
  - 각 커밋마다 워크플로우 실행 결과 확인 가능

#### ✅ 좌측 네비게이션 메뉴 버그 수정
- **문제**: 여러 메뉴가 동시에 활성화되는 현상
- **원인**: "거상 계정 등록" 메뉴 클릭 시 `activeCategory` 초기화 누락
- **해결**: `setActiveCategory(null)` 추가하여 메뉴 상태 완전 초기화
- **결과**: ✅ 한 번에 하나의 메뉴만 활성화

#### ✅ 거상 계정 등록 기능 추가
- **새 메뉴**: "거상 계정 등록" (🔑 아이콘)
- **위치**: 매입 거래처 아래
- **기능**:
  - 회사명 (필수)
  - 계정목록(예)홈페이지 (선택)
  - 아이디 (필수)
  - 비밀번호 (필수)
  - 메모 (선택)
- **데이터 저장**: localStorage (`geosang_accounts_v1`)
- **DB 테이블**: `geosang_accounts` (마이그레이션 0005)

#### ✅ 관리자 계정 정보 업데이트
- **아이디**: gsd2026
- **비밀번호**: gsd1481
- **변경 일시**: 2026-01-13

### 2026-01-11 - 독립 프로젝트로 재배포 완료

#### ✅ 새 Cloudflare Pages 프로젝트 생성 및 배포
- **새 프로젝트명**: gs-connect
- **메인 URL**: https://gs-connect.pages.dev
- **배포 일시**: 2026-01-11
- **변경 사유**: 
  - 기존 webapp-6m6.pages.dev가 거상시공일정표(gs-mytools)와 중복
  - 독립적인 프로젝트 분리 필요
  - gs-connect로 새 프로젝트 생성 및 재배포

#### ✅ 배포 내역
- ✅ 외주팀 관리 파일 첨부 기능 (주민등록증, 통장 사본)
- ✅ DB 마이그레이션 (idCardFile, bankBookFile 컬럼)
- ✅ Worker 번들 컴파일 완료
- ✅ GitHub 동기화 완료

#### ✅ 배포 설정
- Account ID: cf68fabab0b28a441384bf980965f412
- Project Name: gs-connect
- Build Output: dist/public
- Production Branch: main

### 2026-01-11 - 외주팀 관리 파일 첨부 기능 추가

#### ✅ 시공일당/크레인 등록 시 서류 첨부 기능
- **신규 기능**:
  - ✅ **주민등록증 사본 업로드** - 파란색 테마 UI
  - ✅ **통장 사본 업로드** - 초록색 테마 UI
  - ✅ 파일 선택/재선택 기능
  - ✅ 파일 삭제 기능
  - ✅ 파일 다운로드 기능
  - ✅ 실시간 파일 정보 표시 (이름, 크기)
  - ✅ 이미지/PDF 파일 지원 (최대 10MB)
  - ✅ Base64 인코딩하여 DB 저장

- **기술 구현**:
  - DB 마이그레이션: `contacts` 테이블에 `idCardFile`, `bankBookFile` 컬럼 추가
  - TypeScript 타입: `Staff` 인터페이스에 파일 필드 추가
  - UI 위치: 외주팀 관리 폼 → 비고 필드 아래

- **사용 방법**:
  1. 외주팀 관리 → 거래처 추가
  2. 구분 선택 (시공일당/크레인)
  3. 기본 정보 입력
  4. **주민등록증 사본** 파란색 버튼으로 업로드
  5. **통장 사본** 초록색 버튼으로 업로드
  6. 저장

- **수정된 파일**:
  - `migrations/0004_add_file_attachments.sql` - DB 스키마 추가
  - `src/types.ts` - Staff 인터페이스 업데이트
  - `src/App.tsx` - 외주팀 폼 UI 추가

### 2026-01-11 - 회사 사업자등록증 관리 기능 최적화

#### ✅ 직원별 사업자등록증 기능 제거 및 회사 사업자등록증으로 통합
- **변경 사유**: 
  - 직원별 사업자등록증은 실제 업무에서 불필요
  - 회사(법인) 단위 사업자등록증만 필요
  - UI/UX 단순화 및 성능 최적화
  
- **제거된 기능**:
  - ❌ 직원 카드 내부의 사업자등록증 입력란
  - ❌ R2 Storage 직원별 파일 업로드 로직
  - ❌ Staff 인터페이스의 businessLicense 관련 필드

- **유지/추가된 기능**:
  - ✅ **회사 등록 모달**: 회사 사업자등록증 업로드 (CompanyModal)
  - ✅ **거상 인원 등록 모달**: 회사 정보 섹션에 사업자등록증 추가 (ContactFormModal)
  - ✅ 실시간 미리보기 (이미지)
  - ✅ 다운로드 기능
  - ✅ 파일 삭제 및 재선택
  - ✅ Base64 인코딩하여 DB 저장 (R2 Storage 불필요)

- **수정된 파일**:
  - `src/types.ts`: Staff 인터페이스에서 사업자등록증 필드 제거 (3개 필드)
  - `src/App.tsx`: 직원 카드 UI에서 사업자등록증 입력란 제거, contactsAPI.uploadStaffBusinessLicenses() 함수 제거
  - `src/App.tsx`: ContactFormModal 회사 정보 섹션에 사업자등록증 업로드 추가

- **최종 구조**:
  ```
  ✅ CompanyModal (회사 등록) → 회사 사업자등록증
  ✅ ContactFormModal (인원 추가) → 회사 정보 섹션 → 회사 사업자등록증
  ❌ 직원 카드 → 사업자등록증 제거됨
  ```

### 2026-01-11 - 권한 관리 모달 한글 입력 문제 해결

#### ✅ 문제 해결: 권한 관리 모달 한글 입력 버그 수정
- **문제 1**: 한글 입력 시 자음(ㅇ, ㅁ, ㄱ 등)만 입력하면 커서가 사라지는 현상
- **문제 2**: 입력한 글씨가 갑자기 사라지는 현상
- **원인**: 
  - React 제어 컴포넌트의 state 업데이트가 한글 IME 조합과 충돌
  - App 컴포넌트 내부에 정의된 AdminModal이 부모 리렌더링 시 재생성되며 입력값 초기화
- **해결책**:
  1. **비제어 컴포넌트로 전환**: `value` + `onChange` → `useRef` 방식
  2. **컴포넌트 외부 분리**: AdminModal을 App 외부로 이동
  3. **React.memo 적용**: 불필요한 리렌더링 방지
- **결과**: 
  - ✅ 한글 자음/모음 입력 시 커서 정상 유지
  - ✅ 입력 중 다른 작업 수행해도 텍스트 유지
  - ✅ 연속 입력 가능

### 2026-01-10 - UI/UX 개선

#### ✅ 슬라이드 네비게이션 바 추가
- **기능**: 거상 인원 등록 및 회사 등록 모달에 우측 슬라이드 네비게이션 바 추가
- **위치**: 화면 우측에서 560px (화면 중앙 근처)
- **기능**:
  - 회색 반투명 트랙 (300px 높이)
  - 파란색 드래그 가능한 썸 (60px) - 정밀한 스크롤 제어
  - "↑ 맨 위로" 버튼 - 클릭 시 모달 최상단으로 이동
  - "↓ 맨 아래로" 버튼 - 클릭 시 모달 최하단으로 이동
- **장점**: 
  - 직원이 많을 때 중간 정보도 쉽게 확인 가능
  - 드래그로 정밀한 위치 제어
  - 현재 스크롤 위치를 시각적으로 표시

#### ✅ 프랜차이즈 본사 입력 오류 해결
- **문제**: 프랜차이즈 본사 정보 등록 시 입력창에 글씨 입력이 안 되는 현상
- **원인**: "회사 정보를 최초 1회 입력하세요" 기능과 입력창 잠김 로직 충돌
- **해결**: 프랜차이즈 본사의 모든 입력 제약 제거
- **결과**: 프랜차이즈 본사에서 자유롭게 정보 입력 가능

### 수정된 파일
- `src/App.tsx` - 권한 관리 모달 컴포넌트 구조 개선 (2026-01-11)
- `src/App.tsx` - 프랜차이즈 본사 입력 로직 수정 및 슬라이드 네비게이션 바 추가 (2026-01-10)

## 🐛 트러블슈팅

### 입력창에 글씨가 입력되지 않을 때
- 브라우저 캐시 삭제 (Ctrl + Shift + R)
- 다른 카테고리로 이동 후 다시 시도
- 페이지 새로고침

### 데이터베이스 오류
```bash
# 로컬 DB 초기화
npm run db:reset

# 마이그레이션 재실행
npm run db:migrate:local
```

### 빌드 오류
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📝 버전 정보

**최종 업데이트**: 2026-01-13  
**버전**: 2.0.0  
**배포 환경**: Cloudflare Pages (Production)  
**프로젝트명**: gs-connect  
**배포 URL**: https://gs-connect.pages.dev

---

## 🎯 프로젝트 상태

- ✅ GitHub Actions 자동 배포 시스템 구축
- ✅ 좌측 네비게이션 메뉴 버그 수정
- ✅ 거상 계정 등록 기능 추가
- ✅ 외주팀 파일 첨부 기능 (주민등록증, 통장 사본)
- ✅ 회사 사업자등록증 관리
- ✅ 프랜차이즈 본사 입력 오류 해결
- ✅ 권한 관리 모달 한글 입력 버그 수정
- ✅ 슬라이드 네비게이션 바 추가

---

**개발자**: AI Assistant + 사인마스터  
**라이선스**: Private - 거상컴퍼니 전용
# GitHub Actions Auto-Deployment Test

✅ 이 라인은 자동 배포 테스트를 위해 추가되었습니다.
