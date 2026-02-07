import { GoogleGenAI, Type } from '@google/genai';
import type { AgentInstance, AgentRole, EvaluationResult } from '../types';
import { getClient } from './geminiService';

/**
 * Voting and Decision System
 * Implements various voting strategies to select best results
 */
export class VotingSystem {
  /**
   * Select best result by highest score
   * @param agents - Array of agent instances
   * @returns The winning agent instance
   */
  static selectByBest(agents: AgentInstance[]): AgentInstance {
    if (agents.length === 0) {
      throw new Error('No agents to select from');
    }

    return agents.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }

  /**
   * Select by majority vote
   * Agents vote for each other's work
   * @param agents - Array of agent instances
   * @param threshold - Minimum score to be considered a positive vote (default: 7)
   * @returns The winning agent instance
   */
  static selectByMajority(agents: AgentInstance[], threshold: number = 7): AgentInstance {
    if (agents.length === 0) {
      throw new Error('No agents to select from');
    }

    // Count votes for each agent
    const votes = new Map<string, number>();

    agents.forEach(agent => {
      agent.peerReviewsReceived.forEach(review => {
        if (review.overallScore >= threshold) {
          votes.set(agent.id, (votes.get(agent.id) || 0) + 1);
        }
      });
    });

    // Find agent with most votes
    let maxVotes = 0;
    let winner = agents[0];

    agents.forEach(agent => {
      const voteCount = votes.get(agent.id) || 0;
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        winner = agent;
      }
    });

    return winner;
  }

  /**
   * Select by weighted scoring
   * Different dimensions have different weights
   * @param agents - Array of agent instances
   * @param weights - Weight configuration for each dimension
   * @returns The winning agent instance
   */
  static selectByWeighted(
    agents: AgentInstance[],
    weights: {
      quality: number;
      completeness: number;
      creativity: number;
      accuracy: number;
    } = { quality: 0.3, completeness: 0.3, creativity: 0.2, accuracy: 0.2 }
  ): AgentInstance {
    if (agents.length === 0) {
      throw new Error('No agents to select from');
    }

    // Calculate weighted scores
    const weightedScores = new Map<string, number>();

    agents.forEach(agent => {
      let weightedSum = 0;

      agent.peerReviewsReceived.forEach(review => {
        weightedSum +=
          review.scores.quality * weights.quality +
          review.scores.completeness * weights.completeness +
          review.scores.creativity * weights.creativity +
          review.scores.accuracy * weights.accuracy;
      });

      const avgWeighted = agent.peerReviewsReceived.length > 0
        ? weightedSum / agent.peerReviewsReceived.length
        : 0;

      weightedScores.set(agent.id, avgWeighted);
      agent.score = avgWeighted;
    });

    // Return agent with highest weighted score
    return this.selectByBest(agents);
  }

  /**
   * Select by consensus (all agents must agree)
   * Useful for critical decisions
   * @param agents - Array of agent instances
   * @param threshold - Minimum average score to reach consensus (default: 8)
   * @returns The winning agent instance or null if no consensus
   */
  static selectByConsensus(agents: AgentInstance[], threshold: number = 8): AgentInstance | null {
    if (agents.length === 0) {
      throw new Error('No agents to select from');
    }

    // Check if any agent meets the consensus threshold
    const consensusAgents = agents.filter(agent => agent.score >= threshold);

    if (consensusAgents.length === 0) {
      return null; // No consensus reached
    }

    // Return the highest scoring among consensus agents
    return this.selectByBest(consensusAgents);
  }

  /**
   * Merge multiple results intelligently
   * @param agents - Array of agent instances with results
   * @param mergeStrategy - How to merge results
   * @returns Merged result
   */
  static async mergeResults(
    agents: AgentInstance[],
    mergeStrategy: 'concat' | 'average' | 'best-of' | 'ai-merge' = 'best-of'
  ): Promise<any> {
    if (agents.length === 0) {
      throw new Error('No agents to merge results from');
    }

    switch (mergeStrategy) {
      case 'concat':
        return this.concatResults(agents);

      case 'average':
        return this.averageResults(agents);

      case 'best-of':
        return this.selectByBest(agents).result;

      case 'ai-merge':
        return await this.aiMerge(agents);

      default:
        return this.selectByBest(agents).result;
    }
  }

  /**
   * Concatenate all results
   */
  private static concatResults(agents: AgentInstance[]): any {
    // Assumes results are arrays
    const allResults = agents
      .map(agent => agent.result)
      .filter(result => result !== undefined);

    if (Array.isArray(allResults[0])) {
      return allResults.flat();
    }

    return allResults;
  }

  /**
   * Average results (for numeric data)
   */
  private static averageResults(agents: AgentInstance[]): any {
    const allResults = agents
      .map(agent => agent.result)
      .filter(result => result !== undefined);

    // If results are arrays, average element-wise
    if (Array.isArray(allResults[0]) && typeof allResults[0][0] === 'number') {
      const maxLength = Math.max(...allResults.map(arr => arr.length));
      const averaged = [];

      for (let i = 0; i < maxLength; i++) {
        const values = allResults
          .map(arr => arr[i])
          .filter(val => val !== undefined)
          .map(val => Number(val));

        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        averaged.push(avg);
      }

      return averaged;
    }

    return allResults[0];
  }

  /**
   * Use AI to intelligently merge results
   */
  private static async aiMerge(agents: AgentInstance[]): Promise<any> {
    const allResults = agents
      .map(agent => agent.result)
      .filter(result => result !== undefined);

    const prompt = `You are an expert editor. Your task is to merge and synthesize ${agents.length} different versions into a single best version that combines the strengths of all versions.

VERSIONS TO MERGE:
${allResults.map((result, index) => `VERSION ${index + 1}:\n${JSON.stringify(result, null, 2)}`).join('\n\n---\n\n')}

INSTRUCTIONS:
1. Analyze each version carefully
2. Identify the strengths and weaknesses of each
3. Create a merged version that:
   - Combines the best elements from all versions
   - Maintains consistency and coherence
   - Improves upon the individual versions
   - Is better than any single version

Respond with the merged result in the same format as the input versions.`;

    const response = await getClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    // Try to parse as JSON, otherwise return as text
    try {
      return JSON.parse(response.text || '{}');
    } catch {
      return response.text;
    }
  }

  /**
   * Get top N results
   * @param agents - Array of agent instances
   * @param n - Number of top results to return
   * @returns Top N agents
   */
  static getTopN(agents: AgentInstance[], n: number): AgentInstance[] {
    const ranked = [...agents].sort((a, b) => b.score - a.score);
    return ranked.slice(0, Math.min(n, agents.length));
  }

  /**
   * Get evaluation summary
   * @param agents - Array of agent instances
   * @returns Summary text
   */
  static getEvaluationSummary(agents: AgentInstance[]): string {
    const lines: string[] = [];

    lines.push(`=== Evaluation Summary ===`);
    lines.push(`Total agents: ${agents.length}`);
    lines.push('');

    agents.forEach((agent, index) => {
      lines.push(`${index + 1}. ${agent.id}`);
      lines.push(`   Score: ${agent.score.toFixed(2)}`);
      lines.push(`   Reviews: ${agent.peerReviewsReceived.length}`);
      if (agent.specialization) {
        lines.push(`   Specialization: ${agent.specialization}`);
      }
      lines.push('');
    });

    // Winner
    const winner = this.selectByBest(agents);
    lines.push(`🏆 Winner: ${winner.id} (${winner.score.toFixed(2)})`);

    return lines.join('\n');
  }
}
