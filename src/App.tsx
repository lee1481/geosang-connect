import React, { useState, useMemo, useEffect, useRef } from 'react';
import Select from 'react-select';
import { 
  Users, Briefcase, ShoppingBag, Store, Home, 
  Settings, Search, Plus, Trash2, Phone, Mail, 
  MapPin, CreditCard, FileText, Upload, ChevronRight, 
  Building2, HardHat, Coffee, Paintbrush, UtensilsCrossed,
  Layers, Filter, X, Pencil, Globe, ChevronDown, Check, Lock,
  Wallet, Tag, Loader2, Calendar, DollarSign, Download, BarChart3, TrendingUp, FileSpreadsheet, Star, Key, ShieldCheck, UserPlus, LogOut, User, Menu, Contact2
} from 'lucide-react';
import { CategoryType, Contact, Staff, ConstructionRecord, LaborClaim, WorkSite, ClaimBreakdown, Project, ProjectDocument, DocumentType } from './types';
import { extractConstructionData, extractBusinessLicenseData, extractBusinessCardData, extractReceiptData, parseLaborClaimText, extractProjectDocument } from './geminiService';
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

const INITIAL_AUTH_USERS: AuthUser[] = [
  { id: 'admin', name: '마스터 관리자', username: 'admin', password: 'geosang777' }
];

