import { GoogleGenAI, Type } from "@google/genai";
import type { Reference, OutlineItem, WritingTask } from '../types';

let aiClient: GoogleGenAI | null = null;

export const initializeAI = (apiKey: string) => {
  aiClient = new GoogleGenAI({ apiKey });
};

const getClient = () => {
  if (!aiClient) throw new Error("AI Client not initialized");
  return aiClient;
};

// Helper for Exponential Backoff
const callWithRetry = async <T>(
  apiCall: () => Promise<T>,
  retries = 5, // Increased retries to handle strict rate limits
  initialDelay = 4000 // Increased initial delay to 4 seconds
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error: any) {
    const msg = error.message || String(error);

    // Detailed check for Quota/Rate Limit errors
    const isQuotaError =
      msg.includes('429') ||
      msg.toLowerCase().includes('quota') ||
      msg.toLowerCase().includes('resource_exhausted') ||
      msg.toLowerCase().includes('resource exhausted') ||
      (error.response && error.response.status === 429) ||
      (error.status === 429);

    if (retries > 0 && isQuotaError) {
      const nextDelay = initialDelay * 1.5; // Backoff factor
      console.warn(`API Quota hit. Pausing for ${initialDelay}ms before retry... (${retries} attempts left)`);

      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, initialDelay));

      // Retry with increased delay
      return callWithRetry(apiCall, retries - 1, nextDelay);
    }

    // If not a quota error or out of retries, throw
    throw error;
  }
};

// --- AGENT 1: RESEARCHER ---
export const researchTopic = async (topic: string, history: string = ""): Promise<Reference[]> => {
  return callWithRetry(async () => {
    const response = await getClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a Senior Academic Researcher.

      CORE TOPIC: "${topic}"

      ${history ? `RECENT CONVERSATION CONTEXT (Use this to refine the search parameters, quantity, or focus):
      ${history}` : ''}

      INSTRUCTIONS:
      1. Conduct a literature review.
      2. Analyze the topic and conversation context to check if the user specified a quantity (e.g., "find 20 papers") or a specific sub-niche.
      3. If a quantity is specified, generate exactly that many references.
      4. If no quantity is specified, generate 10 high-quality simulated references.
      5. Provide the result strictly as a JSON array.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              year: { type: Type.STRING },
              keyFinding: { type: Type.STRING },
            },
            required: ['title', 'author', 'year', 'keyFinding']
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
};

// --- AGENT 2: OUTLINER ---
export const generateOutline = async (topic: string, references: Reference[]): Promise<OutlineItem[]> => {
  return callWithRetry(async () => {
    const refContext = references.map(r => `- ${r.title} (${r.year}): ${r.keyFinding}`).join('\n');

    const response = await getClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as an Academic Architect. Based on the topic "${topic}" and the following references:\n${refContext}\n
      Create a structured outline for a standard academic paper.
      Return strictly JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['id', 'title', 'description']
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
};

// --- AGENT 2.5: OUTLINE REFINER ---
export const refineOutline = async (currentOutline: OutlineItem[], instruction: string, history: string = ""): Promise<OutlineItem[]> => {
  return callWithRetry(async () => {
    const response = await getClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as an Academic Architect.

      Current Outline: ${JSON.stringify(currentOutline)}

      ${history ? `Conversation Context:
      ${history}` : ''}

      User Instruction for Modification: "${instruction}"

      Update the outline based on the user's instruction and context. Maintain the JSON structure.
      Return strictly JSON.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['id', 'title', 'description']
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
};

// --- AGENT 3: PLANNER ---
export const createWritingPlan = async (outline: OutlineItem[]): Promise<WritingTask[]> => {
  // Logic-only transformation, no API call needed, but keeping async signature for consistency
  return outline.map((item, index) => ({
    id: item.id,
    title: item.title,
    status: 'pending' as const,
    assignedAgent: `Writer-Unit-${index + 1}`
  }));
};

// --- AGENT 4: SECTION WRITER ---
export const writeSection = async (
  topic: string,
  task: WritingTask,
  outline: OutlineItem[],
  references: Reference[]
): Promise<string> => {
  return callWithRetry(async () => {
    const refContext = references.map(r => `${r.author} (${r.year})`).join(', ');
    const outlineContext = outline.map(o => o.title).join(' -> ');

    const response = await getClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as an Academic Writer specialized in "${task.title}".

      Topic: ${topic}
      References available: ${refContext}
      Full Paper Structure: ${outlineContext}

      TASK: Write the content for the section: "${task.title}".
      Context/Instructions: ${outline.find(o => o.id === task.id)?.description || ''}

      Write approximately 200-300 words. Be formal, academic, and cohesive. Do not include markdown headers (###), just the body text paragraphs.`,
    });

    return response.text || "";
  });
};

// --- AGENT 5: EDITOR ---
export const polishPaper = async (fullText: string, instruction?: string, history: string = ""): Promise<string> => {
  return callWithRetry(async () => {
    let prompt = `Act as a Senior Editor.`;

    if (history) {
      prompt += `\n\nContext from conversation:\n${history}`;
    }

    if (instruction) {
      prompt += `\n\nModify the text below based on this instruction: "${instruction}".`;
    } else {
      prompt += `\n\nReview the following academic paper draft. Fix transitions, improve flow, and correct grammar.`;
    }

    prompt += `\n\nText:\n${fullText}`;

    const response = await getClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || fullText;
  });
};
