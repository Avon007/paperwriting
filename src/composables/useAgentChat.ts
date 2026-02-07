import { ref, reactive, computed } from 'vue';
import type { AgentMessage, AgentConversation, AgentRole, WorkflowStep, CommunicationFlow, Reference, OutlineItem, WritingTask } from '../types';

/**
 * Agency Swarm style agent chat management
 * Handles inter-agent communication with directional flows
 */
export function useAgentChat() {
  // Active conversation thread
  const conversation = reactive<AgentConversation>({
    id: generateId(),
    participants: [],
    messages: [],
    status: 'active',
    currentStep: 'INPUT',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  // Define communication flows (Agency Swarm pattern)
  // Using ">" operator concept: left can initiate with right
  const communicationFlows: CommunicationFlow[] = [
    { from: 'RESEARCHER', to: 'OUTLINER', condition: 'RESEARCH' },
    { from: 'OUTLINER', to: 'PLANNER', condition: 'OUTLINE' },
    { from: 'PLANNER', to: 'WRITER', condition: 'PLAN' },
    { from: 'PLANNER', to: 'ALL', condition: 'PLAN' }, // Broadcast to all writers
    { from: 'WRITER', to: 'EDITOR', condition: 'WRITING' },
    { from: 'EDITOR', to: 'ALL', condition: 'POLISHING' } // Final result broadcast
  ];

  /**
   * Check if communication is allowed based on flows
   */
  const isCommunicationAllowed = (from: AgentRole, to: AgentRole | 'ALL', step: WorkflowStep): boolean => {
    return communicationFlows.some(flow =>
      flow.from === from &&
      flow.to === to &&
      (flow.condition === undefined || flow.condition === step)
    );
  };

  /**
   * Add a message to the conversation
   */
  const addMessage = (
    from: AgentRole,
    to: AgentRole | 'ALL',
    content: string,
    step: WorkflowStep,
    attachments?: AgentMessage['attachments']
  ) => {
    if (!isCommunicationAllowed(from, to, step)) {
      console.warn(`Communication not allowed: ${from} -> ${to} at step ${step}`);
      return null;
    }

    const message: AgentMessage = {
      id: generateId(),
      timestamp: Date.now(),
      fromAgent: from,
      toAgent: to,
      content,
      step,
      attachments
    };

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    // Add participants if not already present
    if (!conversation.participants.includes(from)) {
      conversation.participants.push(from);
    }
    if (to !== 'ALL' && !conversation.participants.includes(to)) {
      conversation.participants.push(to);
    }

    return message;
  };

  /**
   * Get conversation context for a specific agent
   * Returns messages relevant to this agent
   */
  const getAgentContext = (agentRole: AgentRole): string => {
    const relevantMessages = conversation.messages.filter(msg =>
      msg.toAgent === 'ALL' || msg.toAgent === agentRole || msg.fromAgent === agentRole
    );

    if (relevantMessages.length === 0) {
      return '';
    }

    return relevantMessages.map(msg => {
      const direction = msg.toAgent === agentRole ? '→ RECEIVED' : '← SENT';
      return `[${msg.fromAgent} ${direction} to ${msg.toAgent}]\n${msg.content}`;
    }).join('\n\n---\n\n');
  };

  /**
   * Get formatted conversation for display
   */
  const getFormattedConversation = computed(() => {
    return conversation.messages.map(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const direction = msg.toAgent === 'ALL'
        ? `📢 ${msg.fromAgent} → ALL`
        : `${msg.fromAgent} → ${msg.toAgent}`;

      return {
        time,
        direction,
        ...msg
      };
    });
  });

  /**
   * Clear conversation and start fresh
   */
  const clearConversation = () => {
    conversation.id = generateId();
    conversation.participants = [];
    conversation.messages = [];
    conversation.status = 'active';
    conversation.currentStep = 'INPUT';
    conversation.createdAt = Date.now();
    conversation.updatedAt = Date.now();
  };

  /**
   * Update conversation step
   */
  const updateStep = (step: WorkflowStep) => {
    conversation.currentStep = step;
    conversation.updatedAt = Date.now();
  };

  /**
   * Get message count for an agent
   */
  const getAgentMessageCount = (agentRole: AgentRole): number => {
    return conversation.messages.filter(msg =>
      msg.fromAgent === agentRole || msg.toAgent === agentRole || msg.toAgent === 'ALL'
    ).length;
  };

  return {
    // State
    conversation,

    // Methods
    addMessage,
    getAgentContext,
    isCommunicationAllowed,
    clearConversation,
    updateStep,
    getAgentMessageCount,

    // Computed
    formattedConversation: getFormattedConversation
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
