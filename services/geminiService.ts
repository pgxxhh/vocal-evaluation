
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VoiceAnalysisResult, Language } from "../types";

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "Overall objective audio quality score (0-100).",
    },
    voiceArchetype: {
      type: Type.STRING,
      description: "A creative but accurate professional classification.",
    },
    estimatedAge: {
      type: Type.STRING,
      description: "Estimate the speaker's biological age based on vocal maturity.",
    },
    estimatedWeight: {
      type: Type.STRING,
      description: "Estimate the speaker's body weight/build based on vocal resonance.",
    },
    isPinched: {
      type: Type.BOOLEAN,
      description: "Strictly identify 'Pinched Voice' (夹子音/Jiazi Yin). Return TRUE ONLY if the voice exhibits artificial constriction, forced nasality, and raised larynx intended to sound 'cute'. Return FALSE for naturally high-pitched, sweet, or soft voices that sound relaxed.",
    },
    roast: {
      type: Type.STRING,
      description: "A sharp, witty, and potentially 'savage' commentary.",
    },
    encouragement: {
      type: Type.STRING,
      description: "A separate, distinct paragraph of genuine support.",
    },
    pros: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Top 3 technical or aesthetic strengths.",
    },
    cons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Top 3 areas for improvement.",
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
  required: ["overallScore", "voiceArchetype", "estimatedAge", "estimatedWeight", "isPinched", "roast", "encouragement", "pros", "cons", "similarVoice", "metrics", "technical"],
};

export const analyzeVoice = async (audioBlob: Blob, language: Language = 'zh'): Promise<VoiceAnalysisResult> => {
  try {
    const base64Data = await blobToBase64(audioBlob);
    
    // Initialize Gemini Client inside the function to ensure process.env is ready
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-2.5-flash"; 
    
    // Dynamic instructions based on language selection
    const langInstructions = language === 'zh' 
        ? `OUTPUT LANGUAGE: SIMPLIFIED CHINESE (简体中文).
           All text fields MUST be in Chinese.
           For 'roast': Use spicy Chinese internet slang.
           For 'isPinched': CRITICAL - Accurately distinguish between 'Natural Sweet Voice' (False) and 'Deliberate Jiazi' (True).`
        : `OUTPUT LANGUAGE: ENGLISH.
           All text fields MUST be in English.
           For 'isPinched': Detect if the voice sounds forced, pinched, or artificially high-pitched (like a cartoon character).`;

    const prompt = `
      You are an expert Voice Coach and Audio Engineer. Analyze the user voice recording.
      
      IMPORTANT: The user may speak in ANY language or dialect. Analyze the **sound physics** (timbre, resonance, glottal tension).
      
      ${langInstructions}

      **STRICT RULE FOR 'PINCHED VOICE' (夹子音 - isPinched) DETECTION:**
      You must differentiate between a **Natural High Voice** and a **Forced Pinched Voice**.
      
      1. **Set isPinched = TRUE (Detected) IF AND ONLY IF:**
         - **Constriction:** The speaker sounds like they are tightening their throat/pharynx.
         - **Raised Larynx:** The sound is artificially thin, bright, and lacks chest resonance.
         - **Performative:** The intonation is exaggeratedly "cute" (anime-style), often with nasal endings or forced breathiness.
         - **Inconsistency:** You hear effort or strain to maintain the pitch.
      
      2. **Set isPinched = FALSE (Natural) IF:**
         - **Relaxed Phonation:** The high pitch sounds open, free, and comfortable.
         - **Resonance:** There is natural body/warmth in the voice, even if it is high-pitched.
         - **Authenticity:** The speaker sounds like this is their biological default.
      
      *Do not flag someone as 'Pinched' just because they have a sweet or high voice. It must sound FORCED.*

      Part 1: Rigorous Objective Analysis.
      - **Acoustic Properties**: Timbre, resonance, pitch stability.
      - **Demographics**: Estimate Age and Weight/Build based on vocal tract resonance.
      
      Part 2: The Verdict.
      1. **The Roast**: Be honest and sharp. If isPinched=true, mock the "Jiazi" attempt mercilessly. If natural, roast their speaking style or content.
      2. **The Encouragement**: 
         - If Overall Score < 60: Reassure them.
         - If Overall Score > 80: Give a brief high-five.

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
        temperature: 0.7, // Slightly lower temperature for more consistent classification
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
      if (result) {
        const base64 = result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
