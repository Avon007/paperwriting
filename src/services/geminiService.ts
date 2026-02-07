import { GoogleGenAI, Type } from "@google/genai";
import type { Reference, OutlineItem, WritingTask, AgentRole, WorkflowStep } from '../types';

let aiClient: GoogleGenAI | null = null;

export const initializeAI = (apiKey: string) => {
  aiClient = new GoogleGenAI({ apiKey });
};

export const getClient = () => {
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
export const researchTopic = async (topic: string, history: string = "", focus?: string): Promise<Reference[]> => {
  return callWithRetry(async () => {
    // Extract the main topic if a focus is specified (format: "topic (Focus: specialization)")
    let mainTopic = topic;
    let specialization = focus;

    // Parse topic if it contains focus info
    const focusMatch = topic.match(/^(.+?)\s*\(Focus:\s*(.+)\)$/);
    if (focusMatch) {
      mainTopic = focusMatch[1];
      specialization = focusMatch[2];
    }

    // Build focused prompt
    let focusInstruction = "";
    if (specialization) {
      focusInstruction = `
      SPECIALIZATION REQUIREMENT: You must focus specifically on "${specialization}" aspect of this topic.
      - ONLY select papers that directly relate to ${specialization}
      - Emphasize methodologies, findings, and perspectives unique to ${specialization}
      - Avoid generic papers that don't specifically address ${specialization}
      - Ensure all key findings highlight ${specialization}-specific insights`;
    }

    const response = await getClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a Senior Academic Researcher specializing in ${specialization || 'general research'}.

      CORE TOPIC: "${mainTopic}"
      ${focusInstruction}

      ${history ? `RECENT CONVERSATION CONTEXT (Use this to refine the search parameters, quantity, or focus):
      ${history}` : ''}

      INSTRUCTIONS:
      1. Conduct a literature review${specialization ? ` with a strong focus on ${specialization}` : ''}.
      2. Analyze the topic and conversation context to check if the user specified a quantity (e.g., "find 20 papers") or a specific sub-niche.
      3. If a quantity is specified, generate exactly that many references.
      4. If no quantity is specified, generate 10 high-quality simulated references.
      5. ${specialization ? `CRITICAL: All papers MUST be highly relevant to ${specialization}. Include domain-specific terminology and methodologies.` : ''}
      6. Provide the result strictly as a JSON array.`,
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

// ================== AGENCY SWARM STYLE INTER-AGENT COMMUNICATION ==================

/**
 * Agent System Instructions
 * Each agent has specific instructions about how to communicate
 */
const AGENT_INSTRUCTIONS: Record<AgentRole, string> = {
  RESEARCHER: `You are the RESEARCHER agent. Your role is to:
1. Search for academic references on the given topic
2. Analyze and summarize key findings
3. Communicate your findings to the OUTLINER agent

When communicating with other agents:
- Be clear about what you found
- Highlight the most important references
- Suggest potential paper structure based on findings`,

  OUTLINER: `You are the OUTLINER agent. Your role is to:
1. Review research findings from RESEARCHER
2. Create a structured paper outline
3. Communicate the outline to the PLANNER agent

When communicating with other agents:
- Present the outline clearly
- Explain the logical flow
- Suggest which sections need more research`,

  PLANNER: `You are the PLANNER agent. Your role is to:
1. Review the outline from OUTLINER
2. Break down sections into writing tasks
3. Assign tasks to WRITER agents
4. Coordinate the writing workflow

When communicating with other agents:
- Be clear about task assignments
- Provide context for each section
- Track progress and dependencies`,

  WRITER: `You are a WRITER agent. Your role is to:
1. Receive writing assignments from PLANNER
2. Write content for your assigned section
3. Communicate completed work to EDITOR

When communicating with other agents:
- Confirm task understanding
- Report progress updates
- Deliver completed sections with summaries`,

  EDITOR: `You are the EDITOR agent. Your role is to:
1. Review completed sections from WRITERs
2. Polish and refine the content
3. Ensure consistency and flow
4. Deliver final polished paper

When communicating with other agents:
- Request revisions when needed
- Confirm receipt of sections
- Broadcast final results to all agents`
};

/**
 * Agent-to-Agent Communication
 * This function simulates one agent sending a message to another
 * It includes the agent's system instructions and conversation context
 */
export const agentSendMessage = async (
  fromAgent: AgentRole,
  toAgent: AgentRole | 'ALL',
  message: string,
  conversationContext: string,
  attachments?: {
    references?: Reference[];
    outline?: OutlineItem[];
    tasks?: WritingTask[];
    content?: string;
  }
): Promise<string> => {
  return callWithRetry(async () => {
    const agentInstructions = AGENT_INSTRUCTIONS[fromAgent];

    // Build context about attachments
    let attachmentContext = '';
    if (attachments?.references) {
      attachmentContext += `\n\nREFERENCES ATTACHED:\n${attachments.references.map(r => `- ${r.title} (${r.year})`).join('\n')}`;
    }
    if (attachments?.outline) {
      attachmentContext += `\n\nOUTLINE ATTACHED:\n${attachments.outline.map(o => `${o.id}. ${o.title}: ${o.description}`).join('\n')}`;
    }
    if (attachments?.tasks) {
      attachmentContext += `\n\nTASKS ATTACHED:\n${attachments.tasks.map(t => `- ${t.title} → ${t.assignedAgent}`).join('\n')}`;
    }
    if (attachments?.content) {
      attachmentContext += `\n\nCONTENT ATTACHED:\n${attachments.content}`;
    }

    const prompt = `${agentInstructions}

CONVERSATION HISTORY:
${conversationContext || '(No previous messages)'}

YOUR TASK:
Send a message to ${toAgent === 'ALL' ? 'ALL AGENTS' : `the ${toAgent} agent`}.

MESSAGE TO COMMUNICATE:
${message}

${attachmentContext}

IMPORTANT:
- Respond with ONLY the message you want to send to ${toAgent === 'ALL' ? 'the other agents' : `the ${toAgent} agent`}.
- Do NOT include any explanations or meta-commentary.
- Be direct and professional.
- Keep your message focused and actionable.`;

    const response = await getClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    return response.text || '';
  });
};

/**
 * Multi-Agent Collaboration Workflow
 * This orchestrates a full step with inter-agent communication
 */
export const runAgentCollaborationStep = async (
  step: WorkflowStep,
  topic: string,
  data: {
    references?: Reference[];
    outline?: OutlineItem[];
    tasks?: WritingTask[];
    content?: string;
  },
  conversationContext: string
): Promise<{
  agentMessages: Array<{ from: AgentRole; to: AgentRole | 'ALL'; content: string }>;
  result: {
    references?: Reference[];
    outline?: OutlineItem[];
    tasks?: WritingTask[];
    content?: string;
  };
}> => {
  const agentMessages: Array<{ from: AgentRole; to: AgentRole | 'ALL'; content: string }> = [];

  switch (step) {
    case 'RESEARCH': {
      // RESEARCHER conducts research and reports to OUTLINER
      const references = await researchTopic(topic, conversationContext);

      // RESEARCHER sends message to OUTLINER
      const researcherMsg = await agentSendMessage(
        'RESEARCHER',
        'OUTLINER',
        `I've completed research on "${topic}". I found ${references.length} relevant papers. Key findings include:\n${references.slice(0, 3).map(r => r.keyFinding).join('\n')}\n\nReady to proceed with outline creation.`,
        conversationContext,
        { references }
      );
      agentMessages.push({ from: 'RESEARCHER', to: 'OUTLINER', content: researcherMsg });

      return { agentMessages, result: { references } };
    }

    case 'OUTLINE': {
      // OUTLINER reviews references and creates outline
      const outline = await generateOutline(topic, data.references || []);

      // OUTLINER sends message to PLANNER
      const outlinerMsg = await agentSendMessage(
        'OUTLINER',
        'PLANNER',
        `I've created a structured outline for "${topic}" with ${outline.length} sections:\n${outline.map(o => `- ${o.title}`).join('\n')}\n\nReady for task planning.`,
        conversationContext,
        { outline }
      );
      agentMessages.push({ from: 'OUTLINER', to: 'PLANNER', content: outlinerMsg });

      return { agentMessages, result: { outline } };
    }

    case 'PLAN': {
      // PLANNER creates writing tasks and broadcasts to WRITERs
      const tasks = await createWritingPlan(data.outline || []);

      // PLANNER broadcasts to ALL WRITERs
      const plannerMsg = await agentSendMessage(
        'PLANNER',
        'ALL',
        `I've created ${tasks.length} writing tasks. Each WRITER unit should pick up their assigned section:\n${tasks.map(t => `- ${t.title} → ${t.assignedAgent}`).join('\n')}\n\nPlease begin writing your sections.`,
        conversationContext,
        { tasks }
      );
      agentMessages.push({ from: 'PLANNER', to: 'ALL', content: plannerMsg });

      return { agentMessages, result: { tasks } };
    }

    case 'WRITING': {
      // Each WRITER works on their section
      const tasks = data.tasks || [];
      const writerMessages: Array<{ from: AgentRole; to: AgentRole | 'ALL'; content: string }> = [];

      for (const task of tasks) {
        if (task.status === 'pending') {
          // WRITER sends message confirming task
          const writerStartMsg = await agentSendMessage(
            'WRITER',
            'EDITOR',
            `Starting work on section: "${task.title}"`,
            conversationContext
          );
          writerMessages.push({ from: 'WRITER', to: 'EDITOR', content: writerStartMsg });

          // Write the section
          const content = await writeSection(topic, task, data.outline || [], data.references || []);
          task.content = content;
          task.status = 'completed';

          // WRITER sends completed section
          const writerDoneMsg = await agentSendMessage(
            'WRITER',
            'EDITOR',
            `Completed section: "${task.title}" (${content.length} chars)`,
            conversationContext,
            { content }
          );
          writerMessages.push({ from: 'WRITER', to: 'EDITOR', content: writerDoneMsg });
        }
      }

      return { agentMessages: writerMessages, result: { tasks } };
    }

    case 'POLISHING': {
      // EDITOR polishes the full paper and broadcasts to ALL
      const fullContent = data.tasks?.map(t => t.content).join('\n\n') || '';
      const polished = await polishPaper(fullContent, undefined, conversationContext);

      // EDITOR broadcasts final result to ALL agents
      const editorMsg = await agentSendMessage(
        'EDITOR',
        'ALL',
        `Final polishing complete! The paper "${topic}" has been refined and is ready.\n\nTotal sections: ${data.tasks?.length || 0}\nTotal characters: ${polished.length}\n\n✅ PAPER COMPLETE`,
        conversationContext,
        { content: polished }
      );
      agentMessages.push({ from: 'EDITOR', to: 'ALL', content: editorMsg });

      return { agentMessages, result: { content: polished } };
    }

    default:
      return { agentMessages, result: data };
  }
};
