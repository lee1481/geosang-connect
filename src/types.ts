export enum CategoryType {
  GEOSANG = 'GEOSANG',
  OUTSOURCE = 'OUTSOURCE',
  PURCHASE = 'PURCHASE',
  FRANCHISE_HQ = 'FRANCHISE_HQ',
  FRANCHISE_BR = 'FRANCHISE_BR',
  INTERIOR = 'INTERIOR',
  SALES = 'SALES',
  OTHERS = 'OTHERS'
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
}

export interface Staff {
  id: string;
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  department?: string;
  rating?: number;
  region?: string;
  bankAccount?: string;
  residentNumber?: string;
  features?: string;
}

export interface Contact {
  id: string;
  category: CategoryType;
  brandName?: string;
  industry?: string;
  subCategory?: string;
  address?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  homepage?: string;
  bankAccount?: string;
  licenseFile?: {
    data: string;
    name: string;
    mimeType: string;
  };
  attachments?: {
    data: string;
    name: string;
    mimeType: string;
    size: number;
  }[];
  staffList: Staff[];
}

// 작업 현장
export interface WorkSite {
  id: string;
  siteName: string;            // 현장명 (예: 컴포즈커피 인천점)
  hours: number;               // 작업 시간
  allocatedAmount?: number;    // 배분된 금액 (시간 비율로 자동 계산)
}

// 청구 금액 세부 내역
export interface ClaimBreakdown {
  basePay: number;             // 기본일비
  overtimeHours: number;       // 연장 시간
  overtimePay: number;         // 연장비
  transportFee: number;        // 차대비
  mealFee: number;             // 식비
  fuelFee: number;             // 주유비
  tollFee: number;             // 톨비
  otherFee: number;            // 기타 비용
  otherFeeDesc?: string;       // 기타 비용 설명
}

// 인건비 청구 내역
export interface LaborClaim {
  id: string;
  workerId: string;            // 외주 인력 ID (Staff.id)
  workerName: string;           // 이름
  workerPhone?: string;         // 연락처
  date: string;                 // 작업일 (YYYY-MM-DD)
  sites: WorkSite[];            // 작업 현장 목록 (다중 현장)
  breakdown: ClaimBreakdown;    // 청구 금액 세부 내역
  totalAmount: number;          // 총 청구 금액
  receiptImages?: {             // 영수증 사진들
    data: string;
    name: string;
    mimeType: string;
  }[];
  status: 'pending' | 'approved' | 'paid';  // 청구 상태
  approvedBy?: string;          // 승인자
  approvedAt?: string;          // 승인일시
  paidAt?: string;              // 지급일시
  memo?: string;                // 메모
  createdAt: string;            // 등록일시
  rawText?: string;             // 원본 텍스트 (문자 입력용)
}
