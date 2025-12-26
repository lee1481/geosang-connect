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

// 인건비 청구 내역
export interface LaborClaim {
  id: string;
  workerId: string;           // 외주 인력 ID (Staff.id)
  workerName: string;          // 이름
  workerPhone?: string;        // 연락처
  date: string;                // 작업일 (YYYY-MM-DD)
  location: string;            // 작업 장소
  workDescription: string;     // 작업 내용
  hours?: number;              // 작업 시간
  amount: number;              // 청구 금액
  receiptImage?: {             // 내역서 사진
    data: string;
    name: string;
    mimeType: string;
  };
  status: 'pending' | 'approved' | 'paid';  // 청구 상태
  approvedBy?: string;         // 승인자
  approvedAt?: string;         // 승인일시
  paidAt?: string;             // 지급일시
  memo?: string;               // 메모
  createdAt: string;           // 등록일시
  rawText?: string;            // 원본 텍스트 (문자 입력용)
}
