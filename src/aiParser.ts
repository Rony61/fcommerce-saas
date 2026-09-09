import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

export async function parseBanglishOrder(text: string) {
  const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-pro"];

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: `Extract order details from this Banglish message into raw JSON format without markdown code blocks.
Required keys: recipient_name, recipient_phone, recipient_address, cod_amount.
Message: "${text}"`,
      });

      if (response.text) {
        const cleanedJson = response.text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedJson);
      }
    } catch (error: any) {
      if (error?.status === 503 || error?.code === 503) {
        console.warn(`[Gemini] ${model} high demand (503). Retrying with next model...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error("All Gemini models are currently busy. Please try again in a moment.");
}