const App: React.FC = () => {
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthUser[]>(() => {
    const saved = localStorage.getItem('geosang_auth_users_v2');
    return saved ? JSON.parse(saved) : INITIAL_AUTH_USERS;
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('geosang_logged_in_user_obj_v2');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('geosang_contacts_v8');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeCategory, setActiveCategory] = useState<CategoryType>(CategoryType.GEOSANG);
  // 검색 기능 제거됨
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
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

  // 인건비 청구 관리
  const [laborClaims, setLaborClaims] = useState<LaborClaim[]>(() => {
    const saved = localStorage.getItem('geosang_labor_claims_v1');
    if (saved) {
      return JSON.parse(saved);
    }
    
    // 샘플 데이터 (최초 실행 시)
    const sampleClaims: LaborClaim[] = [
      {
        id: 'claim-sample-1',
        workerId: 'worker-1',
        workerName: '정경성',
        workerPhone: '010-1234-5678',
        date: new Date().toISOString().split('T')[0],
        sites: [
          { siteName: '컴포즈커피 인천점', hours: 5, allocatedAmount: 187500 },
          { siteName: '스타벅스 강남점', hours: 2, allocatedAmount: 75000 },
          { siteName: '투썸플레이스 판교점', hours: 1, allocatedAmount: 37500 }
        ],
        totalAmount: 300000,
        breakdown: {
          baseDaily: 200000,
          overtimeHours: 2,
          overtimeAmount: 50000,
          carAllowance: 30000,
          mealFee: 15000,
          fuelFee: 0,
          tollFee: 5000,
          otherFee: 0
        },
        status: 'pending',
        memo: '3개 현장 작업',
        createdAt: new Date().toISOString()
      },
      {
        id: 'claim-sample-2',
        workerId: 'worker-2',
        workerName: '김철수',
        workerPhone: '010-9876-5432',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        sites: [
          { siteName: '이디야커피 부산점', hours: 8, allocatedAmount: 250000 }
        ],
        totalAmount: 250000,
        breakdown: {
          baseDaily: 200000,
          overtimeHours: 0,
          overtimeAmount: 0,
          carAllowance: 30000,
          mealFee: 20000,
          fuelFee: 0,
          tollFee: 0,
          otherFee: 0
        },
        status: 'approved',
        memo: '',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        approvedBy: 'admin',
        approvedAt: new Date(Date.now() - 43200000).toISOString()
      },
      {
        id: 'claim-sample-3',
        workerId: 'worker-3',
        workerName: '이영희',
        workerPhone: '010-5555-7777',
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        sites: [
          { siteName: '컴포즈커피 서울점', hours: 4, allocatedAmount: 120000 },
          { siteName: '컴포즈커피 대전점', hours: 4, allocatedAmount: 130000 }
        ],
        totalAmount: 250000,
        breakdown: {
          baseDaily: 200000,
          overtimeHours: 0,
          overtimeAmount: 0,
          carAllowance: 30000,
          mealFee: 20000,
          fuelFee: 0,
          tollFee: 0,
          otherFee: 0
        },
        status: 'paid',
        memo: '컴포즈커피 2개 지점',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        approvedBy: 'admin',
        approvedAt: new Date(Date.now() - 129600000).toISOString(),
        paidAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    // 샘플 데이터 저장
    localStorage.setItem('geosang_labor_claims_v1', JSON.stringify(sampleClaims));
    return sampleClaims;
  });
  const [isLaborClaimView, setIsLaborClaimView] = useState(false);
  const [isLaborClaimModalOpen, setIsLaborClaimModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<LaborClaim | null>(null);

  // 프로젝트 관리 (손익표)
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('geosang_projects_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [isProjectView, setIsProjectView] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    localStorage.setItem('geosang_contacts_v8', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    console.log('=== localStorage 저장 ===');
    console.log('저장할 laborClaims:', laborClaims);
    console.log('laborClaims 개수:', laborClaims.length);
    localStorage.setItem('geosang_labor_claims_v1', JSON.stringify(laborClaims));
    console.log('localStorage에 저장 완료');
  }, [laborClaims]);

  useEffect(() => {
    localStorage.setItem('geosang_projects_v1', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('geosang_auth_users_v2', JSON.stringify(authorizedUsers));
  }, [authorizedUsers]);

  const isAdmin = currentUser?.id === 'admin';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = authorizedUsers.find(u => u.username === loginId && u.password === loginPw);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('geosang_logged_in_user_obj_v2', JSON.stringify(user));
      setAuthError(false);
    } else {
      setAuthError(true);
      setLoginPw('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('geosang_logged_in_user_obj_v2');
  };

  const handleAddAuthUser = (name: string, username: string, pw: string) => {
    if (!name || !username || !pw) return;
    if (authorizedUsers.some(u => u.username === username)) {
      alert('이미 존재하는 아이디입니다.');
      return;
    }
    const newUser = { id: Date.now().toString(), name, username, password: pw };
    setAuthorizedUsers(prev => [...prev, newUser]);
  };

  const handleRevokeAccess = (id: string) => {
    if (id === 'admin') {
      alert('마스터 관리자 계정은 삭제할 수 없습니다.');
      return;
    }
    setAuthorizedUsers(prev => prev.filter(u => u.id !== id));
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
    return list;
  }, [contacts, activeCategory]);

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
      
      setContacts(prev => [...prev, ...newContacts]);
      alert(`✅ ${newContacts.length}개 항목 자동 등록 완료!\n\n파일: ${file.name}\n카테고리: ${getCategoryName(activeCategory)}`);
      if (event.target) event.target.value = '';
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
        return [c.subCategory, s?.name, s?.phone, s?.region, s?.residentNumber, s?.bankAccount, s?.features];
      });
      csvContent += [headers, ...rows].map(e => e.map(v => `"${v}"`).join(",")).join("\n");
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
            <div className="mb-1.5 flex flex-wrap gap-1">
              <span className="px-2 md:px-3 py-0.5 md:py-1 rounded text-[10px] md:text-[11px] font-black bg-blue-600 text-white uppercase tracking-widest shadow-sm">{contact.industry || contact.subCategory || getCategoryName(contact.category)}</span>
            </div>
            <h3 className="text-base md:text-lg lg:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">{isOutsource ? contact.staffList[0]?.name : contact.brandName}</h3>
            {isOutsource && contact.staffList[0]?.rating && (
              <div className="flex gap-0.5 mt-0.5 text-amber-400">{Array.from({length: 5}).map((_, i) => <Star key={i} size={12} fill={i < (contact.staffList[0].rating || 0) ? "currentColor" : "none"} />)}</div>
            )}
          </div>
          <div className="flex gap-0.5 ml-2">
            {contact.licenseFile && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = `data:${contact.licenseFile.mimeType};base64,${contact.licenseFile.data}`;
                  link.download = contact.licenseFile.name;
                  link.click();
                }}
                className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors"
                title="사업자등록증 다운로드"
              >
                <FileText size={16} />
              </button>
            )}
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
            {canManage && (
              <div className="flex gap-1">
                <button 
                  onClick={onEdit} 
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200 hover:scale-105"
                  title="수정"
                >
                  <Pencil size={16} />
                </button>
                <button 
                  onClick={onDelete} 
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 hover:scale-105"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3 lg:space-y-4">
          {contact.staffList?.map((staff: Staff) => (
            <div key={staff.id} className="p-3 lg:p-4 bg-slate-50 rounded-xl lg:rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 text-sm">{staff.name}</span>
                {staff.department && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black">{staff.department}</span>}
                {isOutsource && staff.region && <span className="text-[11px] bg-emerald-600 text-white px-2.5 py-1 rounded-md font-black ml-1 shadow-sm">{staff.region}</span>}
              </div>
              <div className="text-slate-600 text-[11px] lg:text-xs flex flex-col gap-1 font-medium font-mono">
                <a href={`tel:${staff.phone}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors"><Phone size={12} className="text-slate-400" /> {staff.phone}</a>
                {!isOutsource && staff.position && <div className="flex items-center gap-2"><Briefcase size={12} className="text-slate-400" /> {staff.position}</div>}
                {isOutsource && staff.residentNumber && <div className="flex items-center gap-2"><Lock size={12} className="text-slate-400" /> {staff.residentNumber}</div>}
                {(staff.bankAccount || contact.bankAccount) && <div className="flex items-center gap-2"><CreditCard size={12} className="text-slate-400" /> {staff.bankAccount || contact.bankAccount}</div>}
                {!isOutsource && staff.email && <a href={`mailto:${staff.email}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors"><Mail size={12} className="text-slate-400" /> {staff.email}</a>}
                {isOutsource && staff.features && <div className="mt-1 pt-1 border-t border-slate-200/50 text-[10px] italic text-slate-400 truncate">{staff.features}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
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
  const ProjectManagementView = () => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [storeName, setStoreName] = useState('');
    const [franchiseName, setFranchiseName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [reportRequest, setReportRequest] = useState('');
    const [generatingReport, setGeneratingReport] = useState(false);

    // 매장별 손익 집계
    const projectSummaries = useMemo(() => {
      const summaryMap = new Map<string, {
        storeName: string;
        franchiseName: string;
        revenue: number;
        costs: { labor: number; materials: number; delivery: number; other: number; total: number };
        profit: number;
        margin: number;
        documentCount: number;
      }>();

      projects.forEach(project => {
        summaryMap.set(project.storeName, {
          storeName: project.storeName,
          franchiseName: project.franchiseName,
          revenue: project.revenue.quotationAmount || 0,
          costs: project.costs,
          profit: project.profit.amount,
          margin: project.profit.margin,
          documentCount: project.documents?.length || 0
        });
      });

      return Array.from(summaryMap.values());
    }, [projects]);

    // 프랜차이즈별 집계
    const franchiseSummaries = useMemo(() => {
      const franchiseMap = new Map<string, { stores: number; totalRevenue: number; totalCosts: number; totalProfit: number }>();
      
      projectSummaries.forEach(summary => {
        const existing = franchiseMap.get(summary.franchiseName) || { stores: 0, totalRevenue: 0, totalCosts: 0, totalProfit: 0 };
        franchiseMap.set(summary.franchiseName, {
          stores: existing.stores + 1,
          totalRevenue: existing.totalRevenue + summary.revenue,
          totalCosts: existing.totalCosts + summary.costs.total,
          totalProfit: existing.totalProfit + summary.profit
        });
      });

      return Array.from(franchiseMap.entries());
    }, [projectSummaries]);

    // 간편 파일 업로드 (브랜드+지점명만 입력)
    const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (!storeName.trim()) {
        alert('지점명을 입력해주세요. (예: 인천점, 강남점)');
        return;
      }

      setUploading(true);
      setUploadProgress({ current: 0, total: files.length });
      const uploadedCount = files.length;
      let successCount = 0;

      try {
        // 🔧 여러 파일 동시 업로드를 위한 임시 프로젝트 맵
        const projectsMap = new Map<string, Project>();
        
        // 현재 projects 복사
        projects.forEach(p => projectsMap.set(p.id, { ...p, documents: [...p.documents] }));

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress({ current: i + 1, total: files.length });
          
          await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
              try {
                const base64 = event.target?.result as string;
                const base64Data = base64.split(',')[1];

                // AI로 문서 자동 분석 (OCR - 이미지 파일 텍스트 추출)
                let documentType: DocumentType = 'other';
                let extracted: any = {};
                
                try {
                  const fileName = file.name.toLowerCase();
                  const isImage = file.type.startsWith('image/');
                  
                  // 🔍 이미지 파일인 경우 OCR로 분석
                  if (isImage) {
                    console.log(`📸 이미지 파일 감지: ${file.name} - OCR 분석 시작...`);
                    
                    // 파일명으로 문서 타입 추정 (우선순위)
                    if (fileName.includes('견적') || fileName.includes('quote')) {
                      documentType = 'quotation';
                      console.log('📋 견적서로 분류');
                      extracted = await extractProjectDocument(base64Data, file.type, 'quotation');
                    } else if (fileName.includes('발주') || fileName.includes('order')) {
                      documentType = 'purchase_order';
                      console.log('📦 발주서로 분류');
                      extracted = await extractProjectDocument(base64Data, file.type, 'purchase_order');
                    } else if (fileName.includes('거래') || fileName.includes('명세') || fileName.includes('invoice')) {
                      documentType = 'transaction_stmt';
                      console.log('🧾 거래명세서로 분류');
                      extracted = await extractProjectDocument(base64Data, file.type, 'transaction_stmt');
                    } else if (fileName.includes('배송') || fileName.includes('퀵') || fileName.includes('delivery') || fileName.includes('영수증') || fileName.includes('receipt')) {
                      documentType = 'delivery_cost';
                      console.log('🚚 배송비/영수증으로 분류');
                      extracted = await extractProjectDocument(base64Data, file.type, 'delivery_cost');
                    } else if (fileName.includes('시안') || fileName.includes('디자인') || fileName.includes('design')) {
                      documentType = 'design_proposal';
                      console.log('🎨 디자인 시안으로 분류');
                      extracted = await extractProjectDocument(base64Data, file.type, 'design_proposal');
                    } else {
                      // 파일명만으로 판단 불가 시 OCR로 내용 분석하여 자동 분류
                      console.log('🤖 OCR로 문서 타입 자동 감지 중...');
                      extracted = await extractProjectDocument(base64Data, file.type, 'auto');
                      
                      // OCR 결과로 문서 타입 자동 결정
                      if (extracted.detectedType) {
                        documentType = extracted.detectedType;
                        console.log(`✅ 자동 감지됨: ${documentType}`);
                      } else {
                        documentType = 'quotation'; // 기본값
                        console.log('⚠️ 타입 감지 실패, 견적서로 기본 분류');
                      }
                    }
                    
                    console.log('✅ OCR 분석 완료:', extracted);
                  } 
                  // PDF 등 비이미지 파일
                  else {
                    if (fileName.includes('견적') || fileName.includes('quote')) {
                      documentType = 'quotation';
                      extracted = await extractProjectDocument(base64Data, file.type, 'quotation');
                    } else if (fileName.includes('발주') || fileName.includes('order')) {
                      documentType = 'purchase_order';
                      extracted = await extractProjectDocument(base64Data, file.type, 'purchase_order');
                    } else if (fileName.includes('거래') || fileName.includes('명세') || fileName.includes('invoice')) {
                      documentType = 'transaction_stmt';
                      extracted = await extractProjectDocument(base64Data, file.type, 'transaction_stmt');
                    } else if (fileName.includes('배송') || fileName.includes('퀵') || fileName.includes('delivery')) {
                      documentType = 'delivery_cost';
                      extracted = await extractProjectDocument(base64Data, file.type, 'delivery_cost');
                    } else if (fileName.includes('시안') || fileName.includes('디자인') || fileName.includes('design')) {
                      documentType = 'design_proposal';
                      extracted = await extractProjectDocument(base64Data, file.type, 'design_proposal');
                    } else {
                      extracted = await extractProjectDocument(base64Data, file.type, 'quotation');
                    }
                  }
                } catch (err) {
                  console.warn('AI extraction failed, using manual input:', err);
                  extracted = { storeName: `${franchiseName} ${storeName}`, amount: 0 };
                }

                // 프로젝트 매장명 (사용자 입력 우선)
                const fullStoreName = franchiseName.trim() 
                  ? `${franchiseName.trim()} ${storeName.trim()}`
                  : storeName.trim();

                // 🔧 프로젝트 찾기 또는 생성 (임시 맵에서)
                let project: Project | undefined;
                for (const p of projectsMap.values()) {
                  if (p.storeName === fullStoreName) {
                    project = p;
                    break;
                  }
                }
                
                if (!project) {
                  // 새 프로젝트 생성
                  const newProjectId = `proj-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
                  project = {
                    id: newProjectId,
                    storeName: fullStoreName,
                    franchiseName: franchiseName.trim() || fullStoreName.split(' ')[0],
                    location: fullStoreName,
                    startDate: new Date().toISOString().split('T')[0],
                    status: 'in_progress',
                    revenue: { quotationAmount: 0 },
                    costs: { labor: 0, materials: 0, delivery: 0, other: 0, total: 0 },
                    profit: { amount: 0, margin: 0 },
                    documents: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  projectsMap.set(newProjectId, project);
                  console.log(`🆕 새 프로젝트 생성: ${fullStoreName} (ID: ${newProjectId})`);
                } else {
                  console.log(`✅ 기존 프로젝트 발견: ${fullStoreName} (ID: ${project.id})`);
                }

                // 문서 추가
                const document: ProjectDocument = {
                  id: `doc-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                  projectId: project.id,
                  storeName: fullStoreName,
                  documentType,
                  title: file.name,
                  amount: extracted.amount || 0,
                  file: {
                    data: base64Data,
                    name: file.name,
                    mimeType: file.type,
                    size: file.size
                  },
                  uploadedBy: currentUser.name,
                  uploadedAt: new Date().toISOString(),
                  extractedData: extracted
                };

                project.documents.push(document);
                console.log(`📄 문서 추가 완료: ${file.name} → ${fullStoreName} (문서 타입: ${documentType})`);

                // 금액 자동 반영
                if (documentType === 'quotation' && extracted.amount) {
                  project.revenue.quotationAmount = Math.max(project.revenue.quotationAmount, extracted.amount);
                } else if (documentType === 'transaction_stmt' && extracted.amount) {
                  project.costs.materials += extracted.amount;
                } else if (documentType === 'delivery_cost' && extracted.amount) {
                  project.costs.delivery += extracted.amount;
                }

                // 인건비 자동 집계
                const laborCost = laborClaims
                  .filter(claim => claim.sites.some(s => s.siteName.includes(fullStoreName) || fullStoreName.includes(s.siteName)))
                  .reduce((sum, claim) => sum + claim.totalAmount, 0);
                project.costs.labor = laborCost;

                // 손익 계산
                project.costs.total = project.costs.labor + project.costs.materials + project.costs.delivery + project.costs.other;
                project.profit.amount = project.revenue.quotationAmount - project.costs.total;
                project.profit.margin = project.revenue.quotationAmount > 0 
                  ? (project.profit.amount / project.revenue.quotationAmount) * 100 
                  : 0;

                project.updatedAt = new Date().toISOString();

                // 🔧 임시 맵에 저장 (상태 업데이트는 나중에 한 번만)
                projectsMap.set(project.id, project);

                successCount++;
                resolve(true);
              } catch (err) {
                console.error(`❌ 파일 처리 실패: ${file.name}`, err);
                console.error('에러 상세:', {
                  fileName: file.name,
                  fileType: file.type,
                  fileSize: file.size,
                  error: err
                });
                resolve(false);
              }
            };
            reader.readAsDataURL(file);
          });
        }

        // 🔧 모든 파일 처리 완료 후 한 번에 상태 업데이트
        console.log(`✅ 모든 파일 처리 완료: ${successCount}/${uploadedCount}개`);
        const updatedProjects = Array.from(projectsMap.values());
        setProjects(updatedProjects);
        console.log('📊 프로젝트 상태 업데이트 완료:', updatedProjects);

        alert(`✅ 업로드 완료!\n\n매장: ${franchiseName} ${storeName}\n파일: ${successCount}/${uploadedCount}개`);
        
        // 입력 초기화
        setStoreName('');
        setFranchiseName('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('❌ 전체 업로드 프로세스 실패:', error);
        alert(`업로드 중 오류가 발생했습니다.\n\n에러: ${error}\n\n콘솔(F12)을 확인해주세요.`);
      } finally {
        setUploading(false);
      }
    };

    return (
      <section className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-10 scroll-smooth bg-gradient-to-br from-slate-50 to-purple-50">
        {/* 헤더 */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">📊 프로젝트 관리 & 손익표</h2>
          <p className="text-xs md:text-sm text-slate-600 mt-2">매장별 문서를 업로드하면 AI가 자동으로 분류하고 손익을 계산합니다</p>
        </div>

        {/* 업로드 진행 상태 */}
        {uploading && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <div>
                <p className="text-lg font-bold text-blue-900">파일 업로드 중...</p>
                <p className="text-sm text-blue-600">
                  {uploadProgress.current} / {uploadProgress.total} 파일 처리 중
                </p>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-500 mt-2 text-center">
              OCR 분석 및 자동 분류 진행 중... 잠시만 기다려주세요.
            </p>
          </div>
        )}

        {/* 간편 업로드 */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 shadow-lg border-2 border-blue-200 mb-6">
          <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
            <Upload size={24} className="text-blue-600" />
            간편 업로드
          </h3>
          <p className="text-xs text-slate-600 mb-4">브랜드명과 지점명만 입력하고 파일을 올리면 AI가 자동으로 분류합니다</p>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-2">브랜드명</label>
              <input 
                type="text"
                placeholder="예: 컴포즈커피"
                value={franchiseName}
                onChange={(e) => setFranchiseName(e.target.value)}
                className="w-full p-3 border-2 border-slate-300 rounded-xl font-bold focus:border-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-2">지점명 *</label>
              <input 
                type="text"
                placeholder="예: 인천점"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full p-3 border-2 border-blue-300 rounded-xl font-bold focus:border-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-2">파일 선택 (다중 선택 가능)</label>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*,.pdf" 
                onChange={handleQuickUpload}
                disabled={uploading}
                multiple
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !storeName.trim()}
                className="w-full p-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-300 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="animate-spin" size={20} /> AI 분석 중...</>
                ) : (
                  <><Upload size={20} /> 파일 올리기</>
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-900 font-bold">💡 Tip: 파일명에 "견적서", "거래명세서", "배송비" 등이 포함되면 AI가 자동으로 분류합니다</p>
          </div>
        </div>

        {/* 프랜차이즈별 통계 */}
        {franchiseSummaries.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="text-lg font-black text-slate-900 mb-4">🏢 프랜차이즈별 통계</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {franchiseSummaries.map(([name, data]) => (
                <div key={name} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="font-black text-slate-900 mb-2">{name}</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">매장 수:</span>
                      <span className="font-bold">{data.stores}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">총 수익:</span>
                      <span className="font-bold text-blue-600">{data.totalRevenue.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">총 비용:</span>
                      <span className="font-bold text-red-600">{data.totalCosts.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1">
                      <span className="text-slate-900 font-bold">순이익:</span>
                      <span className={`font-black ${data.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {data.totalProfit.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 대화형 리포트 요청 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-6">
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <input 
                type="text"
                placeholder='예: "컴포즈커피 인천점 손익분석 보고해줘" 또는 "컴포즈 인천 리포트"'
                value={reportRequest}
                onChange={(e) => setReportRequest(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && reportRequest.trim()) {
                    // 리포트 생성 로직 (추후 구현)
                    const words = reportRequest.toLowerCase();
                    const matchedProject = projects.find(p => 
                      words.includes(p.storeName.toLowerCase()) ||
                      words.split(' ').some(w => p.storeName.toLowerCase().includes(w))
                    );
                    if (matchedProject) {
                      setSelectedProject(matchedProject);
                      alert(`📊 "${matchedProject.storeName}" 리포트를 생성합니다!`);
                    } else {
                      alert('해당 매장을 찾을 수 없습니다. 매장명을 확인해주세요.');
                    }
                  }
                }}
                className="w-full p-3 pl-12 border-2 border-slate-200 rounded-xl font-bold focus:border-purple-500 outline-none"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
            <button
              onClick={() => {
                if (!reportRequest.trim()) {
                  alert('리포트 요청을 입력해주세요.');
                  return;
                }
                const words = reportRequest.toLowerCase();
                const matchedProject = projects.find(p => 
                  words.includes(p.storeName.toLowerCase()) ||
                  words.split(' ').some(w => p.storeName.toLowerCase().includes(w))
                );
                if (matchedProject) {
                  setSelectedProject(matchedProject);
                  alert(`📊 "${matchedProject.storeName}" 리포트를 생성합니다!`);
                  setReportRequest('');
                } else {
                  alert('해당 매장을 찾을 수 없습니다. 매장명을 확인해주세요.');
                }
              }}
              disabled={!reportRequest.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:bg-slate-300 flex items-center gap-2"
            >
              <BarChart3 size={20} />
              <span className="hidden md:inline">리포트 생성</span>
            </button>
          </div>
        </div>

        {/* 선택된 프로젝트 상세 리포트 */}
        {selectedProject && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 shadow-lg border-2 border-purple-200 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedProject.storeName}</h3>
                <p className="text-sm text-slate-600">프랜차이즈: {selectedProject.franchiseName}</p>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-white rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* 손익 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
                <p className="text-xs text-slate-600 font-bold mb-1">매출 (견적금액)</p>
                <p className="text-2xl font-black text-blue-600">{selectedProject.revenue.quotationAmount.toLocaleString()}원</p>
              </div>
              <div className="bg-white rounded-xl p-4 border-2 border-red-200">
                <p className="text-xs text-slate-600 font-bold mb-1">총 비용</p>
                <p className="text-2xl font-black text-red-600">{selectedProject.costs.total.toLocaleString()}원</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">인건비:</span>
                    <span className="font-bold">{selectedProject.costs.labor.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">자재비:</span>
                    <span className="font-bold">{selectedProject.costs.materials.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">배송비:</span>
                    <span className="font-bold">{selectedProject.costs.delivery.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
              <div className={`bg-white rounded-xl p-4 border-2 ${selectedProject.profit.amount >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
                <p className="text-xs text-slate-600 font-bold mb-1">순이익</p>
                <p className={`text-2xl font-black ${selectedProject.profit.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {selectedProject.profit.amount.toLocaleString()}원
                </p>
                <p className={`text-sm font-bold mt-1 ${selectedProject.profit.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  이익률: {selectedProject.profit.margin.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* 막대 그래프 (CSS로 간단하게) */}
            <div className="bg-white rounded-xl p-4 mb-4">
              <h4 className="text-sm font-black text-slate-900 mb-3">비용 구성</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700">인건비</span>
                    <span className="font-bold text-blue-600">{selectedProject.costs.labor.toLocaleString()}원</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${selectedProject.costs.total > 0 ? (selectedProject.costs.labor / selectedProject.costs.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700">자재비</span>
                    <span className="font-bold text-purple-600">{selectedProject.costs.materials.toLocaleString()}원</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full"
                      style={{ width: `${selectedProject.costs.total > 0 ? (selectedProject.costs.materials / selectedProject.costs.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700">배송비</span>
                    <span className="font-bold text-orange-600">{selectedProject.costs.delivery.toLocaleString()}원</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full rounded-full"
                      style={{ width: `${selectedProject.costs.total > 0 ? (selectedProject.costs.delivery / selectedProject.costs.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 문서 목록 */}
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-sm font-black text-slate-900 mb-3">업로드된 문서 ({selectedProject.documents.length}건)</h4>
              <div className="space-y-2">
                {selectedProject.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{doc.title}</p>
                        <p className="text-xs text-slate-500">
                          {doc.uploadedBy} · {new Date(doc.uploadedAt).toLocaleDateString('ko-KR')}
                          {doc.amount && ` · ${doc.amount.toLocaleString()}원`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold">
                      {doc.documentType === 'quotation' ? '견적서' :
                       doc.documentType === 'transaction_stmt' ? '거래명세서' :
                       doc.documentType === 'delivery_cost' ? '배송비' :
                       doc.documentType === 'design_proposal' ? '디자인' : '기타'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 매장별 손익표 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-black text-slate-900 mb-4">💼 매장별 손익표</h3>
          {projectSummaries.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-bold">문서를 업로드하면 자동으로 손익표가 생성됩니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left p-3 text-xs font-black text-slate-600">매장명</th>
                    <th className="text-left p-3 text-xs font-black text-slate-600">프랜차이즈</th>
                    <th className="text-right p-3 text-xs font-black text-slate-600">견적금액</th>
                    <th className="text-right p-3 text-xs font-black text-slate-600">인건비</th>
                    <th className="text-right p-3 text-xs font-black text-slate-600">자재비</th>
                    <th className="text-right p-3 text-xs font-black text-slate-600">배송비</th>
                    <th className="text-right p-3 text-xs font-black text-slate-600">총비용</th>
                    <th className="text-right p-3 text-xs font-black text-slate-600">손익</th>
                    <th className="text-right p-3 text-xs font-black text-slate-600">이익률</th>
                    <th className="text-center p-3 text-xs font-black text-slate-600">문서</th>
                  </tr>
                </thead>
                <tbody>
                  {projectSummaries.map(summary => (
                    <tr key={summary.storeName} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-sm font-bold text-slate-900">{summary.storeName}</td>
                      <td className="p-3 text-xs text-slate-600">{summary.franchiseName}</td>
                      <td className="p-3 text-sm font-bold text-right text-blue-600">{summary.revenue.toLocaleString()}</td>
                      <td className="p-3 text-xs text-right text-slate-600">{summary.costs.labor.toLocaleString()}</td>
                      <td className="p-3 text-xs text-right text-slate-600">{summary.costs.materials.toLocaleString()}</td>
                      <td className="p-3 text-xs text-right text-slate-600">{summary.costs.delivery.toLocaleString()}</td>
                      <td className="p-3 text-sm font-bold text-right text-red-600">{summary.costs.total.toLocaleString()}</td>
                      <td className={`p-3 text-sm font-black text-right ${summary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {summary.profit.toLocaleString()}
                      </td>
                      <td className={`p-3 text-xs font-bold text-right ${summary.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {summary.margin.toFixed(1)}%
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">
                          {summary.documentCount}건
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  };

  const AdminModal = ({ users, onClose, onAdd, onRevoke }: any) => {
    const [newName, setNewName] = useState('');
    const [newId, setNewId] = useState('');
    const [newPw, setNewPw] = useState('');
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
                <input className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500" placeholder="이름" value={newName} onChange={e => setNewName(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500" placeholder="아이디" value={newId} onChange={e => setNewId(e.target.value)} />
                  <input className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500" placeholder="비밀번호" value={newPw} onChange={e => setNewPw(e.target.value)} />
                </div>
              </div>
              <button onClick={() => { if(newName && newId && newPw) { onAdd(newName, newId, newPw); setNewName(''); setNewId(''); setNewPw(''); } }} className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-black text-xs hover:bg-slate-800 transition-all">계정 등록</button>
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
  };

  const ContactFormModal = ({ onClose, onSubmit, currentCategory, initialData, departments, industries, outsourceTypes, onAddDept, onAddIndustry, onAddOutsourceType, onRenameItem, isAdmin }: any) => {
    const isGeosang = (initialData?.category || currentCategory) === CategoryType.GEOSANG;
    const isOutsource = (initialData?.category || currentCategory) === CategoryType.OUTSOURCE;
    const showDepartmentFeature = !isOutsource;
    const licenseInputRef = useRef<HTMLInputElement>(null);
    const cardInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<Partial<Contact>>(() => {
      if (initialData) return { ...initialData };
      return {
        id: Date.now().toString(), category: currentCategory,
        brandName: isGeosang ? '거상컴퍼니' : '', industry: '',
        subCategory: isOutsource ? '시공일당' : '',
        bankAccount: '',
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
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [isCardOcrLoading, setIsCardOcrLoading] = useState(false);

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
      const newList = [...(formData.staffList || [])];
      newList[index] = { ...newList[index], [field]: value };
      setFormData({ ...formData, staffList: newList });
    };

    const addStaff = () => {
      setFormData({ ...formData, staffList: [...(formData.staffList || []), { 
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
      }] });
    };

    const removeStaff = (index: number) => {
      if ((formData.staffList?.length || 0) <= 1) return;
      const newList = [...(formData.staffList || [])];
      newList.splice(index, 1);
      setFormData({ ...formData, staffList: newList });
    };

    const inputClasses = "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 lg:py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-900 font-bold text-xs lg:text-sm transition-all";
    const labelClasses = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

    const renderItemManagement = (items: string[], type: 'DEPT' | 'INDUSTRY' | 'OUTSOURCE') => {
      const isSelected = (item: string) => {
        if (type === 'DEPT') return selectedDepartment === item;
        if (type === 'INDUSTRY') return formData.industry === item;
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
          } else {
            const newTypes = outsourceTypes.map(t => t === item ? newName : t);
            setOutsourceTypes(newTypes);
            localStorage.setItem('outsource_types_v3', JSON.stringify(newTypes));
          }
        }
      };
      
      return (
        <div className="bg-slate-50 p-4 lg:p-6 rounded-2xl border border-slate-200 space-y-3">
          <label className={labelClasses}>{type === 'DEPT' ? '팀 선택' : (type === 'INDUSTRY' ? '업종' : '구분')}</label>
          <div className="flex flex-wrap gap-1.5">
            {items.map(item => (
              <div key={item} className="relative group">
                <button 
                  type="button" 
                  onClick={() => { 
                    if (type === 'DEPT') { 
                      setSelectedDepartment(item); 
                      handleStaffChange(formData.staffList!.length - 1, 'department', item); 
                    } else if (type === 'INDUSTRY') {
                      setFormData({...formData, industry: item}); 
                    } else {
                      setFormData({...formData, subCategory: item});
                    }
                  }} 
                  className={`px-3 py-1.5 rounded-lg text-[10px] lg:text-xs font-black border-2 transition-all ${isSelected(item) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                  {item}
                </button>
                {isAdmin && (
                  <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-0.5 z-10">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}
                      className="bg-blue-600 text-white p-1 rounded-md shadow-lg hover:bg-blue-700 transition-all"
                      title="이름 수정"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}
                      className="bg-red-600 text-white p-1 rounded-md shadow-lg hover:bg-red-700 transition-all"
                      title="삭제"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <input className="flex-1 bg-white border-2 border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none" placeholder="직접 추가..." value={newItemInput} onChange={e => setNewItemInput(e.target.value)} onKeyPress={e => { if(e.key === 'Enter') { e.preventDefault(); if(newItemInput) { if (type === 'DEPT') onAddDept(newItemInput); else if (type === 'INDUSTRY') onAddIndustry(newItemInput); else onAddOutsourceType(newItemInput); setNewItemInput(''); } } }} />
              <button type="button" onClick={() => { if(newItemInput) { if (type === 'DEPT') onAddDept(newItemInput); else if (type === 'INDUSTRY') onAddIndustry(newItemInput); else onAddOutsourceType(newItemInput); setNewItemInput(''); } }} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-800 transition-all">추가</button>
            </div>
          )}
        </div>
      );
    };

    const handleLicenseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const result = event.target?.result as string;
          const base64 = result.split(',')[1];
          
          setIsOcrLoading(true);
          try {
            const extracted = await extractBusinessLicenseData(base64, file.type);
            setFormData(prev => ({
              ...prev,
              brandName: extracted.brandName || prev.brandName,
              address: extracted.address || prev.address,
              licenseFile: {
                data: base64,
                name: file.name,
                mimeType: file.type
              }
            }));
          } catch (err) {
            console.error("OCR Failed", err);
            setFormData(prev => ({
              ...prev,
              licenseFile: {
                data: base64,
                name: file.name,
                mimeType: file.type
              }
            }));
          } finally {
            setIsOcrLoading(false);
          }
        };
        reader.readAsDataURL(file);
      }
    };

    const handleCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const result = event.target?.result as string;
          const base64 = result.split(',')[1];
          
          setIsCardOcrLoading(true);
          try {
            const extracted = await extractBusinessCardData(base64, file.type);
            
            setFormData(prev => {
              const newList = [...(prev.staffList || [])];
              let targetIdx = newList.length - 1;
              if (newList[targetIdx]?.name && newList[targetIdx]?.phone) {
                newList.push({
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
                });
                targetIdx = newList.length - 1;
              }

              newList[targetIdx] = {
                ...newList[targetIdx],
                name: extracted.name || newList[targetIdx].name,
                position: extracted.position || newList[targetIdx].position,
                phone: extracted.phone || newList[targetIdx].phone,
                email: extracted.email || newList[targetIdx].email,
              };

              return {
                ...prev,
                phone: extracted.companyPhone || prev.phone,
                homepage: extracted.homepage || prev.homepage,
                staffList: newList
              };
            });
          } catch (err) {
            console.error("Card OCR Failed", err);
            alert("명단 분석에 실패했습니다.");
          } finally {
            setIsCardOcrLoading(false);
            if (cardInputRef.current) cardInputRef.current.value = '';
          }
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 lg:p-6">
        <div className="bg-white rounded-3xl lg:rounded-[3rem] w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl p-6 lg:p-10 scrollbar-hide">
          <div className="flex justify-between items-center mb-6 lg:mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-xl lg:text-3xl font-black tracking-tight">{isGeosang ? '거상 인원 등록' : '정보 등록'}</h2>
              <input type="file" ref={licenseInputRef} className="hidden" accept="image/*,.pdf" onChange={handleLicenseUpload} />
              <button 
                type="button" 
                disabled={isOcrLoading}
                onClick={() => licenseInputRef.current?.click()}
                className={`px-3 py-1.5 border rounded-lg text-[10px] font-black transition-colors flex items-center gap-1.5 ${formData.licenseFile ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'} ${isOcrLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isOcrLoading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} 
                {isOcrLoading ? '분석 중...' : (formData.licenseFile ? `변경: ${formData.licenseFile.name}` : '사업자등록증 업로드')}
              </button>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
          </div>
          <form onSubmit={e => { e.preventDefault(); onSubmit(formData); }} className="space-y-6 lg:space-y-8">
            {isOutsource && renderItemManagement(outsourceTypes, 'OUTSOURCE')}
            {!isOutsource && (
              <div className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  <div className="lg:col-span-2"><label className={labelClasses}>상호 / 브랜드명</label><input className={inputClasses} value={formData.brandName} onChange={e => setFormData({...formData, brandName: e.target.value})} disabled={isGeosang} /></div>
                  <div className="lg:col-span-2">{renderItemManagement(industries, 'INDUSTRY')}</div>
                  <div className="lg:col-span-2"><label className={labelClasses}>상세 주소</label><input className={inputClasses} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                  <div className="col-span-1"><label className={labelClasses}>대표번호 1</label><input className={inputClasses} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                  <div className="col-span-1"><label className={labelClasses}>대표번호 2</label><input className={inputClasses} value={formData.phone2} onChange={e => setFormData({...formData, phone2: e.target.value})} /></div>
                  <div className="col-span-1"><label className={labelClasses}>이메일</label><input className={inputClasses} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                  <div className="col-span-1"><label className={labelClasses}>홈페이지 주소</label><input className={inputClasses} value={formData.homepage} onChange={e => setFormData({...formData, homepage: e.target.value})} /></div>
                  <div className="lg:col-span-2"><label className={labelClasses}>계좌번호</label><input className={inputClasses} value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} placeholder="은행명 계좌번호 예금주" /></div>
                </div>
              </div>
            )}
            <div className="border-t-2 border-slate-100 pt-6 lg:pt-8">
              <div className="flex justify-between items-center mb-4 lg:mb-6">
                <h3 className="text-lg lg:text-xl font-black">인원 구성</h3>
                <div className="flex items-center gap-2">
                  <input type="file" ref={cardInputRef} className="hidden" accept="image/*" onChange={handleCardUpload} />
                  <button 
                    type="button" 
                    disabled={isCardOcrLoading}
                    onClick={() => cardInputRef.current?.click()}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isCardOcrLoading ? <Loader2 size={14} className="animate-spin" /> : <Contact2 size={14}/>}
                    {isCardOcrLoading ? '분석 중...' : '명함 업로드'}
                  </button>
                  <button type="button" onClick={addStaff} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"><Plus size={14}/> 추가</button>
                </div>
              </div>
              {showDepartmentFeature && <div className="mb-6 lg:mb-10">{renderItemManagement(departments, 'DEPT')}</div>}
              <div className="space-y-4 lg:space-y-6">
                {formData.staffList?.map((staff, idx) => (
                  <div key={idx} className="bg-slate-50 p-5 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border-2 border-slate-200 relative">
                    {formData.staffList!.length > 1 && (<button type="button" onClick={() => removeStaff(idx)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>)}
                    {isOutsource ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="col-span-1">
                          <label className={labelClasses}>이름/상호</label>
                          <input className={inputClasses} value={staff.name} onChange={e => handleStaffChange(idx, 'name', e.target.value)} required />
                        </div>
                        <div className="col-span-1">
                          <label className={labelClasses}>연락처</label>
                          <input className={inputClasses} value={staff.phone} onChange={e => handleStaffChange(idx, 'phone', e.target.value)} required />
                        </div>
                        <div className="col-span-1">
                          <label className={labelClasses}>활동지역</label>
                          <input className={inputClasses} value={staff.region} onChange={e => handleStaffChange(idx, 'region', e.target.value)} />
                        </div>
                        <div className="col-span-1">
                          <label className={labelClasses}>주민번호/사업자번호</label>
                          <input className={inputClasses} value={staff.residentNumber} onChange={e => handleStaffChange(idx, 'residentNumber', e.target.value)} />
                        </div>
                        <div className="col-span-1">
                          <label className={labelClasses}>계좌번호</label>
                          <input className={inputClasses} value={staff.bankAccount} onChange={e => handleStaffChange(idx, 'bankAccount', e.target.value)} />
                        </div>
                        <div className="col-span-1">
                          <label className={labelClasses}>비고</label>
                          <input className={inputClasses} value={staff.features} onChange={e => handleStaffChange(idx, 'features', e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="col-span-1"><label className={labelClasses}>성명</label><input className={inputClasses} value={staff.name} onChange={e => handleStaffChange(idx, 'name', e.target.value)} required /></div>
                        <div className="col-span-1"><label className={labelClasses}>직함</label><input className={inputClasses} value={staff.position} onChange={e => handleStaffChange(idx, 'position', e.target.value)} /></div>
                        <div className="col-span-1"><label className={labelClasses}>연락처</label><input className={inputClasses} value={staff.phone} onChange={e => handleStaffChange(idx, 'phone', e.target.value)} required /></div>
                        <div className="col-span-1"><label className={labelClasses}>이메일</label><input className={inputClasses} value={staff.email} onChange={e => handleStaffChange(idx, 'email', e.target.value)} /></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t-2 border-slate-100 pt-6 lg:pt-8">
              <div className="flex justify-between items-center mb-4 lg:mb-6">
                <h3 className="text-lg lg:text-xl font-black">첨부파일</h3>
                <div className="flex items-center gap-2">
                  <input type="file" ref={attachmentInputRef} className="hidden" multiple onChange={handleAttachmentUpload} />
                  <button 
                    type="button" 
                    onClick={() => attachmentInputRef.current?.click()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-blue-700 transition-all"
                  >
                    <Upload size={14}/> 파일 첨부
                  </button>
                </div>
              </div>
              
              {formData.attachments && formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <FileText size={16} className="text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {(!formData.attachments || formData.attachments.length === 0) && (
                <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <Upload size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">첨부파일이 없습니다</p>
                </div>
              )}
            </div>
            
            <button type="submit" className="w-full bg-blue-600 text-white py-4 lg:py-5 rounded-2xl lg:rounded-[1.5rem] font-black text-sm lg:text-lg shadow-xl hover:bg-blue-700 transition-all sticky bottom-0 z-10">저장하기</button>
          </form>
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
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl sm:rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] mt-4">로그인</button>
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
      case CategoryType.SALES: return '자영업(매출처)';
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
          <SidebarItem icon={<Users size={18} />} label="거상 조직도" active={activeCategory === CategoryType.GEOSANG && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.GEOSANG); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<HardHat size={18} />} label="외주팀 관리" active={activeCategory === CategoryType.OUTSOURCE && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.OUTSOURCE); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<DollarSign size={18} />} label="💰 인건비 청구" active={isLaborClaimView && !isProjectView} onClick={() => { setIsLaborClaimView(true); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<BarChart3 size={18} />} label="📊 프로젝트 손익표" active={isProjectView} onClick={() => { setIsProjectView(true); setIsLaborClaimView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<ShoppingBag size={18} />} label="매입 거래처" active={activeCategory === CategoryType.PURCHASE && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.PURCHASE); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <div className="pt-4 pb-1 px-3 text-[10px] font-black text-yellow-400 uppercase tracking-widest opacity-60">Partner Network</div>
          <SidebarItem icon={<Building2 size={18} />} label="프랜차이즈 본사" active={activeCategory === CategoryType.FRANCHISE_HQ && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_HQ); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Coffee size={18} />} label="프랜차이즈 지점" active={activeCategory === CategoryType.FRANCHISE_BR && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_BR); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Paintbrush size={18} />} label="인테리어" active={activeCategory === CategoryType.INTERIOR && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.INTERIOR); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<UtensilsCrossed size={18} />} label="자영업(매출처)" active={activeCategory === CategoryType.SALES && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.SALES); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Settings size={18} />} label="기타 거래처" active={activeCategory === CategoryType.OTHERS && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.OTHERS); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {isAdmin && (
            <button onClick={() => { setIsAdminModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-400 hover:bg-blue-500/10 transition-all text-xs font-bold border border-blue-500/20">
              <ShieldCheck size={16} /> 권한 관리
            </button>
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
          <SidebarItem icon={<Users size={18} />} label="거상 조직도" active={activeCategory === CategoryType.GEOSANG && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.GEOSANG); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<HardHat size={18} />} label="외주팀 관리" active={activeCategory === CategoryType.OUTSOURCE && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.OUTSOURCE); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<DollarSign size={18} />} label="💰 인건비 청구" active={isLaborClaimView && !isProjectView} onClick={() => { setIsLaborClaimView(true); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<BarChart3 size={18} />} label="📊 프로젝트 손익표" active={isProjectView} onClick={() => { setIsProjectView(true); setIsLaborClaimView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<ShoppingBag size={18} />} label="매입 거래처" active={activeCategory === CategoryType.PURCHASE && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.PURCHASE); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <div className="pt-4 pb-1 px-3 text-[10px] font-black text-yellow-400 uppercase tracking-widest opacity-60">Partner Network</div>
          <SidebarItem icon={<Building2 size={18} />} label="프랜차이즈 본사" active={activeCategory === CategoryType.FRANCHISE_HQ && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_HQ); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Coffee size={18} />} label="프랜차이즈 지점" active={activeCategory === CategoryType.FRANCHISE_BR && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_BR); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Paintbrush size={18} />} label="인테리어" active={activeCategory === CategoryType.INTERIOR && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.INTERIOR); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<UtensilsCrossed size={18} />} label="자영업(매출처)" active={activeCategory === CategoryType.SALES && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.SALES); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Settings size={18} />} label="기타 거래처" active={activeCategory === CategoryType.OTHERS && !isLaborClaimView && !isProjectView} onClick={() => { setActiveCategory(CategoryType.OTHERS); setIsLaborClaimView(false); setIsProjectView(false); setIsMobileMenuOpen(false); }} />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {isAdmin && (
            <button onClick={() => { setIsAdminModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-400 hover:bg-blue-500/10 transition-all text-xs font-bold border border-blue-500/20">
              <ShieldCheck size={16} /> 권한 관리
            </button>
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
        <header className="h-14 md:h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-6 lg:px-10 sticky top-0 z-40 shadow-sm gap-2">
          {/* 모바일 메뉴 버튼 */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg flex-shrink-0"
          >
            <Menu size={24} />
          </button>
          
          {/* 검색 기능 제거됨 */}
          <div className="flex-1"></div>

          {/* 액션 버튼들: 반응형 레이아웃 */}
          <div className="flex items-center gap-1 md:gap-2 lg:gap-3">
            {isAdmin && (
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
            <button 
              onClick={() => { setEditingContact(null); setIsModalOpen(true); }} 
              className="bg-blue-600 text-white px-3 md:px-4 lg:px-5 py-2 md:py-2.5 lg:py-3 rounded-lg md:rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 md:gap-2 shadow-lg shadow-blue-100 flex-shrink-0"
            >
              <Plus size={18} className="md:w-5 md:h-5" /> 
              <span className="text-xs md:text-sm">신규등록</span>
            </button>
          </div>
        </header>

        {isProjectView ? (
          <ProjectManagementView />
        ) : isLaborClaimView ? (
          <LaborClaimView 
            claims={laborClaims}
            outsourceWorkers={contacts.filter(c => c.category === CategoryType.OUTSOURCE)}
            onAddClaim={() => { setEditingClaim(null); setIsLaborClaimModalOpen(true); }}
            onEditClaim={(claim) => { setEditingClaim(claim); setIsLaborClaimModalOpen(true); }}
            onDeleteClaim={(id) => { if(confirm('삭제하시겠습니까?')) setLaborClaims(prev => prev.filter(c => c.id !== id)); }}
            onUpdateStatus={(id, status) => setLaborClaims(prev => prev.map(c => c.id === id ? { ...c, status, ...(status === 'approved' ? { approvedBy: currentUser.name, approvedAt: new Date().toISOString() } : status === 'paid' ? { paidAt: new Date().toISOString() } : {}) } : c))}
          />
        ) : (
          <section className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-10 scroll-smooth">
            <div className="mb-4 md:mb-6 lg:mb-10">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{getCategoryName(activeCategory)}</h2>
              <p className="text-[10px] md:text-xs lg:text-sm font-bold text-blue-600 mt-1 uppercase tracking-wider">데이터 현황: {filteredContacts.length}건</p>
            </div>
            
            {/* 반응형 그리드: 모바일 1열, 태블릿 2열, PC 3열 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-5 lg:gap-8 pb-20">
              {filteredContacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} canManage={isAdmin} onEdit={() => { setEditingContact(contact); setIsModalOpen(true); }} onDelete={() => { if(confirm('삭제하시겠습니까?')) setContacts(prev => prev.filter(c => c.id !== contact.id)) }} />
              ))}
            </div>
          </section>
        )}
      </main>

      {isAdminModalOpen && <AdminModal users={authorizedUsers} onClose={() => setIsAdminModalOpen(false)} onAdd={handleAddAuthUser} onRevoke={handleRevokeAccess} />}
      {isModalOpen && (
        <ContactFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={(c: Contact) => { if (editingContact) setContacts(prev => prev.map(old => old.id === c.id ? c : old)); else setContacts(prev => [...prev, c]); setIsModalOpen(false); }}
          currentCategory={activeCategory} initialData={editingContact} departments={departments} industries={industries} outsourceTypes={outsourceTypes}
          onAddDept={(dept: string) => setDepartments(prev => [...prev, dept])} onAddIndustry={(ind: string) => setIndustries(prev => [...prev, ind])} onAddOutsourceType={(type: string) => setOutsourceTypes(prev => [...prev, type])}
          onRenameItem={handleGlobalRenameItem} isAdmin={isAdmin}
        />
      )}
      {isLaborClaimModalOpen && (
        <LaborClaimModal
          onClose={() => {
            setIsLaborClaimModalOpen(false);
            setEditingClaim(null); // 모달 닫을 때 editingClaim 초기화
          }}
          onSubmit={(claim: LaborClaim) => {
            console.log('=== onSubmit 호출됨 ===');
            console.log('받은 claim 데이터:', claim);
            console.log('editingClaim:', editingClaim);
            
            if (editingClaim) {
              console.log('수정 모드: 기존 청구 업데이트');
              setLaborClaims(prev => {
                const updated = prev.map(c => c.id === claim.id ? claim : c);
                console.log('업데이트된 laborClaims:', updated);
                return updated;
              });
            } else {
              console.log('등록 모드: 새 청구 추가');
              setLaborClaims(prev => {
                const newClaims = [...prev, claim];
                console.log('새로운 laborClaims:', newClaims);
                return newClaims;
              });
            }
            
            console.log('모달 닫기');
            setIsLaborClaimModalOpen(false);
            setEditingClaim(null); // 등록/수정 후 editingClaim 초기화
          }}
          initialData={editingClaim}
          outsourceWorkers={contacts.filter(c => c.category === CategoryType.OUTSOURCE)}
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

export default App;
