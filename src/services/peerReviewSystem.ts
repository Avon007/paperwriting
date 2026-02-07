import { GoogleGenAI, Type } from '@google/genai';
import type { AgentInstance, PeerReview, EvaluationResult } from '../types';
import { getClient } from './geminiService';

/**
 * Peer Review System
 * Manages peer review process between agent instances
 */
export class PeerReviewSystem {
  /**
   * Conduct peer reviews among agents
   * Each agent reviews the work of other agents
   * @param agents - Array of agent instances to participate in review
   * @param criteria - Evaluation criteria description
   * @param context - Additional context for the review
   * @returns Array of peer reviews
   */
  static async conductPeerReviews(
    agents: AgentInstance[],
    criteria: string,
    context?: string
  ): Promise<PeerReview[]> {
    const reviews: PeerReview[] = [];

    // Each agent reviews other agents' results
    for (const reviewer of agents) {
      for (const target of agents) {
        // Skip self-review
        if (reviewer.id === target.id) continue;

        // Skip if target has no result
        if (!target.result) continue;

        // Update reviewer status
        reviewer.status = 'reviewing';

        try {
          const review = await this.generateReview(reviewer, target, criteria, context);
          reviews.push(review);

          // Record review
          reviewer.peerReviewsGiven.push(review);
          target.peerReviewsReceived.push(review);
        } catch (error) {
          console.error(`Review failed: ${reviewer.id} → ${target.id}`, error);
        } finally {
          reviewer.status = 'idle';
        }
      }
    }

    // Calculate average scores
    agents.forEach(agent => {
      if (agent.peerReviewsReceived.length > 0) {
        const totalScore = agent.peerReviewsReceived.reduce(
          (sum, review) => sum + review.overallScore,
          0
        );
        agent.score = totalScore / agent.peerReviewsReceived.length;
      }
    });

    return reviews;
  }

  /**
   * Generate a single peer review
   * @param reviewer - Agent conducting the review
   * @param target - Agent being reviewed
   * @param criteria - Evaluation criteria
   * @param context - Additional context
   * @returns Peer review object
   */
  private static async generateReview(
    reviewer: AgentInstance,
    target: AgentInstance,
    criteria: string,
    context?: string
  ): Promise<PeerReview> {
    const prompt = this.buildReviewPrompt(reviewer, target, criteria, context);

    const response = await getClient().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quality: { type: Type.NUMBER, minimum: 1, maximum: 10 },
            completeness: { type: Type.NUMBER, minimum: 1, maximum: 10 },
            creativity: { type: Type.NUMBER, minimum: 1, maximum: 10 },
            accuracy: { type: Type.NUMBER, minimum: 1, maximum: 10 },
            comments: { type: Type.STRING }
          },
          required: ['quality', 'completeness', 'creativity', 'accuracy', 'comments']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');

    // Calculate overall score (weighted average)
    const overallScore = (
      data.quality * 0.3 +
      data.completeness * 0.3 +
      data.creativity * 0.2 +
      data.accuracy * 0.2
    );

    return {
      id: `${reviewer.id}->${target.id}-${Date.now()}`,
      reviewerId: reviewer.id,
      targetId: target.id,
      scores: {
        quality: data.quality,
        completeness: data.completeness,
        creativity: data.creativity,
        accuracy: data.accuracy
      },
      overallScore,
      comments: data.comments,
      timestamp: Date.now()
    };
  }

  /**
   * Build the review prompt
   */
  private static buildReviewPrompt(
    reviewer: AgentInstance,
    target: AgentInstance,
    criteria: string,
    context?: string
  ): string {
    const specializationInfo = target.specialization
      ? `\nSpecialization: ${target.specialization}`
      : '';

    return `You are ${reviewer.id} (${reviewer.role}${reviewer.specialization ? ` - ${reviewer.specialization}` : ''}).

Your task is to review the work produced by ${target.id} (${target.role}${specializationInfo}).

EVALUATION CRITERIA:
${criteria}

${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}

WORK TO REVIEW:
${JSON.stringify(target.result, null, 2)}

Please provide an objective evaluation:

1. Quality (1-10): Overall quality and excellence of the work
2. Completeness (1-10): How thorough and complete the work is
3. Creativity (1-10): Originality, innovation, and creative approach
4. Accuracy (1-10): Factual correctness, precision, and reliability

Also provide constructive comments highlighting:
- Strengths (what was done well)
- Weaknesses (what could be improved)
- Specific suggestions for enhancement

Respond in JSON format:
{
  "quality": <number 1-10>,
  "completeness": <number 1-10>,
  "creativity": <number 1-10>,
  "accuracy": <number 1-10>,
  "comments": "<detailed feedback>"
}`;
  }

  /**
   * Calculate average score for an agent
   * @param agent - Agent instance
   * @returns Average score from all received reviews
   */
  static calculateAverageScore(agent: AgentInstance): number {
    if (agent.peerReviewsReceived.length === 0) return 0;

    const total = agent.peerReviewsReceived.reduce(
      (sum, review) => sum + review.overallScore,
      0
    );

    return total / agent.peerReviewsReceived.length;
  }

  /**
   * Get average score for a specific dimension
   * @param agent - Agent instance
   * @param dimension - Score dimension ('quality' | 'completeness' | 'creativity' | 'accuracy')
   * @returns Average score for the dimension
   */
  static getAverageDimensionScore(
    agent: AgentInstance,
    dimension: keyof PeerReview['scores']
  ): number {
    if (agent.peerReviewsReceived.length === 0) return 0;

    const total = agent.peerReviewsReceived.reduce(
      (sum, review) => sum + review.scores[dimension],
      0
    );

    return total / agent.peerReviewsReceived.length;
  }

  /**
   * Rank agents by their scores
   * @param agents - Array of agent instances
   * @returns Agents sorted by score (highest first)
   */
  static rankAgents(agents: AgentInstance[]): AgentInstance[] {
    return [...agents].sort((a, b) => b.score - a.score);
  }

  /**
   * Generate evaluation results with rankings
   * @param agents - Array of agent instances
   * @returns Array of evaluation results
   */
  static generateEvaluationResults(agents: AgentInstance[]): EvaluationResult[] {
    const ranked = this.rankAgents(agents);
    const maxScore = Math.max(...agents.map(a => a.score));

    return ranked.map((agent, index) => ({
      agentId: agent.id,
      result: agent.result,
      reviews: agent.peerReviewsReceived,
      averageScore: agent.score,
      rank: index + 1,
      isWinner: agent.score === maxScore
    }));
  }
}
