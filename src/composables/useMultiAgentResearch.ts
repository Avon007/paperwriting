import { ref } from 'vue';
import type { Reference, AgentInstance, ExecutionStatus, EvaluationResult } from '../types';
import { researchTopic } from '../services/geminiService';
import { useAgentPool } from './useAgentPool';
import { loadAgentConfig } from '../config/agentConfig';
import { ParallelExecutor } from '../services/parallelExecutor';
import { PeerReviewSystem } from '../services/peerReviewSystem';
import { VotingSystem } from '../services/votingSystem';

/**
 * Multi-Agent Research Composable
 * Manages multiple RESEARCHER agents working in parallel
 */
export function useMultiAgentResearch() {
  const config = loadAgentConfig();
  const { agentInstances, initializePool, getAgentsByRole, updateAgentStatus, resetPool } = useAgentPool(config);

  const isLoading = ref(false);
  const executionStatus = ref<ExecutionStatus | null>(null);
  const evaluationResults = ref<EvaluationResult[]>([]);

  /**
   * Execute multi-agent research
   * @param topic - Research topic
   * @param onProgress - Progress callback
   * @returns Best references from all researchers
   */
  const executeMultiAgentResearch = async (
    topic: string,
    onProgress?: (status: ExecutionStatus) => void
  ): Promise<{
    references: Reference[];
    evaluations: EvaluationResult[];
    winner: AgentInstance | null;
  }> => {
    isLoading.value = true;
    evaluationResults.value = [];

    try {
      // Initialize pool with current config
      initializePool();

      // Get all RESEARCHER agents
      const researchers = getAgentsByRole('RESEARCHER');

      if (researchers.length === 0) {
        throw new Error('No RESEARCHER agents available');
      }

      // Determine execution strategy
      const researcherConfig = config.researcher;
      const useRateLimit = researcherConfig.count > 1; // Use rate limiting for multiple agents

      // Execute research in parallel (or sequential with rate limit)
      const results = useRateLimit
        ? await ParallelExecutor.executeWithRateLimit(
            researchers,
            async (agent) => {
              // Build specialized prompt if applicable
              let prompt = topic;
              if (agent.specialization) {
                prompt = `${topic} (Focus: ${agent.specialization})`;
              }

              // Execute research
              updateAgentStatus(agent.id, 'working', null, `Searching: ${prompt.slice(0, 30)}...`);

              const references = await researchTopic(prompt);

              updateAgentStatus(agent.id, 'finished', references);

              return references;
            },
            3000, // 3 second delay between agents
            onProgress
          )
        : await ParallelExecutor.executeParallel(
            researchers,
            async (agent) => {
              const references = await researchTopic(topic);
              updateAgentStatus(agent.id, 'finished', references);
              return references;
            },
            onProgress
          );

      // Conduct peer review if enabled
      if (researcherConfig.enablePeerReview && researchers.length > 1) {
        const criteria = `
Evaluate the quality of research results based on:
1. Relevance: How well the references match the research topic
2. Diversity: Variety of sources and perspectives
3. Quality: Academic rigor and credibility of sources
4. Completeness: Coverage of key aspects of the topic
        `;

        const reviews = await PeerReviewSystem.conductPeerReviews(
          researchers,
          criteria,
          `Research Topic: ${topic}`
        );

        // Generate evaluation results
        evaluationResults.value = PeerReviewSystem.generateEvaluationResults(researchers);

        console.log('Peer reviews completed:', reviews.length);
      }

      // Select best result based on vote method
      let winner: AgentInstance;

      switch (researcherConfig.voteMethod) {
        case 'best':
          winner = VotingSystem.selectByBest(researchers);
          break;
        case 'majority':
          winner = VotingSystem.selectByMajority(researchers);
          break;
        case 'weighted':
          winner = VotingSystem.selectByWeighted(researchers);
          break;
        case 'consensus':
          const consensusWinner = VotingSystem.selectByConsensus(researchers);
          winner = consensusWinner || VotingSystem.selectByBest(researchers);
          break;
        default:
          winner = VotingSystem.selectByBest(researchers);
      }

      return {
        references: winner.result,
        evaluations: evaluationResults.value,
        winner
      };

    } catch (error) {
      console.error('Multi-agent research failed:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Get summary of research execution
   */
  const getSummary = () => {
    const researchers = getAgentsByRole('RESEARCHER');
    const summary = VotingSystem.getEvaluationSummary(researchers);
    return summary;
  };

  return {
    // State
    isLoading,
    executionStatus,
    evaluationResults,
    agentInstances,

    // Methods
    executeMultiAgentResearch,
    getSummary,
    resetPool
  };
}
