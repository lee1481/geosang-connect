import { GoogleGenAI, Type } from "@google/genai";

// API 키 가져오기 (Vite 환경 변수)
const getApiKey = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    console.warn('⚠️ Gemini API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정해주세요.');
    return null;
  }
  return apiKey;
};

// 인건비 청구 내역서 OCR (영수증 OCR)
export async function extractReceiptData(fileBase64: string, mimeType: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    다음은 영수증 또는 지출 내역서입니다.
    식비, 주유비, 톨비, 기타 비용을 추출하여 JSON으로 반환하세요.
    
    추출할 정보:
    - type: 비용 유형 (meal/fuel/toll/other)
    - amount: 금액 (숫자만)
    - description: 항목 설명
    
    여러 항목이 있으면 배열로 반환하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  description: { type: Type.STRING }
                },
                required: ["type", "amount"]
              }
            }
          },
          required: ["items"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Receipt OCR Error:", error);
    throw error;
  }
}

// 문자 메시지 형식 파싱 (AI 기반) - 다중 현장 지원
export async function parseLaborClaimText(text: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    다음은 외주 일당이 보낸 인건비 청구 문자입니다.
    작업일, 현장 정보, 금액 세부내역을 추출하여 JSON으로 반환하세요.
    
    입력 예시:
    "12/26
    *현장1: 컴포즈커피 인천점 *시간: 3시간
    *현장2: 스타벅스 서울점 *시간: 5시간
    *기본일비: 120,000원
    *연장비: 2시간 40,000원
    *차대비: 20,000원
    *식비: 15,000원"
    
    추출 정보:
    - date: 작업일 (YYYY-MM-DD, 올해 기준)
    - sites: 현장 목록 [{ siteName, hours }]
    - basePay: 기본일비
    - overtimeHours: 연장 시간
    - overtimePay: 연장비
    - transportFee: 차대비
    - mealFee: 식비
    - fuelFee: 주유비
    - tollFee: 톨비
    
    입력 텍스트: ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            sites: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  siteName: { type: Type.STRING },
                  hours: { type: Type.NUMBER }
                },
                required: ["siteName", "hours"]
              }
            },
            basePay: { type: Type.NUMBER },
            overtimeHours: { type: Type.NUMBER },
            overtimePay: { type: Type.NUMBER },
            transportFee: { type: Type.NUMBER },
            mealFee: { type: Type.NUMBER },
            fuelFee: { type: Type.NUMBER },
            tollFee: { type: Type.NUMBER }
          },
          required: ["date", "sites", "basePay"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Text Parse Error:", error);
    throw error;
  }
}

export async function extractConstructionData(fileBase64: string, mimeType: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    이 이미지의 모든 텍스트를 읽고 다음 정보를 추출하세요:
    - date: 날짜 (YYYY-MM-DD, 없으면 오늘 날짜)
    - location: 장소/주소 (없으면 "미상")
    - amount: 금액 (숫자만, 없으면 0)
    - description: 내용 요약 (없으면 "미상")
    
    모든 필드는 필수입니다. 정보가 없으면 기본값을 사용하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            location: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
          },
          required: ["date", "location", "amount", "description"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
}

export async function extractBusinessLicenseData(fileBase64: string, mimeType: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    이 이미지는 사업자등록증입니다. 모든 텍스트를 정확하게 읽고 다음을 추출하세요:
    - brandName: 상호 또는 법인명 (필수)
    - address: 사업장 주소 (필수)
    
    정보가 없으면 빈 문자열("")을 사용하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brandName: { type: Type.STRING },
            address: { type: Type.STRING },
          },
          required: ["brandName", "address"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Business License OCR Error:", error);
    throw error;
  }
}

export async function extractBusinessCardData(fileBase64: string, mimeType: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    이 이미지는 명함입니다. 모든 텍스트를 정확하게 읽고 다음을 추출하세요:
    - name: 성명 (필수)
    - position: 직함/직위 (없으면 "")
    - phone: 개인 휴대폰 번호 (없으면 "")
    - companyPhone: 회사 대표번호 (없으면 "")
    - email: 이메일 (없으면 "")
    - homepage: 홈페이지 URL (없으면 "")
    
    정보가 없는 필드는 빈 문자열("")을 사용하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            position: { type: Type.STRING },
            phone: { type: Type.STRING },
            companyPhone: { type: Type.STRING },
            email: { type: Type.STRING },
            homepage: { type: Type.STRING },
          },
          required: ["name"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Business Card OCR Error:", error);
    throw error;
  }
}

