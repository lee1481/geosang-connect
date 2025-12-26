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
  staffList: Staff[];
}
