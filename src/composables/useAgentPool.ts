import { ref, computed } from 'vue';
import type { AgentInstance, AgentRole, AgentConfig } from '../types';
import { DEFAULT_AGENT_CONFIG } from '../config/agentConfig';

/**
 * Agent Pool Management Composable
 * Manages multiple agent instances for each role
 */
export function useAgentPool(config?: AgentConfig) {
  const agentConfig = config || DEFAULT_AGENT_CONFIG;
  const agentInstances = ref<AgentInstance[]>([]);

  /**
   * Initialize agent pool based on configuration
   */
  const initializePool = () => {
    agentInstances.value = [];

    // Create instances for each role
    const roles: AgentRole[] = ['RESEARCHER', 'OUTLINER', 'PLANNER', 'WRITER', 'EDITOR'];

    roles.forEach((role) => {
      const roleConfig = agentConfig[role.toLowerCase() as keyof AgentConfig];

      for (let i = 0; i < roleConfig.count; i++) {
        const instance: AgentInstance = {
          id: `${role.toLowerCase()}-${i + 1}`,
          role,
          index: i,
          specialization: getSpecialization(role, i, roleConfig.specializations),
          status: 'idle',
          peerReviewsReceived: [],
          peerReviewsGiven: [],
          score: 0
        };

        agentInstances.value.push(instance);
      }
    });
  };

  /**
   * Get specialization for an agent instance
   */
  const getSpecialization = (
    role: AgentRole,
    index: number,
    specializations?: string[]
  ): string | undefined => {
    const roleConfig = agentConfig[role.toLowerCase() as keyof AgentConfig];

    if (roleConfig?.strategy === 'specialized' && specializations) {
      return specializations[index % specializations.length];
    }

    return undefined;
  };

  /**
   * Get all agents for a specific role
   */
  const getAgentsByRole = (role: AgentRole): AgentInstance[] => {
    return agentInstances.value.filter(agent => agent.role === role);
  };

  /**
   * Get available (idle) agents for a role
   */
  const getAvailableAgents = (role: AgentRole): AgentInstance[] => {
    return getAgentsByRole(role).filter(agent => agent.status === 'idle');
  };

  /**
   * Get a specific agent by ID
   */
  const getAgentById = (id: string): AgentInstance | undefined => {
    return agentInstances.value.find(agent => agent.id === id);
  };

  /**
   * Update agent status
   */
  const updateAgentStatus = (
    agentId: string,
    status: AgentInstance['status'],
    result?: any,
    currentTask?: string
  ) => {
    const agent = getAgentById(agentId);
    if (agent) {
      agent.status = status;
      if (result !== undefined) agent.result = result;
      if (currentTask) agent.currentTask = currentTask;
    }
  };

  /**
   * Reset all agents to idle state
   */
  const resetPool = () => {
    agentInstances.value.forEach(agent => {
      agent.status = 'idle';
      agent.result = undefined;
      agent.currentTask = undefined;
      agent.peerReviewsReceived = [];
      agent.peerReviewsGiven = [];
      agent.score = 0;
    });
  };

  /**
   * Clear the entire pool
   */
  const clearPool = () => {
    agentInstances.value = [];
  };

  /**
   * Get execution statistics
   */
  const getStats = computed(() => {
    const stats = {
      total: agentInstances.value.length,
      idle: 0,
      working: 0,
      reviewing: 0,
      finished: 0,
      byRole: {} as Record<AgentRole, number>
    };

    agentInstances.value.forEach(agent => {
      stats[agent.status]++;
      stats.byRole[agent.role] = (stats.byRole[agent.role] || 0) + 1;
    });

    return stats;
  });

  /**
   * Get agents with results (for evaluation)
   */
  const getAgentsWithResults = (role: AgentRole): AgentInstance[] => {
    return getAgentsByRole(role).filter(agent => agent.result !== undefined);
  };

  /**
   * Update agent score after peer review
   */
  const updateAgentScore = (agentId: string, score: number) => {
    const agent = getAgentById(agentId);
    if (agent) {
      agent.score = score;
    }
  };

  /**
   * Add peer review to an agent
   */
  const addPeerReview = (review: any) => {
    const reviewer = getAgentById(review.reviewerId);
    const target = getAgentById(review.targetId);

    if (reviewer && target) {
      reviewer.peerReviewsGiven.push(review);
      target.peerReviewsReceived.push(review);
    }
  };

  // Initialize pool on creation
  initializePool();

  return {
    // State
    agentInstances,
    stats: getStats,

    // Methods
    initializePool,
    getAgentsByRole,
    getAvailableAgents,
    getAgentById,
    getAgentsWithResults,
    updateAgentStatus,
    updateAgentScore,
    addPeerReview,
    resetPool,
    clearPool
  };
}