// 프로젝트 문서 자동 분석 (매장명, 금액 추출)
export async function extractProjectDocument(fileBase64: string, mimeType: string, documentType: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompts: Record<string, string> = {
    auto: `
      이 이미지의 모든 텍스트를 정확하게 읽고 다음을 추출하세요:
      
      1. detectedType: 문서 타입
         - 견적서 → quotation
         - 발주서 → purchase_order  
         - 거래명세서/세금계산서 → transaction_stmt
         - 영수증/배송비 → delivery_cost
         - 시안/디자인 → design_proposal
         - 모르겠으면 → other
      
      2. storeName: 매장명 (예: 컴포즈커피 인천점)
      3. franchiseName: 프랜차이즈명 (예: 컴포즈커피)
      4. amount: 금액 (숫자만)
      5. date: 날짜 (YYYY-MM-DD)
      6. fullText: 이미지의 모든 텍스트
      
      필수: detectedType, storeName, amount
      정보 없으면: storeName="미상", amount=0
    `,
    design_proposal: `
      이 이미지는 디자인 시안입니다. 모든 텍스트를 읽고 추출하세요:
      - storeName: 매장명
      - franchiseName: 프랜차이즈명
      - fullText: 모든 텍스트
      - detectedType: "design_proposal"
    `,
    quotation: `
      이 이미지는 견적서입니다. 모든 텍스트를 읽고 추출하세요:
      - storeName: 매장명
      - franchiseName: 프랜차이즈명
      - amount: 금액 (숫자만)
      - date: 날짜 (YYYY-MM-DD)
      - fullText: 모든 텍스트
      - detectedType: "quotation"
    `,
    purchase_order: `
      이 이미지는 발주서입니다. 모든 텍스트를 읽고 추출하세요:
      - storeName: 매장명
      - amount: 금액 (숫자만)
      - date: 날짜 (YYYY-MM-DD)
      - fullText: 모든 텍스트
      - detectedType: "purchase_order"
    `,
    transaction_stmt: `
      이 이미지는 거래명세서입니다. 모든 텍스트를 읽고 추출하세요:
      - storeName: 매장명
      - amount: 금액 (숫자만)
      - date: 날짜 (YYYY-MM-DD)
      - fullText: 모든 텍스트
      - detectedType: "transaction_stmt"
    `,
    delivery_cost: `
      이 이미지는 영수증입니다. 모든 텍스트를 읽고 추출하세요:
      - storeName: 매장명
      - amount: 금액 (숫자만)
      - date: 날짜 (YYYY-MM-DD)
      - fullText: 모든 텍스트
      - detectedType: "delivery_cost"
    `
  };

  const prompt = prompts[documentType] || prompts.auto;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedType: { type: Type.STRING },
            storeName: { type: Type.STRING },
            franchiseName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            supplier: { type: Type.STRING },
            location: { type: Type.STRING },
            deliveryType: { type: Type.STRING },
            designNotes: { type: Type.STRING },
            fullText: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["storeName", "amount"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Project Document OCR Error:", error);
    throw error;
  }
}

