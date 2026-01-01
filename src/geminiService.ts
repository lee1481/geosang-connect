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

// 엑셀 파일 처리 (XLSX, XLS, CSV)
export async function extractExcelData(fileBase64: string, fileName: string) {
  try {
    // Dynamic import to avoid bundling issues
    const XLSX = await import('xlsx');
    
    // Base64를 ArrayBuffer로 변환
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 엑셀 파일 읽기
    const workbook = XLSX.read(bytes, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    // 데이터 분석 (첫 행을 헤더로 사용)
    const rows = data as any[][];
    if (rows.length < 2) {
      throw new Error('엑셀 데이터가 비어있습니다.');
    }
    
    // 자동으로 문서 정보 추출
    let storeName = '미상';
    let amount = 0;
    let documentType = 'other';
    
    // 파일명으로 문서 타입 추정
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('견적')) documentType = 'quotation';
    else if (lowerFileName.includes('발주')) documentType = 'purchase_order';
    else if (lowerFileName.includes('거래') || lowerFileName.includes('명세')) documentType = 'transaction_stmt';
    else if (lowerFileName.includes('영수증') || lowerFileName.includes('배송')) documentType = 'delivery_cost';
    
    // 엑셀 데이터에서 매장명, 금액 찾기
    for (const row of rows) {
      const rowStr = row.join(' ').toLowerCase();
      
      // 매장명 찾기 (상호, 거래처, 매장, 지점 등)
      if ((rowStr.includes('상호') || rowStr.includes('거래처') || rowStr.includes('매장') || rowStr.includes('지점')) && storeName === '미상') {
        const nextCell = row[1] || row[0];
        if (nextCell && typeof nextCell === 'string' && nextCell.length > 1) {
          storeName = nextCell;
        }
      }
      
      // 금액 찾기 (합계, 총액, 금액 등)
      if (rowStr.includes('합계') || rowStr.includes('총액') || rowStr.includes('금액')) {
        for (const cell of row) {
          if (typeof cell === 'number' && cell > amount) {
            amount = cell;
          }
        }
      }
    }
    
    return {
      detectedType: documentType,
      storeName,
      amount,
      fullText: JSON.stringify(rows),
      extractedData: rows
    };
  } catch (error) {
    console.error("Excel Parse Error:", error);
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
