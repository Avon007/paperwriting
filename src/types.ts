export type WorkflowStep = 'INPUT' | 'RESEARCH' | 'OUTLINE' | 'PLAN' | 'WRITING' | 'POLISHING' | 'COMPLETE';

export interface Reference {
  title: string;
  author: string;
  year: string;
  keyFinding: string;
}

export interface OutlineItem {
  id: string;
  title: string;
  description: string;
}

export interface WritingTask {
  id: string; // Matches OutlineItem id
  title: string;
  status: 'pending' | 'writing' | 'completed';
  content?: string;
  assignedAgent: string;
}

export interface PaperState {
  topic: string;
  references: Reference[];
  outline: OutlineItem[];
  tasks: WritingTask[];
  fullContent: string;
  finalPolish: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'finished';
  currentAction?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

// Agent Communication Types (Agency Swarm style)
export type AgentRole = 'RESEARCHER' | 'OUTLINER' | 'PLANNER' | 'WRITER' | 'EDITOR';

export interface AgentMessage {
  id: string;
  timestamp: number;
  fromAgent: AgentRole;
  toAgent: AgentRole | 'ALL'; // 'ALL' for broadcast messages
  content: string;
  step: WorkflowStep;
  attachments?: {
    references?: Reference[];
    outline?: OutlineItem[];
    tasks?: WritingTask[];
    content?: string;
  };
}

export interface AgentConversation {
  id: string;
  participants: AgentRole[];
  messages: AgentMessage[];
  status: 'active' | 'completed' | 'blocked';
  currentStep: WorkflowStep;
  createdAt: number;
  updatedAt: number;
}

// Communication flow definition (Agency Swarm style)
export interface CommunicationFlow {
  from: AgentRole;
  to: AgentRole | 'ALL';
  condition?: WorkflowStep;
}
