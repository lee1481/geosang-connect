import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Loader2, Bot, User, FileText, Download } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ProfitChatbotProps {
  projects: any[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  franchiseName: string;
  storeName: string;
  setFranchiseName: (value: string) => void;
  setStoreName: (value: string) => void;
}

export const ProfitChatbot: React.FC<ProfitChatbotProps> = ({
  projects,
  onFileUpload,
  uploading,
  franchiseName,
  storeName,
  setFranchiseName,
  setStoreName
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '안녕하세요! 👋 간판 손익분석 AI 어시스턴트입니다.\n\n저는 다음과 같은 업무를 도와드립니다:\n\n📊 **손익분석**\n- 엑셀 파일, 이미지, PDF 업로드 시 자동으로 OCR 분석\n- 매출, 원가, 마진율 자동 계산\n- 견적서, 발주서, 거래명세서, 영수증 자동 분류\n\n💾 **AI 드라이브 저장**\n- 지점별 폴더 자동 생성 및 정리\n- 문서 타입별 분류 저장\n- 원본 이미지 함께 보관\n\n📈 **분석 및 리포트**\n- 지점별 손익 비교\n- 월별 트렌드 분석\n- 거래처별 수익성 분석\n\n어떤 작업을 도와드릴까요? 파일을 업로드하거나 질문해 주세요!',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // 간단한 응답 로직 (추후 Gemini API 연동)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: processUserQuery(inputMessage),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const processUserQuery = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    // 손익 분석 요청
    if (lowerQuery.includes('손익') || lowerQuery.includes('분석') || lowerQuery.includes('리포트')) {
      if (projects.length === 0) {
        return '현재 등록된 프로젝트가 없습니다.\n\n파일을 업로드하여 프로젝트를 시작해주세요!';
      }
      
      return generateProfitReport(projects);
    }

    // 프로젝트 목록 요청
    if (lowerQuery.includes('목록') || lowerQuery.includes('리스트') || lowerQuery.includes('프로젝트')) {
      if (projects.length === 0) {
        return '현재 등록된 프로젝트가 없습니다.';
      }
      
      return `📋 **등록된 프로젝트 목록** (총 ${projects.length}개)\n\n` +
        projects.map((p, idx) => 
          `${idx + 1}. ${p.storeName}\n   ㄴ 프랜차이즈: ${p.franchiseName}\n   ㄴ 문서: ${p.documents.length}건`
        ).join('\n\n');
    }

    // 도움말
    if (lowerQuery.includes('도움') || lowerQuery.includes('help') || lowerQuery.includes('사용법')) {
      return `📚 **사용 가능한 명령어**\n\n` +
        `1. "손익분석해줘" - 전체 프로젝트 손익 분석\n` +
        `2. "OO지점 분석해줘" - 특정 지점 분석\n` +
        `3. "프로젝트 목록" - 등록된 프로젝트 보기\n` +
        `4. "저장해줘" - AI 드라이브에 저장\n` +
        `5. 파일 업로드 - 엑셀/이미지/PDF 자동 분석\n\n` +
        `💡 파일 업로드 시 브랜드명과 지점명을 먼저 입력해주세요!`;
    }

    // 기본 응답
    return `이해하지 못했습니다. 😅\n\n다음과 같이 질문해보세요:\n- "손익분석해줘"\n- "프로젝트 목록 보여줘"\n- "도움말"\n\n또는 파일을 업로드해주세요!`;
  };

  const generateProfitReport = (projects: any[]): string => {
    const totalRevenue = projects.reduce((sum, p) => sum + (p.revenue?.quotationAmount || 0), 0);
    const totalCosts = projects.reduce((sum, p) => sum + (p.costs?.total || 0), 0);
    const totalProfit = totalRevenue - totalCosts;
    const marginRate = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

    let report = `📊 **손익분석 리포트**\n\n`;
    report += `**전체 요약**\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `💰 총 매출: ${totalRevenue.toLocaleString()}원\n`;
    report += `💸 총 비용: ${totalCosts.toLocaleString()}원\n`;
    report += `📈 순이익: ${totalProfit.toLocaleString()}원\n`;
    report += `📊 마진율: ${marginRate.toFixed(1)}%\n\n`;

    if (projects.length > 0) {
      report += `**지점별 상세**\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      projects.forEach((p, idx) => {
        const profit = (p.revenue?.quotationAmount || 0) - (p.costs?.total || 0);
        const margin = p.revenue?.quotationAmount > 0 
          ? ((profit / p.revenue.quotationAmount) * 100) 
          : 0;
        
        report += `\n${idx + 1}. ${p.storeName}\n`;
        report += `   ├ 매출: ${(p.revenue?.quotationAmount || 0).toLocaleString()}원\n`;
        report += `   ├ 비용: ${(p.costs?.total || 0).toLocaleString()}원\n`;
        report += `   ├ 손익: ${profit.toLocaleString()}원\n`;
        report += `   └ 마진: ${margin.toFixed(1)}%\n`;
      });
    }

    return report;
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">🤖 손익분석 AI 챗봇</h2>
            <p className="text-xs text-slate-600">파일을 업로드하거나 질문해보세요</p>
          </div>
        </div>
      </div>

      {/* 파일 업로드 영역 */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="브랜드명 (예: 컴포즈커피)"
            value={franchiseName}
            onChange={(e) => setFranchiseName(e.target.value)}
            className="p-2 border-2 border-slate-200 rounded-lg font-bold text-sm focus:border-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="지점명 * (예: 인천점)"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="p-2 border-2 border-slate-200 rounded-lg font-bold text-sm focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleFileUploadClick}
            disabled={uploading || !storeName.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 flex items-center justify-center gap-2 text-sm"
          >
            {uploading ? (
              <><Loader2 className="animate-spin" size={16} /> 분석 중...</>
            ) : (
              <><Upload size={16} /> 파일 업로드</>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.pdf"
            onChange={onFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
              }`}>
                {message.role === 'user' ? (
                  <User className="text-white" size={16} />
                ) : (
                  <Bot className="text-white" size={16} />
                )}
              </div>
              <div className={`rounded-2xl p-4 ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-900'
              }`}>
                <p className="text-sm whitespace-pre-wrap font-medium">{message.content}</p>
                <p className={`text-[10px] mt-2 ${
                  message.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-600">
                <Bot className="text-white" size={16} />
              </div>
              <div className="rounded-2xl p-4 bg-slate-100">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="메시지를 입력하세요... (예: 손익분석해줘, 프로젝트 목록)"
            className="flex-1 p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-300 flex items-center gap-2"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          💡 Tip: "손익분석해줘", "프로젝트 목록", "도움말" 등을 입력해보세요
        </p>
      </div>
    </div>
  );
};
