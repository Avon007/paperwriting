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

// ================== Multi-Agent System Types ==================

// Agent configuration for each role
export interface AgentRoleConfig {
  count: number; // Number of agent instances (1-5)
  strategy: 'parallel' | 'sequential' | 'specialized' | 'diverse' | 'collaborative' | 'merge';
  specializations?: string[]; // Specialization directions (only for specialized strategy)
  enablePeerReview: boolean; // Enable peer review among agents
  voteMethod: 'majority' | 'weighted' | 'best' | 'consensus';
}

// Complete agent configuration
export interface AgentConfig {
  researcher: AgentRoleConfig;
  outliner: AgentRoleConfig;
  planner: AgentRoleConfig;
  writer: AgentRoleConfig;
  editor: AgentRoleConfig;
}

// Agent instance (individual agent of a role)
export interface AgentInstance {
  id: string; // e.g., "researcher-1"
  role: AgentRole;
  index: number; // Instance index (0-based)
  specialization?: string; // Specialization direction
  status: 'idle' | 'working' | 'reviewing' | 'finished';
  currentTask?: string;
  result?: any; // Execution result
  peerReviewsReceived: PeerReview[];
  peerReviewsGiven: PeerReview[];
  score: number; // Average score from peer reviews
}

// Peer review record
export interface PeerReview {
  id: string;
  reviewerId: string; // Agent who wrote the review
  targetId: string; // Agent being reviewed
  scores?: {
    quality: number; // 1-10
    completeness: number; // 1-10
    creativity: number; // 1-10
    accuracy: number; // 1-10
  };
  overallScore?: number; // Weighted average
  comments: string; // Review comments
  timestamp: number;
  isUserComment?: boolean; // True if this is a user comment
}

// Evaluation result for an agent
export interface EvaluationResult {
  agentId: string;
  result: any;
  reviews: PeerReview[];
  averageScore: number;
  rank: number; // 1 = best
  isWinner: boolean;
}

// Parallel task execution
export interface ParallelTask {
  id: string;
  role: AgentRole;
  phase: WorkflowStep;
  subtasks: SubTask[];
  config: AgentRoleConfig;
}

// Subtask for individual agent
export interface SubTask {
  id: string;
  assignedTo: string; // Agent instance ID
  input: any;
  specialization?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

// Execution status for parallel tasks
export interface ExecutionStatus {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  agents: {
    id: string;
    status: AgentInstance['status'];
    progress: number; // 0-100
  }[];
}
