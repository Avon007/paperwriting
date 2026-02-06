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
