import React, { useState, useMemo, useEffect, useRef } from 'react';
import Select from 'react-select';
import { 
  Users, Briefcase, ShoppingBag, Store, Home, 
  Settings, Search, Plus, Trash2, Phone, Mail, 
  MapPin, CreditCard, FileText, Upload, ChevronRight, 
  Building2, HardHat, Coffee, Paintbrush, UtensilsCrossed,
  Layers, Filter, X, Pencil, Globe, ChevronDown, ChevronUp, Check, Lock,
  Wallet, Tag, Loader2, Calendar, DollarSign, Download, BarChart3, TrendingUp, FileSpreadsheet, Star, Key, ShieldCheck, UserPlus, LogOut, User, Menu, Contact2, Shield, Info
} from 'lucide-react';
import { CategoryType, Contact, Staff, ConstructionRecord, LaborClaim, WorkSite, ClaimBreakdown, Project, ProjectDocument, DocumentType } from './types';
import { extractConstructionData, extractBusinessLicenseData, extractBusinessCardData, extractReceiptData, parseLaborClaimText, extractProjectDocument, extractExcelData, extractPDFData } from './geminiService';
import PasswordManager from './PasswordManager';
import * as XLSX from 'xlsx';

interface AuthUser {
  id: string;
  name: string;
  username: string;
  password: string;
}

const DEFAULT_DEPARTMENTS = ['총무팀', '관리팀', '디자인팀', '시공팀', '감리팀', '영업팀', '제작팀', '마케팅팀'];
const DEFAULT_INDUSTRIES = ['프랜차이즈', '기업', '요식업', '공장', '부동산/건설', '미용/헬스', '병원/약국', '학원', '교육업', '인테리어'];
const DEFAULT_OUTSOURCE_TYPES = ['시공일당', '크레인'];

// 거상 조직도 전용 상수
const DEFAULT_GEOSANG_COMPANY_TYPES = ['프랜차이즈', '기업', '요식업', '공장', '병원'];
const DEFAULT_GEOSANG_DEPARTMENTS = ['관리부', '총무부', '디자인팀', '제작팀', '시공팀', '마케팅팀', '영업팀'];

const INITIAL_AUTH_USERS: AuthUser[] = [
  { id: 'admin', name: '마스터 관리자', username: 'admin', password: 'geosang777' }
];

// 🖼️ 이미지 압축 유틸리티
const compressImage = async (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 이미지 리사이징 (maxWidth 기준)
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // WebP 포맷으로 압축 (지원하지 않으면 JPEG)
        const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp') 
          ? 'image/webp' 
          : 'image/jpeg';

        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        reject(new Error('Image load failed'));
      };
    };
    reader.onerror = () => {
      reject(new Error('File read failed'));
    };
  });
};

// 파일을 압축하고 Base64 데이터 반환
const compressAndEncodeFile = async (file: File): Promise<{ data: string; name: string; mimeType: string; originalSize: number; compressedSize: number }> => {
  // PDF는 압축하지 않음
  if (file.type === 'application/pdf') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        resolve({
          data: base64,
          name: file.name,
          mimeType: file.type,
          originalSize: file.size,
          compressedSize: file.size
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // 이미지 압축 (1920px, 80% 품질)
  const compressedDataUrl = await compressImage(file, 1920, 0.8);
  const base64 = compressedDataUrl.split(',')[1];
  const mimeType = compressedDataUrl.split(';')[0].split(':')[1];
  
  // 압축된 크기 계산 (Base64는 실제 크기의 약 75%)
  const compressedSize = Math.ceil(base64.length * 0.75);
  
  return {
    data: base64,
    name: file.name,
    mimeType: mimeType,
    originalSize: file.size,
    compressedSize: compressedSize
  };
};

// 🔧 API 함수
const contactsAPI = {
  async create(contact: Contact) {
    try {
      // 연락처 생성 (파일 데이터 포함)
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      });
      const result = await response.json();
      
      return result;
    } catch (error) {
      console.error('API create error:', error);
      return { success: false, error: String(error) };
    }
  },
  async update(id: string, contact: Contact) {
    try {
      // 연락처 수정 (파일 데이터 포함)
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      });
      return await response.json();
    } catch (error) {
      console.error('API update error:', error);
      return { success: false, error: String(error) };
    }
  },
  async delete(id: string) {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('API delete error:', error);
      return { success: false, error: String(error) };
    }
  },
  async getAll() {
    try {
      const response = await fetch('/api/contacts');
      return await response.json();
    } catch (error) {
      console.error('API getAll error:', error);
      return { success: false, error: String(error) };
    }
  }
};

const laborClaimsAPI = {
  async create(claim: LaborClaim) {
    try {
      const response = await fetch('/api/labor-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claim)
      });
      return await response.json();
    } catch (error) {
      console.error('API create error:', error);
      return { success: false, error: String(error) };
    }
  },
  async update(id: string, claim: LaborClaim) {
    try {
      const response = await fetch(`/api/labor-claims/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claim)
      });
      return await response.json();
    } catch (error) {
      console.error('API update error:', error);
      return { success: false, error: String(error) };
    }
  },
  async delete(id: string) {
    try {
      const response = await fetch(`/api/labor-claims/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('API delete error:', error);
      return { success: false, error: String(error) };
    }
  },
  async getAll() {
    try {
      const response = await fetch('/api/labor-claims');
      return await response.json();
    } catch (error) {
      console.error('API getAll error:', error);
      return { success: false, error: String(error) };
    }
  }
};

// 🔧 지점명 정규화 함수
const normalizeStoreName = (storeName: string): string => {
  // 1. 공백 제거 및 소문자 변환
  let normalized = storeName.trim().toLowerCase();
  
  // 2. 지역명 추출 (예: 부산, 서울, 인천 등)
  const regionPattern = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/;
  const regionMatch = normalized.match(regionPattern);
  const region = regionMatch ? regionMatch[1] : '';
  
  // 3. 점포명 추출 (예: 센텀, 강남, 역삼 등)
  let shopName = normalized
    .replace(regionPattern, '') // 지역명 제거
    .replace(/점$/, '') // 끝의 '점' 제거
    .replace(/지점$/, '') // 끝의 '지점' 제거
    .replace(/매장$/, '') // 끝의 '매장' 제거
    .replace(/점포$/, '') // 끝의 '점포' 제거
    .replace(/\s+/g, '') // 모든 공백 제거
    .trim();
  
  // 4. 정규화된 이름 생성
  if (region && shopName) {
    return `${region}${shopName}점`;
  } else if (shopName) {
    return `${shopName}점`;
  } else {
    return storeName.replace(/\s+/g, '_'); // 실패 시 공백을 _로 변경
  }
};

// 🔧 문서 타입을 폴더명으로 매핑
const getDocumentFolderName = (docType: string): string => {
  const mapping: Record<string, string> = {
    'quotation': '견적서',
    'purchase_order': '발주서',
    'transaction_stmt': '거래명세서',
    'delivery_cost': '영수증',
    'design_proposal': '시안',
    'tax_invoice': '세금계산서',
    'labor_claim': '인건비',
    'other': '기타'
  };
  return mapping[docType] || '기타';
};

