import type { AgentInstance, ExecutionStatus } from '../types';

/**
 * Parallel Execution Engine
 * Manages parallel execution of multiple agent instances
 */
export class ParallelExecutor {
  /**
   * Execute tasks in parallel across multiple agents
   * @param agents - Array of agent instances
   * @param taskFn - Function to execute for each agent
   * @param onProgress - Callback for progress updates
   * @returns Map of agent IDs to their results
   */
  static async executeParallel<T>(
    agents: AgentInstance[],
    taskFn: (agent: AgentInstance) => Promise<T>,
    onProgress?: (status: ExecutionStatus) => void
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    let completed = 0;
    const total = agents.length;

    // Create progress callback
    const reportProgress = () => {
      if (onProgress) {
        onProgress({
          total,
          completed,
          failed: 0,
          inProgress: total - completed,
          agents: agents.map(agent => ({
            id: agent.id,
            status: agent.status,
            progress: agent.status === 'finished' ? 100 : agent.status === 'working' ? 50 : 0
          }))
        });
      }
    };

    // Create all promises
    const promises = agents.map(async (agent) => {
      try {
        // Update status to working
        agent.status = 'working';
        reportProgress();

        // Execute the task
        const result = await taskFn(agent);

        // Save result
        results.set(agent.id, result);
        agent.result = result;
        agent.status = 'finished';

        // Update progress
        completed++;
        reportProgress();

        return result;
      } catch (error) {
        // Handle error
        agent.status = 'idle';
        console.error(`Error in ${agent.id}:`, error);
        throw error;
      }
    });

    // Wait for all tasks to complete
    await Promise.all(promises);

    reportProgress();

    return results;
  }

  /**
   * Execute tasks sequentially (one after another)
   * @param agents - Array of agent instances
   * @param taskFn - Function to execute for each agent (receives previous results)
   * @param onProgress - Callback for progress updates
   * @returns Array of results in execution order
   */
  static async executeSequential<T>(
    agents: AgentInstance[],
    taskFn: (agent: AgentInstance, previousResults: T[]) => Promise<T>,
    onProgress?: (status: ExecutionStatus) => void
  ): Promise<T[]> {
    const results: T[] = [];
    const total = agents.length;

    const reportProgress = () => {
      if (onProgress) {
        onProgress({
          total,
          completed: results.length,
          failed: 0,
          inProgress: total - results.length,
          agents: agents.map(agent => ({
            id: agent.id,
            status: agent.status,
            progress: agent.status === 'finished' ? 100 : agent.status === 'working' ? 50 : 0
          }))
        });
      }
    };

    for (const agent of agents) {
      agent.status = 'working';
      reportProgress();

      try {
        const result = await taskFn(agent, results);
        results.push(result);
        agent.result = result;
        agent.status = 'finished';
        reportProgress();
      } catch (error) {
        agent.status = 'idle';
        console.error(`Error in ${agent.id}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Execute with rate limiting to avoid API quota issues
   * @param agents - Array of agent instances
   * @param taskFn - Function to execute for each agent
   * @param delayMs - Delay between each execution (default: 3000ms)
   * @param onProgress - Callback for progress updates
   * @returns Map of agent IDs to their results
   */
  static async executeWithRateLimit<T>(
    agents: AgentInstance[],
    taskFn: (agent: AgentInstance) => Promise<T>,
    delayMs: number = 3000,
    onProgress?: (status: ExecutionStatus) => void
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    let completed = 0;
    const total = agents.length;

    const reportProgress = () => {
      if (onProgress) {
        onProgress({
          total,
          completed,
          failed: 0,
          inProgress: total - completed,
          agents: agents.map(agent => ({
            id: agent.id,
            status: agent.status,
            progress: agent.status === 'finished' ? 100 : agent.status === 'working' ? 50 : 0
          }))
        });
      }
    };

    // Execute sequentially with delay
    for (const agent of agents) {
      agent.status = 'working';
      reportProgress();

      try {
        const result = await taskFn(agent);
        results.set(agent.id, result);
        agent.result = result;
        agent.status = 'finished';
        completed++;
        reportProgress();

        // Delay before next execution (except for last)
        if (completed < total) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        agent.status = 'idle';
        console.error(`Error in ${agent.id}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Execute with specialized tasks
   * Each agent gets a specialized version of the task based on their specialization
   * @param agents - Array of agent instances
   * @param taskFn - Function that takes agent and returns specialized task
   * @param onProgress - Callback for progress updates
   * @returns Map of agent IDs to their results
   */
  static async executeSpecialized<T>(
    agents: AgentInstance[],
    taskFn: (agent: AgentInstance) => Promise<T>,
    onProgress?: (status: ExecutionStatus) => void
  ): Promise<Map<string, T>> {
    return this.executeParallel(agents, taskFn, onProgress);
  }
}
