import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, Briefcase, ShoppingBag, Store, Home, 
  Settings, Search, Plus, Trash2, Phone, Mail, 
  MapPin, CreditCard, FileText, Upload, ChevronRight, 
  Building2, HardHat, Coffee, Paintbrush, UtensilsCrossed,
  Layers, Filter, X, Pencil, Globe, ChevronDown, Check, Lock,
  Wallet, Tag, Loader2, Calendar, DollarSign, Download, BarChart3, TrendingUp, FileSpreadsheet, Star, Key, ShieldCheck, UserPlus, LogOut, User, Menu, Contact2
} from 'lucide-react';
import { CategoryType, Contact, Staff, ConstructionRecord } from './types';
import { extractConstructionData, extractBusinessLicenseData, extractBusinessCardData } from './geminiService';

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
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    localStorage.setItem('geosang_contacts_v8', JSON.stringify(contacts));
  }, [contacts]);

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
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      return list.map(contact => {
        const companyMatch = contact.brandName?.toLowerCase().includes(lower) || contact.subCategory?.toLowerCase().includes(lower) || contact.industry?.toLowerCase().includes(lower);
        const matchingStaff = contact.staffList.filter(s => 
          s.name.toLowerCase().includes(lower) || 
          s.phone.toLowerCase().includes(lower) || 
          s.department?.toLowerCase().includes(lower) ||
          s.region?.toLowerCase().includes(lower)
        );
        if (companyMatch || matchingStaff.length > 0) return { ...contact, staffList: matchingStaff.length > 0 ? matchingStaff : contact.staffList };
        return null;
      }).filter((c): c is Contact => c !== null);
    }
    return list;
  }, [contacts, activeCategory, searchTerm]);

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n');
      const newContacts: Contact[] = [];
      
      const isOutsourceCategory = activeCategory === CategoryType.OUTSOURCE;

      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (isOutsourceCategory) {
          if (cols.length >= 2) {
            const [subCat, name, phone, region, resident, account, features] = cols;
            newContacts.push({
              id: 'csv-out-' + Date.now() + '-' + i,
              category: CategoryType.OUTSOURCE,
              subCategory: subCat || '시공일당',
              staffList: [{
                id: 's-out-' + Date.now() + '-' + i,
                name: name || '성명미상',
                phone: phone || '',
                region: region || '',
                residentNumber: resident || '',
                bankAccount: account || '',
                features: features || '',
                position: '',
                email: ''
              }]
            });
          }
        } else {
          if (cols.length >= 1) {
            const [brand, ind, addr, mainPhone, mainEmail, home, sName, sPos, sPhone, sEmail, sDept] = cols;
            newContacts.push({
              id: 'csv-' + Date.now() + '-' + i,
              category: activeCategory,
              brandName: brand || '상호미상',
              industry: ind || '',
              address: addr || '',
              phone: mainPhone || '',
              email: mainEmail || '',
              homepage: home || '',
              staffList: sName ? [{ 
                id: 's-' + Date.now() + '-' + i, 
                name: sName, 
                position: sPos || '', 
                phone: sPhone || '', 
                email: sEmail || '', 
                department: sDept || '' 
              }] : []
            });
          }
        }
      }
      setContacts(prev => [...prev, ...newContacts]);
      alert(`${newContacts.length}개 항목 등록 완료`);
      if (event.target) event.target.value = '';
    };
    reader.readAsText(file, 'euc-kr');
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
      <div className="bg-white rounded-2xl lg:rounded-[2rem] p-5 lg:p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col h-full relative group">
        <div className="flex justify-between items-start mb-4 lg:mb-6">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap gap-1">
              <span className="px-3 py-1 rounded-md text-[11px] font-black bg-blue-600 text-white uppercase tracking-widest shadow-sm">{contact.industry || contact.subCategory || getCategoryName(contact.category)}</span>
            </div>
            <h3 className="text-lg lg:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">{isOutsource ? contact.staffList[0]?.name : contact.brandName}</h3>
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
            {canManage && (
              <>
                <button onClick={onEdit} className="text-slate-300 hover:text-blue-600 p-2"><Pencil size={16} /></button>
                <button onClick={onDelete} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={16} /></button>
              </>
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
      return (
        <div className="bg-slate-50 p-4 lg:p-6 rounded-2xl border border-slate-200 space-y-3">
          <label className={labelClasses}>{type === 'DEPT' ? '팀 선택' : (type === 'INDUSTRY' ? '업종' : '구분')}</label>
          <div className="flex flex-wrap gap-1.5">
            {items.map(item => (
              <button 
                key={item} 
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
                onContextMenu={(e) => {
                  if (!isAdmin) return;
                  e.preventDefault(); 
                  const newName = prompt(`'${item}' 항목의 이름을 수정하시겠습니까?`, item);
                  if (newName && newName !== item) onRenameItem(item, newName, type);
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] lg:text-xs font-black border-2 transition-all ${isSelected(item) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                title={isAdmin ? "마우스 우클릭으로 이름 수정 가능" : ""}
              >
                {item}
              </button>
            ))}
          </div>
          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <input className="flex-1 bg-white border-2 border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none" placeholder="직접 추가..." value={newItemInput} onChange={e => setNewItemInput(e.target.value)} />
              <button type="button" onClick={() => { if(newItemInput) { if (type === 'DEPT') onAddDept(newItemInput); else if (type === 'INDUSTRY') onAddIndustry(newItemInput); else onAddOutsourceType(newItemInput); setNewItemInput(''); } }} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black">추가</button>
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
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-[60] transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl lg:text-2xl font-black tracking-tighter flex items-center gap-2"><Layers className="text-blue-400" /> 거상커넥트</h1>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400"><X size={20}/></button>
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
          <SidebarItem icon={<Users size={18} />} label="거상 조직도" active={activeCategory === CategoryType.GEOSANG} onClick={() => { setActiveCategory(CategoryType.GEOSANG); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<HardHat size={18} />} label="외주팀 관리" active={activeCategory === CategoryType.OUTSOURCE} onClick={() => { setActiveCategory(CategoryType.OUTSOURCE); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<ShoppingBag size={18} />} label="매입 거래처" active={activeCategory === CategoryType.PURCHASE} onClick={() => { setActiveCategory(CategoryType.PURCHASE); setIsMobileMenuOpen(false); }} />
          <div className="pt-4 pb-1 px-3 text-[10px] font-black text-yellow-400 uppercase tracking-widest opacity-60">Partner Network</div>
          <SidebarItem icon={<Building2 size={18} />} label="프랜차이즈 본사" active={activeCategory === CategoryType.FRANCHISE_HQ} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_HQ); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Coffee size={18} />} label="프랜차이즈 지점" active={activeCategory === CategoryType.FRANCHISE_BR} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_BR); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Paintbrush size={18} />} label="인테리어" active={activeCategory === CategoryType.INTERIOR} onClick={() => { setActiveCategory(CategoryType.INTERIOR); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<UtensilsCrossed size={18} />} label="자영업(매출처)" active={activeCategory === CategoryType.SALES} onClick={() => { setActiveCategory(CategoryType.SALES); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={<Settings size={18} />} label="기타 거래처" active={activeCategory === CategoryType.OTHERS} onClick={() => { setActiveCategory(CategoryType.OTHERS); setIsMobileMenuOpen(false); }} />
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

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-[50] lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-40 shadow-sm gap-2">
          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
          
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="통합 검색..." className="w-full pl-10 lg:pl-12 pr-4 py-2 lg:py-3 border-2 border-slate-100 rounded-xl lg:rounded-2xl bg-slate-50 focus:outline-none focus:border-blue-500 transition-all text-xs lg:text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex items-center gap-1.5 lg:gap-3">
            {isAdmin && (
              <div className="hidden lg:flex gap-2">
                <input type="file" ref={csvInputRef} className="hidden" accept=".csv" onChange={handleCSVUpload} />
                <button onClick={() => csvInputRef.current?.click()} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm" title="대량 업로드">
                  <FileSpreadsheet size={18} className="text-emerald-500" />
                </button>
                <button onClick={handleCSVDownload} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm" title="명단 추출">
                  <Download size={18} className="text-blue-500" />
                </button>
              </div>
            )}
            <button onClick={() => { setEditingContact(null); setIsModalOpen(true); }} className="bg-blue-600 text-white p-2.5 lg:px-5 lg:py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-100">
              <Plus size={20} /> <span className="hidden lg:inline text-sm">신규 등록</span>
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-10 scroll-smooth">
          <div className="mb-6 lg:mb-10">
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{getCategoryName(activeCategory)}</h2>
            <p className="text-[10px] lg:text-sm font-bold text-blue-600 mt-1 uppercase tracking-wider">{searchTerm ? `'${searchTerm}' 결과: ` : '데이터 현황: '}{filteredContacts.length}건</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-8 pb-20">
            {filteredContacts.map(contact => (
              <ContactCard key={contact.id} contact={contact} canManage={isAdmin} onEdit={() => { setEditingContact(contact); setIsModalOpen(true); }} onDelete={() => { if(confirm('삭제하시겠습니까?')) setContacts(prev => prev.filter(c => c.id !== contact.id)) }} />
            ))}
          </div>
        </section>
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
    </div>
  );
};

export default App;
