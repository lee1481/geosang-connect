import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Users, ShoppingBag, Building2, HardHat, Coffee, Paintbrush, UtensilsCrossed, Layers, X, Pencil, Plus, Trash2, Phone, Mail, FileText, Upload, Settings, Search, ShieldCheck, LogOut, User, Menu, Loader2, Star, Lock, CreditCard, Download, FileSpreadsheet, Key, Briefcase } from 'lucide-react';
import { CategoryType, type Contact, type Staff, type AuthUser } from './types';
import { api } from './api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthUser[]>([]);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryType>(CategoryType.GEOSANG);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [departments, setDepartments] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [outsourceTypes, setOutsourceTypes] = useState<string[]>([]);
  
  const csvInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser?.id === 'admin';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setCurrentUser({ id: 'user', name: '사용자', username: 'user' });
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadSettings();
      loadContacts();
      if (isAdmin) loadUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) loadContacts();
  }, [activeCategory]);

  const loadSettings = async () => {
    try {
      const [dept, ind, out] = await Promise.all([
        api.getDepartments(),
        api.getIndustries(),
        api.getOutsourceTypes()
      ]);
      setDepartments(dept.departments || []);
      setIndustries(ind.industries || []);
      setOutsourceTypes(out.outsourceTypes || []);
    } catch (e) { console.error(e); }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await api.getContacts(activeCategory);
      setContacts(data.contacts || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setAuthorizedUsers(data.users || []);
    } catch (e) { console.error(e); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.login(loginId, loginPw);
      setCurrentUser(data.user);
      setAuthError(false);
    } catch (e) {
      setAuthError(true);
      setLoginPw('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('token');
  };

  const filteredContacts = useMemo(() => {
    let list = contacts.filter(c => c.category === activeCategory);
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      return list.filter(c => 
        c.brandName?.toLowerCase().includes(lower) ||
        c.subCategory?.toLowerCase().includes(lower) ||
        c.staffList.some(s => s.name.toLowerCase().includes(lower) || s.phone?.toLowerCase().includes(lower))
      );
    }
    return list;
  }, [contacts, activeCategory, searchTerm]);

  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
        </div>
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-10 shadow-2xl relative z-10 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">거상커넥트</h1>
          <p className="text-slate-400 text-xs font-bold uppercase mb-8">System Login</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="text" placeholder="아이디" className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 font-bold" value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
            </div>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="password" placeholder="비밀번호" className={`w-full bg-white/5 border-2 ${authError ? 'border-red-500/50' : 'border-white/10'} rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 font-bold`} value={loginPw} onChange={(e) => {setLoginPw(e.target.value); setAuthError(false);}} required />
            </div>
            {authError && <p className="text-red-400 text-xs font-black">정보가 올바르지 않습니다.</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-2xl font-black shadow-xl">로그인</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-50 transition-transform lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-black flex items-center gap-2"><Layers className="text-blue-400" /> 거상커넥트</h1>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden"><X size={20}/></button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span className="text-xs text-slate-200 font-bold">{currentUser.name}</span>
          </div>
          {isAdmin && <span className="text-[8px] bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-black uppercase mt-1 inline-block">Admin</span>}
        </div>

        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto scrollbar-hide">
          <NavItem icon={<Users size={18} />} label="거상 조직도" active={activeCategory === CategoryType.GEOSANG} onClick={() => { setActiveCategory(CategoryType.GEOSANG); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<HardHat size={18} />} label="외주팀 관리" active={activeCategory === CategoryType.OUTSOURCE} onClick={() => { setActiveCategory(CategoryType.OUTSOURCE); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<ShoppingBag size={18} />} label="매입 거래처" active={activeCategory === CategoryType.PURCHASE} onClick={() => { setActiveCategory(CategoryType.PURCHASE); setIsMobileMenuOpen(false); }} />
          <div className="pt-4 pb-1 px-3 text-xs font-black text-yellow-400 uppercase opacity-60">Partner Network</div>
          <NavItem icon={<Building2 size={18} />} label="프랜차이즈 본사" active={activeCategory === CategoryType.FRANCHISE_HQ} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_HQ); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Coffee size={18} />} label="프랜차이즈 지점" active={activeCategory === CategoryType.FRANCHISE_BR} onClick={() => { setActiveCategory(CategoryType.FRANCHISE_BR); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Paintbrush size={18} />} label="인테리어" active={activeCategory === CategoryType.INTERIOR} onClick={() => { setActiveCategory(CategoryType.INTERIOR); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<UtensilsCrossed size={18} />} label="자영업(매출처)" active={activeCategory === CategoryType.SALES} onClick={() => { setActiveCategory(CategoryType.SALES); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Settings size={18} />} label="기타 거래처" active={activeCategory === CategoryType.OTHERS} onClick={() => { setActiveCategory(CategoryType.OTHERS); setIsMobileMenuOpen(false); }} />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {isAdmin && (
            <button onClick={() => { setIsAdminModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-400 hover:bg-blue-500/10 text-xs font-bold border border-blue-500/20">
              <ShieldCheck size={16} /> 권한 관리
            </button>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 text-xs font-bold">
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm gap-2">
          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600">
            <Menu size={24} />
          </button>
          
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="통합 검색..." className="w-full pl-12 pr-4 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:outline-none focus:border-blue-500 text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => { setEditingContact(null); setIsModalOpen(true); }} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg">
              <Plus size={20} /> <span className="hidden lg:inline">신규 등록</span>
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-10">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900">{getCategoryName(activeCategory)}</h2>
            <p className="text-sm font-bold text-blue-600 mt-1 uppercase">데이터 현황: {filteredContacts.length}건</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
              {filteredContacts.map(contact => (
                <ContactCard 
                  key={contact.id} 
                  contact={contact} 
                  canManage={isAdmin} 
                  onEdit={() => { setEditingContact(contact); setIsModalOpen(true); }} 
                  onDelete={async () => { 
                    if(confirm('삭제하시겠습니까?')) {
                      await api.deleteContact(contact.id);
                      await loadContacts();
                    }
                  }} 
                />
              ))}
              {filteredContacts.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <Search size={32} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-400 font-bold">등록된 데이터가 없습니다.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {isAdminModalOpen && (
        <AdminModal 
          users={authorizedUsers} 
          onClose={() => setIsAdminModalOpen(false)} 
          onAdd={async (name, username, password) => {
            await api.addUser(name, username, password);
            await loadUsers();
          }}
          onRevoke={async (id) => {
            await api.deleteUser(id);
            await loadUsers();
          }}
        />
      )}
      
      {isModalOpen && (
        <ContactFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={async (c: Contact) => { 
            try {
              if (editingContact) await api.updateContact(c.id, c);
              else await api.createContact(c);
              await loadContacts();
              setIsModalOpen(false);
            } catch (e: any) {
              alert(e.message || '저장 실패');
            }
          }}
          currentCategory={activeCategory} 
          initialData={editingContact} 
          departments={departments} 
          industries={industries} 
          outsourceTypes={outsourceTypes}
          onAddDept={async (dept) => {
            await api.addDepartment(dept);
            await loadSettings();
          }}
          onAddIndustry={async (ind) => {
            await api.addIndustry(ind);
            await loadSettings();
          }}
          onAddOutsourceType={async (type) => {
            await api.addOutsourceType(type);
            await loadSettings();
          }}
          onRenameItem={async (oldName, newName, type) => {
            await api.renameItem(type, oldName, newName);
            await loadSettings();
            await loadContacts();
          }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-xl font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon} <span className="text-[15px]">{label}</span>
  </button>
);

const ContactCard = ({ contact, onEdit, onDelete, canManage }: any) => {
  const isOutsource = contact.category === CategoryType.OUTSOURCE;
  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <span className="px-3 py-1 rounded-md text-xs font-black bg-blue-600 text-white uppercase">{contact.industry || contact.subCategory}</span>
          <h3 className="text-xl font-black text-slate-900 mt-2">{isOutsource ? contact.staffList[0]?.name : contact.brandName}</h3>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="text-slate-300 hover:text-blue-600 p-2"><Pencil size={16} /></button>
            <button onClick={onDelete} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={16} /></button>
          </div>
        )}
      </div>
      <div className="space-y-4">
        {contact.staffList?.map((staff: Staff) => (
          <div key={staff.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex justify-between mb-1.5">
              <span className="font-bold text-slate-900">{staff.name}</span>
              {staff.department && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black">{staff.department}</span>}
            </div>
            <div className="text-xs text-slate-600 space-y-1 font-mono">
              {staff.phone && <a href={`tel:${staff.phone}`} className="flex items-center gap-2 hover:text-blue-600"><Phone size={12} /> {staff.phone}</a>}
              {staff.email && <a href={`mailto:${staff.email}`} className="flex items-center gap-2 hover:text-blue-600"><Mail size={12} /> {staff.email}</a>}
              {staff.position && <div className="flex items-center gap-2"><Briefcase size={12} /> {staff.position}</div>}
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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-2xl font-black flex items-center gap-3"><ShieldCheck className="text-blue-600" /> 권한 관리</h2>
          <button onClick={onClose} className="p-2 bg-white rounded-xl border border-slate-200"><X size={20}/></button>
        </div>
        <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto">
          <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100">
            <h3 className="text-xs font-black text-blue-600 mb-4 uppercase">신규 계정 발급</h3>
            <div className="space-y-3">
              <input className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold" placeholder="이름" value={newName} onChange={e => setNewName(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold" placeholder="아이디" value={newId} onChange={e => setNewId(e.target.value)} />
                <input className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold" placeholder="비밀번호" value={newPw} onChange={e => setNewPw(e.target.value)} />
              </div>
            </div>
            <button onClick={() => { if(newName && newId && newPw) { onAdd(newName, newId, newPw); setNewName(''); setNewId(''); setNewPw(''); } }} className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-black text-xs">계정 등록</button>
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase mb-3">등록된 계정</h3>
            {users.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 text-[8px] font-black text-slate-400">U</div>
                  <div>
                    <div className="font-black text-slate-900 text-xs">{user.name}</div>
                    <div className="text-[9px] font-bold text-slate-400">ID: {user.username}</div>
                  </div>
                </div>
                {user.id !== 'admin' && (
                  <button onClick={() => onRevoke(user.id)} className="text-slate-300 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactFormModal = ({ onClose, onSubmit, currentCategory, initialData, departments, industries, outsourceTypes, onAddDept, onAddIndustry, onAddOutsourceType, onRenameItem, isAdmin }: any) => {
  const isOutsource = (initialData?.category || currentCategory) === CategoryType.OUTSOURCE;
  const [formData, setFormData] = useState<Partial<Contact>>(initialData || {
    id: Date.now().toString(), 
    category: currentCategory,
    brandName: '', 
    staffList: [{ id: 's' + Date.now(), name: '', position: '', phone: '', email: '', department: departments[0] || '' }]
  });

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black">정보 등록</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-xl"><X size={20}/></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(formData); }} className="space-y-8">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">상호명</label>
                <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 outline-none font-bold" value={formData.brandName} onChange={e => setFormData({...formData, brandName: e.target.value})} />
              </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-blue-700">저장하기</button>
        </form>
      </div>
    </div>
  );
};

const getCategoryName = (cat: CategoryType) => {
  const names = {
    [CategoryType.GEOSANG]: '거상 조직도',
    [CategoryType.OUTSOURCE]: '외주팀 관리',
    [CategoryType.PURCHASE]: '매입 거래처',
    [CategoryType.FRANCHISE_HQ]: '프랜차이즈 본사',
    [CategoryType.FRANCHISE_BR]: '프랜차이즈 지점',
    [CategoryType.INTERIOR]: '인테리어',
    [CategoryType.SALES]: '자영업(매출처)',
    [CategoryType.OTHERS]: '기타 거래처'
  };
  return names[cat] || cat;
};

export default App;