// 엑셀 파일 처리 (XLSX, XLS, CSV) - 정확도 개선
export async function extractExcelData(fileBase64: string, fileName: string) {
  try {
    // Dynamic import to avoid bundling issues
    const XLSX = await import('xlsx');
    
    console.log(`📊 엑셀 파일 분석 시작: ${fileName}`);
    
    // Base64를 ArrayBuffer로 변환
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 엑셀 파일 읽기
    const workbook = XLSX.read(bytes, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // 2가지 형식으로 데이터 읽기
    const arrayData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    const objectData = XLSX.utils.sheet_to_json(firstSheet) as any[];
    
    console.log(`📋 시트명: ${workbook.SheetNames[0]}`);
    console.log(`📏 데이터 행 수: ${arrayData.length}`);
    
    if (arrayData.length === 0) {
      throw new Error('엑셀 데이터가 비어있습니다.');
    }
    
    // 자동으로 문서 정보 추출
    let storeName = '미상';
    let franchiseName = '';
    let amount = 0;
    let date = '';
    let supplier = '';
    let items: string[] = [];
    let documentType: string = 'other';
    
    // 1. 파일명으로 문서 타입 추정
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('견적') || lowerFileName.includes('quote')) {
      documentType = 'quotation';
      console.log('📋 문서 타입: 견적서');
    } else if (lowerFileName.includes('발주') || lowerFileName.includes('order')) {
      documentType = 'purchase_order';
      console.log('📦 문서 타입: 발주서');
    } else if (lowerFileName.includes('거래') || lowerFileName.includes('명세') || lowerFileName.includes('invoice')) {
      documentType = 'transaction_stmt';
      console.log('🧾 문서 타입: 거래명세서');
    } else if (lowerFileName.includes('영수증') || lowerFileName.includes('배송') || lowerFileName.includes('퀵')) {
      documentType = 'delivery_cost';
      console.log('🚚 문서 타입: 영수증/배송비');
    } else if (lowerFileName.includes('시안') || lowerFileName.includes('디자인')) {
      documentType = 'design_proposal';
      console.log('🎨 문서 타입: 디자인 시안');
    }
    
    // 2. 엑셀 데이터에서 정보 추출 (더 정확한 알고리즘)
    const allText = arrayData.map(row => row.join(' ')).join('\n');
    console.log('📝 전체 텍스트 길이:', allText.length);
    
    // 매장명/상호 찾기 (다양한 패턴 지원)
    const storePatterns = [
      /(?:상호|거래처|매장명?|지점명?|고객명?|업체명?|회사명?)[:\s]*([^\n\r]+)/i,
      /(?:받는|수신)[:\s]*([^\n\r]+)/i,
      /(?:TO|To|to)[:\s]*([^\n\r]+)/i
    ];
    
    for (const pattern of storePatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate.length > 1 && candidate.length < 50 && !candidate.match(/^\d+$/)) {
          storeName = candidate;
          console.log(`🏪 매장명 발견: ${storeName}`);
          break;
        }
      }
    }
    
    // 프랜차이즈명 추출 (매장명에서 브랜드 분리)
    const franchisePatterns = [
      /(스타벅스|컴포즈커피|이디야|투썸플레이스|빽다방|메가커피|파스쿠찌|탐앤탐스|커피빈|할리스)/i,
      /(GS25|CU|세븐일레븐|이마트24)/i,
      /(맥도날드|롯데리아|버거킹|KFC|맘스터치)/i
    ];
    
    for (const pattern of franchisePatterns) {
      const match = storeName.match(pattern);
      if (match) {
        franchiseName = match[1];
        console.log(`🏢 프랜차이즈 발견: ${franchiseName}`);
        break;
      }
    }
    
    // 금액 찾기 (더 정확한 패턴)
    const amountPatterns = [
      /(?:합계|총[액계]|금액|공급가액|total|amount)[:\s]*[₩]?\s*([0-9,]+)/gi,
      /([0-9,]+)\s*원?$/gm
    ];
    
    const foundAmounts: number[] = [];
    for (const pattern of amountPatterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        const amountStr = match[1].replace(/,/g, '');
        const amountNum = parseInt(amountStr, 10);
        if (!isNaN(amountNum) && amountNum > 0) {
          foundAmounts.push(amountNum);
        }
      }
    }
    
    // 가장 큰 금액을 선택 (보통 합계가 가장 큼)
    if (foundAmounts.length > 0) {
      amount = Math.max(...foundAmounts);
      console.log(`💰 금액 발견: ${amount.toLocaleString()}원`);
    }
    
    // 날짜 찾기
    const datePatterns = [
      /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/,
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
      /(\d{2})[-/.](\d{2})[-/.](\d{2})/
    ];
    
    for (const pattern of datePatterns) {
      const match = allText.match(pattern);
      if (match) {
        if (match[0].includes('년')) {
          date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else if (match[1].length === 4) {
          date = match[1];
        } else {
          // 2자리 연도는 20XX로 변환
          const year = parseInt(match[1]) > 50 ? `19${match[1]}` : `20${match[1]}`;
          date = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
        console.log(`📅 날짜 발견: ${date}`);
        break;
      }
    }
    
    // 공급업체/거래처 찾기
    const supplierPatterns = [
      /(?:공급자|판매자|from|FROM|발신)[:\s]*([^\n\r]+)/i
    ];
    
    for (const pattern of supplierPatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        supplier = match[1].trim();
        console.log(`🏭 공급업체 발견: ${supplier}`);
        break;
      }
    }
    
    // 항목 목록 추출 (objectData 활용)
    if (objectData.length > 0) {
      items = objectData.slice(0, 10).map((row, idx) => {
        const keys = Object.keys(row);
        const values = Object.values(row);
        return `${idx + 1}. ${values.slice(0, 3).join(' / ')}`;
      });
      console.log(`📦 항목 수: ${items.length}`);
    }
    
    console.log('✅ 엑셀 분석 완료');
    
    return {
      detectedType: documentType,
      storeName,
      franchiseName,
      amount,
      date: date || new Date().toISOString().split('T')[0],
      supplier,
      items,
      fullText: allText,
      extractedData: arrayData
    };
  } catch (error) {
    console.error("❌ Excel Parse Error:", error);
    throw error;
  }
}

// PDF 파일 처리
export async function extractPDFData(fileBase64: string, fileName: string) {
  try {
    // PDF에서 텍스트 추출 (간단한 버전)
    // 실제로는 pdf.js를 사용하지만, Cloudflare Workers에서는 제한적
    
    // 파일명으로 문서 타입 추정
    let documentType = 'other';
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('견적')) documentType = 'quotation';
    else if (lowerFileName.includes('발주')) documentType = 'purchase_order';
    else if (lowerFileName.includes('거래') || lowerFileName.includes('명세')) documentType = 'transaction_stmt';
    else if (lowerFileName.includes('영수증') || lowerFileName.includes('배송')) documentType = 'delivery_cost';
    
    // PDF는 OCR 대신 메타데이터만 반환
    return {
      detectedType: documentType,
      storeName: '미상',
      amount: 0,
      fullText: `PDF 파일: ${fileName}`,
      isPDF: true
    };
  } catch (error) {
    console.error("PDF Parse Error:", error);
    throw error;
  }
}
