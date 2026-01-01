import React, { useState, useRef } from 'react';
import { Eye, EyeOff, Copy, Trash2, Plus, X, Download, Upload, FileText, Shield, Edit2, Save, Search } from 'lucide-react';

interface PasswordEntry {
  id: string;
  accountName: string;
  websiteUrl: string;
  username: string;
  password: string;
  twoFactorCode?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

interface PasswordManagerProps {
  currentUser: { id: string; username: string; name: string } | null;
}

export default function PasswordManager({ currentUser }: PasswordManagerProps) {
  const [entries, setEntries] = useState<PasswordEntry[]>(() => {
    const saved = localStorage.getItem('password_entries');
    console.log('🔐 PasswordManager - localStorage 데이터 로드:', saved);
    const parsed = saved ? JSON.parse(saved) : [];
    console.log('🔐 PasswordManager - 파싱된 entries 개수:', parsed.length);
    return parsed;
  });

  const [formData, setFormData] = useState({
    accountName: '',
    websiteUrl: '',
    username: '',
    password: '',
    twoFactorCode: '',
    memo: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // 관리자 권한 확인
  if (currentUser?.username !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
          <Shield size={64} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">접근 권한 없음</h2>
          <p className="text-slate-600">이 기능은 관리자만 사용할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  // 저장 함수
  const saveEntries = (newEntries: PasswordEntry[]) => {
    console.log('🔐 PasswordManager - 저장할 entries:', newEntries.length);
    setEntries(newEntries);
    localStorage.setItem('password_entries', JSON.stringify(newEntries));
    console.log('🔐 PasswordManager - localStorage 저장 완료');
  };

  // 항목 추가 또는 수정
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.accountName || !formData.username || !formData.password) {
      alert('계정명, 아이디, 비밀번호는 필수 입력 항목입니다.');
      return;
    }

    if (editingId) {
      // 수정 모드
      const updatedEntries = entries.map(entry => 
        entry.id === editingId 
          ? {
              ...entry,
              accountName: formData.accountName,
              websiteUrl: formData.websiteUrl,
              username: formData.username,
              password: formData.password,
              twoFactorCode: formData.twoFactorCode,
              memo: formData.memo,
              updatedAt: new Date().toISOString()
            }
          : entry
      );
      saveEntries(updatedEntries);
      setEditingId(null);
      alert('✅ 계정 정보가 수정되었습니다.');
    } else {
      // 추가 모드
      const newEntry: PasswordEntry = {
        id: Date.now().toString(),
        accountName: formData.accountName,
        websiteUrl: formData.websiteUrl,
        username: formData.username,
        password: formData.password,
        twoFactorCode: formData.twoFactorCode,
        memo: formData.memo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveEntries([...entries, newEntry]);
      alert('✅ 계정 정보가 저장되었습니다.');
    }
    
    // 폼 초기화
    setFormData({
      accountName: '',
      websiteUrl: '',
      username: '',
      password: '',
      twoFactorCode: '',
      memo: ''
    });
  };

  // 항목 수정 모드로 전환
  const handleEditEntry = (entry: PasswordEntry) => {
    setEditingId(entry.id);
    setFormData({
      accountName: entry.accountName,
      websiteUrl: entry.websiteUrl,
      username: entry.username,
      password: entry.password,
      twoFactorCode: entry.twoFactorCode || '',
      memo: entry.memo || ''
    });
    // 폼으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      accountName: '',
      websiteUrl: '',
      username: '',
      password: '',
      twoFactorCode: '',
      memo: ''
    });
  };

  // 항목 삭제
  const handleDeleteEntry = (id: string) => {
    if (confirm('이 계정 정보를 삭제하시겠습니까?')) {
      saveEntries(entries.filter(e => e.id !== id));
      // 수정 중이던 항목이 삭제되면 초기화
      if (editingId === id) {
        handleCancelEdit();
      }
      alert('✅ 삭제되었습니다.');
    }
  };

  // 복사 함수
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label}이(가) 클립보드에 복사되었습니다.`);
  };

  // 비밀번호 표시/숨김 토글
  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 계정 데이터 업로드 (JSON 파일)
  const handleUploadAccounts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          // 기존 데이터와 병합
          const mergedEntries = [...entries, ...data];
          saveEntries(mergedEntries);
          alert(`✅ ${data.length}개의 계정 정보를 업로드했습니다.`);
        } else {
          alert('❌ 올바른 형식의 파일이 아닙니다.');
        }
      } catch (error) {
        alert('❌ 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    
    // 파일 입력 초기화
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  // 계정 데이터 다운로드 (CSV 파일)
  const handleDownloadAccounts = () => {
    if (entries.length === 0) {
      alert('❌ 다운로드할 계정 정보가 없습니다.');
      return;
    }

    // CSV 헤더
    const headers = ['계정명칭', '웹사이트주소', '아이디', '비밀번호', '2FA복구코드', '메모', '생성일시', '수정일시'];
    
    // CSV 데이터 생성
    const csvRows = [
      headers.join(','), // 헤더 행
      ...entries.map(entry => [
        `"${entry.accountName.replace(/"/g, '""')}"`,
        `"${entry.websiteUrl.replace(/"/g, '""')}"`,
        `"${entry.username.replace(/"/g, '""')}"`,
        `"${entry.password.replace(/"/g, '""')}"`,
        `"${(entry.twoFactorCode || '').replace(/"/g, '""')}"`,
        `"${(entry.memo || '').replace(/"/g, '""')}"`,
        `"${new Date(entry.createdAt).toLocaleString('ko-KR')}"`,
        `"${new Date(entry.updatedAt).toLocaleString('ko-KR')}"`,
      ].join(','))
    ];

    // BOM 추가 (한글 깨짐 방지)
    const BOM = '\uFEFF';
    const csvContent = BOM + csvRows.join('\n');
    
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `계정목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    alert(`✅ ${entries.length}개의 계정 정보를 CSV 파일로 다운로드했습니다.`);
  };

  // 검색 필터링
  const filteredEntries = entries.filter(entry => {
    const query = searchQuery.toLowerCase();
    return (
      entry.accountName.toLowerCase().includes(query) ||
      entry.username.toLowerCase().includes(query) ||
      entry.websiteUrl.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-8">
      {/* 헤더 */}
      <div className="max-w-[1920px] mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-black text-white mb-3">
            🔐 계정관리
          </h1>
          <p className="text-slate-300 text-sm lg:text-base">
            아이디와 비밀번호를 안전하고 편리하게 관리하세요.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* 좌측: 계정 정보 입력 */}
          <div className="w-full lg:w-[400px] lg:flex-shrink-0 lg:sticky lg:top-8">
            <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                  <Shield size={24} />
                  {editingId ? '계정 정보 수정' : '계정 정보 입력'}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-sm"
                  >
                    <X size={16} />
                    취소
                  </button>
                )}
              </div>
              {editingId && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm flex items-center gap-2">
                    <Edit2 size={16} />
                    수정 모드: 정보를 수정하고 저장하세요.
                  </p>
                </div>
              )}

              <form onSubmit={handleAddEntry} className="space-y-4">
                {/* 계정 명칭 */}
                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    계정 명칭
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="예: 구글 (개인용)"
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* 웹사이트 주소 */}
                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    웹사이트 주소
                  </label>
                  <input
                    type="text"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="예: https://www.google.com"
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* 아이디 */}
                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    아이디
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="예: example@gmail.com"
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* 비밀번호 */}
                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    비밀번호
                  </label>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="변경할 기존 비밀번호 예시로 제거해야..."
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:border-cyan-500 focus:outline-none pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400"
                    >
                      {showFormPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className={`w-full py-3 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                      editingId 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-cyan-500 hover:bg-cyan-600'
                    }`}
                  >
                    {editingId ? (
                      <>
                        <Save size={20} />
                        수정 완료
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        항목 추가
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* 우측: 저장된 계정 목록 */}
          <div className="w-full lg:flex-1 lg:min-w-0">
            <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700">
              <div className="flex flex-col gap-4 mb-6">
                {/* 첫 번째 줄: 제목 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                    <FileText size={24} />
                    저장된 계정 목록 ({filteredEntries.length}/{entries.length})
                  </h2>
                </div>
                
                {/* 두 번째 줄: 검색창, 업로드, 다운로드 */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* 검색창 */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="계정명, 아이디, 웹사이트 검색..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none placeholder-slate-400"
                    />
                  </div>
                  
                  {/* 업로드 버튼 */}
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleUploadAccounts}
                    className="hidden"
                  />
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    title="계정 업로드"
                  >
                    <Upload size={18} />
                    <span className="hidden sm:inline">업로드</span>
                  </button>
                  
                  {/* 다운로드 버튼 */}
                  <button
                    onClick={handleDownloadAccounts}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    title="계정 다운로드"
                  >
                    <Download size={18} />
                    <span className="hidden sm:inline">다운로드</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                {/* 디버깅: entries 상태 표시 */}
                {console.log('🔐 렌더링 시점 - entries 개수:', entries.length, '필터링:', filteredEntries.length)}
                
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Shield size={48} className="mx-auto mb-4 opacity-50" />
                    {entries.length === 0 ? (
                      <>
                        <p className="text-lg">저장된 계정이 없습니다.</p>
                        <p className="text-sm">좌측에서 계정 정보를 입력해주세요.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg">검색 결과가 없습니다.</p>
                        <p className="text-sm">다른 검색어로 시도해보세요.</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50 hover:border-cyan-500/50 transition-colors relative"
                    >
                      {/* 제목 및 삭제 버튼 */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-cyan-400">{entry.accountName}</h3>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* 아이디 */}
                      <div className="mb-2 flex items-center justify-between bg-slate-800/50 rounded px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-slate-400 text-sm font-semibold whitespace-nowrap">아이디:</span>
                          <span className="text-white text-sm truncate">{entry.username}</span>
                        </div>
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="text-slate-400 hover:text-cyan-400 transition-colors ml-2"
                          title="수정"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>

                      {/* 비밀번호 */}
                      <div className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-slate-400 text-sm font-semibold whitespace-nowrap">비밀번호:</span>
                          <span className="text-white text-sm font-mono truncate">
                            {showPassword[entry.id] ? entry.password : '•'.repeat(Math.min(entry.password.length, 12))}
                          </span>
                        </div>
                        <button
                          onClick={() => togglePasswordVisibility(entry.id)}
                          className="text-slate-400 hover:text-cyan-400 transition-colors ml-2"
                          title={showPassword[entry.id] ? '숨기기' : '보기'}
                        >
                          {showPassword[entry.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