// AdminModal 컴포넌트 - App 외부에 정의하여 리렌더링 방지
const AdminModal = React.memo(({ users, onClose, onAdd, onRevoke }: any) => {
  // 비제어 컴포넌트: useRef로 입력값 관리
  const nameInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const pwInputRef = useRef<HTMLInputElement>(null);

  const handleAddClick = () => {
    const name = nameInputRef.current?.value || '';
    const id = idInputRef.current?.value || '';
    const pw = pwInputRef.current?.value || '';
    
    if (name && id && pw) {
      onAdd(name, id, pw);
      // 입력창 초기화
      if (nameInputRef.current) nameInputRef.current.value = '';
      if (idInputRef.current) idInputRef.current.value = '';
      if (pwInputRef.current) pwInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] lg:rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 lg:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div><h2 className="text-xl lg:text-2xl font-black tracking-tight flex items-center gap-3"><ShieldCheck className="text-blue-600" /> 권한 관리</h2></div>
          <button onClick={onClose} className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm"><X size={20}/></button>
        </div>
        <div className="p-6 lg:p-10 flex-1 overflow-y-auto space-y-8 scrollbar-hide">
          <div className="bg-blue-50/50 rounded-2xl lg:rounded-3xl p-5 lg:p-8 border border-blue-100">
            <h3 className="text-[10px] font-black text-blue-600 mb-4 uppercase tracking-widest">신규 계정 발급</h3>
            <div className="grid grid-cols-1 gap-3">
              <input 
                ref={nameInputRef}
                type="text"
                autoComplete="off"
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500" 
                placeholder="이름"
              />
              <div className="grid grid-cols-2 gap-3">
                <input 
                  ref={idInputRef}
                  type="text"
                  autoComplete="off"
                  className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500" 
                  placeholder="아이디"
                />
                <input 
                  ref={pwInputRef}
                  type="password"
                  autoComplete="new-password"
                  className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500" 
                  placeholder="비밀번호"
                />
              </div>
            </div>
            <button onClick={handleAddClick} className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-black text-xs hover:bg-slate-800 transition-all">계정 등록</button>
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">등록된 계정</h3>
            <div className="grid gap-2">
              {users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 font-black text-[8px] text-slate-400 uppercase">User</div>
                    <div>
                      <div className="font-black text-slate-900 text-xs">{user.name}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">ID: {user.username}</div>
                    </div>
                  </div>
                  <button onClick={() => onRevoke(user.id)} className={`p-2 rounded-lg transition-all ${user.id === 'admin' ? 'hidden' : 'text-slate-300 hover:text-red-600 hover:bg-red-50'}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const App: React.FC = () => {
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthUser[]>(() => {
    const saved = localStorage.getItem('geosang_auth_users_v2');
    return saved ? JSON.parse(saved) : INITIAL_AUTH_USERS;
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('geosang_logged_in_user_obj_v2');
    const loginTime = localStorage.getItem('geosang_login_time');
    
    if (saved && loginTime) {
      const now = Date.now();
      const elapsed = now - parseInt(loginTime);
      const thirtyMinutes = 30 * 60 * 1000; // 30분 = 1800000ms
      
      // 30분 초과 시 자동 로그아웃
      if (elapsed > thirtyMinutes) {
        localStorage.removeItem('geosang_logged_in_user_obj_v2');
        localStorage.removeItem('geosang_login_time');
        return null;
      }
      
      return JSON.parse(saved);
    }
    
    return null;
  });
  
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminSettingsModalOpen, setIsAdminSettingsModalOpen] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 관리자 계정 설정 상태
  const [adminSettingsForm, setAdminSettingsForm] = useState({
    currentPassword: '',
    newId: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryType>(CategoryType.GEOSANG);
  
  // 🔍 통합 검색 필터 (모든 카테고리)
  const [generalSearch, setGeneralSearch] = useState(''); // 이름, 연락처 검색
  const [locationSearch, setLocationSearch] = useState(''); // 지역 검색
  const [industryFilter, setIndustryFilter] = useState(''); // 업종 필터
  
  // 🔍 외주팀 전용 검색 필터
  const [outsourceSearch, setOutsourceSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');
  const [outsourceTypeFilter, setOutsourceTypeFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // 거상 조직도 전용 모달 state
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false); // 회사 등록 모달
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false); // 직원 등록 모달
  const [selectedCompany, setSelectedCompany] = useState<Contact | null>(null); // 선택된 회사
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set()); // 확장된 회사 ID들
  
  const [departments, setDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem('geosang_departments_v3');
    return saved ? JSON.parse(saved) : DEFAULT_DEPARTMENTS;
  });

  const [industries, setIndustries] = useState<string[]>(() => {
    const saved = localStorage.getItem('geosang_industries_v2');
    return saved ? JSON.parse(saved) : DEFAULT_INDUSTRIES;
  });

  const [outsourceTypes, setOutsourceTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('outsource_types_v3');
    return saved ? JSON.parse(saved) : DEFAULT_OUTSOURCE_TYPES;
  });

  // 거상 조직도 전용 state
  const [geosangCompanyTypes, setGeosangCompanyTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('geosang_company_types_v1');
    return saved ? JSON.parse(saved) : DEFAULT_GEOSANG_COMPANY_TYPES;
  });

  const [geosangDepartments, setGeosangDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem('geosang_departments_custom_v1');
    return saved ? JSON.parse(saved) : DEFAULT_GEOSANG_DEPARTMENTS;
  });

  // 인건비 청구 관리
  const [laborClaims, setLaborClaims] = useState<LaborClaim[]>([]);
  const [isLaborClaimView, setIsLaborClaimView] = useState(false);
  const [isLaborClaimModalOpen, setIsLaborClaimModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<LaborClaim | null>(null);
  const [isPasswordManagerView, setIsPasswordManagerView] = useState(false);
  const [isGeosangAccountView, setIsGeosangAccountView] = useState(false);
  const [geosangAccounts, setGeosangAccounts] = useState<any[]>(() => {
    const saved = localStorage.getItem('geosang_accounts_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [isGeosangAccountModalOpen, setIsGeosangAccountModalOpen] = useState(false);
  const [editingGeosangAccount, setEditingGeosangAccount] = useState<any | null>(null);

  // 프로젝트 관리 (손익표)
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('geosang_projects_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // 데이터 로드 함수 (재사용 가능)
  const loadData = async () => {
    try {
      console.log('🔄 데이터 새로고침 중...');
      
      // Authorized Users 로드
      const authResponse = await fetch('/api/auth/users');
      if (authResponse.ok) {
        const authResult = await authResponse.json();
        if (authResult.success && authResult.data) {
          setAuthorizedUsers(authResult.data);
        }
      }
      
      // Contacts 로드
      const contactsResponse = await contactsAPI.getAll();
      if (contactsResponse.success && contactsResponse.data) {
        // 모든 주민번호를 문자열로 변환
        const sanitizedContacts = contactsResponse.data.map((contact: any) => ({
          ...contact,
          staffList: contact.staffList?.map((staff: any) => ({
            ...staff,
            residentNumber: staff.residentNumber ? String(staff.residentNumber) : staff.residentNumber
          }))
        }));
        setContacts(sanitizedContacts);
        console.log('✅ Contacts 새로고침 완료:', sanitizedContacts.length, '개');
      }
      
      // Labor Claims 로드
      const laborClaimsResponse = await laborClaimsAPI.getAll();
      if (laborClaimsResponse.success && laborClaimsResponse.data) {
        setLaborClaims(laborClaimsResponse.data);
      }
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  // 윈도우 포커스 시 데이터 새로고침 (PC/모바일 동기화)
  // 단, 모달이 열려 있을 때는 새로고침하지 않음
  useEffect(() => {
    const handleFocus = () => {
      if (!isModalOpen && !isLaborClaimModalOpen && !isCompanyModalOpen && !isStaffModalOpen) {
        console.log('👁️ 윈도우 포커스 감지 - 데이터 새로고침');
        loadData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isModalOpen, isLaborClaimModalOpen, isCompanyModalOpen, isStaffModalOpen]);

  // 실시간 동기화: 30초마다 자동 새로고침 (성능 최적화)
  // 단, 모달이 열려 있을 때는 새로고침하지 않음
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!isModalOpen && !isLaborClaimModalOpen && !isCompanyModalOpen && !isStaffModalOpen) {
        console.log('🔄 실시간 동기화: 30초 자동 새로고침');
        loadData();
      }
    }, 30000); // 30초마다 실행 (5초→30초로 변경하여 성능 개선)

    return () => {
      clearInterval(syncInterval);
    };
  }, [isModalOpen, isLaborClaimModalOpen, isCompanyModalOpen, isStaffModalOpen]); // 모달 상태 변경 시 interval 재설정

  useEffect(() => {
    localStorage.setItem('geosang_projects_v1', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('geosang_accounts_v1', JSON.stringify(geosangAccounts));
  }, [geosangAccounts]);

  // authorizedUsers는 이제 API에서 로드되므로 localStorage 저장 불필요
  // useEffect(() => {
  //   localStorage.setItem('geosang_auth_users_v2', JSON.stringify(authorizedUsers));
  // }, [authorizedUsers]);

  // 30분 자동 로그아웃 타이머
  useEffect(() => {
    if (!currentUser) return;

    const checkLoginExpiry = () => {
      const loginTime = localStorage.getItem('geosang_login_time');
      if (!loginTime) {
        handleLogout();
        return;
      }

      const now = Date.now();
      const elapsed = now - parseInt(loginTime);
      const thirtyMinutes = 30 * 60 * 1000; // 30분

      if (elapsed > thirtyMinutes) {
        alert('⏱️ 세션이 만료되었습니다. 다시 로그인해주세요.');
        handleLogout();
      }
    };

    // 1분마다 체크
    const interval = setInterval(checkLoginExpiry, 60 * 1000);

    // 초기 체크
    checkLoginExpiry();

    return () => clearInterval(interval);
  }, [currentUser]);

  const isAdmin = currentUser?.id === 'admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      // API로 직접 로그인 인증 (모바일 호환성 개선)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginId, password: loginPw })
      });
      
      const result = await response.json();
      
      if (result.success && result.user) {
        setCurrentUser(result.user);
        const loginTime = Date.now().toString();
        localStorage.setItem('geosang_logged_in_user_obj_v2', JSON.stringify(result.user));
        localStorage.setItem('geosang_login_time', loginTime);
        setAuthError(false);
        // 로그인 성공 후 입력란 유지 (자동 로그아웃 시에만 초기화)
      } else {
        setAuthError(true);
        setLoginPw('');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setAuthError(true);
      setLoginPw('');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginId('');
    setLoginPw('');
    localStorage.removeItem('geosang_logged_in_user_obj_v2');
    localStorage.removeItem('geosang_login_time');
  };

  // 관리자 계정 설정 변경
  const handleAdminSettings = async () => {
    const { currentPassword, newId, newPassword, confirmPassword } = adminSettingsForm;
    
    // 새 비밀번호 확인
    if (newPassword && newPassword !== confirmPassword) {
      alert('❌ 새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    try {
      // API로 관리자 계정 업데이트 (현재 비밀번호 검증 포함)
      const response = await fetch('/api/auth/users/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          username: newId || undefined,
          password: newPassword || undefined
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        alert('❌ ' + (result.error || '계정 변경 실패'));
        return;
      }
      
      // authorizedUsers 새로고침
      const usersResponse = await fetch('/api/auth/users');
      const usersResult = await usersResponse.json();
      if (usersResult.success) {
        setAuthorizedUsers(usersResult.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          password: '' // 비밀번호는 보안상 빈 문자열
        })));
      }
      
      // 현재 로그인한 사용자도 업데이트
      if (currentUser?.id === 'admin') {
        const updatedUser = {
          ...currentUser,
          username: newId || currentUser.username
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('geosang_logged_in_user_obj_v2', JSON.stringify(updatedUser));
      }
      
      alert('✅ 관리자 계정이 성공적으로 변경되었습니다!');
      setIsAdminSettingsModalOpen(false);
      setAdminSettingsForm({
        currentPassword: '',
        newId: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('관리자 설정 변경 오류:', error);
      alert('❌ 계정 변경 중 오류가 발생했습니다.');
    }
  };

  const handleAddAuthUser = async (name: string, username: string, pw: string) => {
    if (!name || !username || !pw) return;
    if (authorizedUsers.some(u => u.username === username)) {
      alert('이미 존재하는 아이디입니다.');
      return;
    }
    
    const newUser = { id: Date.now().toString(), name, username, password: pw };
    
    try {
      // API로 데이터베이스에 저장
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAuthorizedUsers(prev => [...prev, newUser]);
        alert('✅ 계정이 성공적으로 등록되었습니다!');
      } else {
        alert('❌ 계정 등록 실패: ' + result.error);
      }
    } catch (error) {
      console.error('계정 등록 오류:', error);
      alert('❌ 계정 등록 중 오류가 발생했습니다.');
    }
  };

  const handleRevokeAccess = async (id: string) => {
    if (id === 'admin') {
      alert('마스터 관리자 계정은 삭제할 수 없습니다.');
      return;
    }
    
    try {
      // API로 데이터베이스에서 삭제
      const response = await fetch(`/api/auth/users/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAuthorizedUsers(prev => prev.filter(u => u.id !== id));
        alert('✅ 계정이 삭제되었습니다.');
      } else {
        alert('❌ 계정 삭제 실패: ' + result.error);
      }
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      alert('❌ 계정 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleGlobalRenameItem = (oldName: string, newName: string, type: 'DEPT' | 'INDUSTRY' | 'OUTSOURCE') => {
    if (!isAdmin) return;
    if (!newName || oldName === newName) return;
    if (type === 'DEPT') {
      setDepartments(prev => prev.map(d => d === oldName ? newName : d));
      setContacts(prev => prev.map(contact => ({
        ...contact,
        staffList: contact.staffList.map(staff => staff.department === oldName ? { ...staff, department: newName } : staff)
      })));
    } else if (type === 'INDUSTRY') {
      setIndustries(prev => prev.map(i => i === oldName ? newName : i));
      setContacts(prev => prev.map(contact => contact.industry === oldName ? { ...contact, industry: newName } : contact));
    } else {
      setOutsourceTypes(prev => prev.map(t => t === oldName ? newName : t));
      setContacts(prev => prev.map(contact => ({ ...contact, subCategory: contact.subCategory === oldName ? newName : contact.subCategory })));
    }
  };

  const filteredContacts = useMemo(() => {
    let list = contacts.filter(c => c.category === activeCategory);
    
    // 🔍 외주팀 관리 전용 검색 필터
    if (activeCategory === CategoryType.OUTSOURCE) {
      // 이름/연락처 검색
      if (outsourceSearch) {
        const searchLower = outsourceSearch.toLowerCase();
        list = list.filter(c => {
          const staff = c.staffList[0];
          if (!staff) return false;
          
          const nameMatch = staff.name?.toLowerCase().includes(searchLower);
          const phoneMatch = staff.phone?.toLowerCase().includes(searchLower);
          
          return nameMatch || phoneMatch;
        });
      }
      
      // 활동지역 검색
      if (regionSearch) {
        const regionLower = regionSearch.toLowerCase();
        list = list.filter(c => {
          const staff = c.staffList[0];
          if (!staff || !staff.region) return false;
          
          return staff.region.toLowerCase().includes(regionLower);
        });
      }
      
      // 구분 필터 (시공일당, 크레인)
      if (outsourceTypeFilter) {
        list = list.filter(c => c.subCategory === outsourceTypeFilter);
      }
    } else {
      // 🔍 다른 카테고리 (거상, 매입, 프랜차이즈 등) 통합 검색 필터
      
      // 이름/연락처 검색
      if (generalSearch) {
        const searchLower = generalSearch.toLowerCase();
        list = list.filter(c => {
          // 브랜드명 검색
          const brandMatch = c.brandName?.toLowerCase().includes(searchLower);
          
          // 직원 이름/연락처 검색
          const staffMatch = c.staffList?.some(staff => {
            const nameMatch = staff.name?.toLowerCase().includes(searchLower);
            const phoneMatch = staff.phone?.toLowerCase().includes(searchLower);
            return nameMatch || phoneMatch;
          });
          
          return brandMatch || staffMatch;
        });
      }
      
      // 지역 검색
      if (locationSearch) {
        const locationLower = locationSearch.toLowerCase();
        list = list.filter(c => {
          const addressMatch = c.address?.toLowerCase().includes(locationLower);
          return addressMatch;
        });
      }
      
      // 업종 필터
      if (industryFilter) {
        list = list.filter(c => c.industry === industryFilter);
      }
    }
    
    return list;
  }, [contacts, activeCategory, outsourceSearch, regionSearch, outsourceTypeFilter, generalSearch, locationSearch, industryFilter]);

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const newContacts: Contact[] = [];
      const isOutsourceCategory = activeCategory === CategoryType.OUTSOURCE;
      
      let rows: any[] = [];
      
      if (isExcel) {
        // Excel 파일 처리
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      } else {
        // CSV 파일 처리 (다양한 인코딩 지원)
        const text = e.target?.result as string;
        rows = text.split('\n').map(row => 
          row.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        );
      }
      
      // 데이터 파싱
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i] || (Array.isArray(rows[i]) && rows[i].every((c: any) => !c))) continue;
        const cols = Array.isArray(rows[i]) ? rows[i] : [];
        
        if (isOutsourceCategory) {
          if (cols.length >= 2) {
            const [subCat, name, phone, region, resident, account, features] = cols;
            newContacts.push({
              id: 'csv-out-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 9),
              category: CategoryType.OUTSOURCE,
              subCategory: subCat || '시공일당',
              staffList: [{
                id: 's-out-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 9),
                name: name || '성명미상',
                phone: phone || '',
                region: region || '',
                residentNumber: resident || '',
                bankAccount: account || '',
                features: features || '',
                position: '',
                email: '',
                rating: 5
              }]
            });
          }
        } else {
          if (cols.length >= 1) {
            const [brand, ind, addr, mainPhone, mainEmail, home, sName, sPos, sPhone, sEmail, sDept] = cols;
            newContacts.push({
              id: 'csv-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 9),
              category: activeCategory,
              brandName: brand || '상호미상',
              industry: ind || '',
              address: addr || '',
              phone: mainPhone || '',
              email: mainEmail || '',
              homepage: home || '',
              staffList: sName ? [{ 
                id: 's-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 9),
                name: sName, 
                position: sPos || '', 
                phone: sPhone || '', 
                email: sEmail || '', 
                department: sDept || '',
                rating: 5
              }] : []
            });
          }
        }
      }
      
      // API로 저장 (비동기)
      const savePromises = newContacts.map(async (contact) => {
        try {
          const response = await contactsAPI.create(contact);
          if (response.success) {
            return response.data;
          } else {
            console.error('CSV 업로드 저장 실패:', contact.id, response.error);
            return null;
          }
        } catch (error) {
          console.error('CSV 업로드 저장 오류:', contact.id, error);
          return null;
        }
      });
      
      Promise.all(savePromises).then((results) => {
        const savedContacts = results.filter(c => c !== null);
        setContacts(prev => [...prev, ...savedContacts]);
        alert(`✅ ${savedContacts.length}개 항목이 데이터베이스에 저장되었습니다!\n\n파일: ${file.name}\n카테고리: ${getCategoryName(activeCategory)}`);
        if (event.target) event.target.value = '';
      });
    };
    
    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      // CSV - UTF-8, EUC-KR 등 자동 감지
      reader.readAsText(file, 'euc-kr');
    }
  };

  const handleCSVDownload = () => {
    if (!isAdmin) return;
    const list = contacts.filter(c => c.category === activeCategory);
    let csvContent = "\uFEFF";
    
    if (activeCategory === CategoryType.OUTSOURCE) {
      const headers = ['구분', '이름', '연락처', '활동지역', '주민번호/사업자번호', '계좌번호', '비고'];
      const rows = list.map(c => {
        const s = c.staffList[0];
        return [c.subCategory, s?.name, s?.phone, s?.region, s?.residentNumber ? String(s.residentNumber) : '', s?.bankAccount, s?.features];
      });
      csvContent += [headers, ...rows].map(e => e.map(v => `"${v || ''}"`).join(",")).join("\n");
    } else {
      const headers = ['상호', '업종', '주소', '대표번호', '이메일', '홈페이지', '직원성명', '직함', '연락처', '부서'];
      const rows = list.map(c => {
        const s = c.staffList[0];
        return [c.brandName, c.industry, c.address, c.phone, c.email, c.homepage, s?.name, s?.position, s?.phone, s?.department];
      });
      csvContent += [headers, ...rows].map(e => e.map(v => `"${v}"`).join(",")).join("\n");
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `거상_${getCategoryName(activeCategory)}.csv`;
    link.click();
  };

  const SidebarItem = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 lg:py-3.5 rounded-xl transition-all duration-200 ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}>
      {icon} <span className="text-sm lg:text-[15px]">{label}</span>
    </button>
  );

  const ContactCard = ({ contact, onEdit, onDelete, canManage }: any) => {
    const isOutsource = contact.category === CategoryType.OUTSOURCE;
    return (
      <div className="bg-white rounded-xl md:rounded-2xl lg:rounded-[2rem] p-4 md:p-5 lg:p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col h-full relative group">
        <div className="flex justify-between items-start mb-3 md:mb-4 lg:mb-6">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap gap-2 items-center">
              {isOutsource ? (
                <>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">구분</span>
                    <span className="px-2 md:px-3 py-0.5 md:py-1 rounded text-[10px] md:text-[11px] font-black bg-red-600 text-white tracking-widest shadow-sm">{contact.subCategory || '시공일당'}</span>
                  </div>
                  {contact.staffList[0]?.region && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold">활동지역</span>
                      <span className="px-2 md:px-3 py-0.5 md:py-1 rounded text-[10px] md:text-[11px] font-black bg-emerald-600 text-white tracking-widest shadow-sm">{contact.staffList[0].region}</span>
                    </div>
                  )}
                </>
              ) : (
                <span className="px-2 md:px-3 py-0.5 md:py-1 rounded text-[10px] md:text-[11px] font-black bg-blue-600 text-white uppercase tracking-widest shadow-sm">{contact.industry || getCategoryName(contact.category)}</span>
              )}
            </div>
            <h3 className="text-base md:text-lg lg:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">{isOutsource ? contact.staffList[0]?.name : contact.brandName}</h3>
            {isOutsource && contact.staffList[0]?.rating && (
              <div className="flex gap-0.5 mt-0.5 text-amber-400">{Array.from({length: 5}).map((_, i) => <Star key={i} size={12} fill={i < (contact.staffList[0].rating || 0) ? "currentColor" : "none"} />)}</div>
            )}
          </div>
          <div className="flex gap-0.5 ml-2">
            {contact.attachments && contact.attachments.length > 0 && (
              <div className="relative group/attach">
                <button 
                  className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                  title={`첨부파일 ${contact.attachments.length}개`}
                >
                  <Upload size={16} />
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {contact.attachments.length}
                  </span>
                </button>
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 min-w-[200px] hidden group-hover/attach:block z-50">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">첨부파일</div>
                  {contact.attachments.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = `data:${file.mimeType};base64,${file.data}`;
                        link.download = file.name;
                        link.click();
                      }}
                      className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <FileText size={12} className="text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-900 truncate">{file.name}</div>
                        <div className="text-[8px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <Download size={10} className="text-slate-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-1">
              {/* 수정 버튼 - 모든 사용자 */}
              <button 
                onClick={onEdit} 
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-all duration-200 hover:scale-110"
                title="수정"
              >
                <Pencil size={16} />
              </button>
              {/* 삭제 버튼 - 관리자만 */}
              {canManage && (
                <button 
                  onClick={onDelete} 
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white transition-all duration-200 hover:scale-110"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-3 lg:space-y-4">
          {contact.staffList?.map((staff: Staff) => (
            <div key={staff.id} className="p-3 lg:p-4 bg-slate-50 rounded-xl lg:rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 text-sm">{staff.name}</span>
                {staff.department && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black">{staff.department}</span>}
              </div>
              <div className="text-slate-600 text-[11px] lg:text-xs flex flex-col gap-1 font-medium font-mono">
                <a href={`tel:${staff.phone}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors"><Phone size={12} className="text-slate-400" /> {staff.phone}</a>
                {!isOutsource && staff.position && <div className="flex items-center gap-2"><Briefcase size={12} className="text-slate-400" /> {staff.position}</div>}
                {isOutsource && staff.residentNumber && <div className="flex items-center gap-2"><Lock size={12} className="text-slate-400" /> {String(staff.residentNumber)}</div>}
                {(staff.bankAccount || contact.bankAccount) && <div className="flex items-center gap-2"><CreditCard size={12} className="text-slate-400" /> {staff.bankAccount || contact.bankAccount}</div>}
                {!isOutsource && staff.email && <a href={`mailto:${staff.email}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors"><Mail size={12} className="text-slate-400" /> {staff.email}</a>}
              </div>
              {isOutsource && staff.features && (
                <div className="mt-2 pt-2 border-t border-slate-200/50">
                  <span className="text-[10px] text-slate-400 font-medium">{staff.features}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 거상 계정 등록 뷰
  const GeosangAccountView = () => {
    return (
      <section className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-10 scroll-smooth">
        <div className="mb-4 md:mb-6 lg:mb-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">거상 계정 등록</h2>
              <p className="text-[10px] md:text-xs lg:text-sm font-bold text-blue-600 mt-1 uppercase tracking-wider">계정 현황: {geosangAccounts.length}건</p>
            </div>
            <button 
              onClick={() => { setEditingGeosangAccount(null); setIsGeosangAccountModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
            >
              <Plus size={18} />
              <span>계정 추가</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
            {geosangAccounts.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <Key size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-400 font-medium">등록된 계정이 없습니다</p>
                <p className="text-slate-300 text-sm mt-2">우측 상단의 '계정 추가' 버튼을 클릭하세요</p>
              </div>
            ) : (
              geosangAccounts.map((account: any) => (
                <div key={account.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-slate-900 truncate">{account.company_name}</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">{account.username}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button 
                        onClick={() => { setEditingGeosangAccount(account); setIsGeosangAccountModalOpen(true); }}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Pencil size={16} className="text-blue-600" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('이 계정을 삭제하시겠습니까?')) {
                            setGeosangAccounts(prev => prev.filter(a => a.id !== account.id));
                          }
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {account.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-slate-600 truncate">{account.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Lock size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-slate-400 text-xs">••••••••</span>
                    </div>
                    {account.memo && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-slate-600 text-xs">{account.memo}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    );
  };

  // 인건비 청구 관리 뷰
  const LaborClaimView = ({ claims, outsourceWorkers, onAddClaim, onEditClaim, onDeleteClaim, onUpdateStatus }: any) => {
    const [selectedWorker, setSelectedWorker] = useState<string>('all');
    const [workerDetailModal, setWorkerDetailModal] = useState<string | null>(null);
    
    const filteredClaims = useMemo(() => {
      let filtered = claims;
      
      // 일당 필터
      if (selectedWorker !== 'all') {
        filtered = filtered.filter((c: LaborClaim) => c.workerId === selectedWorker);
      }
      
      return filtered.sort((a: LaborClaim, b: LaborClaim) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [claims, selectedWorker]);
    
    const totalAmount = filteredClaims.reduce((sum: number, c: LaborClaim) => sum + c.totalAmount, 0);
    const pendingAmount = filteredClaims.filter((c: LaborClaim) => c.status === 'pending').reduce((sum: number, c: LaborClaim) => sum + c.totalAmount, 0);
    const paidAmount = filteredClaims.filter((c: LaborClaim) => c.status === 'paid').reduce((sum: number, c: LaborClaim) => sum + c.totalAmount, 0);
    
    return (
      <section className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-10 scroll-smooth bg-gradient-to-br from-slate-50 to-blue-50">
        {/* 헤더 */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">💰 인건비 청구 관리</h2>
          <p className="text-xs md:text-sm text-slate-600 mt-2">
            외주 일당의 인건비 청구 내역을 간편하게 관리하세요
          </p>
        </div>
        
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">총 청구금액</p>
                <p className="text-2xl font-black text-slate-900">{totalAmount.toLocaleString()}원</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-amber-600" size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">대기중</p>
                <p className="text-2xl font-black text-amber-600">{pendingAmount.toLocaleString()}원</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Check className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">지급완료</p>
                <p className="text-2xl font-black text-emerald-600">{paidAmount.toLocaleString()}원</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 검색 & 필터 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-6">
          {/* 필터 & 액션 */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex-1 max-w-md">
              <Select
                options={[
                  { value: 'all', label: '전체 일당' },
                  ...outsourceWorkers.map((w: Contact) => ({
                    value: w.staffList[0]?.id,
                    label: `${w.staffList[0]?.name}${w.staffList[0]?.phone ? ` (${w.staffList[0].phone})` : ''}`
                  }))
                ]}
                value={
                  selectedWorker === 'all'
                    ? { value: 'all', label: '전체 일당' }
                    : outsourceWorkers
                        .map((w: Contact) => ({
                          value: w.staffList[0]?.id,
                          label: `${w.staffList[0]?.name}${w.staffList[0]?.phone ? ` (${w.staffList[0].phone})` : ''}`
                        }))
                        .find((opt: any) => opt.value === selectedWorker) || null
                }
                onChange={(selected: any) => {
                  setSelectedWorker(selected?.value || 'all');
                }}
                placeholder="일당 이름 또는 전화번호로 검색..."
                isSearchable
                isClearable
                noOptionsMessage={() => "일당을 찾을 수 없습니다"}
                styles={{
                  control: (base) => ({
                    ...base,
                    padding: '2px',
                    borderRadius: '12px',
                    borderWidth: '2px',
                    borderColor: '#e2e8f0',
                    fontWeight: 'bold',
                    minHeight: '42px',
                    '&:hover': {
                      borderColor: '#3b82f6'
                    }
                  }),
                  menu: (base) => ({
                    ...base,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 100
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
                    color: state.isSelected ? 'white' : '#1e293b',
                    fontWeight: state.isSelected ? 'bold' : 'normal',
                    padding: '12px 16px',
                    cursor: 'pointer'
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: '#94a3b8',
                    fontSize: '14px'
                  })
                }}
              />
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  // CSV 다운로드 (현장별 배분 금액 포함)
                  let csvContent = "\uFEFF"; // BOM for Excel
                  const headers = ['작업일', '일당명', '현장명', '작업시간', '배분금액', '총청구금액', '상태'];
                  csvContent += headers.map(h => `"${h}"`).join(",") + "\n";
                  
                  filteredClaims.forEach((claim: LaborClaim) => {
                    claim.sites.forEach((site) => {
                      const row = [
                        claim.date,
                        claim.workerName,
                        site.siteName,
                        site.hours,
                        site.allocatedAmount || 0,
                        claim.totalAmount,
                        claim.status === 'pending' ? '대기' : claim.status === 'approved' ? '승인' : '지급완료'
                      ];
                      csvContent += row.map(v => `"${v}"`).join(",") + "\n";
                    });
                  });
                  
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
                  link.download = `인건비청구_${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                }}
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-emerald-700"
              >
                <Download size={18} /> 청구서 다운로드
              </button>
              <button 
                onClick={onAddClaim} 
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-blue-700"
              >
                <Plus size={18} /> 청구 등록
              </button>
            </div>
          </div>
        </div>
        
        {/* 청구 내역 리스트 */}
        <div className="space-y-3">
          {filteredClaims.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">청구 내역이 없습니다</p>
              <p className="text-xs text-slate-400 mt-2">새로운 청구를 등록해보세요</p>
              <button
                onClick={onAddClaim}
                className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 mx-auto hover:bg-blue-700"
              >
                <Plus size={18} /> 청구 등록
              </button>
            </div>
          ) : (
            filteredClaims.map((claim: LaborClaim) => (
              <div key={claim.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-lg font-black text-slate-900">{claim.workerName}</h3>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        claim.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        claim.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>{claim.status === 'pending' ? '대기' : claim.status === 'approved' ? '승인' : '지급완료'}</span>
                    </div>
                    <div className="text-xs text-slate-600 mb-3">
                      <span className="font-bold">작업일:</span> {claim.date}
                    </div>
                    
                    {/* 현장 목록 + 금액 배분 */}
                    <div className="space-y-1.5 mb-3">
                      {(() => {
                        const totalHours = claim.sites.reduce((sum, s) => sum + s.hours, 0);
                        return claim.sites.map((site, idx) => {
                          const percentage = totalHours > 0 ? (site.hours / totalHours) * 100 : 0;
                          const allocated = totalHours > 0 ? Math.round((site.hours / totalHours) * claim.totalAmount) : 0;
                          return (
                            <div key={site.id} className="bg-blue-50 px-3 py-2 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-blue-600">현장{idx + 1}:</span>
                                  <span className="text-xs font-bold text-slate-900">{site.siteName}</span>
                                </div>
                                <span className="text-xs font-black text-blue-600">{allocated.toLocaleString()}원</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span>{site.hours}시간</span>
                                <span>•</span>
                                <span>{percentage.toFixed(1)}%</span>
                                <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    
                    {/* 금액 세부내역 */}
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">기본일비</span>
                        <span className="font-bold text-slate-900">{claim.breakdown.basePay.toLocaleString()}원</span>
                      </div>
                      {claim.breakdown.overtimePay > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">연장비 ({claim.breakdown.overtimeHours}시간)</span>
                          <span className="font-bold text-slate-900">{claim.breakdown.overtimePay.toLocaleString()}원</span>
                        </div>
                      )}
                      {claim.breakdown.transportFee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">차대비</span>
                          <span className="font-bold text-slate-900">{claim.breakdown.transportFee.toLocaleString()}원</span>
                        </div>
                      )}
                      {claim.breakdown.mealFee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">식비</span>
                          <span className="font-bold text-slate-900">{claim.breakdown.mealFee.toLocaleString()}원</span>
                        </div>
                      )}
                      {claim.breakdown.fuelFee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">주유비</span>
                          <span className="font-bold text-slate-900">{claim.breakdown.fuelFee.toLocaleString()}원</span>
                        </div>
                      )}
                      {claim.breakdown.tollFee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">톨비</span>
                          <span className="font-bold text-slate-900">{claim.breakdown.tollFee.toLocaleString()}원</span>
                        </div>
                      )}
                      {claim.breakdown.otherFee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">{claim.breakdown.otherFeeDesc || '기타'}</span>
                          <span className="font-bold text-slate-900">{claim.breakdown.otherFee.toLocaleString()}원</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">총 청구금액</p>
                    <p className="text-2xl font-black text-blue-600">{claim.totalAmount.toLocaleString()}원</p>
                    <p className="text-xs text-slate-500 mt-1">{claim.sites.reduce((sum, s) => sum + s.hours, 0)}시간</p>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  {claim.receiptImages && claim.receiptImages.length > 0 && (
                    <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">
                      📸 영수증 {claim.receiptImages.length}장
                    </button>
                  )}
                  {claim.status === 'pending' && (
                    <button onClick={() => onUpdateStatus(claim.id, 'approved')} className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-200">
                      ✓ 승인
                    </button>
                  )}
                  {claim.status === 'approved' && (
                    <button onClick={() => onUpdateStatus(claim.id, 'paid')} className="px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-200">
                      💵 지급완료
                    </button>
                  )}
                  <button onClick={() => setWorkerDetailModal(claim.workerId)} className="px-3 py-1.5 bg-purple-100 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-200">
                    📊 개인별 내역
                  </button>
                  <button onClick={() => onEditClaim(claim)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">
                    수정
                  </button>
                  <button onClick={() => onDeleteClaim(claim.id)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200">
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* 개인별 상세 내역 모달 */}
        {workerDetailModal && (() => {
          const workerClaims = claims.filter((c: LaborClaim) => c.workerId === workerDetailModal);
          const workerName = workerClaims[0]?.workerName || '일당';
          const paidClaims = workerClaims.filter((c: LaborClaim) => c.status === 'paid');
          const unpaidClaims = workerClaims.filter((c: LaborClaim) => c.status !== 'paid');
          const totalPaid = paidClaims.reduce((sum: number, c: LaborClaim) => sum + c.totalAmount, 0);
          const totalUnpaid = unpaidClaims.reduce((sum: number, c: LaborClaim) => sum + c.totalAmount, 0);
          
          // 개인별 CSV 다운로드
          const downloadWorkerCSV = () => {
            let csvContent = "\uFEFF";
            const headers = ['상태', '작업일', '현장명', '작업시간', '배분금액', '총청구금액', '지급일자'];
            csvContent += headers.map(h => `"${h}"`).join(",") + "\n";
            
            [...paidClaims, ...unpaidClaims].forEach((claim: LaborClaim) => {
              claim.sites.forEach((site) => {
                const totalHours = claim.sites.reduce((sum, s) => sum + s.hours, 0);
                const allocated = totalHours > 0 ? Math.round((site.hours / totalHours) * claim.totalAmount) : 0;
                const row = [
                  claim.status === 'paid' ? '지급완료' : (claim.status === 'approved' ? '승인대기' : '대기'),
                  claim.date,
                  site.siteName,
                  site.hours,
                  allocated,
                  claim.totalAmount,
                  claim.paidAt ? new Date(claim.paidAt).toLocaleDateString('ko-KR') : '-'
                ];
                csvContent += row.map(v => `"${v}"`).join(",") + "\n";
              });
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${workerName}_작업비내역_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
          };
          
          return (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-600 to-blue-600">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                      <Contact2 size={28} />
                      {workerName} 작업비 내역
                    </h2>
                    <p className="text-sm text-white/80 mt-1">지급/미지급 내역을 확인하세요</p>
                  </div>
                  <button onClick={() => setWorkerDetailModal(null)} className="p-2 bg-white/20 rounded-xl hover:bg-white/30">
                    <X size={24} className="text-white" />
                  </button>
                </div>
                
                <div className="p-6 lg:p-8 flex-1 overflow-y-auto space-y-6">
                  {/* 통계 요약 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Check className="text-emerald-600" size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-emerald-700 font-bold">지급완료</p>
                          <p className="text-xs text-emerald-600">{paidClaims.length}건</p>
                        </div>
                      </div>
                      <p className="text-3xl font-black text-emerald-700">{totalPaid.toLocaleString()}원</p>
                    </div>
                    
                    <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Calendar className="text-amber-600" size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-amber-700 font-bold">미지급</p>
                          <p className="text-xs text-amber-600">{unpaidClaims.length}건</p>
                        </div>
                      </div>
                      <p className="text-3xl font-black text-amber-700">{totalUnpaid.toLocaleString()}원</p>
                    </div>
                  </div>
                  
                  {/* 지급완료 내역 */}
                  {paidClaims.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-black text-emerald-700 flex items-center gap-2">
                        <Check size={20} />
                        지급완료 ({paidClaims.length}건)
                      </h3>
                      {paidClaims.map((claim: LaborClaim) => (
                        <div key={claim.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{claim.date}</p>
                              <p className="text-xs text-emerald-600 font-bold mt-1">
                                💰 지급일: {claim.paidAt ? new Date(claim.paidAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                              </p>
                            </div>
                            <p className="text-xl font-black text-emerald-700">{claim.totalAmount.toLocaleString()}원</p>
                          </div>
                          <div className="space-y-1">
                            {claim.sites.map((site, idx) => {
                              const totalHours = claim.sites.reduce((sum, s) => sum + s.hours, 0);
                              const allocated = totalHours > 0 ? Math.round((site.hours / totalHours) * claim.totalAmount) : 0;
                              return (
                                <div key={site.id} className="flex justify-between items-center text-xs bg-white/50 px-3 py-2 rounded-lg">
                                  <span className="font-bold text-slate-700">{site.siteName}</span>
                                  <span className="text-emerald-600 font-bold">{allocated.toLocaleString()}원 ({site.hours}시간)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 미지급 내역 */}
                  {unpaidClaims.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-black text-amber-700 flex items-center gap-2">
                        <Calendar size={20} />
                        미지급 ({unpaidClaims.length}건)
                      </h3>
                      {unpaidClaims.map((claim: LaborClaim) => (
                        <div key={claim.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{claim.date}</p>
                              <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold mt-1 ${
                                claim.status === 'pending' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'
                              }`}>{claim.status === 'pending' ? '대기' : '승인'}</span>
                            </div>
                            <p className="text-xl font-black text-amber-700">{claim.totalAmount.toLocaleString()}원</p>
                          </div>
                          <div className="space-y-1">
                            {claim.sites.map((site, idx) => {
                              const totalHours = claim.sites.reduce((sum, s) => sum + s.hours, 0);
                              const allocated = totalHours > 0 ? Math.round((site.hours / totalHours) * claim.totalAmount) : 0;
                              return (
                                <div key={site.id} className="flex justify-between items-center text-xs bg-white/50 px-3 py-2 rounded-lg">
                                  <span className="font-bold text-slate-700">{site.siteName}</span>
                                  <span className="text-amber-600 font-bold">{allocated.toLocaleString()}원 ({site.hours}시간)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-6 border-t border-slate-200 flex gap-3">
                  <button onClick={downloadWorkerCSV} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                    <Download size={20} />
                    내역서 다운로드
                  </button>
                  <button onClick={() => setWorkerDetailModal(null)} className="px-8 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200">
                    닫기
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </section>
    );
  };

  // 프로젝트 관리 뷰 (손익표) - 개선된 버전

  // 회사 등록 모달 (거상 조직도 + 모든 거래처 타입 공통)
  const CompanyModal = ({ onClose, onSubmit, initialData, geosangCompanyTypes, setGeosangCompanyTypes, isAdmin, currentCategory }: any) => {
    const [formData, setFormData] = useState(() => {
      if (initialData) return { ...initialData, attachments: initialData.attachments || [] };
      return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        category: currentCategory || CategoryType.GEOSANG,
        brandName: '',
        industry: '',
        address: '',
        phone: '',
        phone2: '',
        email: '',
        homepage: '',
        bankAccount: '',
        licenseFile: null,
        attachments: [],
        staffList: []
      };
    });

    const [newItemInput, setNewItemInput] = useState('');
    const [licensePreview, setLicensePreview] = useState<string | null>(null);
    const [isUploadingLicense, setIsUploadingLicense] = useState(false);
    const licenseInputRef = useRef<HTMLInputElement>(null);
    const additionalFilesInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);
    
    // 슬라이드 네비게이션 바 상태 관리 (회사 등록 모달용)
    const [companyScrollThumbTop, setCompanyScrollThumbTop] = useState(0);

    // initialData가 있을 때 기존 파일 미리보기 설정
    useEffect(() => {
      if (initialData?.licenseFile) {
        // 사업자등록증 미리보기 설정
        const preview = `data:${initialData.licenseFile.mimeType};base64,${initialData.licenseFile.data}`;
        setLicensePreview(preview);
      }
    }, [initialData]);

    // 스크롤 이벤트 리스너 (회사 등록 모달용)
    useEffect(() => {
      const modal = document.getElementById('company-form-modal');
      if (!modal) return;

      const handleScroll = () => {
        const scrollPercentage = modal.scrollTop / (modal.scrollHeight - modal.clientHeight);
        const trackHeight = 300;
        const thumbHeight = 60;
        const maxThumbTop = trackHeight - thumbHeight;
        setCompanyScrollThumbTop(scrollPercentage * maxThumbTop);
      };

      modal.addEventListener('scroll', handleScroll);
      handleScroll();
      
      return () => modal.removeEventListener('scroll', handleScroll);
    }, []);

    // 썸 드래그 핸들러 (회사 등록 모달용)
    const handleCompanyThumbMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startThumbTop = companyScrollThumbTop;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const trackHeight = 300;
        const thumbHeight = 60;
        const maxThumbTop = trackHeight - thumbHeight;
        
        let newThumbTop = startThumbTop + deltaY;
        newThumbTop = Math.max(0, Math.min(newThumbTop, maxThumbTop));
        
        const scrollPercentage = newThumbTop / maxThumbTop;
        const modal = document.getElementById('company-form-modal');
        if (modal) {
          modal.scrollTop = scrollPercentage * (modal.scrollHeight - modal.clientHeight);
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    const inputClasses = "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 lg:py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-900 font-bold text-xs lg:text-sm transition-all";
    const labelClasses = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

    const renderCompanyTypeManagement = () => {
      return (
        <div className="bg-slate-50 p-4 lg:p-6 rounded-2xl border border-slate-200 space-y-3">
          <label className={labelClasses}>회사 구분 *</label>
          <div className="flex flex-wrap gap-1.5">
            {geosangCompanyTypes.map((item: string) => (
              <div key={item} className="relative group">
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, industry: item})}
                  className={`px-3 py-1.5 rounded-lg text-[10px] lg:text-xs font-black border-2 transition-all ${formData.industry === item ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                  {item}
                </button>
                {isAdmin && (
                  <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt(`'${item}' 항목의 이름을 수정하시겠습니까?`, item);
                        if (newName && newName !== item) {
                          const newTypes = geosangCompanyTypes.map((t: string) => t === item ? newName : t);
                          setGeosangCompanyTypes(newTypes);
                          localStorage.setItem('geosang_company_types_v1', JSON.stringify(newTypes));
                        }
                      }}
                      className="bg-blue-600 text-white p-1.5 rounded-full shadow-xl hover:bg-blue-700 transition-all border-2 border-white hover:scale-110"
                      title="이름 수정"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`'${item}' 항목을 삭제하시겠습니까?`)) {
                          const newTypes = geosangCompanyTypes.filter((t: string) => t !== item);
                          setGeosangCompanyTypes(newTypes);
                          localStorage.setItem('geosang_company_types_v1', JSON.stringify(newTypes));
                        }
                      }}
                      className="bg-red-600 text-white p-1.5 rounded-full shadow-xl hover:bg-red-700 transition-all border-2 border-white hover:scale-110"
                      title="삭제"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <input 
                className="flex-1 bg-white border-2 border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none" 
                placeholder="직접 추가..." 
                value={newItemInput} 
                onChange={e => setNewItemInput(e.target.value)} 
                onKeyPress={e => { 
                  if(e.key === 'Enter') { 
                    e.preventDefault(); 
                    if(newItemInput) { 
                      const newTypes = [...geosangCompanyTypes, newItemInput];
                      setGeosangCompanyTypes(newTypes);
                      localStorage.setItem('geosang_company_types_v1', JSON.stringify(newTypes));
                      setNewItemInput(''); 
                    } 
                  } 
                }} 
              />
              <button 
                type="button" 
                onClick={() => { 
                  if(newItemInput) { 
                    const newTypes = [...geosangCompanyTypes, newItemInput];
                    setGeosangCompanyTypes(newTypes);
                    localStorage.setItem('geosang_company_types_v1', JSON.stringify(newTypes));
                    setNewItemInput(''); 
                  } 
                }} 
                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-800 transition-all"
              >
                추가
              </button>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 lg:p-6">
        <div className="bg-white rounded-3xl lg:rounded-[3rem] w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl p-6 lg:p-10 scrollbar-hide relative" id="company-form-modal">
          <div className="flex justify-between items-center mb-6 lg:mb-8">
            <h2 className="text-xl lg:text-3xl font-black tracking-tight flex items-center gap-3">
              <Building2 size={28} className="text-blue-600" />
              {initialData ? '회사 정보 수정' : '회사 등록'}
            </h2>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
              <X size={20}/>
            </button>
          </div>
          
          <form onSubmit={e => { 
            e.preventDefault();
            if (!formData.brandName?.trim()) {
              alert('❌ 회사명은 필수 입력입니다.');
              return;
            }
            if (!formData.industry) {
              alert('❌ 회사 구분을 선택해주세요.');
              return;
            }
            onSubmit(formData);
          }} className="space-y-6">
            {/* 회사 구분 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 lg:p-8 rounded-3xl border-2 border-blue-200">
              {renderCompanyTypeManagement()}
            </div>

            {/* 회사 기본 정보 */}
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>회사명 *</label>
                <input 
                  className={inputClasses} 
                  value={formData.brandName} 
                  onChange={async (e) => {
                    const companyName = e.target.value;
                    setFormData({...formData, brandName: companyName});
                    
                    // 회사명이 입력되면 기존 데이터 자동완성
                    if (companyName.trim()) {
                      try {
                        const response = await fetch(`/api/contacts/by-company-name/${encodeURIComponent(companyName.trim())}`);
                        const result = await response.json();
                        
                        if (result.success && result.data) {
                          // 기존 회사 정보가 있으면 자동으로 채우기
                          setFormData({
                            ...formData,
                            brandName: companyName,
                            industry: result.data.industry || formData.industry,
                            address: result.data.address || '',
                            phone: result.data.phone || '',
                            phone2: result.data.phone2 || '',
                            email: result.data.email || '',
                            homepage: result.data.homepage || '',
                            bankAccount: result.data.bankAccount || '',
                            licenseFile: result.data.licenseFile || null
                          });
                        }
                      } catch (error) {
                        console.error('자동완성 오류:', error);
                      }
                    }
                  }} 
                  placeholder="회사명을 입력하세요 (기존 회사는 자동완성)"
                  required
                />
              </div>
              <div>
                <label className={labelClasses}>주소</label>
                <input 
                  className={inputClasses} 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  placeholder="회사 주소를 입력하세요"
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>이메일</label>
                  <input 
                    className={inputClasses} 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="company@example.com"
                  />
                </div>
                <div>
                  <label className={labelClasses}>홈페이지</label>
                  <input 
                    className={inputClasses} 
                    value={formData.homepage} 
                    onChange={e => setFormData({...formData, homepage: e.target.value})} 
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>대표번호 1</label>
                  <input 
                    className={inputClasses} 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    placeholder="02-1234-5678"
                  />
                </div>
                <div>
                  <label className={labelClasses}>대표번호 2</label>
                  <input 
                    className={inputClasses} 
                    value={formData.phone2} 
                    onChange={e => setFormData({...formData, phone2: e.target.value})} 
                    placeholder="02-8765-4321"
                  />
                </div>
              </div>
              <div>
                <label className={labelClasses}>계좌번호</label>
                <input 
                  className={inputClasses} 
                  value={formData.bankAccount} 
                  onChange={e => setFormData({...formData, bankAccount: e.target.value})} 
                  placeholder="은행명 계좌번호 예금주"
                />
              </div>
            </div>

            {/* 회사 사업자등록증 업로드 */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 lg:p-8 rounded-3xl border-2 border-emerald-200">
              <label className={labelClasses}>📄 회사 사업자등록증</label>
              <div className="space-y-4">
                <input
                  ref={licenseInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    // 파일 크기 체크 (10MB)
                    if (file.size > 10 * 1024 * 1024) {
                      alert('❌ 파일 크기는 10MB 이하여야 합니다.');
                      return;
                    }
                    
                    setIsUploadingLicense(true);
                    
                    try {
                      // 이미지 압축 및 인코딩
                      const compressed = await compressAndEncodeFile(file);
                      
                      // 압축 결과 로그
                      const compressionRatio = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
                      console.log(`✅ 이미지 압축 완료: ${(compressed.originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressed.compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% 감소)`);
                      
                      // 미리보기 생성
                      const previewUrl = `data:${compressed.mimeType};base64,${compressed.data}`;
                      setLicensePreview(previewUrl);
                      
                      setFormData({
                        ...formData,
                        licenseFile: {
                          data: compressed.data,
                          name: compressed.name,
                          mimeType: compressed.mimeType
                        }
                      });
                    } catch (error) {
                      console.error('파일 업로드 오류:', error);
                      alert('❌ 파일 업로드 중 오류가 발생했습니다.');
                    } finally {
                      setIsUploadingLicense(false);
                    }
                  }}
                />
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => licenseInputRef.current?.click()}
                    disabled={isUploadingLicense}
                    className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploadingLicense ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        {formData.licenseFile || licensePreview ? '파일 재선택' : '파일 선택'}
                      </>
                    )}
                  </button>
                  
                  {(formData.licenseFile || licensePreview) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, licenseFile: null });
                        setLicensePreview(null);
                        if (licenseInputRef.current) {
                          licenseInputRef.current.value = '';
                        }
                      }}
                      className="bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-200 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      삭제
                    </button>
                  )}
                </div>
                
                {/* 미리보기 */}
                {licensePreview && (
                  <div className="bg-white rounded-xl p-4 border-2 border-emerald-200">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText size={20} className="text-emerald-600" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">사업자등록증</p>
                        <p className="text-xs text-slate-500">{formData.licenseFile?.name || initialData?.licenseFile?.name || '파일'}</p>
                      </div>
                      {(formData.licenseFile || initialData?.licenseFile) && (
                        <button
                          type="button"
                          onClick={() => {
                            const file = formData.licenseFile || initialData?.licenseFile;
                            if (file) {
                              const link = document.createElement('a');
                              link.href = `data:${file.mimeType};base64,${file.data}`;
                              link.download = file.name;
                              link.click();
                            }
                          }}
                          className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="다운로드"
                        >
                          <Download size={18} />
                        </button>
                      )}
                    </div>
                    {licensePreview && formData.licenseFile?.mimeType?.startsWith('image/') && (
                      <img 
                        src={licensePreview} 
                        alt="사업자등록증 미리보기" 
                        className="w-full rounded-lg border border-slate-200 max-h-64 object-contain bg-slate-50"
                      />
                    )}
                    {licensePreview && !formData.licenseFile?.mimeType?.startsWith('image/') && initialData?.licenseFile?.mimeType?.startsWith('image/') && (
                      <img 
                        src={licensePreview} 
                        alt="사업자등록증 미리보기" 
                        className="w-full rounded-lg border border-slate-200 max-h-64 object-contain bg-slate-50"
                      />
                    )}
                    {formData.licenseFile?.mimeType === 'application/pdf' && (
                      <div className="p-3 flex items-center justify-center bg-slate-50">
                        <div className="text-center">
                          <FileText size={48} className="text-red-500 mx-auto mb-2" />
                          <p className="text-xs text-slate-600 font-medium">PDF 문서</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-slate-500 mt-2">
                  * 이미지 또는 PDF 파일 (최대 10MB)
                </p>
              </div>
            </div>

            {/* 추가 서류 업로드 (통장사본, 명함 등) */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 lg:p-8 rounded-3xl border-2 border-blue-200">
              <label className={labelClasses}>📎 추가 서류 (통장사본, 명함 등)</label>
              <div className="space-y-4">
                <input
                  ref={additionalFilesInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    
                    // 파일 크기 체크 (각 10MB)
                    const oversized = files.find(f => f.size > 10 * 1024 * 1024);
                    if (oversized) {
                      alert('❌ 각 파일 크기는 10MB 이하여야 합니다.');
                      return;
                    }
                    
                    setIsUploadingAdditional(true);
                    
                    try {
                      const newAttachments = await Promise.all(
                        files.map(async (file) => {
                          const compressed = await compressAndEncodeFile(file);
                          const compressionRatio = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
                          console.log(`✅ ${file.name} 압축: ${(compressed.originalSize / 1024).toFixed(1)}KB → ${(compressed.compressedSize / 1024).toFixed(1)}KB (${compressionRatio}% 감소)`);
                          
                          return {
                            data: compressed.data,
                            name: compressed.name,
                            mimeType: compressed.mimeType,
                            size: compressed.compressedSize
                          };
                        })
                      );
                      
                      setFormData({
                        ...formData,
                        attachments: [...(formData.attachments || []), ...newAttachments]
                      });
                    } catch (error) {
                      console.error('파일 업로드 오류:', error);
                      alert('❌ 파일 업로드 중 오류가 발생했습니다.');
                    } finally {
                      setIsUploadingAdditional(false);
                      if (additionalFilesInputRef.current) {
                        additionalFilesInputRef.current.value = '';
                      }
                    }
                  }}
                />
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => additionalFilesInputRef.current?.click()}
                    disabled={isUploadingAdditional}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploadingAdditional ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        파일 추가 (여러 개 선택 가능)
                      </>
                    )}
                  </button>
                  
                  {formData.attachments && formData.attachments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, attachments: [] });
                      }}
                      className="bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-200 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      전체 삭제
                    </button>
                  )}
                </div>
                
                {/* 첨부파일 목록 */}
                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="bg-white rounded-xl p-4 border-2 border-blue-200 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        <p className="text-sm font-bold text-slate-900">
                          첨부파일 {formData.attachments.length}개
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {formData.attachments.map((file: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
                        >
                          {/* 파일 정보 헤더 */}
                          <div className="flex items-center justify-between p-3 bg-white border-b border-slate-200">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText size={16} className="text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                                <p className="text-[10px] text-slate-500">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `data:${file.mimeType};base64,${file.data}`;
                                  link.download = file.name;
                                  link.click();
                                }}
                                className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="다운로드"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newAttachments = formData.attachments.filter((_: any, i: number) => i !== idx);
                                  setFormData({ ...formData, attachments: newAttachments });
                                }}
                                className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          
                          {/* 이미지 미리보기 */}
                          {file.mimeType && file.mimeType.startsWith('image/') && file.data && (
                            <div className="p-3">
                              <img 
                                src={`data:${file.mimeType};base64,${file.data}`}
                                alt={file.name}
                                className="w-full rounded-lg border border-slate-200 max-h-64 object-contain bg-slate-50"
                              />
                            </div>
                          )}
                          
                          {/* PDF 파일 아이콘 */}
                          {file.mimeType && file.mimeType === 'application/pdf' && (
                            <div className="p-3 flex items-center justify-center bg-slate-50">
                              <div className="text-center">
                                <FileText size={48} className="text-red-500 mx-auto mb-2" />
                                <p className="text-xs text-slate-600 font-medium">PDF 문서</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-slate-500 mt-2">
                  * 통장사본, 명함, 계약서 등 추가 서류를 첨부할 수 있습니다 (각 최대 10MB)
                </p>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-3 lg:py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-black text-sm lg:text-base transition-all"
              >
                취소
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 lg:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm lg:text-base shadow-lg shadow-blue-200 transition-all"
              >
                {initialData ? '수정 완료' : '회사 등록'}
              </button>
            </div>
          </form>
        </div>
        
        {/* 우측 슬라이드 네비게이션 바 - 회사 등록 모달 */}
        <div 
          className="fixed top-1/2 -translate-y-1/2 w-3 bg-slate-300/50 rounded-full shadow-lg z-[110]" 
          style={{right: '560px', height: '300px'}}
        >
          {/* 위로 버튼 */}
          <button
            type="button"
            className="absolute -top-10 left-1/2 -translate-x-1/2 p-2 bg-slate-600/90 rounded-full hover:bg-slate-700 transition-all shadow-lg"
            onClick={() => {
              const modal = document.getElementById('company-form-modal');
              if (modal) {
                modal.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            title="맨 위로"
          >
            <ChevronUp size={16} className="text-white" />
          </button>
          
          {/* 드래그 가능한 썸 */}
          <div 
            className="absolute left-0 w-full bg-blue-600/90 rounded-full cursor-grab active:cursor-grabbing transition-colors hover:bg-blue-700 shadow-md"
            style={{height: '60px', top: `${companyScrollThumbTop}px`}}
            onMouseDown={handleCompanyThumbMouseDown}
            title="드래그하여 스크롤"
          />
          
          {/* 아래로 버튼 */}
          <button
            type="button"
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 p-2 bg-slate-600/90 rounded-full hover:bg-slate-700 transition-all shadow-lg"
            onClick={() => {
              const modal = document.getElementById('company-form-modal');
              if (modal) {
                modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
              }
            }}
            title="맨 아래로"
          >
            <ChevronDown size={16} className="text-white" />
          </button>
        </div>
      </div>
    );
  };

  const ContactFormModal = ({ onClose, onSubmit, currentCategory, initialData, departments, industries, outsourceTypes, geosangCompanyTypes, geosangDepartments, onAddDept, onAddIndustry, onAddOutsourceType, onRenameItem, isAdmin }: any) => {
    const isGeosang = (initialData?.category || currentCategory) === CategoryType.GEOSANG;
    const isOutsource = (initialData?.category || currentCategory) === CategoryType.OUTSOURCE;
    const isPurchase = (initialData?.category || currentCategory) === CategoryType.PURCHASE;
    const isFranchiseHQ = (initialData?.category || currentCategory) === CategoryType.FRANCHISE_HQ;
    const isFranchiseBR = (initialData?.category || currentCategory) === CategoryType.FRANCHISE_BR;
    const isInterior = (initialData?.category || currentCategory) === CategoryType.INTERIOR;
    const isSales = (initialData?.category || currentCategory) === CategoryType.SALES;
    const isOthers = (initialData?.category || currentCategory) === CategoryType.OTHERS;
    
    // 파트너 네트워크 카테고리 (회사 정보 자동 저장 대상)
    const isPartnerNetwork = isPurchase || isFranchiseHQ || isFranchiseBR || isInterior || isSales || isOthers;
    
    const showDepartmentFeature = !isOutsource;
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const companyLicenseInputRef = useRef<HTMLInputElement>(null);

    const staffModalRef = useRef<HTMLDivElement>(null);
    
    // 회사 사업자등록증 업로드 상태
    const [companyLicensePreview, setCompanyLicensePreview] = useState<string | null>(null);
    const [isUploadingCompanyLicense, setIsUploadingCompanyLicense] = useState(false);
    
    // 추가 서류 업로드 상태 (파트너 네트워크 카테고리용)
    const additionalFilesInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);
    
    // 슬라이드 네비게이션 바 상태 관리
    const [staffScrollThumbTop, setStaffScrollThumbTop] = useState(0);

    // 수정 모드에서 기존 파일 미리보기 설정
    useEffect(() => {
      if (initialData?.licenseFile) {
        const preview = `data:${initialData.licenseFile.mimeType};base64,${initialData.licenseFile.data}`;
        setCompanyLicensePreview(preview);
      }
    }, [initialData]);

    // 스크롤 이벤트 리스너 (거상 인원 등록 모달용)
    useEffect(() => {
      const modal = staffModalRef.current;
      if (!modal) return;

      const handleScroll = () => {
        const scrollPercentage = modal.scrollTop / (modal.scrollHeight - modal.clientHeight);
        const trackHeight = 300;
        const thumbHeight = 60;
        const maxThumbTop = trackHeight - thumbHeight;
        setStaffScrollThumbTop(scrollPercentage * maxThumbTop);
      };

      modal.addEventListener('scroll', handleScroll);
      handleScroll();
      
      return () => modal.removeEventListener('scroll', handleScroll);
    }, []);

    // 썸 드래그 핸들러 (거상 인원 등록 모달용)
    const handleStaffThumbMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startThumbTop = staffScrollThumbTop;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const trackHeight = 300;
        const thumbHeight = 60;
        const maxThumbTop = trackHeight - thumbHeight;
        
        let newThumbTop = startThumbTop + deltaY;
        newThumbTop = Math.max(0, Math.min(newThumbTop, maxThumbTop));
        
        const scrollPercentage = newThumbTop / maxThumbTop;
        const modal = staffModalRef.current;
        if (modal) {
          modal.scrollTop = scrollPercentage * (modal.scrollHeight - modal.clientHeight);
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    // 카테고리별 회사 정보 localStorage 키 (프랜차이즈 본사 제외)
    const getCompanyInfoKey = (category: CategoryType) => {
      const keyMap: Record<string, string> = {
        [CategoryType.GEOSANG]: 'geosang_company_info_v1',
        [CategoryType.PURCHASE]: 'purchase_company_info_v1',
        [CategoryType.FRANCHISE_BR]: 'franchise_br_company_info_v1',
        [CategoryType.INTERIOR]: 'interior_company_info_v1',
        [CategoryType.SALES]: 'sales_company_info_v1',
        [CategoryType.OTHERS]: 'others_company_info_v1'
      };
      return keyMap[category];
    };

    // 회사 정보 불러오기 (프랜차이즈 본사 제외)
    const getCompanyInfo = () => {
      if (isFranchiseHQ) return null; // 프랜차이즈 본사는 localStorage 사용 안 함
      if (!isGeosang && !isPartnerNetwork) return null;
      const key = getCompanyInfoKey(initialData?.category || currentCategory);
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    };

    const [formData, setFormData] = useState<Partial<Contact>>(() => {
      if (initialData) {
        return { ...initialData, attachments: initialData.attachments || [] };
      }
      
      // 프랜차이즈 본사는 localStorage 사용 안 함 - 완전히 빈 폼으로 시작
      if (isFranchiseHQ) {
        return {
          id: Date.now().toString(), 
          category: currentCategory,
          brandName: '', 
          industry: '',
          address: '',
          phone: '',
          phone2: '',
          email: '',
          homepage: '',
          bankAccount: '',
          subCategory: '',
          attachments: [],
          staffList: [{ 
            id: 's' + Date.now(), 
            name: '', 
            position: '', 
            phone: '', 
            email: '', 
            department: '', 
            rating: 5,
            region: '',
            bankAccount: '',
            residentNumber: '',
            features: ''
          }],
        };
      }
      
      // 외주팀 관리는 localStorage 사용 안 함 - 완전히 빈 폼으로 시작
      if (isOutsource) {
        return {
          id: Date.now().toString(), 
          category: currentCategory,
          brandName: '', 
          industry: '',
          address: '',
          phone: '',
          phone2: '',
          email: '',
          homepage: '',
          bankAccount: '',
          subCategory: '시공일당',
          attachments: [],
          staffList: [{ 
            id: 's' + Date.now(), 
            name: '', 
            position: '', 
            phone: '', 
            email: '', 
            department: '', 
            rating: 5,
            region: '',
            bankAccount: '',
            residentNumber: '',
            features: ''
          }],
        };
      }
      
      // 다른 카테고리는 기존 로직 사용
      const companyInfo = getCompanyInfo();
      return {
        id: Date.now().toString(), category: currentCategory,
        brandName: isGeosang ? (companyInfo?.brandName || '거상컴퍼니') : (companyInfo?.brandName || ''), 
        industry: companyInfo?.industry || '',
        address: companyInfo?.address || '',
        phone: companyInfo?.phone || '',
        phone2: companyInfo?.phone2 || '',
        email: companyInfo?.email || '',
        homepage: companyInfo?.homepage || '',
        bankAccount: companyInfo?.bankAccount || '',
        subCategory: '',
        attachments: [],
        staffList: [{ 
          id: 's' + Date.now(), 
          name: '', 
          position: '', 
          phone: '', 
          email: '', 
          department: showDepartmentFeature ? (departments[0] || '') : '', 
          rating: 5,
          region: '',
          bankAccount: '',
          residentNumber: '',
          features: ''
        }],
      };
    });

    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [newItemInput, setNewItemInput] = useState('');
    // 프랜차이즈 본사는 isEditingCompanyInfo 사용 안 함
    const [isEditingCompanyInfo, setIsEditingCompanyInfo] = useState(false);

    const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      const newAttachments = Array.from(files).map(file => {
        return new Promise<{ data: string; name: string; mimeType: string; size: number }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            const base64 = result.split(',')[1];
            resolve({
              data: base64,
              name: file.name,
              mimeType: file.type,
              size: file.size
            });
          };
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(newAttachments).then(attachments => {
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...attachments]
        }));
        if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      });
    };

    const handleRemoveAttachment = (index: number) => {
      setFormData(prev => ({
        ...prev,
        attachments: (prev.attachments || []).filter((_, i) => i !== index)
      }));
    };

    const handleStaffChange = (index: number, field: keyof Staff, value: any) => {
      setFormData(prev => {
        const currentList = prev.staffList || [];
        if (index >= currentList.length) {
          console.error('❌ Invalid staff index:', index, 'staffList length:', currentList.length);
          return prev;
        }
        const newList = [...currentList];
        newList[index] = { ...newList[index], [field]: value };
        return { ...prev, staffList: newList };
      });
    };

    const addStaff = () => {
      setFormData(prev => ({
        ...prev,
        staffList: [...(prev.staffList || []), { 
          id: 's' + Date.now(), 
          name: '', 
          position: '', 
          phone: '', 
          email: '', 
          department: showDepartmentFeature ? (selectedDepartment || departments[0] || '') : '', 
          rating: 5,
          region: '',
          bankAccount: '',
          residentNumber: '',
          features: ''
        }]
      }));
    };

    const removeStaff = (index: number) => {
      setFormData(prev => {
        if ((prev.staffList?.length || 0) <= 1) return prev;
        const newList = [...(prev.staffList || [])];
        newList.splice(index, 1);
        return { ...prev, staffList: newList };
      });
    };

    const inputClasses = "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 lg:py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-900 font-bold text-xs lg:text-sm transition-all";
    const labelClasses = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

    const renderItemManagement = (items: string[], type: 'DEPT' | 'INDUSTRY' | 'OUTSOURCE' | 'COMPANY_TYPE' | 'GEOSANG_DEPT', staffIdx?: number) => {
      const isSelected = (item: string) => {
        if (type === 'DEPT') return selectedDepartment === item;
        if (type === 'INDUSTRY') return formData.industry === item;
        if (type === 'COMPANY_TYPE') return formData.industry === item; // 거상 조직도 회사 구분
        if (type === 'GEOSANG_DEPT') {
          // 현재 직원 카드의 부서 선택 (인덱스 기반)
          if (staffIdx !== undefined) {
            const currentStaff = formData.staffList?.[staffIdx];
            return currentStaff?.department === item;
          }
          return false;
        }
        return formData.subCategory === item;
      };
      
      const handleDeleteItem = (item: string) => {
        if (!isAdmin) return;
        if (confirm(`'${item}' 항목을 삭제하시겠습니까?`)) {
          if (type === 'DEPT') {
            const newDepts = departments.filter(d => d !== item);
            setDepartments(newDepts);
            localStorage.setItem('geosang_departments_v3', JSON.stringify(newDepts));
          } else if (type === 'INDUSTRY') {
            const newInds = industries.filter(i => i !== item);
            setIndustries(newInds);
            localStorage.setItem('geosang_industries_v2', JSON.stringify(newInds));
          } else if (type === 'COMPANY_TYPE') {
            const newTypes = geosangCompanyTypes.filter(t => t !== item);
            setGeosangCompanyTypes(newTypes);
            localStorage.setItem('geosang_company_types_v1', JSON.stringify(newTypes));
          } else if (type === 'GEOSANG_DEPT') {
            const newDepts = geosangDepartments.filter(d => d !== item);
            setGeosangDepartments(newDepts);
            localStorage.setItem('geosang_departments_custom_v1', JSON.stringify(newDepts));
          } else {
            const newTypes = outsourceTypes.filter(t => t !== item);
            setOutsourceTypes(newTypes);
            localStorage.setItem('outsource_types_v3', JSON.stringify(newTypes));
          }
        }
      };
      
      const handleEditItem = (item: string) => {
        if (!isAdmin) return;
        const newName = prompt(`'${item}' 항목의 이름을 수정하시겠습니까?`, item);
        if (newName && newName !== item) {
          onRenameItem(item, newName, type);
          if (type === 'DEPT') {
            const newDepts = departments.map(d => d === item ? newName : d);
            setDepartments(newDepts);
            localStorage.setItem('geosang_departments_v3', JSON.stringify(newDepts));
          } else if (type === 'INDUSTRY') {
            const newInds = industries.map(i => i === item ? newName : i);
            setIndustries(newInds);
            localStorage.setItem('geosang_industries_v2', JSON.stringify(newInds));
          } else if (type === 'COMPANY_TYPE') {
            const newTypes = geosangCompanyTypes.map(t => t === item ? newName : t);
            setGeosangCompanyTypes(newTypes);
            localStorage.setItem('geosang_company_types_v1', JSON.stringify(newTypes));
          } else if (type === 'GEOSANG_DEPT') {
            const newDepts = geosangDepartments.map(d => d === item ? newName : d);
            setGeosangDepartments(newDepts);
            localStorage.setItem('geosang_departments_custom_v1', JSON.stringify(newDepts));
          } else {
            const newTypes = outsourceTypes.map(t => t === item ? newName : t);
            setOutsourceTypes(newTypes);
            localStorage.setItem('outsource_types_v3', JSON.stringify(newTypes));
          }
        }
      };
      
      return (
        <div className="bg-slate-50 p-4 lg:p-6 rounded-2xl border border-slate-200 space-y-3">
          <label className={labelClasses}>
            {type === 'DEPT' ? '팀 선택' : 
             type === 'INDUSTRY' ? '업종' : 
             type === 'COMPANY_TYPE' ? '회사 구분 *' :
             type === 'GEOSANG_DEPT' ? '부서 *' :
             '구분'}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {items.map(item => (
              <div key={item} className="relative group">
                <button 
                  type="button" 
                  onClick={() => { 
                    if (type === 'DEPT') { 
                      setSelectedDepartment(item); 
                      handleStaffChange(formData.staffList!.length - 1, 'department', item); 
                    } else if (type === 'INDUSTRY' || type === 'COMPANY_TYPE') {
                      setFormData({...formData, industry: item}); 
                    } else if (type === 'GEOSANG_DEPT') {
                      // 현재 직원의 부서 설정 (인덱스 기반)
                      if (staffIdx !== undefined) {
                        handleStaffChange(staffIdx, 'department', item);
                      }
                    } else {
                      setFormData({...formData, subCategory: item});
                    }
                  }} 
                  className={`px-3 py-1.5 rounded-lg text-[10px] lg:text-xs font-black border-2 transition-all ${isSelected(item) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                  {item}
                </button>
                {isAdmin && (
                  <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-20">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}
                      className="bg-blue-600 text-white p-1.5 rounded-full shadow-xl hover:bg-blue-700 transition-all border-2 border-white hover:scale-110"
                      title="이름 수정"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}
                      className="bg-red-600 text-white p-1.5 rounded-full shadow-xl hover:bg-red-700 transition-all border-2 border-white hover:scale-110"
                      title="삭제"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <input 
                className="flex-1 bg-white border-2 border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none" 
                placeholder="직접 추가..." 
                value={newItemInput} 
                onChange={e => setNewItemInput(e.target.value)} 
                onKeyPress={e => { 
                  if(e.key === 'Enter') { 
                    e.preventDefault(); 
                    if(newItemInput) { 
                      if (type === 'DEPT') onAddDept(newItemInput); 
                      else if (type === 'INDUSTRY') onAddIndustry(newItemInput); 
                      else if (type === 'COMPANY_TYPE') {
                        const newTypes = [...geosangCompanyTypes, newItemInput];
                        setGeosangCompanyTypes(newTypes);
                        localStorage.setItem('geosang_company_types_v1', JSON.stringify(newTypes));
                      }
                      else if (type === 'GEOSANG_DEPT') {
                        const newDepts = [...geosangDepartments, newItemInput];
                        setGeosangDepartments(newDepts);
                        localStorage.setItem('geosang_departments_custom_v1', JSON.stringify(newDepts));
                      }
                      else onAddOutsourceType(newItemInput); 
                      setNewItemInput(''); 
                    } 
                  } 
                }} 
              />
              <button 
                type="button" 
                onClick={() => { 
                  if(newItemInput) { 
                    if (type === 'DEPT') onAddDept(newItemInput); 
                    else if (type === 'INDUSTRY') onAddIndustry(newItemInput); 
                    else if (type === 'COMPANY_TYPE') {
                      const newTypes = [...geosangCompanyTypes, newItemInput];
                      setGeosangCompanyTypes(newTypes);
                      localStorage.setItem('geosang_company_types_v1', JSON.stringify(newTypes));
                    }
                    else if (type === 'GEOSANG_DEPT') {
                      const newDepts = [...geosangDepartments, newItemInput];
                      setGeosangDepartments(newDepts);
                      localStorage.setItem('geosang_departments_custom_v1', JSON.stringify(newDepts));
                    }
                    else onAddOutsourceType(newItemInput); 
                    setNewItemInput(''); 
                  } 
                }} 
                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-800 transition-all"
              >
                추가
              </button>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 lg:p-6">
        <div ref={staffModalRef} className="bg-white rounded-3xl lg:rounded-[3rem] w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl p-6 lg:p-10 scrollbar-hide relative">
          <div className="flex justify-between items-center mb-6 lg:mb-8">
            <h2 className="text-xl lg:text-3xl font-black tracking-tight">{isGeosang ? '거상 인원 등록' : '정보 등록'}</h2>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
          </div>
          <form onSubmit={e => { 
            e.preventDefault(); 
            
            // 유효성 검사
            if (!formData.staffList || formData.staffList.length === 0) {
              alert('❌ 최소 1명 이상의 인원을 등록해야 합니다.');
              return;
            }
            
            // 외주팀: 이름과 연락처 필수
            if (isOutsource) {
              const emptyStaff = formData.staffList.find(s => !s.name?.trim() || !s.phone?.trim());
              if (emptyStaff) {
                alert('❌ 외주팀 등록 시 이름과 연락처는 필수 입력입니다.');
                return;
              }
            } 
            // 다른 카테고리: 성명과 연락처 필수
            else {
              const emptyStaff = formData.staffList.find(s => !s.name?.trim() || !s.phone?.trim());
              if (emptyStaff) {
                alert('❌ 인원 등록 시 성명과 연락처는 필수 입력입니다.');
                return;
              }
            }
            
            console.log('=== 폼 제출 ===');
            console.log('formData:', formData);
            console.log('category:', formData.category);
            console.log('brandName:', formData.brandName);
            console.log('staffList:', formData.staffList);
            onSubmit(formData); 
          }} className="space-y-6 lg:space-y-8">
            {/* 거상 조직도 전용 UI */}
            {isGeosang && (
              <>
                {/* 회사 정보 카드 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 lg:p-8 rounded-3xl border-2 border-blue-200 shadow-sm relative">
                  <h3 className="text-lg lg:text-xl font-black text-blue-900 mb-6 flex items-center gap-2">
                    <Building2 size={24} className="text-blue-600" />
                    회사 정보
                  </h3>
                  
                  {/* 회사 구분 선택 */}
                  <div className="mb-6">
                    {renderItemManagement(geosangCompanyTypes, 'COMPANY_TYPE')}
                  </div>
                  
                  {/* 회사 기본 정보 입력 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <label className={labelClasses}>회사명</label>
                        {initialData && (
                          <span className="text-[8px] text-slate-400">(회사명 변경 시 자동완성 작동)</span>
                        )}
                      </div>
                      <input 
                        className={inputClasses} 
                        value={formData.brandName} 
                        onBlur={async (e) => {
                          const companyName = e.target.value.trim();
                          if (!companyName) return;
                          
                          // API로 동일한 회사명 검색
                          try {
                            const response = await fetch(`/api/contacts/search?name=${encodeURIComponent(companyName)}`);
                            const result = await response.json();
                            
                            if (result.success && result.data) {
                              const existingCompany = result.data;
                              
                              // 수정 모드이고 회사명이 변경되었을 때
                              const isEditMode = !!initialData;
                              const hasEmptyFields = !formData.address || !formData.phone || !formData.email;
                              
                              if (isEditMode && hasEmptyFields) {
                                // 빈 필드만 자동 입력
                                setFormData(prev => ({
                                  ...prev,
                                  address: prev.address || existingCompany.address || '',
                                  email: prev.email || existingCompany.email || '',
                                  homepage: prev.homepage || existingCompany.homepage || '',
                                  phone: prev.phone || existingCompany.phone || '',
                                  phone2: prev.phone2 || existingCompany.phone2 || '',
                                  bankAccount: prev.bankAccount || existingCompany.bankAccount || ''
                                }));
                                console.log('✅ 회사 정보 자동완성 (수정 모드):', existingCompany.brandName);
                              } else if (!isEditMode) {
                                // 신규 등록 모드: 빈 필드만 자동 입력
                                setFormData(prev => ({
                                  ...prev,
                                  address: prev.address || existingCompany.address || '',
                                  email: prev.email || existingCompany.email || '',
                                  homepage: prev.homepage || existingCompany.homepage || '',
                                  phone: prev.phone || existingCompany.phone || '',
                                  phone2: prev.phone2 || existingCompany.phone2 || '',
                                  bankAccount: prev.bankAccount || existingCompany.bankAccount || ''
                                }));
                                console.log('✅ 회사 정보 자동완성 (신규 등록):', existingCompany.brandName);
                              }
                            }
                          } catch (error) {
                            console.error('회사명 조회 실패:', error);
                          }
                        }}
                        onChange={e => setFormData(prev => ({...prev, brandName: e.target.value}))} 
                        placeholder="회사명을 입력하세요"
                        required
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className={labelClasses}>주소</label>
                      <input 
                        className={inputClasses} 
                        value={formData.address} 
                        onChange={e => setFormData(prev => ({...prev, address: e.target.value}))} 
                        placeholder="회사 주소를 입력하세요"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className={labelClasses}>이메일</label>
                      <input 
                        className={inputClasses} 
                        value={formData.email} 
                        onChange={e => setFormData(prev => ({...prev, email: e.target.value}))} 
                        placeholder="company@example.com"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className={labelClasses}>홈페이지</label>
                      <input 
                        className={inputClasses} 
                        value={formData.homepage} 
                        onChange={e => setFormData(prev => ({...prev, homepage: e.target.value}))} 
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className={labelClasses}>대표번호 1</label>
                      <input 
                        className={inputClasses} 
                        value={formData.phone} 
                        onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))} 
                        placeholder="02-1234-5678"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className={labelClasses}>대표번호 2</label>
                      <input 
                        className={inputClasses} 
                        value={formData.phone2} 
                        onChange={e => setFormData(prev => ({...prev, phone2: e.target.value}))} 
                        placeholder="02-8765-4321"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className={labelClasses}>계좌번호</label>
                      <input 
                        className={inputClasses} 
                        value={formData.bankAccount} 
                        onChange={e => setFormData(prev => ({...prev, bankAccount: e.target.value}))} 
                        placeholder="은행명 계좌번호 예금주"
                      />
                    </div>
                    
                    {/* 회사 사업자등록증 업로드 */}
                    <div className="lg:col-span-2 mt-6">
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border-2 border-emerald-200">
                        <label className="block text-sm lg:text-base font-black text-emerald-700 mb-4 flex items-center gap-2">
                          <FileText size={20} className="text-emerald-600" />
                          회사 사업자등록증
                        </label>
                        <input
                          ref={companyLicenseInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            if (file.size > 10 * 1024 * 1024) {
                              alert('❌ 파일 크기는 10MB 이하여야 합니다.');
                              return;
                            }
                            
                            setIsUploadingCompanyLicense(true);
                            
                            try {
                              // 이미지 압축 및 인코딩
                              const compressed = await compressAndEncodeFile(file);
                              
                              // 압축 결과 로그
                              const compressionRatio = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
                              console.log(`✅ 이미지 압축 완료: ${(compressed.originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressed.compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% 감소)`);
                              
                              // 미리보기 생성
                              const previewUrl = `data:${compressed.mimeType};base64,${compressed.data}`;
                              setCompanyLicensePreview(previewUrl);
                              
                              setFormData(prev => ({
                                ...prev,
                                licenseFile: {
                                  data: compressed.data,
                                  name: compressed.name,
                                  mimeType: compressed.mimeType
                                }
                              }));
                            } catch (error) {
                              console.error('파일 업로드 오류:', error);
                              alert('❌ 파일 업로드 중 오류가 발생했습니다.');
                            } finally {
                              setIsUploadingCompanyLicense(false);
                            }
                          }}
                        />
                        
                        <div className="flex gap-3 mb-4">
                          <button
                            type="button"
                            onClick={() => companyLicenseInputRef.current?.click()}
                            disabled={isUploadingCompanyLicense}
                            className="flex-1 bg-emerald-600 text-white px-5 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base hover:bg-emerald-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                          >
                            {isUploadingCompanyLicense ? (
                              <>
                                <Loader2 size={20} className="animate-spin" />
                                업로드 중...
                              </>
                            ) : (
                              <>
                                <Upload size={20} />
                                {formData.licenseFile || companyLicensePreview ? '파일 재선택' : '파일 선택'}
                              </>
                            )}
                          </button>
                          
                          {(formData.licenseFile || companyLicensePreview) && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, licenseFile: null }));
                                setCompanyLicensePreview(null);
                                if (companyLicenseInputRef.current) {
                                  companyLicenseInputRef.current.value = '';
                                }
                              }}
                              className="bg-red-100 text-red-600 px-5 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base hover:bg-red-200 transition-all flex items-center gap-2"
                            >
                              <Trash2 size={20} />
                              삭제
                            </button>
                          )}
                        </div>
                        
                        {(companyLicensePreview || formData.licenseFile) && (
                          <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-5 border-2 border-emerald-200">
                            <div className="flex items-center gap-3 mb-3">
                              <FileText size={22} className="text-emerald-600" />
                              <div className="flex-1">
                                <p className="text-sm lg:text-base font-bold text-slate-900">사업자등록증</p>
                                <p className="text-xs lg:text-sm text-slate-500">{formData.licenseFile?.name || '파일 업로드됨'}</p>
                              </div>
                              {formData.licenseFile && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = `data:${formData.licenseFile.mimeType};base64,${formData.licenseFile.data}`;
                                    link.download = formData.licenseFile.name;
                                    link.click();
                                  }}
                                  className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-all"
                                  title="다운로드"
                                >
                                  <Download size={20} />
                                </button>
                              )}
                            </div>
                            {companyLicensePreview && companyLicensePreview.startsWith('data:image') && (
                              <img 
                                src={companyLicensePreview} 
                                alt="사업자등록증 미리보기" 
                                className="w-full rounded-lg border border-slate-200 max-h-64 object-contain"
                              />
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs lg:text-sm text-slate-500 mt-3 flex items-center gap-1">
                          <Info size={14} />
                          이미지 또는 PDF 파일 (최대 10MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 직원 정보 카드들 */}
                <div id="staff-info-section" className="border-t-2 border-slate-200 pt-6 lg:pt-8 scroll-mt-20">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg lg:text-xl font-black text-slate-900 flex items-center gap-2">
                      <Users size={24} className="text-blue-600" />
                      직원 정보
                    </h3>
                    <button 
                      type="button" 
                      onClick={addStaff} 
                      className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all"
                    >
                      <Plus size={16}/> 인원 추가
                    </button>
                  </div>

                  {/* 직원 카드 리스트 */}
                  <div className="space-y-4">
                    {formData.staffList?.map((staff, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-slate-50 to-gray-50 p-6 lg:p-8 rounded-2xl border-2 border-slate-200 shadow-sm relative">
                        {formData.staffList!.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeStaff(idx)} 
                            className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-full transition-all"
                            title="삭제"
                          >
                            <Trash2 size={18}/>
                          </button>
                        )}
                        
                        {/* 부서 선택 */}
                        <div className="mb-6">
                          <label className={labelClasses}>부서 구분 *</label>
                          {renderItemManagement(geosangDepartments, 'GEOSANG_DEPT', idx)}
                        </div>

                        {/* 직원 기본 정보 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="col-span-1">
                            <label className={labelClasses}>이름 *</label>
                            <input 
                              className={inputClasses} 
                              value={staff.name || ''} 
                              onChange={e => handleStaffChange(idx, 'name', e.target.value)} 
                              placeholder="이름을 입력하세요"
                              required 
                            />
                          </div>
                          <div className="col-span-1">
                            <label className={labelClasses}>직함</label>
                            <input 
                              className={inputClasses} 
                              value={staff.position || ''} 
                              onChange={e => handleStaffChange(idx, 'position', e.target.value)} 
                              placeholder="직함을 입력하세요"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className={labelClasses}>이메일</label>
                            <input 
                              className={inputClasses} 
                              value={staff.email || ''} 
                              onChange={e => handleStaffChange(idx, 'email', e.target.value)} 
                              placeholder="example@company.com"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className={labelClasses}>핸드폰번호 *</label>
                            <input 
                              className={inputClasses} 
                              value={staff.phone || ''} 
                              onChange={e => handleStaffChange(idx, 'phone', e.target.value)} 
                              placeholder="010-1234-5678"
                              required 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 외주팀 관리 UI */}
            {isOutsource && (
              <div className="space-y-4 lg:space-y-6">
                {/* 구분 선택 (시공일당, 크레인) */}
                <div>
                  <label className={labelClasses}>구분 *</label>
                  {renderItemManagement(outsourceTypes, 'OUTSOURCE')}
                </div>
                
                {/* 외주팀 기본 정보 입력 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  <div className="lg:col-span-2">
                    <label className={labelClasses}>이름 *</label>
                    <input 
                      className={inputClasses} 
                      value={formData.staffList?.[0]?.name || ''} 
                      onChange={e => handleStaffChange(0, 'name', e.target.value)} 
                      placeholder="이름을 입력하세요"
                      required
                    />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <label className={labelClasses}>연락처 *</label>
                    <input 
                      className={inputClasses} 
                      value={formData.staffList?.[0]?.phone || ''} 
                      onChange={e => handleStaffChange(0, 'phone', e.target.value)} 
                      placeholder="010-1234-5678"
                      required
                    />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <label className={labelClasses}>주소</label>
                    <input 
                      className={inputClasses} 
                      value={formData.staffList?.[0]?.region || ''} 
                      onChange={e => handleStaffChange(0, 'region', e.target.value)} 
                      placeholder="주소를 입력하세요"
                    />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <label className={labelClasses}>계좌번호</label>
                    <input 
                      className={inputClasses} 
                      value={formData.staffList?.[0]?.bankAccount || ''} 
                      onChange={e => handleStaffChange(0, 'bankAccount', e.target.value)} 
                      placeholder="은행명 계좌번호 예금주"
                    />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <label className={labelClasses}>비고</label>
                    <textarea 
                      className={inputClasses + " min-h-[100px] resize-y"} 
                      value={formData.staffList?.[0]?.features || ''} 
                      onChange={e => handleStaffChange(0, 'features', e.target.value)} 
                      placeholder="특이사항, 메모 등을 입력하세요"
                    />
                  </div>
                  
                  {/* 주민등록증 사본 업로드 */}
                  <div className="lg:col-span-2">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border-2 border-blue-200">
                      <label className="block text-sm lg:text-base font-black text-blue-700 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        주민등록증 사본
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        id="idCardInput"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          if (file.size > 10 * 1024 * 1024) {
                            alert('❌ 파일 크기는 10MB 이하여야 합니다.');
                            return;
                          }
                          
                          try {
                            const compressed = await compressAndEncodeFile(file);
                            const compressionRatio = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
                            console.log(`✅ 주민등록증 압축: ${(compressed.originalSize / 1024).toFixed(1)}KB → ${(compressed.compressedSize / 1024).toFixed(1)}KB (${compressionRatio}% 감소)`);
                            
                            handleStaffChange(0, 'idCardFile', {
                              data: compressed.data,
                              name: compressed.name,
                              mimeType: compressed.mimeType,
                              size: compressed.compressedSize
                            });
                          } catch (error) {
                            console.error('파일 업로드 오류:', error);
                            alert('❌ 파일 업로드 중 오류가 발생했습니다.');
                          }
                        }}
                      />
                      
                      <div className="flex gap-3 mb-4">
                        <button
                          type="button"
                          onClick={() => document.getElementById('idCardInput')?.click()}
                          className="flex-1 bg-blue-600 text-white px-5 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Upload size={20} />
                          {formData.staffList?.[0]?.idCardFile ? '파일 재선택' : '파일 선택'}
                        </button>
                        
                        {formData.staffList?.[0]?.idCardFile && (
                          <button
                            type="button"
                            onClick={() => {
                              handleStaffChange(0, 'idCardFile', null);
                              const input = document.getElementById('idCardInput') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                            className="bg-red-100 text-red-600 px-5 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base hover:bg-red-200 transition-all flex items-center gap-2"
                          >
                            <Trash2 size={20} />
                            삭제
                          </button>
                        )}
                      </div>
                      
                      {formData.staffList?.[0]?.idCardFile && (
                        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-5 border-2 border-blue-200">
                          <div className="flex items-center gap-3">
                            <FileText size={22} className="text-blue-600" />
                            <div className="flex-1">
                              <p className="text-sm lg:text-base font-bold text-slate-900">주민등록증 사본</p>
                              <p className="text-xs lg:text-sm text-slate-500">{formData.staffList[0].idCardFile.name}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const file = formData.staffList?.[0]?.idCardFile;
                                if (file) {
                                  const link = document.createElement('a');
                                  link.href = `data:${file.mimeType};base64,${file.data}`;
                                  link.download = file.name;
                                  link.click();
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-all"
                              title="다운로드"
                            >
                              <Download size={20} />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs lg:text-sm text-slate-500 mt-3 flex items-center gap-1">
                        <Info size={14} />
                        이미지 또는 PDF 파일 (최대 10MB)
                      </p>
                    </div>
                  </div>
                  
                  {/* 통장 사본 업로드 */}
                  <div className="lg:col-span-2">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border-2 border-green-200">
                      <label className="block text-sm lg:text-base font-black text-green-700 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-green-600" />
                        통장 사본
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        id="bankBookInput"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          if (file.size > 10 * 1024 * 1024) {
                            alert('❌ 파일 크기는 10MB 이하여야 합니다.');
                            return;
                          }
                          
                          try {
                            const compressed = await compressAndEncodeFile(file);
                            const compressionRatio = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
                            console.log(`✅ 통장사본 압축: ${(compressed.originalSize / 1024).toFixed(1)}KB → ${(compressed.compressedSize / 1024).toFixed(1)}KB (${compressionRatio}% 감소)`);
                            
                            handleStaffChange(0, 'bankBookFile', {
                              data: compressed.data,
                              name: compressed.name,
                              mimeType: compressed.mimeType,
                              size: compressed.compressedSize
                            });
                          } catch (error) {
                            console.error('파일 업로드 오류:', error);
                            alert('❌ 파일 업로드 중 오류가 발생했습니다.');
                          }
                        }}
                      />
                      
                      <div className="flex gap-3 mb-4">
                        <button
                          type="button"
                          onClick={() => document.getElementById('bankBookInput')?.click()}
                          className="flex-1 bg-green-600 text-white px-5 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Upload size={20} />
                          {formData.staffList?.[0]?.bankBookFile ? '파일 재선택' : '파일 선택'}
                        </button>
                        
                        {formData.staffList?.[0]?.bankBookFile && (
                          <button
                            type="button"
                            onClick={() => {
                              handleStaffChange(0, 'bankBookFile', null);
                              const input = document.getElementById('bankBookInput') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                            className="bg-red-100 text-red-600 px-5 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base hover:bg-red-200 transition-all flex items-center gap-2"
                          >
                            <Trash2 size={20} />
                            삭제
                          </button>
                        )}
                      </div>
                      
                      {formData.staffList?.[0]?.bankBookFile && (
                        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-5 border-2 border-green-200">
                          <div className="flex items-center gap-3">
                            <FileText size={22} className="text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm lg:text-base font-bold text-slate-900">통장 사본</p>
                              <p className="text-xs lg:text-sm text-slate-500">{formData.staffList[0].bankBookFile.name}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const file = formData.staffList?.[0]?.bankBookFile;
                                if (file) {
                                  const link = document.createElement('a');
                                  link.href = `data:${file.mimeType};base64,${file.data}`;
                                  link.download = file.name;
                                  link.click();
                                }
                              }}
                              className="text-green-600 hover:text-green-700 p-2 hover:bg-green-50 rounded-lg transition-all"
                              title="다운로드"
                            >
                              <Download size={20} />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs lg:text-sm text-slate-500 mt-3 flex items-center gap-1">
                        <Info size={14} />
                        이미지 또는 PDF 파일 (최대 10MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 다른 카테고리 UI */}
            {!isGeosang && !isOutsource && (
              <div className="space-y-4 lg:space-y-6">
                {(isGeosang || isPartnerNetwork) && !isFranchiseHQ && ( // UPDATED: 다른 카테고리용
                  <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Info size={16} className="text-blue-600" />
                      <span className="text-xs font-bold text-blue-900">회사 정보는 최초 등록 후 수정 아이콘으로만 변경 가능합니다</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingCompanyInfo(prev => !prev)}
                      className={`p-2 rounded-lg transition-all ${isEditingCompanyInfo ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-100'}`}
                      title={isEditingCompanyInfo ? '수정 완료' : '회사 정보 수정'}
                    >
                      {isEditingCompanyInfo ? <Check size={16} /> : <Pencil size={16} />}
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  <div className="lg:col-span-2"><label className={labelClasses}>상호 / 브랜드명</label><input className={inputClasses} value={formData.brandName} onChange={e => setFormData(prev => ({...prev, brandName: e.target.value}))} disabled={isFranchiseHQ ? false : ((isGeosang || isPartnerNetwork) && !isEditingCompanyInfo)} /></div> {/* UPDATED */}
                  <div className="lg:col-span-2">{renderItemManagement(industries, 'INDUSTRY')}</div>
                  <div className="lg:col-span-2"><label className={labelClasses}>상세 주소</label><input className={inputClasses} value={formData.address} onChange={e => setFormData(prev => ({...prev, address: e.target.value}))} disabled={isFranchiseHQ ? false : ((isGeosang || isPartnerNetwork) && !isEditingCompanyInfo)} /></div> {/* UPDATED */}
                  <div className="col-span-1"><label className={labelClasses}>대표번호 1</label><input className={inputClasses} value={formData.phone} onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))} disabled={isFranchiseHQ ? false : ((isGeosang || isPartnerNetwork) && !isEditingCompanyInfo)} /></div> {/* UPDATED */}
                  <div className="col-span-1"><label className={labelClasses}>대표번호 2</label><input className={inputClasses} value={formData.phone2} onChange={e => setFormData(prev => ({...prev, phone2: e.target.value}))} disabled={isFranchiseHQ ? false : ((isGeosang || isPartnerNetwork) && !isEditingCompanyInfo)} /></div> {/* UPDATED */}
                  <div className="col-span-1"><label className={labelClasses}>이메일</label><input className={inputClasses} value={formData.email} onChange={e => setFormData(prev => ({...prev, email: e.target.value}))} disabled={isFranchiseHQ ? false : ((isGeosang || isPartnerNetwork) && !isEditingCompanyInfo)} /></div> {/* UPDATED */}
                  <div className="col-span-1"><label className={labelClasses}>홈페이지 주소</label><input className={inputClasses} value={formData.homepage} onChange={e => setFormData(prev => ({...prev, homepage: e.target.value}))} disabled={isFranchiseHQ ? false : ((isGeosang || isPartnerNetwork) && !isEditingCompanyInfo)} /></div> {/* UPDATED */}
                  <div className="lg:col-span-2"><label className={labelClasses}>계좌번호</label><input className={inputClasses} value={formData.bankAccount} onChange={e => setFormData(prev => ({...prev, bankAccount: e.target.value}))} placeholder="은행명 계좌번호 예금주" disabled={isFranchiseHQ ? false : ((isGeosang || isPartnerNetwork) && !isEditingCompanyInfo)} /></div> {/* UPDATED */}
                </div>
              </div>
            )}
            
            {/* 회사 사업자등록증 업로드 (파트너 네트워크 카테고리 전용) */}
            {isPartnerNetwork && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 lg:p-8 rounded-3xl border-2 border-emerald-200">
                <label className="block text-sm lg:text-base font-black text-emerald-700 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" />
                  📄 회사 사업자등록증
                </label>
                <input
                  ref={companyLicenseInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    if (file.size > 10 * 1024 * 1024) {
                      alert('❌ 파일 크기는 10MB 이하여야 합니다.');
                      return;
                    }
                    
                    setIsUploadingCompanyLicense(true);
                    
                    try {
                      // 이미지 압축 및 인코딩
                      const compressed = await compressAndEncodeFile(file);
                      
                      // 압축 결과 로그
                      const compressionRatio = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
                      console.log(`✅ 이미지 압축 완료: ${(compressed.originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressed.compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% 감소)`);
                      
                      // 미리보기 생성
                      const previewUrl = `data:${compressed.mimeType};base64,${compressed.data}`;
                      setCompanyLicensePreview(previewUrl);
                      
                      setFormData(prev => ({
                        ...prev,
                        licenseFile: {
                          data: compressed.data,
                          name: compressed.name,
                          mimeType: compressed.mimeType
                        }
                      }));
                    } catch (error) {
                      console.error('파일 업로드 오류:', error);
                      alert('❌ 파일 업로드 중 오류가 발생했습니다.');
                    } finally {
                      setIsUploadingCompanyLicense(false);
                    }
                  }}
                />
                
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => companyLicenseInputRef.current?.click()}
                    disabled={isUploadingCompanyLicense}
                    className="flex-1 bg-emerald-600 text-white px-5 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base hover:bg-emerald-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isUploadingCompanyLicense ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        {formData.licenseFile || companyLicensePreview ? '파일 재선택' : '파일 선택'}
                      </>
                    )}
                  </button>
                  
                  {(formData.licenseFile || companyLicensePreview) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, licenseFile: null }));
                        setCompanyLicensePreview(null);
                        if (companyLicenseInputRef.current) {
                          companyLicenseInputRef.current.value = '';
                        }
                      }}
                      className="bg-red-100 text-red-600 px-5 py-3 lg:py-3.5 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base hover:bg-red-200 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={20} />
                      삭제
                    </button>
                  )}
                </div>
                
                {(companyLicensePreview || formData.licenseFile) && (
                  <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-5 border-2 border-emerald-200">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText size={22} className="text-emerald-600" />
                      <div className="flex-1">
                        <p className="text-sm lg:text-base font-bold text-slate-900">사업자등록증</p>
                        <p className="text-xs lg:text-sm text-slate-500">{formData.licenseFile?.name || initialData?.licenseFile?.name || '파일 업로드됨'}</p>
                      </div>
                      {(formData.licenseFile || initialData?.licenseFile) && (
                        <button
                          type="button"
                          onClick={() => {
                            const file = formData.licenseFile || initialData?.licenseFile;
                            if (file) {
                              const link = document.createElement('a');
                              link.href = `data:${file.mimeType};base64,${file.data}`;
                              link.download = file.name;
                              link.click();
                            }
                          }}
                          className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-all"
                          title="다운로드"
                        >
                          <Download size={20} />
                        </button>
                      )}
                    </div>
                    {companyLicensePreview && companyLicensePreview.startsWith('data:image') && (
                      <img 
                        src={companyLicensePreview} 
                        alt="사업자등록증 미리보기" 
                        className="w-full rounded-lg border border-slate-200 max-h-64 object-contain bg-slate-50"
                      />
                    )}
                    {companyLicensePreview && !companyLicensePreview.startsWith('data:image') && initialData?.licenseFile?.mimeType?.startsWith('image/') && (
                      <img 
                        src={companyLicensePreview} 
                        alt="사업자등록증 미리보기" 
                        className="w-full rounded-lg border border-slate-200 max-h-64 object-contain bg-slate-50"
                      />
                    )}
                    {formData.licenseFile?.mimeType === 'application/pdf' && (
                      <div className="p-3 flex items-center justify-center bg-slate-50">
                        <div className="text-center">
                          <FileText size={48} className="text-red-500 mx-auto mb-2" />
                          <p className="text-xs text-slate-600 font-medium">PDF 문서</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-xs lg:text-sm text-slate-500 mt-3 flex items-center gap-1">
                  <Info size={14} />
                  이미지 또는 PDF 파일 (최대 10MB)
                </p>
              </div>
            )}
            
            {/* 추가 서류 업로드 (파트너 네트워크 카테고리 전용) */}
            {isPartnerNetwork && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 lg:p-8 rounded-3xl border-2 border-blue-200">
                <label className="block text-sm lg:text-base font-black text-blue-700 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  📎 추가 서류 (통장사본, 명함 등)
                </label>
                <div className="space-y-4">
                  <input
                    ref={additionalFilesInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      
                      // 파일 크기 체크 (각 10MB)
                      const oversized = files.find(f => f.size > 10 * 1024 * 1024);
                      if (oversized) {
                        alert('❌ 각 파일 크기는 10MB 이하여야 합니다.');
                        return;
                      }
                      
                      setIsUploadingAdditional(true);
                      
                      try {
                        const newAttachments = await Promise.all(
                          files.map(async (file) => {
                            const compressed = await compressAndEncodeFile(file);
                            const compressionRatio = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
                            console.log(`✅ ${file.name} 압축: ${(compressed.originalSize / 1024).toFixed(1)}KB → ${(compressed.compressedSize / 1024).toFixed(1)}KB (${compressionRatio}% 감소)`);
                            
                            return {
                              data: compressed.data,
                              name: compressed.name,
                              mimeType: compressed.mimeType,
                              size: compressed.compressedSize
                            };
                          })
                        );
                        
                        setFormData({
                          ...formData,
                          attachments: [...(formData.attachments || []), ...newAttachments]
                        });
                      } catch (error) {
                        console.error('파일 업로드 오류:', error);
                        alert('❌ 파일 업로드 중 오류가 발생했습니다.');
                      } finally {
                        setIsUploadingAdditional(false);
                        if (additionalFilesInputRef.current) {
                          additionalFilesInputRef.current.value = '';
                        }
                      }
                    }}
                  />
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => additionalFilesInputRef.current?.click()}
                      disabled={isUploadingAdditional}
                      className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isUploadingAdditional ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          파일 추가 (여러 개 선택 가능)
                        </>
                      )}
                    </button>
                    
                    {formData.attachments && formData.attachments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, attachments: [] });
                        }}
                        className="bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-200 transition-all flex items-center gap-2"
                      >
                        <Trash2 size={18} />
                        전체 삭제
                      </button>
                    )}
                  </div>
                  
                  {/* 첨부파일 목록 */}
                  {formData.attachments && formData.attachments.length > 0 && (
                    <div className="bg-white rounded-xl p-4 border-2 border-blue-200 space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText size={20} className="text-blue-600" />
                          <p className="text-sm font-bold text-slate-900">
                            첨부파일 {formData.attachments.length}개
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {formData.attachments.map((file: any, idx: number) => (
                          <div 
                            key={idx} 
                            className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
                          >
                            {/* 파일 정보 헤더 */}
                            <div className="flex items-center justify-between p-3 bg-white border-b border-slate-200">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText size={16} className="text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = `data:${file.mimeType};base64,${file.data}`;
                                    link.download = file.name;
                                    link.click();
                                  }}
                                  className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="다운로드"
                                >
                                  <Download size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newAttachments = formData.attachments.filter((_: any, i: number) => i !== idx);
                                    setFormData({ ...formData, attachments: newAttachments });
                                  }}
                                  className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  title="삭제"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            
                            {/* 이미지 미리보기 */}
                            {file.mimeType && file.mimeType.startsWith('image/') && file.data && (
                              <div className="p-3">
                                <img 
                                  src={`data:${file.mimeType};base64,${file.data}`}
                                  alt={file.name}
                                  className="w-full rounded-lg border border-slate-200 max-h-64 object-contain bg-slate-50"
                                />
                              </div>
                            )}
                            
                            {/* PDF 파일 아이콘 */}
                            {file.mimeType && file.mimeType === 'application/pdf' && (
                              <div className="p-3 flex items-center justify-center bg-slate-50">
                                <div className="text-center">
                                  <FileText size={48} className="text-red-500 mx-auto mb-2" />
                                  <p className="text-xs text-slate-600 font-medium">PDF 문서</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-slate-500 mt-2">
                    * 통장사본, 명함, 계약서 등 추가 서류를 첨부할 수 있습니다 (각 최대 10MB)
                  </p>
                </div>
              </div>
            )}
            
            {/* 직원 정보 섹션 - 파트너 네트워크 카테고리 전용 */}
            {isPartnerNetwork && (
              <div id="staff-info-section" className="border-t-2 border-slate-200 pt-6 lg:pt-8 scroll-mt-20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg lg:text-xl font-black text-slate-900 flex items-center gap-2">
                    <Users size={24} className="text-blue-600" />
                    직원 정보
                  </h3>
                  <button 
                    type="button" 
                    onClick={addStaff} 
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all"
                  >
                    <Plus size={16}/> 인원 추가
                  </button>
                </div>

                {/* 직원 카드 리스트 */}
                <div className="space-y-4">
                  {formData.staffList?.map((staff, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-slate-50 to-gray-50 p-6 lg:p-8 rounded-2xl border-2 border-slate-200 shadow-sm relative">
                      {formData.staffList!.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeStaff(idx)} 
                          className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-full transition-all"
                          title="삭제"
                        >
                          <Trash2 size={18}/>
                        </button>
                      )}
                      
                      {/* 부서 선택 */}
                      <div className="mb-6">
                        <label className={labelClasses}>부서 구분 *</label>
                        {renderItemManagement(geosangDepartments, 'GEOSANG_DEPT', idx)}
                      </div>

                      {/* 직원 기본 정보 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="col-span-1">
                          <label className={labelClasses}>이름 *</label>
                          <input 
                            className={inputClasses} 
                            value={staff.name || ''} 
                            onChange={e => handleStaffChange(idx, 'name', e.target.value)} 
                            placeholder="이름을 입력하세요"
                            required 
                          />
                        </div>
                        <div className="col-span-1">
                          <label className={labelClasses}>직함</label>
                          <input 
                            className={inputClasses} 
                            value={staff.position || ''} 
                            onChange={e => handleStaffChange(idx, 'position', e.target.value)} 
                            placeholder="직함을 입력하세요"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className={labelClasses}>이메일</label>
                          <input 
                            className={inputClasses} 
                            value={staff.email || ''} 
                            onChange={e => handleStaffChange(idx, 'email', e.target.value)} 
                            placeholder="example@company.com"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className={labelClasses}>핸드폰번호 *</label>
                          <input 
                            className={inputClasses} 
                            value={staff.phone || ''} 
                            onChange={e => handleStaffChange(idx, 'phone', e.target.value)} 
                            placeholder="010-1234-5678"
                            required 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button type="submit" className="w-full bg-blue-600 text-white py-4 lg:py-5 rounded-2xl lg:rounded-[1.5rem] font-black text-sm lg:text-lg shadow-xl hover:bg-blue-700 transition-all sticky bottom-0 z-10">저장하기</button>
          </form>
        </div>
        
        {/* 우측 슬라이드 네비게이션 바 - 거상 인원 등록 모달 */}
        <div 
          className="fixed top-1/2 -translate-y-1/2 w-3 bg-slate-300/50 rounded-full shadow-lg z-[110]" 
          style={{right: '560px', height: '300px'}}
        >
          {/* 위로 버튼 */}
          <button
            type="button"
            className="absolute -top-10 left-1/2 -translate-x-1/2 p-2 bg-slate-600/90 rounded-full hover:bg-slate-700 transition-all shadow-lg"
            onClick={() => {
              const modal = staffModalRef.current;
              if (modal) {
                modal.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            title="맨 위로"
          >
            <ChevronUp size={16} className="text-white" />
          </button>
          
          {/* 드래그 가능한 썸 */}
          <div 
            className="absolute left-0 w-full bg-blue-600/90 rounded-full cursor-grab active:cursor-grabbing transition-colors hover:bg-blue-700 shadow-md"
            style={{height: '60px', top: `${staffScrollThumbTop}px`}}
            onMouseDown={handleStaffThumbMouseDown}
            title="드래그하여 스크롤"
          />
          
          {/* 아래로 버튼 */}
          <button
            type="button"
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 p-2 bg-slate-600/90 rounded-full hover:bg-slate-700 transition-all shadow-lg"
            onClick={() => {
              const modal = staffModalRef.current;
              if (modal) {
                modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
              }
            }}
            title="맨 아래로"
          >
            <ChevronDown size={16} className="text-white" />
          </button>
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-600 rounded-full blur-[100px] sm:blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-indigo-600 rounded-full blur-[100px] sm:blur-[120px]"></div>
        </div>
        <div className="w-full max-w-sm sm:max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative z-10 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/40 mb-6">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tighter mb-1">거상커넥트</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">System Login</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" placeholder="아이디" className="w-full bg-white/5 border-2 border-white/10 rounded-xl sm:rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all font-bold text-sm placeholder:text-slate-600" value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
              </div>
            </div>
            <div className="text-left">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4 mb-1 block">Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="password" placeholder="비밀번호" className={`w-full bg-white/5 border-2 ${authError ? 'border-red-500/50' : 'border-white/10'} rounded-xl sm:rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all font-bold text-sm placeholder:text-slate-600`} value={loginPw} onChange={(e) => {setLoginPw(e.target.value); setAuthError(false);}} required />
              </div>
            </div>
            {authError && <p className="text-red-400 text-[10px] font-black animate-pulse">정보가 올바르지 않습니다.</p>}
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl sm:rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  로그인 중...
                </>
              ) : '로그인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getCategoryName = (cat: CategoryType) => {
    switch (cat) {
      case CategoryType.GEOSANG: return '거상 조직도';
      case CategoryType.OUTSOURCE: return '외주팀 관리';
      case CategoryType.PURCHASE: return '매입 거래처';
      case CategoryType.FRANCHISE_HQ: return '프랜차이즈 본사';
      case CategoryType.FRANCHISE_BR: return '프랜차이즈 지점';
      case CategoryType.INTERIOR: return '인테리어';
      case CategoryType.SALES: return '요식업(개인)';
      case CategoryType.OTHERS: return '기타 거래처';
      default: return cat;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans tracking-tight text-slate-900">
      {/* 좌측 사이드바: 모바일에서는 숨김, 태블릿 이상에서 표시 */}
      <aside className="hidden md:flex md:w-64 lg:w-72 bg-slate-900 text-white flex-col shadow-2xl z-[60] relative">
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg md:text-xl lg:text-2xl font-black tracking-tighter flex items-center gap-2"><Layers className="text-blue-400" /> 거상커넥트</h1>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <span className="text-[10px] lg:text-[11px] text-slate-200 font-bold">{currentUser.name}</span>
            </div>
            {isAdmin && <span className="text-[8px] bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-black w-fit uppercase tracking-widest">Master Admin</span>}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto pb-8 scrollbar-hide">
          <SidebarItem icon={<Users size={18} />} label="거상 조직도" active={activeCategory === CategoryType.GEOSANG && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.GEOSANG); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<HardHat size={18} />} label="외주팀 관리" active={activeCategory === CategoryType.OUTSOURCE && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.OUTSOURCE); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<DollarSign size={18} />} label="💰 인건비 청구" active={isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setIsLaborClaimView(true); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          {currentUser?.username === 'admin' && (
            <SidebarItem icon={<Shield size={18} />} label="🔐 계정관리" active={isPasswordManagerView && !isGeosangAccountView} onClick={() => { setIsPasswordManagerView(true); setIsLaborClaimView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          )}

          <SidebarItem icon={<ShoppingBag size={18} />} label="매입 거래처" active={activeCategory === CategoryType.PURCHASE && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.PURCHASE); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Key size={18} />} label="거상 계정 등록" active={isGeosangAccountView} onClick={() => { setIsGeosangAccountView(true); setIsLaborClaimView(false); setIsPasswordManagerView(false); setActiveCategory(null as any); setIsMobileMenuOpen(false); }} />
          <div className="pt-4 pb-1 px-3 text-[10px] font-black text-yellow-400 uppercase tracking-widest opacity-60">Partner Network</div>
          <SidebarItem icon={<Building2 size={18} />} label="프랜차이즈 본사" active={activeCategory === CategoryType.FRANCHISE_HQ && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_HQ); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Coffee size={18} />} label="프랜차이즈 지점" active={activeCategory === CategoryType.FRANCHISE_BR && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_BR); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Paintbrush size={18} />} label="인테리어" active={activeCategory === CategoryType.INTERIOR && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.INTERIOR); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<UtensilsCrossed size={18} />} label="요식업(개인)" active={activeCategory === CategoryType.SALES && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.SALES); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Briefcase size={18} />} label="기타 거래처" active={activeCategory === CategoryType.OTHERS && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.OTHERS); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {isAdmin && (
            <>
              <button onClick={() => { setIsAdminModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-400 hover:bg-blue-500/10 transition-all text-xs font-bold border border-blue-500/20">
                <ShieldCheck size={16} /> 권한 관리
              </button>
              <button onClick={() => { setIsAdminSettingsModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs font-bold border border-emerald-500/20">
                <Settings size={16} /> 관리자 계정 설정
              </button>
            </>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-xs font-bold">
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </aside>

      {/* 모바일 사이드바 (슬라이딩) */}
      <aside className={`md:hidden fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-[70] transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-black tracking-tighter flex items-center gap-2"><Layers className="text-blue-400" /> 거상커넥트</h1>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
              <X size={20}/>
            </button>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <span className="text-[11px] text-slate-200 font-bold">{currentUser.name}</span>
            </div>
            {isAdmin && <span className="text-[8px] bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-black w-fit uppercase tracking-widest">Master Admin</span>}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto pb-8 scrollbar-hide">
          <SidebarItem icon={<Users size={18} />} label="거상 조직도" active={activeCategory === CategoryType.GEOSANG && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.GEOSANG); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<HardHat size={18} />} label="외주팀 관리" active={activeCategory === CategoryType.OUTSOURCE && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.OUTSOURCE); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<DollarSign size={18} />} label="💰 인건비 청구" active={isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setIsLaborClaimView(true); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          {currentUser?.username === 'admin' && (
            <SidebarItem icon={<Shield size={18} />} label="🔐 계정관리" active={isPasswordManagerView && !isGeosangAccountView} onClick={() => { setIsPasswordManagerView(true); setIsLaborClaimView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          )}

          <SidebarItem icon={<ShoppingBag size={18} />} label="매입 거래처" active={activeCategory === CategoryType.PURCHASE && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.PURCHASE); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Key size={18} />} label="거상 계정 등록" active={isGeosangAccountView} onClick={() => { setIsGeosangAccountView(true); setIsLaborClaimView(false); setIsPasswordManagerView(false); setActiveCategory(null as any); setIsMobileMenuOpen(false); }} />
          <div className="pt-4 pb-1 px-3 text-[10px] font-black text-yellow-400 uppercase tracking-widest opacity-60">Partner Network</div>
          <SidebarItem icon={<Building2 size={18} />} label="프랜차이즈 본사" active={activeCategory === CategoryType.FRANCHISE_HQ && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_HQ); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Coffee size={18} />} label="프랜차이즈 지점" active={activeCategory === CategoryType.FRANCHISE_BR && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_BR); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Paintbrush size={18} />} label="인테리어" active={activeCategory === CategoryType.INTERIOR && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.INTERIOR); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<UtensilsCrossed size={18} />} label="요식업(개인)" active={activeCategory === CategoryType.SALES && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.SALES); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Briefcase size={18} />} label="기타 거래처" active={activeCategory === CategoryType.OTHERS && !isLaborClaimView && !isPasswordManagerView && !isGeosangAccountView} onClick={() => { setActiveCategory(CategoryType.OTHERS); setIsLaborClaimView(false); setIsPasswordManagerView(false); setIsGeosangAccountView(false); setIsMobileMenuOpen(false); }} />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {isAdmin && (
            <>
              <button onClick={() => { setIsAdminModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-400 hover:bg-blue-500/10 transition-all text-xs font-bold border border-blue-500/20">
                <ShieldCheck size={16} /> 권한 관리
              </button>
              <button onClick={() => { setIsAdminSettingsModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs font-bold border border-emerald-500/20">
                <Settings size={16} /> 관리자 계정 설정
              </button>
            </>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-xs font-bold">
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {isMobileMenuOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-[60]" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        {/* 헤더: 반응형 레이아웃 */}
        <header className={`h-14 md:h-16 lg:h-20 ${isPasswordManagerView ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-3 md:px-6 lg:px-10 sticky top-0 z-40 shadow-sm gap-2`}>
          {/* 모바일 메뉴 버튼 */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className={`md:hidden p-2 ${isPasswordManagerView ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'} rounded-lg flex-shrink-0`}
          >
            <Menu size={24} />
          </button>
          
          {/* 검색 기능 제거됨 */}
          <div className="flex-1"></div>

          {/* 액션 버튼들: 반응형 레이아웃 */}
          <div className="flex items-center gap-1 md:gap-2 lg:gap-3">
            {isAdmin && !isPasswordManagerView && (
              <>
                <input type="file" ref={csvInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleCSVUpload} />
                {/* PC: 전체 버튼, 모바일: 아이콘만 */}
                <button 
                  onClick={() => csvInputRef.current?.click()} 
                  className="p-2 md:p-2.5 md:px-3 lg:px-4 bg-white border-2 border-emerald-500 text-emerald-600 rounded-lg md:rounded-xl hover:bg-emerald-50 shadow-sm font-bold flex items-center gap-2" 
                  title="파일업로드"
                >
                  <Upload size={16} className="md:w-[18px] md:h-[18px]" /> 
                  <span className="hidden md:inline text-xs lg:text-sm">파일업로드</span>
                </button>
                <button 
                  onClick={handleCSVDownload} 
                  className="p-2 md:p-2.5 md:px-3 lg:px-4 bg-white border-2 border-blue-500 text-blue-600 rounded-lg md:rounded-xl hover:bg-blue-50 shadow-sm font-bold flex items-center gap-2" 
                  title="다운로드"
                >
                  <Download size={16} className="md:w-[18px] md:h-[18px]" /> 
                  <span className="hidden md:inline text-xs lg:text-sm">다운로드</span>
                </button>
              </>
            )}
            {/* 거상 조직도, 매입거래처, 프랜차이즈본사, 프랜차이즈지점, 인테리어, 요식업, 기타거래처는 회사 등록 버튼 */}
            {!isLaborClaimView && !isPasswordManagerView && (
              activeCategory === CategoryType.GEOSANG ||
              activeCategory === CategoryType.PURCHASE ||
              activeCategory === CategoryType.FRANCHISE_HQ ||
              activeCategory === CategoryType.FRANCHISE_BR ||
              activeCategory === CategoryType.INTERIOR ||
              activeCategory === CategoryType.SALES ||
              activeCategory === CategoryType.OTHERS
            ) && (
              <button 
                onClick={() => { setEditingContact(null); setIsCompanyModalOpen(true); }} 
                className="bg-blue-600 text-white px-3 md:px-4 lg:px-5 py-2 md:py-2.5 lg:py-3 rounded-lg md:rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 md:gap-2 shadow-lg shadow-blue-100 flex-shrink-0"
              >
                <Building2 size={18} className="md:w-5 md:h-5" /> 
                <span className="text-xs md:text-sm">회사 등록</span>
              </button>
            )}
            {/* 외주팀 관리는 신규등록 버튼 유지 */}
            {!isLaborClaimView && !isPasswordManagerView && activeCategory === CategoryType.OUTSOURCE && (
              <button 
                onClick={() => { setEditingContact(null); setIsModalOpen(true); }} 
                className="bg-blue-600 text-white px-3 md:px-4 lg:px-5 py-2 md:py-2.5 lg:py-3 rounded-lg md:rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 md:gap-2 shadow-lg shadow-blue-100 flex-shrink-0"
              >
                <Plus size={18} className="md:w-5 md:h-5" /> 
                <span className="text-xs md:text-sm">신규등록</span>
              </button>
            )}
          </div>
        </header>

        {isPasswordManagerView ? (
          <PasswordManager currentUser={currentUser} />
        ) : isGeosangAccountView ? (
          <GeosangAccountView />
        ) : isLaborClaimView ? (
          <LaborClaimView 
            claims={laborClaims}
            outsourceWorkers={contacts.filter(c => c.category === CategoryType.OUTSOURCE)}
            onAddClaim={() => { setEditingClaim(null); setIsLaborClaimModalOpen(true); }}
            onEditClaim={(claim) => { setEditingClaim(claim); setIsLaborClaimModalOpen(true); }}
            onDeleteClaim={async (id) => {
              if(confirm('삭제하시겠습니까?')) {
                // 낙관적 UI 업데이트
                setLaborClaims(prev => prev.filter(c => c.id !== id));
                
                // 백엔드 API 호출하여 D1 데이터베이스에서 삭제
                const result = await laborClaimsAPI.delete(id);
                
                if (!result.success) {
                  console.error('❌ 삭제 실패:', result.error);
                  alert('삭제에 실패했습니다. 다시 시도해주세요.');
                  // 실패 시 데이터 다시 로드
                  loadData();
                } else {
                  console.log('✅ 성공적으로 삭제되었습니다.');
                }
              }
            }}
            onUpdateStatus={async (id, status) => {
              // 낙관적 UI 업데이트
              setLaborClaims(prev => prev.map(c => c.id === id ? { ...c, status, ...(status === 'approved' ? { approvedBy: currentUser.name, approvedAt: new Date().toISOString() } : status === 'paid' ? { paidAt: new Date().toISOString() } : {}) } : c));
              
              // 백엔드 API 호출하여 D1 데이터베이스에 저장
              const claim = laborClaims.find(c => c.id === id);
              if (claim) {
                const updatedClaim = {
                  ...claim,
                  status,
                  ...(status === 'approved' ? { approvedBy: currentUser.name, approvedAt: new Date().toISOString() } : {}),
                  ...(status === 'paid' ? { paidAt: new Date().toISOString() } : {})
                };
                
                const result = await laborClaimsAPI.update(id, updatedClaim);
                
                if (!result.success) {
                  console.error('❌ 상태 업데이트 실패:', result.error);
                  alert('상태 업데이트에 실패했습니다. 다시 시도해주세요.');
                  // 실패 시 데이터 다시 로드
                  loadData();
                } else {
                  console.log('✅ 상태가 성공적으로 저장되었습니다.');
                }
              }
            }}
          />
        ) : (
          <section className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-10 scroll-smooth">
            <div className="mb-4 md:mb-6 lg:mb-10">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{getCategoryName(activeCategory)}</h2>
                  <p className="text-[10px] md:text-xs lg:text-sm font-bold text-blue-600 mt-1 uppercase tracking-wider">데이터 현황: {filteredContacts.length}건</p>
                </div>
                
                {/* 외주팀 관리 전용 검색 */}
                {activeCategory === CategoryType.OUTSOURCE ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 검색어 입력 */}
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="이름, 연락처 검색..."
                        value={outsourceSearch}
                        onChange={(e) => setOutsourceSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all w-48 md:w-64"
                      />
                    </div>
                    
                    {/* 활동지역 검색 */}
                    <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500" />
                      <input
                        type="text"
                        placeholder="활동지역 검색 (부산, 서울...)"
                        value={regionSearch}
                        onChange={(e) => setRegionSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border-2 border-emerald-200 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all w-56 md:w-72 bg-emerald-50"
                      />
                    </div>
                    
                    {/* 구분 필터 (시공일당, 크레인) */}
                    <select
                      value={outsourceTypeFilter}
                      onChange={(e) => setOutsourceTypeFilter(e.target.value)}
                      className="px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                    >
                      <option value="">전체 구분</option>
                      {outsourceTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    
                    {/* 초기화 버튼 */}
                    {(outsourceSearch || regionSearch || outsourceTypeFilter) && (
                      <button
                        onClick={() => {
                          setOutsourceSearch('');
                          setRegionSearch('');
                          setOutsourceTypeFilter('');
                        }}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                      >
                        <X size={16} />
                        초기화
                      </button>
                    )}
                  </div>
                ) : (
                  /* 다른 카테고리 (거상, 매입, 프랜차이즈 등) 통합 검색 */
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 이름/연락처 검색 */}
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="이름, 연락처 검색..."
                        value={generalSearch}
                        onChange={(e) => setGeneralSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all w-48 md:w-64"
                      />
                    </div>
                    
                    {/* 지역 검색 */}
                    <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500" />
                      <input
                        type="text"
                        placeholder="활동지역 검색 (부산, 서울...)"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border-2 border-emerald-200 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all w-56 md:w-72 bg-emerald-50"
                      />
                    </div>
                    
                    {/* 업종 필터 */}
                    <select
                      value={industryFilter}
                      onChange={(e) => setIndustryFilter(e.target.value)}
                      className="px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                    >
                      <option value="">전체 업종</option>
                      {industries.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                    
                    {/* 초기화 버튼 */}
                    {(generalSearch || locationSearch || industryFilter) && (
                      <button
                        onClick={() => {
                          setGeneralSearch('');
                          setLocationSearch('');
                          setIndustryFilter('');
                        }}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                      >
                        <X size={16} />
                        초기화
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* 반응형 그리드: 모바일 1열, 태블릿 2열, PC 3열 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-5 lg:gap-8 pb-20">
              {filteredContacts.map(contact => (
                <ContactCard 
                  key={contact.id} 
                  contact={contact} 
                  canManage={isAdmin} 
                  onEdit={() => { 
                    setEditingContact(contact); 
                    setIsModalOpen(true); 
                  }} 
                  onDelete={async () => { 
                    if(confirm('삭제하시겠습니까?')) {
                      try {
                        // API로 DB에서 삭제
                        const response = await contactsAPI.delete(contact.id);
                        if (response.success) {
                          // 로컬 state 업데이트
                          setContacts(prev => prev.filter(c => c.id !== contact.id));
                          alert('✅ 삭제되었습니다.');
                        } else {
                          alert('❌ 삭제 실패: ' + response.error);
                        }
                      } catch (error) {
                        console.error('삭제 오류:', error);
                        alert('❌ 삭제 중 오류가 발생했습니다.');
                      }
                    }
                  }} 
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {isAdminModalOpen && <AdminModal users={authorizedUsers} onClose={() => setIsAdminModalOpen(false)} onAdd={handleAddAuthUser} onRevoke={handleRevokeAccess} />}
      
      {/* 관리자 계정 설정 모달 */}
      {isAdminSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">관리자 계정 설정</h2>
            
            <div className="space-y-4">
              {/* 현재 비밀번호 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">현재 비밀번호</label>
                <input
                  type="password"
                  value={adminSettingsForm.currentPassword}
                  onChange={(e) => setAdminSettingsForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="현재 비밀번호를 입력하세요"
                />
              </div>
              
              {/* 새 아이디 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">새 아이디</label>
                <input
                  type="text"
                  value={adminSettingsForm.newId}
                  onChange={(e) => setAdminSettingsForm(prev => ({ ...prev, newId: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="admin"
                />
              </div>
              
              {/* 새 비밀번호 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">새 비밀번호</label>
                <input
                  type="password"
                  value={adminSettingsForm.newPassword}
                  onChange={(e) => setAdminSettingsForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="새 비밀번호를 입력하세요"
                />
              </div>
              
              {/* 새 비밀번호 확인 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={adminSettingsForm.confirmPassword}
                  onChange={(e) => setAdminSettingsForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAdminSettingsModalOpen(false);
                  setAdminSettingsForm({
                    currentPassword: '',
                    newId: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full font-bold transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdminSettings}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 회사 등록 모달 (거상 조직도 + 모든 거래처 타입 공통) */}
      {isCompanyModalOpen && (
        <CompanyModal
          onClose={() => setIsCompanyModalOpen(false)}
          onSubmit={async (companyData: Contact) => {
            try {
              if (editingContact) {
                // 회사 수정
                const response = await contactsAPI.update(companyData.id, companyData);
                if (response.success) {
                  setContacts(prev => prev.map(c => c.id === companyData.id ? { ...companyData, staffList: c.staffList } : c));
                  setIsCompanyModalOpen(false);
                  alert('✅ 회사 정보가 수정되었습니다.');
                } else {
                  alert('❌ 수정 실패: ' + response.error);
                }
              } else {
                // 회사 신규 등록
                const response = await contactsAPI.create(companyData);
                if (response.success) {
                  setContacts(prev => [...prev, companyData]);
                  setIsCompanyModalOpen(false);
                  alert('✅ 회사가 등록되었습니다.');
                } else {
                  alert('❌ 등록 실패: ' + response.error);
                }
              }
            } catch (error) {
              console.error('회사 저장 실패:', error);
              alert('❌ 저장 중 오류가 발생했습니다.');
            }
          }}
          initialData={editingContact}
          geosangCompanyTypes={geosangCompanyTypes}
          setGeosangCompanyTypes={setGeosangCompanyTypes}
          isAdmin={isAdmin}
          currentCategory={activeCategory}
        />
      )}
      {isModalOpen && (
        <ContactFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={async (c: Contact) => { 
            try {
              // 거상 조직도 및 파트너 네트워크 카테고리일 때 회사 정보 localStorage에 저장
              const partnerCategories = [
                CategoryType.GEOSANG,
                CategoryType.PURCHASE,
                CategoryType.FRANCHISE_HQ,
                CategoryType.FRANCHISE_BR,
                CategoryType.INTERIOR,
                CategoryType.SALES,
                CategoryType.OTHERS
              ];
              
              if (partnerCategories.includes(c.category)) {
                const companyInfo = {
                  brandName: c.brandName,
                  industry: c.industry,
                  address: c.address,
                  phone: c.phone,
                  phone2: c.phone2,
                  email: c.email,
                  homepage: c.homepage,
                  bankAccount: c.bankAccount
                };
                
                // 카테고리별 localStorage 키
                const keyMap: Record<string, string> = {
                  [CategoryType.GEOSANG]: 'geosang_company_info_v1',
                  [CategoryType.PURCHASE]: 'purchase_company_info_v1',
                  [CategoryType.FRANCHISE_HQ]: 'franchise_hq_company_info_v1',
                  [CategoryType.FRANCHISE_BR]: 'franchise_br_company_info_v1',
                  [CategoryType.INTERIOR]: 'interior_company_info_v1',
                  [CategoryType.SALES]: 'sales_company_info_v1',
                  [CategoryType.OTHERS]: 'others_company_info_v1'
                };
                
                const key = keyMap[c.category];
                if (key) {
                  localStorage.setItem(key, JSON.stringify(companyInfo));
                }
              }
              
              if (editingContact) {
                // 수정
                console.log('=== 수정 API 호출 전 ===');
                console.log('전송할 데이터:', c);
                
                const response = await contactsAPI.update(c.id, c);
                
                console.log('=== 수정 API 응답 ===');
                console.log('response:', response);
                console.log('response.data:', response.data);
                
                if (response.success && response.data) {
                  console.log('=== 메인 화면에 업데이트할 데이터 ===');
                  console.log('response.data:', response.data);
                  // 주민번호를 문자열로 변환
                  const sanitizedData = {
                    ...response.data,
                    staffList: response.data.staffList?.map((staff: any) => ({
                      ...staff,
                      residentNumber: staff.residentNumber ? String(staff.residentNumber) : staff.residentNumber
                    }))
                  };
                  setContacts(prev => prev.map(old => old.id === c.id ? sanitizedData : old));
                  setIsModalOpen(false);
                } else {
                  alert('수정 실패: ' + (response.error || '알 수 없는 오류'));
                }
              } else {
                // 생성
                console.log('=== API 호출 전 ===');
                console.log('전송할 데이터:', c);
                
                const response = await contactsAPI.create(c);
                
                console.log('=== API 응답 ===');
                console.log('response:', response);
                console.log('response.data:', response.data);
                
                if (response.success && response.data) {
                  console.log('=== 메인 화면에 추가할 데이터 ===');
                  console.log('response.data:', response.data);
                  // 주민번호를 문자열로 변환
                  const sanitizedData = {
                    ...response.data,
                    staffList: response.data.staffList?.map((staff: any) => ({
                      ...staff,
                      residentNumber: staff.residentNumber ? String(staff.residentNumber) : staff.residentNumber
                    }))
                  };
                  setContacts(prev => [...prev, sanitizedData]);
                  setIsModalOpen(false);
                } else {
                  alert('등록 실패: ' + (response.error || '알 수 없는 오류'));
                }
              }
            } catch (error) {
              console.error('저장 실패:', error);
              alert('저장 중 오류가 발생했습니다.');
            }
          }}
          currentCategory={activeCategory} 
          initialData={editingContact} 
          departments={departments} 
          industries={industries} 
          outsourceTypes={outsourceTypes}
          geosangCompanyTypes={geosangCompanyTypes}
          geosangDepartments={geosangDepartments}
          onAddDept={(dept: string) => setDepartments(prev => [...prev, dept])} 
          onAddIndustry={(ind: string) => setIndustries(prev => [...prev, ind])} 
          onAddOutsourceType={(type: string) => setOutsourceTypes(prev => [...prev, type])}
          onRenameItem={handleGlobalRenameItem} 
          isAdmin={isAdmin}
        />
      )}
      {isLaborClaimModalOpen && (
        <LaborClaimModal
          onClose={() => {
            setIsLaborClaimModalOpen(false);
            setEditingClaim(null); // 모달 닫을 때 editingClaim 초기화
          }}
          onSubmit={async (claim: LaborClaim) => {
            console.log('=== onSubmit 호출됨 ===');
            console.log('받은 claim 데이터:', claim);
            console.log('editingClaim:', editingClaim);
            
            try {
              if (editingClaim) {
                console.log('수정 모드: 기존 청구 업데이트');
                setLaborClaims(prev => {
                  const updated = prev.map(c => c.id === claim.id ? claim : c);
                  console.log('업데이트된 laborClaims:', updated);
                  return updated;
                });
              } else {
                console.log('등록 모드: 새 청구 추가');
                // API로 DB에 저장
                const response = await laborClaimsAPI.create(claim);
                if (response.success) {
                  setLaborClaims(prev => {
                    const newClaims = [...prev, claim];
                    console.log('새로운 laborClaims:', newClaims);
                    return newClaims;
                  });
                  alert('✅ 인건비 청구가 등록되었습니다.');
                } else {
                  alert('❌ 등록 실패: ' + response.error);
                  return;
                }
              }
              
              console.log('모달 닫기');
              setIsLaborClaimModalOpen(false);
              setEditingClaim(null); // 등록/수정 후 editingClaim 초기화
            } catch (error) {
              console.error('인건비 청구 등록 오류:', error);
              alert('❌ 등록 중 오류가 발생했습니다.');
            }
          }}
          initialData={editingClaim}
          outsourceWorkers={contacts.filter(c => c.category === CategoryType.OUTSOURCE)}
        />
      )}
      {isGeosangAccountModalOpen && (
        <GeosangAccountModal
          onClose={() => {
            setIsGeosangAccountModalOpen(false);
            setEditingGeosangAccount(null);
          }}
          onSubmit={(account: any) => {
            if (editingGeosangAccount) {
              setGeosangAccounts(prev => prev.map(a => a.id === account.id ? account : a));
            } else {
              setGeosangAccounts(prev => [...prev, account]);
            }
            setIsGeosangAccountModalOpen(false);
            setEditingGeosangAccount(null);
          }}
          initialData={editingGeosangAccount}
        />
      )}
    </div>
  );
};

// 인건비 청구 등록/수정 모달
const LaborClaimModal = ({ onClose, onSubmit, initialData, outsourceWorkers }: any) => {
  const getInitialFormData = () => ({
    id: 'claim-' + Date.now(),
    workerId: '',
    workerName: '',
    workerPhone: '',
    date: new Date().toISOString().split('T')[0],
    sites: [{ id: 'site-1', siteName: '', hours: 0 }],
    breakdown: {
      basePay: 0,
      overtimeHours: 0,
      overtimePay: 0,
      transportFee: 0,
      mealFee: 0,
      fuelFee: 0,
      tollFee: 0,
      otherFee: 0,
      otherFeeDesc: ''
    },
    totalAmount: 0,
    receiptImages: [],
    status: 'pending',
    createdAt: new Date().toISOString(),
    rawText: ''
  });
  
  const [formData, setFormData] = useState<Partial<LaborClaim>>(
    initialData || getInitialFormData()
  );
  
  // initialData가 변경될 때마다 formData 업데이트
  useEffect(() => {
    console.log('=== LaborClaimModal useEffect ===');
    console.log('initialData:', initialData);
    if (initialData) {
      console.log('수정 모드: initialData로 formData 설정');
      setFormData(initialData);
    } else {
      console.log('등록 모드: 새 formData 생성');
      setFormData(getInitialFormData());
    }
  }, [initialData]);
  
  const [inputMode, setInputMode] = useState<'form' | 'text'>('text');
  const [isTextParsing, setIsTextParsing] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  
  const handleWorkerChange = (workerId: string) => {
    console.log('handleWorkerChange called with:', workerId);
    const worker = outsourceWorkers.find((w: Contact) => w.staffList[0]?.id === workerId);
    console.log('Found worker:', worker);
    if (worker && worker.staffList[0]) {
      const newFormData = {
        ...formData,
        workerId,
        workerName: worker.staffList[0].name,
        workerPhone: worker.staffList[0].phone
      };
      console.log('Setting formData to:', newFormData);
      setFormData(newFormData);
    } else {
      console.error('Worker not found for id:', workerId);
    }
  };
  
  const handleAddSite = () => {
    setFormData({
      ...formData,
      sites: [...(formData.sites || []), { id: 'site-' + Date.now(), siteName: '', hours: 0 }]
    });
  };
  
  const handleRemoveSite = (index: number) => {
    if ((formData.sites?.length || 0) <= 1) return;
    setFormData({
      ...formData,
      sites: formData.sites?.filter((_, i) => i !== index)
    });
  };
  
  const handleSiteChange = (index: number, field: 'siteName' | 'hours', value: string | number) => {
    const newSites = [...(formData.sites || [])];
    newSites[index] = { ...newSites[index], [field]: value };
    setFormData({ ...formData, sites: newSites });
  };
  
  const handleBreakdownChange = (field: keyof ClaimBreakdown, value: number | string) => {
    setFormData({
      ...formData,
      breakdown: { ...formData.breakdown!, [field]: value }
    });
  };
  
  const calculateTotal = () => {
    const b = formData.breakdown!;
    return b.basePay + b.overtimePay + b.transportFee + b.mealFee + b.fuelFee + b.tollFee + b.otherFee;
  };
  
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        try {
          const result = await extractReceiptData(base64, file.type);
          if (result.items && result.items.length > 0) {
            const breakdown = { ...formData.breakdown! };
            result.items.forEach((item: any) => {
              if (item.type === 'meal') breakdown.mealFee += item.amount;
              else if (item.type === 'fuel') breakdown.fuelFee += item.amount;
              else if (item.type === 'toll') breakdown.tollFee += item.amount;
              else breakdown.otherFee += item.amount;
            });
            setFormData({
              ...formData,
              breakdown,
              receiptImages: [...(formData.receiptImages || []), { data: base64, name: file.name, mimeType: file.type }]
            });
            alert('✅ 영수증 분석 완료!');
          }
        } catch (error) {
          // OCR 실패해도 영수증 이미지는 저장
          setFormData({
            ...formData,
            receiptImages: [...(formData.receiptImages || []), { data: base64, name: file.name, mimeType: file.type }]
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleTextParse = async () => {
    if (!formData.rawText?.trim()) {
      alert('청구 내용을 입력하세요');
      return;
    }
    
    setIsTextParsing(true);
    try {
      const result = await parseLaborClaimText(formData.rawText);
      setFormData({
        ...formData,
        date: result.date,
        sites: result.sites,
        breakdown: {
          basePay: result.basePay || 0,
          overtimeHours: result.overtimeHours || 0,
          overtimePay: result.overtimePay || 0,
          transportFee: result.transportFee || 0,
          mealFee: result.mealFee || 0,
          fuelFee: result.fuelFee || 0,
          tollFee: result.tollFee || 0,
          otherFee: 0,
          otherFeeDesc: ''
        }
      });
      alert('✅ 문자 분석 완료!');
      setInputMode('form');
    } catch (error) {
      alert('❌ 분석 실패: ' + error);
    }
    setIsTextParsing(false);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 항목 체크
    if (!formData.workerId) {
      alert('일당을 선택하세요');
      return;
    }
    if (!formData.date) {
      alert('작업일을 입력하세요');
      return;
    }
    if (!formData.sites || formData.sites.length === 0) {
      alert('작업 현장을 최소 1개 이상 입력하세요');
      return;
    }
    
    // 현장명과 시간이 모두 입력되었는지 체크
    for (let i = 0; i < formData.sites.length; i++) {
      const site = formData.sites[i];
      if (!site.siteName || !site.siteName.trim()) {
        alert(`${i + 1}번째 현장명을 입력하세요`);
        return;
      }
      if (!site.hours || site.hours <= 0) {
        alert(`${i + 1}번째 현장의 작업시간을 입력하세요`);
        return;
      }
    }
    
    const totalAmount = calculateTotal();
    const totalHours = formData.sites!.reduce((sum, s) => sum + s.hours, 0);
    
    // 작업시간 비율로 금액 자동 배분
    const sitesWithAllocation = formData.sites!.map(site => ({
      ...site,
      allocatedAmount: totalHours > 0 ? Math.round((site.hours / totalHours) * totalAmount) : 0
    }));
    
    const claimData = {
      ...formData,
      sites: sitesWithAllocation,
      totalAmount
    } as LaborClaim;
    
    console.log('=== 청구 등록 시작 ===');
    console.log('claimData:', claimData);
    console.log('workerId:', claimData.workerId);
    console.log('workerName:', claimData.workerName);
    console.log('date:', claimData.date);
    console.log('sites:', claimData.sites);
    console.log('totalAmount:', claimData.totalAmount);
    
    onSubmit(claimData);
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-8 shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-3xl flex justify-between items-center z-10">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <DollarSign size={28} /> {initialData ? '청구 수정' : '💬 간편 청구 등록'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 입력 모드 선택 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex-1 p-4 rounded-xl font-bold transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              💬 문자 입력
            </button>
            <button
              type="button"
              onClick={() => setInputMode('form')}
              className={`flex-1 p-4 rounded-xl font-bold transition-all ${inputMode === 'form' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              📝 직접 입력
            </button>
          </div>
          
          {/* 문자 입력 모드 */}
          {inputMode === 'text' && (
            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Contact2 size={24} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg mb-2">💬 카톡 스타일 간편 입력</h3>
                  <p className="text-xs text-slate-600 mb-4">일당이 보낸 문자 그대로 붙여넣으세요!</p>
                  <textarea
                    value={formData.rawText || ''}
                    onChange={(e) => setFormData({ ...formData, rawText: e.target.value })}
                    placeholder={"예시:\n12/26\n*현장1: 컴포즈커피 인천점 *시간: 3시간\n*현장2: 스타벅스 서울점 *시간: 5시간\n*기본일비: 120,000원\n*연장비: 2시간 40,000원\n*차대비: 20,000원\n*식비: 15,000원"}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl text-sm font-medium resize-none focus:border-blue-500 outline-none"
                    rows={8}
                  />
                  <button
                    type="button"
                    onClick={handleTextParse}
                    disabled={isTextParsing || !formData.rawText?.trim()}
                    className="mt-3 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isTextParsing ? <Loader2 className="animate-spin" size={20} /> : <><Contact2 size={20} /> AI 자동 분석</>}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 폼 입력 모드 */}
          {inputMode === 'form' && (
            <div className="space-y-6">
              {/* 일당 선택 - React Select */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">일당 선택 *</label>
                <Select
                  options={outsourceWorkers.map((w: Contact) => ({
                    value: w.staffList[0]?.id,
                    label: `${w.staffList[0]?.name} ${w.staffList[0]?.phone ? `(${w.staffList[0].phone})` : ''}`,
                    name: w.staffList[0]?.name,
                    phone: w.staffList[0]?.phone
                  }))}
                  value={
                    formData.workerId 
                      ? outsourceWorkers
                          .map((w: Contact) => ({
                            value: w.staffList[0]?.id,
                            label: `${w.staffList[0]?.name} ${w.staffList[0]?.phone ? `(${w.staffList[0].phone})` : ''}`,
                            name: w.staffList[0]?.name,
                            phone: w.staffList[0]?.phone
                          }))
                          .find((opt: any) => opt.value === formData.workerId)
                      : null
                  }
                  onChange={(selected: any) => {
                    if (selected) {
                      handleWorkerChange(selected.value);
                    } else {
                      // Clear selection
                      setFormData({
                        ...formData,
                        workerId: '',
                        workerName: '',
                        workerPhone: ''
                      });
                    }
                  }}
                  placeholder="이름 또는 전화번호로 검색..."
                  isSearchable
                  isClearable
                  noOptionsMessage={() => "일당을 찾을 수 없습니다"}
                  styles={{
                    control: (base) => ({
                      ...base,
                      padding: '6px',
                      borderRadius: '12px',
                      borderWidth: '2px',
                      borderColor: '#e2e8f0',
                      fontWeight: 'bold',
                      '&:hover': {
                        borderColor: '#3b82f6'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
                      color: state.isSelected ? 'white' : '#1e293b',
                      fontWeight: state.isSelected ? 'bold' : 'normal',
                      padding: '12px 16px',
                      cursor: 'pointer'
                    })
                  }}
                />
              </div>
              
              {/* 작업일 */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">작업일 *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                  required
                />
              </div>
              
              {/* 작업 현장 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-slate-600">작업 현장 *</label>
                  <button
                    type="button"
                    onClick={handleAddSite}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> 현장 추가
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.sites?.map((site, idx) => (
                    <div key={site.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl">
                      <span className="text-xs font-black text-blue-600 w-16">현장{idx + 1}:</span>
                      <input
                        type="text"
                        value={site.siteName}
                        onChange={(e) => handleSiteChange(idx, 'siteName', e.target.value)}
                        placeholder="컴포즈커피 인천점"
                        className="flex-1 p-2 border-2 border-slate-200 rounded-lg font-bold text-sm focus:border-blue-500 outline-none"
                        required
                      />
                      <input
                        type="number"
                        value={site.hours || ''}
                        onChange={(e) => handleSiteChange(idx, 'hours', parseFloat(e.target.value) || 0)}
                        placeholder="3"
                        className="w-20 p-2 border-2 border-slate-200 rounded-lg font-bold text-sm text-center focus:border-blue-500 outline-none"
                        required
                      />
                      <span className="text-xs text-slate-600">시간</span>
                      {(formData.sites?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSite(idx)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 청구 금액 세부내역 */}
              <div className="bg-blue-50 p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-black text-blue-900 mb-4">💰 청구 금액 세부내역</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-2">기본일비 *</label>
                    <input
                      type="number"
                      value={formData.breakdown?.basePay || ''}
                      onChange={(e) => handleBreakdownChange('basePay', parseFloat(e.target.value) || 0)}
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                      placeholder="120000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-2">차대비</label>
                    <input
                      type="number"
                      value={formData.breakdown?.transportFee || ''}
                      onChange={(e) => handleBreakdownChange('transportFee', parseFloat(e.target.value) || 0)}
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                      placeholder="20000"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-2">연장 시간</label>
                    <input
                      type="number"
                      value={formData.breakdown?.overtimeHours || ''}
                      onChange={(e) => handleBreakdownChange('overtimeHours', parseFloat(e.target.value) || 0)}
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-2">연장비</label>
                    <input
                      type="number"
                      value={formData.breakdown?.overtimePay || ''}
                      onChange={(e) => handleBreakdownChange('overtimePay', parseFloat(e.target.value) || 0)}
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                      placeholder="40000"
                    />
                  </div>
                </div>
                
                {/* 영수증 첨부 */}
                <div className="border-t-2 border-blue-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-black text-slate-600">식비/주유비/톨비 (영수증 첨부 가능)</label>
                    <button
                      type="button"
                      onClick={() => receiptInputRef.current?.click()}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <Upload size={14} /> 영수증 OCR
                    </button>
                  </div>
                  <input type="file" ref={receiptInputRef} className="hidden" accept="image/*" multiple onChange={handleReceiptUpload} />
                  
                  {formData.receiptImages && formData.receiptImages.length > 0 && (
                    <div className="mb-3 text-xs text-emerald-600 font-bold">
                      ✓ 영수증 {formData.receiptImages.length}장 첨부됨
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">식비</label>
                      <input
                        type="number"
                        value={formData.breakdown?.mealFee || ''}
                        onChange={(e) => handleBreakdownChange('mealFee', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border-2 border-slate-200 rounded-lg font-bold text-sm focus:border-blue-500 outline-none"
                        placeholder="15000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">주유비</label>
                      <input
                        type="number"
                        value={formData.breakdown?.fuelFee || ''}
                        onChange={(e) => handleBreakdownChange('fuelFee', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border-2 border-slate-200 rounded-lg font-bold text-sm focus:border-blue-500 outline-none"
                        placeholder="30000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">톨비</label>
                      <input
                        type="number"
                        value={formData.breakdown?.tollFee || ''}
                        onChange={(e) => handleBreakdownChange('tollFee', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border-2 border-slate-200 rounded-lg font-bold text-sm focus:border-blue-500 outline-none"
                        placeholder="5000"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-2">기타 비용</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.breakdown?.otherFeeDesc || ''}
                      onChange={(e) => handleBreakdownChange('otherFeeDesc', e.target.value)}
                      placeholder="항목명"
                      className="flex-1 p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                    />
                    <input
                      type="number"
                      value={formData.breakdown?.otherFee || ''}
                      onChange={(e) => handleBreakdownChange('otherFee', parseFloat(e.target.value) || 0)}
                      placeholder="금액"
                      className="w-32 p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                
                {/* 총 청구금액 */}
                <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">총 청구금액</span>
                    <span className="text-2xl font-black text-blue-600">{calculateTotal().toLocaleString()}원</span>
                  </div>
                </div>
              </div>
              
              {/* 메모 */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">메모</label>
                <textarea
                  value={formData.memo || ''}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-500 outline-none resize-none"
                  placeholder="특이사항이나 메모"
                  rows={2}
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4 border-t-2 border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">
              취소
            </button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              {initialData ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 거상 계정 등록 모달
const GeosangAccountModal = ({ onClose, onSubmit, initialData }: any) => {
  const [formData, setFormData] = useState({
    id: initialData?.id || 'ga' + Date.now(),
    company_name: initialData?.company_name || '',
    email: initialData?.email || '',
    username: initialData?.username || '',
    password: initialData?.password || '',
    memo: initialData?.memo || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name || !formData.username || !formData.password) {
      alert('회사명, 아이디, 비밀번호는 필수 입력 항목입니다.');
      return;
    }

    onSubmit({
      ...formData,
      created_at: initialData?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl w-full max-w-2xl my-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b-2 border-slate-100 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Key className="text-blue-600" size={24} />
            {initialData ? '계정 수정' : '계정 등록'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 회사명 */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-600 mb-2">
                회사명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                placeholder="거상컴퍼니"
                required
              />
            </div>

            {/* 계정목록(예)홈페이지 */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-600 mb-2">계정목록(예)홈페이지</label>
              <input
                type="text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-500 outline-none"
                placeholder="사이트주소"
              />
            </div>

            {/* 아이디 */}
            <div>
              <label className="block text-xs font-black text-slate-600 mb-2">
                아이디 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                placeholder="geosang123"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-xs font-black text-slate-600 mb-2">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {/* 메모 */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-600 mb-2">메모</label>
              <textarea
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-500 outline-none resize-none"
                placeholder="추가 정보나 메모..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              {initialData ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
