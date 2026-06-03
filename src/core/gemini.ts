import { GoogleGenAI } from '@google/genai';

// Cliente oficial de Gemini (Google Gen AI SDK)
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});
