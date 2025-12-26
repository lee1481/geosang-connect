import { GoogleGenAI, Type } from "@google/genai";

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
