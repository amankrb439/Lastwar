
import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";

// Always initialize the client within the service to ensure it uses the latest process.env.API_KEY
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTacticalAdvice = async (gameState: GameState) => {
  const ai = getAiClient();
  const prompt = `
    You are the "Aegis Tactical Advisor" in a post-apocalyptic strategy game called Last War.
    
    CRITICAL INTELLIGENCE DATA:
    - Current Day: ${gameState.day}
    - Logistics: Gold(${gameState.resources.Gold}), Food(${gameState.resources.Food}), Steel(${gameState.resources.Steel}), Tech(${gameState.resources.Tech})
    - Combat Readiness: ${gameState.units.reduce((acc, u) => acc + u.power * u.count, 0)} Combined Power
    - Infrastructure: ${gameState.buildings.map(b => `${b.name} (Lv.${b.level})`).join(', ')}

    Analyze the player's situation. Determine if they are resource-starved, military-weak, or over-extended.
    Provide a concise (max 100 words), immersive, and highly strategic briefing.
    Suggest specific immediate actions (e.g., "prioritize Steel Works level 3 to prepare for heavy armor research").
    Use a stern, professional, military commander tone.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro for better tactical reasoning
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2000 } // Small budget for reasoning
      }
    });
    return response.text || "Status report unavailable. Maintain current trajectory.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Communication link unstable. Rely on manual tactical assessment.";
  }
};

export const generateMissionDescription = async (difficulty: number) => {
  const ai = getAiClient();
  const prompt = `Generate a gritty, high-stakes 1-sentence mission briefing for a wasteland operation. Difficulty level: ${difficulty}/10.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "Eliminate hostile elements in the vicinity.";
  } catch {
    return "Eliminate hostile elements in the vicinity.";
  }
};
