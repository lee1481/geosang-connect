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
    다음은 시공비 내역서(이미지 또는 문서)입니다. 
    내용에서 다음 정보를 추출하여 JSON 형식으로 반환해 주세요:
    - date (시공 날짜: YYYY-MM-DD)
    - location (시공 장소/주소)
    - amount (청구 금액: 숫자만)
    - description (시공 내용 요약)
    
    정확하게 알 수 없는 정보는 '미상'으로 표시하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    이 이미지는 한국의 사업자등록증입니다. 
    다음 정보를 추출하여 JSON 형식으로 반환해 주세요:
    - brandName (상호 또는 법인명)
    - address (사업장 소재지/주소)
    
    정확하게 알 수 없는 정보는 빈 문자열("")로 표시하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    이 이미지는 명함입니다. 
    다음 정보를 추출하여 JSON 형식으로 반환해 주세요:
    - name (성명)
    - position (직함/직위)
    - phone (개인 휴대폰 번호)
    - companyPhone (회사 대표번호 또는 사무실 번호)
    - email (이메일 주소)
    - homepage (홈페이지 URL)
    
    정확하게 알 수 없는 정보는 빈 문자열("")로 표시하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
          required: ["name", "position", "phone", "companyPhone", "email", "homepage"]
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
      🔍 이 이미지는 비즈니스 문서입니다. OCR로 텍스트를 추출하고 자동으로 문서 타입을 감지하세요.
      
      다음 정보를 추출하세요:
      1. detectedType: 문서 타입 자동 감지 (quotation/purchase_order/transaction_stmt/delivery_cost/design_proposal/other)
         - 견적서, 견적, Quotation → "quotation"
         - 발주서, 주문서, Order → "purchase_order"
         - 거래명세서, 세금계산서, Invoice → "transaction_stmt"
         - 영수증, 배송비, 퀵비, Receipt, Delivery → "delivery_cost"
         - 시안, 디자인, Design → "design_proposal"
      
      2. storeName: 매장명 (예: 컴포즈커피 인천점, 스타벅스 강남점)
      3. franchiseName: 프랜차이즈명 (예: 컴포즈커피, 스타벅스)
      4. amount: 총 금액 (숫자만, 쉼표 제거)
      5. date: 날짜 (YYYY-MM-DD 형식)
      6. supplier: 공급업체명/거래처명 (있는 경우)
      7. items: 항목 목록 (배열, 있는 경우)
      8. fullText: OCR로 추출한 전체 텍스트
      
      ⚠️ 중요: 
      - 모든 텍스트를 정확하게 읽어주세요 (한글, 영어, 숫자 모두)
      - 금액은 쉼표를 제거하고 숫자만 반환
      - 매장명은 최대한 정확하게 추출
      - fullText에는 이미지의 모든 텍스트를 포함
    `,
    design_proposal: `
      🎨 이 이미지는 간판 디자인 시안입니다. OCR로 텍스트를 추출하세요.
      
      다음 정보를 추출하세요:
      - storeName: 매장명 (예: 컴포즈커피 인천점, 스타벅스 강남점)
      - franchiseName: 프랜차이즈명 (예: 컴포즈커피, 스타벅스)
      - location: 지점명/위치 (예: 인천점, 강남점)
      - designNotes: 디자인 특징 요약
      - fullText: OCR로 추출한 전체 텍스트
      - detectedType: "design_proposal"
    `,
    quotation: `
      📋 이 이미지는 견적서입니다. OCR로 모든 텍스트를 정확하게 추출하세요.
      
      다음 정보를 추출하세요:
      - storeName: 매장명 (예: 컴포즈커피 인천점)
      - franchiseName: 프랜차이즈명
      - amount: 총 견적 금액 (숫자만, 쉼표 제거)
      - date: 견적일자 (YYYY-MM-DD)
      - items: 견적 항목 목록 (배열)
      - fullText: OCR로 추출한 전체 텍스트
      - detectedType: "quotation"
    `,
    purchase_order: `
      📦 이 이미지는 발주서입니다. OCR로 텍스트를 추출하세요.
      
      다음 정보를 추출하세요:
      - storeName: 매장명
      - supplier: 공급업체명
      - amount: 발주 금액 (숫자만)
      - date: 발주일자 (YYYY-MM-DD)
      - items: 발주 항목 목록
      - fullText: OCR로 추출한 전체 텍스트
      - detectedType: "purchase_order"
    `,
    transaction_stmt: `
      🧾 이 이미지는 거래명세서입니다. OCR로 텍스트를 추출하세요.
      
      다음 정보를 추출하세요:
      - storeName: 매장명 (거래처명에서 추출)
      - supplier: 공급업체명
      - amount: 거래 금액 (숫자만)
      - date: 거래일자 (YYYY-MM-DD)
      - items: 거래 항목 목록
      - fullText: OCR로 추출한 전체 텍스트
      - detectedType: "transaction_stmt"
    `,
    delivery_cost: `
      🚚 이 이미지는 배송비/퀵비 영수증입니다. OCR로 텍스트를 추출하세요.
      
      다음 정보를 추출하세요:
      - storeName: 배송지 매장명
      - amount: 배송비 금액 (숫자만)
      - date: 배송일자 (YYYY-MM-DD)
      - deliveryType: 배송 유형 (택배/퀵/차량/기타)
      - fullText: OCR로 추출한 전체 텍스트
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
          required: []
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Project Document OCR Error:", error);
    throw error;
  }
}
