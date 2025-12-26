import { GoogleGenAI, Type } from "@google/genai";

// 인건비 청구 내역서 OCR
export async function extractLaborClaimData(fileBase64: string, mimeType: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    다음은 인건비 청구 내역서입니다. 
    작업일, 작업 장소, 작업 내용, 청구 금액을 추출하여 JSON으로 반환하세요.
    
    추출할 정보:
    - date: 작업일 (YYYY-MM-DD 형식)
    - location: 작업 장소/현장명
    - workDescription: 작업 내용 (구체적으로)
    - hours: 작업 시간 (숫자, 없으면 8)
    - amount: 청구 금액 (숫자만, 쉼표 제거)
    
    여러 건이 있으면 배열로 반환하세요.
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
            claims: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  location: { type: Type.STRING },
                  workDescription: { type: Type.STRING },
                  hours: { type: Type.NUMBER },
                  amount: { type: Type.NUMBER },
                },
                required: ["date", "location", "workDescription", "amount"]
              }
            }
          },
          required: ["claims"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Labor Claim OCR Error:", error);
    throw error;
  }
}

// 문자 메시지 형식 파싱 (AI 기반)
export async function parseLaborClaimText(text: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    다음은 외주 일당이 보낸 인건비 청구 문자입니다.
    문자에서 작업일, 장소, 내용, 금액을 추출하여 JSON으로 반환하세요.
    
    입력 예시:
    "12/25 강남 현장 타일공사 150,000원"
    "오늘 서초구 OO빌딩 도배작업 했어요. 12만원"
    "25일 판교 전기작업 8시간 20만원"
    
    추출 정보:
    - date: 작업일 (YYYY-MM-DD, 올해 기준)
    - location: 작업 장소
    - workDescription: 작업 내용
    - hours: 작업 시간 (없으면 8)
    - amount: 금액 (숫자만)
    
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
            location: { type: Type.STRING },
            workDescription: { type: Type.STRING },
            hours: { type: Type.NUMBER },
            amount: { type: Type.NUMBER },
          },
          required: ["date", "location", "workDescription", "amount"]
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
