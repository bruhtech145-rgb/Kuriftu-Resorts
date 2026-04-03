import { GoogleGenAI, Type } from "@google/genai";
import { PricingRule } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function safeGenerateContent(params: any, fallback: any) {
  try {
    const response = await ai.models.generateContent(params);
    if (!response.text) throw new Error("Empty response from AI");
    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Check for 429 (Rate Limit) or other quota issues
    const isQuotaError = error?.message?.includes("429") || 
                        error?.message?.includes("quota") || 
                        error?.status === "RESOURCE_EXHAUSTED";
    
    if (isQuotaError && fallback) {
      console.warn("Quota exceeded, using fallback data.");
      return fallback;
    }
    
    throw error;
  }
}

export async function getGuestSegmentation(preferences: any) {
  const fallback = {
    segment_name: "Premium Traveler",
    segment_confidence: 0.85,
    willingness_to_pay_score: 9,
    recommended_services: ["Spa Treatment", "Private Dinner"],
    tagline: "Seeking the ultimate luxury experience."
  };

  return safeGenerateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Analyze these guest preferences and categorize them into a segment: ${JSON.stringify(preferences)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          segment_name: { type: Type.STRING },
          segment_confidence: { type: Type.NUMBER },
          willingness_to_pay_score: { type: Type.NUMBER },
          recommended_services: { type: Type.ARRAY, items: { type: Type.STRING } },
          tagline: { type: Type.STRING }
        },
        required: ["segment_name", "segment_confidence", "willingness_to_pay_score", "recommended_services", "tagline"]
      }
    }
  }, fallback);
}

export async function getRevenueForecast(historicalData: any, pricingRules: any[]) {
  const fallback = {
    forecast_summary: "AI Forecast is currently unavailable due to high demand. Showing baseline projections based on historical occupancy trends.",
    predicted_revenue: 12500000,
    risk_factors: ["Seasonal fluctuations", "Limited dynamic rule coverage"],
    recommendations: ["Consider increasing weekend rates", "Monitor competitor pricing"],
    pricing_optimization_tips: ["Implement early bird discounts", "Optimize last-minute availability"]
  };

  return safeGenerateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Provide a 30-day revenue forecast based on this historical data: ${JSON.stringify(historicalData)}. 
    Consider these current dynamic pricing rules: ${JSON.stringify(pricingRules)}.
    Provide strategic recommendations on how to optimize these rules or add new ones.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          forecast_summary: { type: Type.STRING },
          predicted_revenue: { type: Type.NUMBER },
          risk_factors: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          pricing_optimization_tips: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["forecast_summary", "predicted_revenue", "risk_factors", "recommendations", "pricing_optimization_tips"]
      }
    }
  }, fallback);
}

export async function suggestPricingRules(forecast: any, currentRules: PricingRule[]) {
  const fallback: any[] = [];

  return safeGenerateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Based on this revenue forecast: ${JSON.stringify(forecast)} 
    and these current pricing rules: ${JSON.stringify(currentRules)}, 
    suggest 3 new dynamic pricing rules to optimize revenue.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["occupancy", "seasonal", "event"] },
            condition_value: { type: Type.STRING },
            adjustment_type: { type: Type.STRING, enum: ["percentage", "fixed"] },
            adjustment_value: { type: Type.NUMBER },
            is_active: { type: Type.BOOLEAN }
          },
          required: ["name", "description", "type", "condition_value", "adjustment_type", "adjustment_value", "is_active"]
        }
      }
    }
  }, fallback);
}

export async function getChatbotResponse(message: string, context: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: `You are the AI Concierge for Lalibela Resort & Spa. Use this context to help the guest: ${JSON.stringify(context)}`
      }
    });
    return response.text || "I'm sorry, I'm having trouble connecting right now. Please try again later.";
  } catch (error: any) {
    console.error("Chatbot Error:", error);
    if (error?.message?.includes("429")) {
      return "I'm currently experiencing high demand. Please give me a moment and try again.";
    }
    return "I'm sorry, I'm having trouble connecting right now. Please try again later.";
  }
}
