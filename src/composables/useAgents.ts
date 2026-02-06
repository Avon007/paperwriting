import { ref, computed } from 'vue';
import type { Agent } from '../types';

const INITIAL_AGENTS: Agent[] = [
  { id: 'researcher', name: 'Dr. Search', role: 'RESEARCHER', status: 'idle' },
  { id: 'outliner', name: 'Architect', role: 'OUTLINER', status: 'idle' },
  { id: 'planner', name: 'Strategist', role: 'PLANNER', status: 'idle' },
  { id: 'editor', name: 'The Finisher', role: 'EDITOR', status: 'idle' },
];

export function useAgents() {
  const agents = ref<Agent[]>([...INITIAL_AGENTS]);

  const updateAgent = (id: string, status: Agent['status'], action?: string) => {
    const agent = agents.value.find(a => a.id === id);
    if (agent) {
      agent.status = status;
      agent.currentAction = action;
    }
  };

  const addWriterAgent = (id: string, name: string) => {
    if (!agents.value.find(a => a.id === id)) {
      agents.value.push({ id, name, role: 'WRITER', status: 'idle' });
    }
  };

  const resetAgents = () => {
    agents.value = [...INITIAL_AGENTS];
  };

  const hasActiveWriters = computed(() => {
    return agents.value.some(a => a.role === 'WRITER' && a.status !== 'idle');
  });

  return {
    agents,
    updateAgent,
    addWriterAgent,
    resetAgents,
    hasActiveWriters
  };
}
