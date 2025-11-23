import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VoiceAnalysisResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "Overall objective audio quality score (0-100).",
    },
    voiceArchetype: {
      type: Type.STRING,
      description: "A creative but accurate professional classification (e.g., 'The Late Night DJ', 'The Corporate Leader').",
    },
    estimatedAge: {
      type: Type.STRING,
      description: "Estimate the speaker's biological age based on vocal maturity, timbre and pitch (e.g., 'Late 20s', 'Approx 35', 'Teenager').",
    },
    estimatedWeight: {
      type: Type.STRING,
      description: "Estimate the speaker's body weight/build based on vocal resonance, lung capacity and fullness (e.g., 'Approx 70kg', 'Light build ~50kg', 'Heavy build >90kg').",
    },
    roast: {
      type: Type.STRING,
      description: "A sharp, witty, and potentially 'savage' commentary. If the voice sounds fake, forced (e.g., '夹子音' / forced cuteness), or pretentious, roast them hard. Use Gen Z humor.",
    },
    encouragement: {
      type: Type.STRING,
      description: "A separate, distinct paragraph of genuine support. If the score is low, reassure them that the roast was a joke and highlight their potential. If high, give a brief high-five.",
    },
    pros: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Top 3 technical or aesthetic strengths (objective).",
    },
    cons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Top 3 areas for improvement (objective).",
    },
    similarVoice: {
      type: Type.STRING,
      description: "A famous person, actor, or character with a similar vocal quality.",
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        clarity: { type: Type.NUMBER, description: "Articulation and diction (0-100)." },
        charisma: { type: Type.NUMBER, description: "Magnetic quality (0-100)." },
        uniqueness: { type: Type.NUMBER, description: "Distinctiveness (0-100)." },
        stability: { type: Type.NUMBER, description: "Tone consistency (0-100)." },
        warmth: { type: Type.NUMBER, description: "Approachability and resonance (0-100)." },
      },
      required: ["clarity", "charisma", "uniqueness", "stability", "warmth"],
    },
    technical: {
      type: Type.OBJECT,
      properties: {
        pitchRange: { type: Type.STRING, description: "e.g., 'Deep Baritone', 'Bright Soprano'." },
        speakingPace: { type: Type.STRING, description: "e.g., 'Rapid Fire', 'Thoughtful & Slow'." },
        expressiveness: { type: Type.STRING, description: "e.g., 'Flat', 'Melodic', 'Dynamic'." },
      },
      required: ["pitchRange", "speakingPace", "expressiveness"],
    },
  },
  required: ["overallScore", "voiceArchetype", "estimatedAge", "estimatedWeight", "roast", "encouragement", "pros", "cons", "similarVoice", "metrics", "technical"],
};

export const analyzeVoice = async (audioBlob: Blob): Promise<VoiceAnalysisResult> => {
  try {
    const base64Data = await blobToBase64(audioBlob);
    const model = "gemini-2.5-flash"; 
    
    const prompt = `
      You are an expert Audio Engineer and a 'Vibe Check' specialist. Analyze the user voice recording.
      
      IMPORTANT: The user may speak in ANY language or dialect (English, Chinese, Spanish, etc.).
      Do not bias the score based on the language spoken. If you cannot understand the words, you must still analyze the **sound** itself.
      
      Part 1: Rigorous Objective Analysis.
      Analyze the **acoustic properties** (timbre, resonance, pitch stability, clarity of tone) like a scientist.
      Identify technical strengths and weaknesses regardless of language. Score strictly based on how the voice *sounds*.
      **Infer Demographics**: 
      1. Age: Listen to vocal maturity/roughness.
      2. Weight: Estimate physical build/weight based on vocal tract resonance and fullness.
      
      Part 2: The Verdict (Two Parts).
      1. **The Roast**: Be honest and sharp. If they sound like they are forcing a voice (e.g., '夹子音' / forced cuteness, Batman voice, fake radio host), CALL THEM OUT. Be funny, spicy, and use internet slang.
      2. **The Encouragement**: 
         - If Overall Score < 60: "Look, I was roasting you for fun. Your voice actually has [X quality]. Don't be afraid to speak up."
         - If Overall Score > 80: "Jokes aside, you have a killer voice. Keep using it."

      Output valid JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: audioBlob.type || "audio/webm", data: base64Data } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8, // Slightly higher for more creative roasts
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as VoiceAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};