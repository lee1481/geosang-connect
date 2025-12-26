import { GoogleGenAI, Type } from "@google/genai";

// 인건비 청구 내역서 OCR (영수증 OCR)
export async function extractReceiptData(fileBase64: string, mimeType: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
