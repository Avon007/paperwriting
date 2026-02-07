# 多智能体并行执行与互评系统 - 实现计划

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档名称 | 多智能体并行执行与互评系统实现计划 |
| 版本 | v1.0.0 |
| 创建日期 | 2025-02-07 |
| 状态 | 初稿 |
| 作者 | Claude & Product Team |

---

## 1. 概述

### 1.1 目标

将现有的单智能体系统升级为**多智能体并行执行与互评系统**，每个角色类型（RESEARCHER、OUTLINER、PLANNER、WRITER、EDITOR）可以配置多个实例，同时执行任务并互相评估结果，最终通过投票机制选择最佳输出。

### 1.2 核心特性

✨ **并行执行**: 同类型的多个智能体同时工作，提高效率
🗳️ **互评机制**: 智能体之间互相评估和打分
⚖️ **投票决策**: 通过评分投票选择最佳结果
⚙️ **可配置**: 每个角色的智能体数量可动态配置
📊 **可视化**: 显示智能体群体协作和评估过程

### 1.3 应用场景

**场景 1: 多角度研究**
- 3个 RESEARCHER 同时搜索
- RESEARCHER-1: 搜索理论方法
- RESEARCHER-2: 搜索实验应用
- RESEARCHER-3: 搜索最新进展

**场景 2: 多方案大纲**
- 3个 OUTLINER 生成不同大纲
- OUTLINER-1: 传统结构（引言-方法-结果-讨论）
- OUTLINER-2: 问题导向结构
- OUTLINER-3: 创新混合结构

**场景 3: 多版本写作**
- 2个 WRITER 写同一章节
- WRITER-A: 侧重理论深度
- WRITER-B: 侧重实验验证
- EDITOR 互评后选择或融合

---

## 2. 系统架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    配置层 (Config Layer)                      │
│  AgentConfig: { researcher: 3, outliner: 2, ... }           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 智能体实例管理层 (Agent Pool)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ RESEARCHER  │  │  OUTLINER   │  │   PLANNER   │         │
│  │  Pool (3)   │  │  Pool (2)   │  │  Pool (2)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                并行执行层 (Parallel Execution)                │
│  Task Dispatcher → 3 RESEARCHER → 并行执行 → 收集结果       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  互评与投票层 (Evaluation)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Peer Review │  │   Scoring   │  │   Voting     │      │
│  │  (互相评审)   │  │  (打分)      │  │  (投票)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    结果融合层 (Fusion)                       │
│  Best Selection / Content Merge / Final Output             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 执行流程图

```
[用户触发任务]
      ↓
[读取配置] researcher: 3, outliner: 2, ...
      ↓
[创建智能体池]
  RESEARCHER-1, RESEARCHER-2, RESEARCHER-3
      ↓
[并行执行] ──→ RESEARCHER-1: 生成结果A
              RESEARCHER-2: 生成结果B
              RESEARCHER-3: 生成结果C
      ↓
[互相评估]
  RESEARCHER-1 → 评估 B, C
  RESEARCHER-2 → 评估 A, C
  RESEARCHER-3 → 评估 A, B
      ↓
[收集评分]
  Result A: [8, 7, -] = 7.5
  Result B: [9, -, 8] = 8.5
  Result C: [6, 8, 9] = 7.7
      ↓
[投票选择]
  Winner: Result B (8.5分)
      ↓
[输出最佳结果]
```

---

## 3. 数据模型设计

### 3.1 配置模型

```typescript
// 智能体配置
interface AgentConfig {
  researcher: {
    count: number;          // 智能体数量 (1-5)
    strategy: 'parallel' | 'sequential' | 'specialized';
    specializations?: string[];  // 专业化方向 (仅specialized模式)
    enablePeerReview: boolean;   // 是否启用互评
    voteMethod: 'majority' | 'weighted' | 'best';
  };
  outliner: {
    count: number;
    strategy: 'parallel' | 'diverse' | 'hierarchical';
    enablePeerReview: boolean;
    voteMethod: 'majority' | 'weighted' | 'best';
  };
  planner: {
    count: number;
    strategy: 'parallel' | 'collaborative';
    enablePeerReview: boolean;
    voteMethod: 'majority' | 'weighted' | 'best';
  };
  writer: {
    count: number;           // 每个章节的智能体数量
    strategy: 'parallel' | 'divide' | 'merge';
    enablePeerReview: boolean;
    voteMethod: 'majority' | 'weighted' | 'best';
  };
  editor: {
    count: number;
    strategy: 'sequential' | 'parallel';
    enablePeerReview: boolean;
    voteMethod: 'majority' | 'weighted' | 'consensus';
  };
}

// 默认配置
const DEFAULT_AGENT_CONFIG: AgentConfig = {
  researcher: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
  outliner: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
  planner: { count: 1, strategy: 'collaborative', enablePeerReview: false, voteMethod: 'best' },
  writer: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
  editor: { count: 1, strategy: 'sequential', enablePeerReview: false, voteMethod: 'best' }
};
```

### 3.2 智能体实例模型

```typescript
// 智能体实例
interface AgentInstance {
  id: string;                // 实例ID: "researcher-1"
  role: AgentRole;           // 角色类型
  index: number;             // 实例索引
  specialization?: string;   // 专业化方向
  status: 'idle' | 'working' | 'reviewing' | 'finished';
  currentTask?: string;      // 当前任务描述
  result?: any;              // 执行结果
  peerReviewsReceived: PeerReview[];  // 收到的评审
  peerReviewsGiven: PeerReview[];      // 给出的评审
  score: number;             // 综合得分
}

// 评审记录
interface PeerReview {
  id: string;
  reviewerId: string;        // 评审者ID
  targetId: string;          // 被评审者ID
  scores: {
    quality: number;         // 质量评分 (1-10)
    completeness: number;    // 完整性评分 (1-10)
    creativity: number;      // 创新性评分 (1-10)
    accuracy: number;        // 准确性评分 (1-10)
  };
  overallScore: number;      // 总体评分
  comments: string;          // 评审意见
  timestamp: number;
}

// 评估结果
interface EvaluationResult {
  agentId: string;
  result: any;
  reviews: PeerReview[];
  averageScore: number;
  rank: number;              // 排名
  isWinner: boolean;
}
```

### 3.3 任务执行模型

```typescript
// 并行任务
interface ParallelTask {
  id: string;
  role: AgentRole;
  phase: WorkflowStep;
  subtasks: SubTask[];       // 子任务列表
  config: AgentConfig[AgentRole];
}

// 子任务
interface SubTask {
  id: string;
  assignedTo: string;        // 分配给哪个实例
  input: any;                // 输入数据
  specialization?: string;   // 专业化要求
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  startedAt?: number;
  completedAt?: number;
}
```

---

## 4. 核心功能实现

### 4.1 智能体池管理

```typescript
// src/composables/useAgentPool.ts

export function useAgentPool() {
  const agentInstances = ref<AgentInstance[]>([]);
  const config = ref<AgentConfig>(DEFAULT_AGENT_CONFIG);

  /**
   * 根据配置初始化智能体池
   */
  const initializePool = () => {
    agentInstances.value = [];

    // 创建 RESEARCHER 实例
    for (let i = 0; i < config.value.researcher.count; i++) {
      agentInstances.value.push({
        id: `researcher-${i + 1}`,
        role: 'RESEARCHER',
        index: i,
        specialization: getSpecialization('researcher', i),
        status: 'idle',
        peerReviewsReceived: [],
        peerReviewsGiven: [],
        score: 0
      });
    }

    // 创建其他角色实例...
  };

  /**
   * 获取指定角色的所有实例
   */
  const getAgentsByRole = (role: AgentRole): AgentInstance[] => {
    return agentInstances.value.filter(agent => agent.role === role);
  };

  /**
   * 获取空闲的智能体实例
   */
  const getAvailableAgents = (role: AgentRole): AgentInstance[] => {
    return getAgentsByRole(role).filter(agent => agent.status === 'idle');
  };

  /**
   * 更新智能体状态
   */
  const updateAgentStatus = (
    agentId: string,
    status: AgentInstance['status'],
    result?: any
  ) => {
    const agent = agentInstances.value.find(a => a.id === agentId);
    if (agent) {
      agent.status = status;
      if (result) agent.result = result;
    }
  };

  /**
   * 获取专业化方向
   */
  const getSpecialization = (role: AgentRole, index: number): string | undefined => {
    const roleConfig = config.value[role.toLowerCase() as keyof AgentConfig];

    if (roleConfig?.strategy === 'specialized' && roleConfig.specializations) {
      return roleConfig.specializations[index % roleConfig.specializations.length];
    }

    return undefined;
  };

  return {
    agentInstances,
    config,
    initializePool,
    getAgentsByRole,
    getAvailableAgents,
    updateAgentStatus
  };
}
```

### 4.2 并行执行引擎

```typescript
// src/services/parallelExecutor.ts

export class ParallelExecutor {
  /**
   * 并行执行任务
   */
  static async executeParallel<T>(
    agents: AgentInstance[],
    taskFn: (agent: AgentInstance) => Promise<T>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    let completed = 0;

    const promises = agents.map(async (agent) => {
      try {
        // 更新状态为工作
        agent.status = 'working';

        // 执行任务
        const result = await taskFn(agent);

        // 保存结果
        results.set(agent.id, result);
        agent.result = result;
        agent.status = 'finished';

        // 更新进度
        completed++;
        onProgress?.(completed, agents.length);

        return result;
      } catch (error) {
        agent.status = 'idle';
        throw error;
      }
    });

    // 等待所有任务完成
    await Promise.all(promises);

    return results;
  }

  /**
   * 顺序执行任务（用于某些需要顺序的场景）
   */
  static async executeSequential<T>(
    agents: AgentInstance[],
    taskFn: (agent: AgentInstance, previousResults: T[]) => Promise<T>
  ): Promise<T[]> {
    const results: T[] = [];

    for (const agent of agents) {
      agent.status = 'working';
      const result = await taskFn(agent, results);
      results.push(result);
      agent.result = result;
      agent.status = 'finished';
    }

    return results;
  }
}
```

### 4.3 互评系统

```typescript
// src/services/peerReviewSystem.ts

export class PeerReviewSystem {
  /**
   * 执行同行评审
   */
  static async conductPeerReviews(
    agents: AgentInstance[],
    evaluationCriteria: string
  ): Promise<PeerReview[]> {
    const reviews: PeerReview[] = [];

    // 每个智能体评审其他智能体的结果
    for (const reviewer of agents) {
      for (const target of agents) {
        if (reviewer.id === target.id) continue; // 不评审自己

        const review = await this.generateReview(
          reviewer,
          target,
          evaluationCriteria
        );

        reviews.push(review);

        // 记录评审关系
        reviewer.peerReviewsGiven.push(review);
        target.peerReviewsReceived.push(review);
      }
    }

    return reviews;
  }

  /**
   * 生成单个评审
   */
  private static async generateReview(
    reviewer: AgentInstance,
    target: AgentInstance,
    criteria: string
  ): Promise<PeerReview> {
    // 调用 AI 生成评审
    const prompt = this.buildReviewPrompt(reviewer, target, criteria);

    const response = await callGeminiAPI(prompt);

    // 解析评审结果
    return this.parseReviewResponse(response, reviewer.id, target.id);
  }

  /**
   * 构建评审提示词
   */
  private static buildReviewPrompt(
    reviewer: AgentInstance,
    target: AgentInstance,
    criteria: string
  ): string {
    return `You are ${reviewer.id} (${reviewer.role}).

Your task is to review the work produced by ${target.id} (${target.role}).

CRITERIA:
${criteria}

WORK TO REVIEW:
${JSON.stringify(target.result, null, 2)}

Please provide:
1. Quality Score (1-10): Overall quality of the work
2. Completeness Score (1-10): How complete and thorough
3. Creativity Score (1-10): Originality and innovation
4. Accuracy Score (1-10): Factual correctness and accuracy
5. Overall Score (1-10): Weighted average
6. Comments: Detailed feedback (strengths and weaknesses)

Respond in JSON format:
{
  "quality": number,
  "completeness": number,
  "creativity": number,
  "accuracy": number,
  "overall": number,
  "comments": string
}`;
  }

  /**
   * 解析评审响应
   */
  private static parseReviewResponse(
    response: string,
    reviewerId: string,
    targetId: string
  ): PeerReview {
    const data = JSON.parse(response);

    return {
      id: `${reviewerId}->${targetId}-${Date.now()}`,
      reviewerId,
      targetId,
      scores: {
        quality: data.quality,
        completeness: data.completeness,
        creativity: data.creativity,
        accuracy: data.accuracy
      },
      overallScore: data.overall,
      comments: data.comments,
      timestamp: Date.now()
    };
  }

  /**
   * 计算平均得分
   */
  static calculateAverageScore(agent: AgentInstance): number {
    if (agent.peerReviewsReceived.length === 0) return 0;

    const total = agent.peerReviewsReceived.reduce(
      (sum, review) => sum + review.overallScore,
      0
    );

    return total / agent.peerReviewsReceived.length;
  }
}
```

### 4.4 投票决策系统

```typescript
// src/services/votingSystem.ts

export class VotingSystem {
  /**
   * 根据评分投票选择最佳结果
   */
  static selectByBest(agents: AgentInstance[]): AgentInstance {
    return agents.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }

  /**
   * 多数投票
   */
  static selectByMajority(agents: AgentInstance[]): AgentInstance {
    // 统计每个结果被投票的次数
    const votes = new Map<string, number>();

    agents.forEach(agent => {
      agent.peerReviewsReceived.forEach(review => {
        if (review.overallScore >= 7) {
          votes.set(agent.id, (votes.get(agent.id) || 0) + 1);
        }
      });
    });

    // 找出得票最多的
    let maxVotes = 0;
    let winner = agents[0];

    votes.forEach((count, agentId) => {
      if (count > maxVotes) {
        maxVotes = count;
        winner = agents.find(a => a.id === agentId) || winner;
      }
    });

    return winner;
  }

  /**
   * 加权投票
   */
  static selectByWeighted(
    agents: AgentInstance[],
    weights: {
      quality: number;
      completeness: number;
      creativity: number;
      accuracy: number;
    }
  ): AgentInstance {
    // 计算每个智能体的加权得分
    agents.forEach(agent => {
      let weightedSum = 0;

      agent.peerReviewsReceived.forEach(review => {
        weightedSum +=
          review.scores.quality * weights.quality +
          review.scores.completeness * weights.completeness +
          review.scores.creativity * weights.creativity +
          review.scores.accuracy * weights.accuracy;
      });

      agent.score = weightedSum / agent.peerReviewsReceived.length;
    });

    return this.selectByBest(agents);
  }

  /**
   * 融合多个结果
   */
  static async mergeResults(
    agents: AgentInstance[],
    mergeStrategy: 'concat' | 'average' | 'best-of' | 'ai-merge'
  ): Promise<any> {
    switch (mergeStrategy) {
      case 'concat':
        return this.concatResults(agents);
      case 'average':
        return this.averageResults(agents);
      case 'best-of':
        return this.selectByBest(agents).result;
      case 'ai-merge':
        return this.aiMerge(agents);
      default:
        return this.selectByBest(agents).result;
    }
  }

  /**
   * AI 融合结果
   */
  private static async aiMerge(agents: AgentInstance[]): Promise<any> {
    const allResults = agents.map(a => a.result);

    const prompt = `You are an expert editor. Merge the following ${agents.length} different versions into a single best version:

${allResults.map((r, i) => `VERSION ${i + 1}:\n${JSON.stringify(r, null, 2)}`).join('\n\n---\n\n')}

Create the best merged version that combines the strengths of all versions. Respond in JSON format.`;

    const response = await callGeminiAPI(prompt);
    return JSON.parse(response);
  }
}
```

### 4.5 配置管理

```typescript
// src/composables/useAgentConfig.ts

export function useAgentConfig() {
  const config = ref<AgentConfig>(DEFAULT_AGENT_CONFIG);

  /**
   * 更新配置
   */
  const updateConfig = (role: keyof AgentConfig, updates: Partial<AgentConfig[AgentRole]>) => {
    config.value[role] = { ...config.value[role], ...updates };
  };

  /**
   * 保存配置到 localStorage
   */
  const saveConfig = () => {
    localStorage.setItem('agent-config', JSON.stringify(config.value));
  };

  /**
   * 从 localStorage 加载配置
   */
  const loadConfig = () => {
    const saved = localStorage.getItem('agent-config');
    if (saved) {
      config.value = JSON.parse(saved);
    }
  };

  /**
   * 重置为默认配置
   */
  const resetConfig = () => {
    config.value = JSON.parse(JSON.stringify(DEFAULT_AGENT_CONFIG));
  };

  /**
   * 获取预设配置模板
   */
  const getPresetConfigs = (): Record<string, AgentConfig> => {
    return {
      'basic': {
        researcher: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
        outliner: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
        planner: { count: 1, strategy: 'collaborative', enablePeerReview: false, voteMethod: 'best' },
        writer: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
        editor: { count: 1, strategy: 'sequential', enablePeerReview: false, voteMethod: 'best' }
      },
      'collaborative': {
        researcher: { count: 3, strategy: 'specialized', specializations: ['理论方法', '实验应用', '最新进展'], enablePeerReview: true, voteMethod: 'weighted' },
        outliner: { count: 3, strategy: 'diverse', enablePeerReview: true, voteMethod: 'weighted' },
        planner: { count: 2, strategy: 'collaborative', enablePeerReview: true, voteMethod: 'majority' },
        writer: { count: 2, strategy: 'merge', enablePeerReview: true, voteMethod: 'weighted' },
        editor: { count: 2, strategy: 'parallel', enablePeerReview: true, voteMethod: 'consensus' }
      },
      'power': {
        researcher: { count: 5, strategy: 'specialized', specializations: ['理论', '方法', '实验', '应用', '综述'], enablePeerReview: true, voteMethod: 'weighted' },
        outliner: { count: 5, strategy: 'diverse', enablePeerReview: true, voteMethod: 'weighted' },
        planner: { count: 3, strategy: 'collaborative', enablePeerReview: true, voteMethod: 'majority' },
        writer: { count: 3, strategy: 'merge', enablePeerReview: true, voteMethod: 'weighted' },
        editor: { count: 3, strategy: 'parallel', enablePeerReview: true, voteMethod: 'consensus' }
      }
    };
  };

  return {
    config,
    updateConfig,
    saveConfig,
    loadConfig,
    resetConfig,
    getPresetConfigs
  };
}
```

---

## 5. UI/UX 设计

### 5.1 配置面板

```vue
<!-- src/components/AgentConfigPanel.vue -->
<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
      <Settings :size="20" class="text-blue-400" />
      智能体配置
    </h3>

    <!-- 预设选择 -->
    <div class="mb-4">
      <label class="text-sm text-zinc-400 mb-2 block">预设配置</label>
      <select v-model="selectedPreset" @change="applyPreset" class="w-full bg-zinc-800 border border-zinc-700 rounded p-2">
        <option value="basic">基础模式 (单智能体)</option>
        <option value="collaborative">协作模式 (3智能体)</option>
        <option value="power">强力模式 (5智能体)</option>
        <option value="custom">自定义</option>
      </select>
    </div>

    <!-- 每个角色的配置 -->
    <div class="space-y-4">
      <!-- RESEARCHER 配置 -->
      <div class="bg-zinc-800/50 rounded p-3">
        <div class="flex items-center gap-2 mb-2">
          <Search :size="16" class="text-purple-400" />
          <span class="font-medium">RESEARCHER (研究助理)</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <label class="text-zinc-400">数量</label>
            <input type="number" v-model.number="config.researcher.count" min="1" max="5" class="w-full bg-zinc-700 rounded p-1" />
          </div>
          <div>
            <label class="text-zinc-400">策略</label>
            <select v-model="config.researcher.strategy" class="w-full bg-zinc-700 rounded p-1">
              <option value="parallel">并行</option>
              <option value="specialized">专业化</option>
            </select>
          </div>
          <div>
            <label class="text-zinc-400">互评</label>
            <input type="checkbox" v-model="config.researcher.enablePeerReview" class="ml-2" />
          </div>
          <div>
            <label class="text-zinc-400">投票方式</label>
            <select v-model="config.researcher.voteMethod" class="w-full bg-zinc-700 rounded p-1">
              <option value="best">最佳</option>
              <option value="weighted">加权</option>
              <option value="majority">多数</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 其他角色配置... -->
    </div>

    <!-- 保存按钮 -->
    <button @click="saveConfig" class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white rounded p-2">
      保存配置
    </button>
  </div>
</template>
```

### 5.2 智能体池可视化

```vue
<!-- src/components/AgentPoolVisualizer.vue -->
<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <h3 class="text-lg font-semibold mb-4">智能体池</h3>

    <!-- 按角色分组显示 -->
    <div class="space-y-4">
      <div v-for="role in agentRoles" :key="role">
        <div class="flex items-center gap-2 mb-2">
          <component :is="getIcon(role)" :size="18" :class="getColor(role)" />
          <span class="font-medium">{{ role }}</span>
          <span class="text-zinc-500 text-sm">({{ getAgentsByRole(role).length }} 个实例)</span>
        </div>

        <!-- 实例卡片网格 -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div
            v-for="agent in getAgentsByRole(role)"
            :key="agent.id"
            class="bg-zinc-800 rounded p-3 border"
            :class="{
              'border-green-500': agent.status === 'finished',
              'border-blue-500': agent.status === 'working',
              'border-yellow-500': agent.status === 'reviewing',
              'border-zinc-700': agent.status === 'idle'
            }"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium">{{ agent.id }}</span>
              <span class="text-xs" :class="getStatusColor(agent.status)">
                {{ agent.status }}
              </span>
            </div>

            <!-- 专业化方向 -->
            <div v-if="agent.specialization" class="text-xs text-zinc-400 mb-1">
              {{ agent.specialization }}
            </div>

            <!-- 得分 -->
            <div v-if="agent.score > 0" class="text-sm">
              <span class="text-zinc-400">评分:</span>
              <span class="font-bold text-green-400">{{ agent.score.toFixed(1) }}</span>
            </div>

            <!-- 评审统计 -->
            <div v-if="agent.peerReviewsReceived.length > 0" class="text-xs text-zinc-500">
              {{ agent.peerReviewsReceived.length }} 条评审
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 5.3 评审结果可视化

```vue
<!-- src/components/PeerReviewResults.vue -->
<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <h3 class="text-lg font-semibold mb-4">评审结果</h3>

    <!-- 评分排名 -->
    <div class="space-y-2">
      <div
        v-for="(result, index) in rankedResults"
        :key="result.agentId"
        class="bg-zinc-800 rounded p-3 flex items-center gap-3"
        :class="{
          'ring-2 ring-yellow-500': result.isWinner,
          'opacity-50': !result.isWinner && index > 2
        }"
      >
        <!-- 排名 -->
        <div class="text-2xl font-bold w-10 h-10 flex items-center justify-center rounded"
          :class="{
            'bg-yellow-500 text-black': index === 0,
            'bg-zinc-600 text-white': index === 1,
            'bg-amber-700 text-white': index === 2,
            'bg-zinc-700 text-zinc-400': index > 2
          }"
        >
          {{ index + 1 }}
        </div>

        <!-- 智能体信息 -->
        <div class="flex-1">
          <div class="font-medium">{{ result.agentId }}</div>
          <div class="text-sm text-zinc-400">平均分: {{ result.averageScore.toFixed(2) }}</div>
        </div>

        <!-- 详细评分 -->
        <div class="text-right text-sm">
          <div>质量: {{ getAverageScore(result, 'quality').toFixed(1) }}</div>
          <div>完整性: {{ getAverageScore(result, 'completeness').toFixed(1) }}</div>
          <div>创新性: {{ getAverageScore(result, 'creativity').toFixed(1) }}</div>
          <div>准确性: {{ getAverageScore(result, 'accuracy').toFixed(1) }}</div>
        </div>
      </div>
    </div>

    <!-- 评审详情 -->
    <details class="mt-4">
      <summary class="cursor-pointer text-sm text-zinc-400 hover:text-white">
        查看详细评审意见
      </summary>
      <div class="mt-2 space-y-2">
        <div
          v-for="review in allReviews"
          :key="review.id"
          class="bg-zinc-800 rounded p-3 text-sm"
        >
          <div class="flex items-center gap-2 mb-2">
            <span class="font-medium">{{ review.reviewerId }}</span>
            <span class="text-zinc-500">→</span>
            <span class="font-medium">{{ review.targetId }}</span>
            <span class="ml-auto font-bold text-yellow-400">{{ review.overallScore }}/10</span>
          </div>
          <p class="text-zinc-300">{{ review.comments }}</p>
        </div>
      </div>
    </details>
  </div>
</template>
```

---

## 6. 实现步骤

### Phase 1: 基础架构 (Week 1-2)

**目标**: 建立多智能体实例管理基础

**任务**:
- [ ] 创建 `useAgentPool` composable
- [ ] 实现 `AgentInstance` 数据模型
- [ ] 创建 `AgentConfig` 配置系统
- [ ] 实现智能体池初始化逻辑
- [ ] 创建基础 UI: AgentConfigPanel

**验收标准**:
- 可以为每个角色配置 1-5 个智能体
- 智能体池正确初始化并显示在界面上
- 配置可保存和加载

---

### Phase 2: 并行执行引擎 (Week 2-3)

**目标**: 实现多智能体并行执行

**任务**:
- [ ] 创建 `ParallelExecutor` 服务
- [ ] 实现 `executeParallel` 方法
- [ ] 实现 `executeSequential` 方法
- [ ] 更新 `geminiService` 支持实例化调用
- [ ] 实现进度回调机制

**验收标准**:
- 多个 RESEARCHER 可并行执行
- 结果正确收集并关联到实例
- UI 显示实时进度

---

### Phase 3: 互评系统 (Week 3-4)

**目标**: 实现智能体互相评审

**任务**:
- [ ] 创建 `PeerReviewSystem` 服务
- [ ] 实现评审 Prompt 生成
- [ ] 实现评审响应解析
- [ ] 创建评审数据模型
- [ ] 实现 `conductPeerReviews` 方法
- [ ] 创建 UI: PeerReviewResults

**验收标准**:
- 智能体可以互相评审
- 评审包含 4 个维度评分
- 评审结果正确显示和排名

---

### Phase 4: 投票决策系统 (Week 4-5)

**目标**: 实现多种投票策略

**任务**:
- [ ] 创建 `VotingSystem` 服务
- [ ] 实现 `selectByBest` 策略
- [ ] 实现 `selectByMajority` 策略
- [ ] 实现 `selectByWeighted` 策略
- [ ] 实现结果融合逻辑
- [ ] 集成到工作流中

**验收标准**:
- 可选择不同投票策略
- 正确选出最佳结果
- 支持结果融合

---

### Phase 5: UI 完善与集成 (Week 5-6)

**目标**: 完善用户体验并集成到主流程

**任务**:
- [ ] 创建 `AgentPoolVisualizer` 组件
- [ ] 优化配置面板交互
- [ ] 添加评审结果可视化
- [ ] 集成到主工作流
- [ ] 添加配置预设模板
- [ ] 实现配置持久化

**验收标准**:
- UI 直观易用
- 配置可预设和保存
- 与现有工作流无缝集成

---

### Phase 6: 测试与优化 (Week 6-7)

**目标**: 全面测试和性能优化

**任务**:
- [ ] 单元测试: ParallelExecutor
- [ ] 单元测试: PeerReviewSystem
- [ ] 单元测试: VotingSystem
- [ ] 集成测试: 完整工作流
- [ ] 性能优化: API 调用批处理
- [ ] 性能优化: 速率限制处理
- [ ] 错误处理完善
- [ ] 用户文档编写

**验收标准**:
- 所有测试通过
- API 调用高效且不触发限流
- 错误处理完善
- 文档完整

---

## 7. 技术挑战与解决方案

### 7.1 API 限流问题

**挑战**: 多个智能体并行调用会快速消耗 API 配额

**解决方案**:
1. **队列管理**: 实现请求队列，控制并发数
2. **速率限制器**: 令牌桶算法，限制每秒请求数
3. **智能调度**: 错峰执行，避免同时请求
4. **缓存机制**: 缓存相似请求的结果
5. **批处理**: 合并多个小请求

```typescript
// src/utils/rateLimiter.ts

export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 如果达到并发上限，加入队列等待
    if (this.running >= this.maxConcurrent) {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            resolve(await fn());
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    this.running++;
    try {
      const result = await fn();
      return result;
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
```

### 7.2 结果一致性

**挑战**: 多个智能体生成的结果格式可能不一致

**解决方案**:
1. **严格 Schema**: 使用 JSON Schema 约束输出格式
2. **后处理验证**: 验证并修正结果格式
3. **标准化模板**: 提供标准输出模板
4. **互校验机制**: 智能体互相验证格式正确性

### 7.3 评分主观性

**挑战**: AI 评分可能存在主观偏差

**解决方案**:
1. **匿名评审**: 隐藏被评审者身份
2. **多维评分**: 质量、完整性、创新性、准确性 4 个维度
3. **加权平均**: 不同维度设置不同权重
4. **异常值检测**: 过滤过高或过低的评分
5. **共识机制**: 多轮评审直至达成共识

### 7.4 计算成本

**挑战**: 多智能体 + 互评会显著增加 API 调用次数

**解决方案**:
1. **渐进式启用**: 从基础模式开始，按需升级
2. **智能缓存**: 缓存相似任务的评审结果
3. **采样评审**: 随机抽取部分智能体进行互评
4. **用户配置**: 允许用户控制互评开启/关闭

---

## 8. 性能指标

### 8.1 执行效率

| 模式 | 智能体数 | API 调用数 | 预计时间 |
|------|---------|-----------|---------|
| 基础模式 | 1×5=5 | ~10 | 2-3 分钟 |
| 协作模式 | 3×5=15 | ~50 (含互评) | 5-8 分钟 |
| 强力模式 | 5×5=25 | ~150 (含互评) | 10-15 分钟 |

### 8.2 成本估算

假设 Gemini API 价格:
- Flash: $0.075/1M tokens (输入) + $0.30/1M tokens (输出)
- 平均每次调用: 2000 tokens 输入 + 1000 tokens 输出

**基础模式** (10次调用):
- 成本: 10 × (2000×0.075 + 1000×0.30) / 1M = ~$0.0045

**协作模式** (50次调用):
- 成本: 50 × ... = ~$0.0225

**强力模式** (150次调用):
- 成本: 150 × ... = ~$0.0675

---

## 9. 用户体验优化

### 9.1 进度可视化

```vue
<!-- 实时显示并行执行进度 -->
<template>
  <div class="progress-indicator">
    <div class="flex items-center gap-2 mb-2">
      <Loader :size="16" class="animate-spin" />
      <span>{{ completedCount }}/{{ totalCount }} 智能体已完成</span>
    </div>

    <!-- 进度条 -->
    <div class="w-full bg-zinc-800 rounded-full h-2">
      <div
        class="bg-blue-500 h-2 rounded-full transition-all"
        :style="{ width: `${(completedCount / totalCount) * 100}%` }"
      />
    </div>

    <!-- 实时状态列表 -->
    <div class="mt-3 space-y-1 text-sm">
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="flex items-center gap-2"
      >
        <span :class="getStatusDot(agent.status)" />
        <span class="flex-1">{{ agent.id }}</span>
        <span class="text-zinc-500">{{ agent.status }}</span>
      </div>
    </div>
  </div>
</template>
```

### 9.2 配置预设

为不同用户群体提供预设配置:

**🟢 快速模式** (适合快速原型)
- 所有角色: 1 个智能体
- 互评: 关闭
- 预计时间: 2-3 分钟

**🟡 标准模式** (适合日常使用)
- 研究和大纲: 2 个智能体
- 写作和编辑: 1 个智能体
- 互评: 开启
- 预计时间: 5-8 分钟

**🔴 专业模式** (适合重要论文)
- 所有角色: 3 个智能体
- 互评: 开启
- 预计时间: 10-15 分钟

### 9.3 成本提示

在配置面板实时显示预计成本和时间:

```vue
<template>
  <div class="cost-estimator bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
    <div class="flex items-center gap-2 mb-2">
      <DollarSign :size="16" class="text-yellow-500" />
      <span class="font-medium">成本预估</span>
    </div>
    <div class="text-sm space-y-1">
      <div class="flex justify-between">
        <span class="text-zinc-400">预计 API 调用:</span>
        <span>{{ estimatedCalls }} 次</span>
      </div>
      <div class="flex justify-between">
        <span class="text-zinc-400">预计成本:</span>
        <span class="text-green-400">${{ estimatedCost }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-zinc-400">预计时间:</span>
        <span>{{ estimatedTime }}</span>
      </div>
    </div>
  </div>
</template>
```

---

## 10. 测试计划

### 10.1 单元测试

```typescript
// tests/parallelExecutor.test.ts

describe('ParallelExecutor', () => {
  it('should execute tasks in parallel', async () => {
    const agents = [
      { id: 'agent-1', status: 'idle' },
      { id: 'agent-2', status: 'idle' }
    ];

    const results = await ParallelExecutor.executeParallel(
      agents,
      async (agent) => ({ agentId: agent.id, data: 'result' })
    );

    expect(results.size).toBe(2);
    expect(results.get('agent-1')).toEqual({ agentId: 'agent-1', data: 'result' });
  });

  it('should handle errors gracefully', async () => {
    // 测试错误处理
  });
});
```

### 10.2 集成测试

```typescript
// tests/multiAgentWorkflow.test.ts

describe('Multi-Agent Workflow', () => {
  it('should execute full workflow with multiple agents', async () => {
    const config = {
      researcher: { count: 3, strategy: 'parallel', enablePeerReview: true, voteMethod: 'weighted' },
      // ...其他配置
    };

    const result = await runMultiAgentWorkflow('Test Topic', config);

    expect(result.finalPaper).toBeDefined();
    expect(result.agentDiscussions.length).toBeGreaterThan(0);
  });
});
```

---

## 11. 未来扩展

### 11.1 自适应配置

- 根据任务复杂度自动调整智能体数量
- 基于历史表现动态优化配置
- A/B 测试不同配置的效果

### 11.2 智能体市场

- 用户可以创建和分享自定义智能体
- 智能体性能评级系统
- 社区贡献的专业化智能体

### 11.3 实时协作

- 多用户同时使用
- 智能体分配策略优化
- 分布式执行

---

## 12. 附录

### 12.1 配置示例

```json
{
  "researcher": {
    "count": 3,
    "strategy": "specialized",
    "specializations": ["理论方法", "实验应用", "最新进展"],
    "enablePeerReview": true,
    "voteMethod": "weighted"
  },
  "outliner": {
    "count": 2,
    "strategy": "diverse",
    "enablePeerReview": true,
    "voteMethod": "majority"
  },
  "planner": {
    "count": 1,
    "strategy": "collaborative",
    "enablePeerReview": false,
    "voteMethod": "best"
  },
  "writer": {
    "count": 2,
    "strategy": "merge",
    "enablePeerReview": true,
    "voteMethod": "weighted"
  },
  "editor": {
    "count": 1,
    "strategy": "sequential",
    "enablePeerReview": false,
    "voteMethod": "best"
  }
}
```

### 12.2 API 接口设计

```typescript
interface MultiAgentAPI {
  // 初始化智能体池
  initializePool(config: AgentConfig): Promise<void>;

  // 并行执行任务
  executeParallel(
    role: AgentRole,
    task: string,
    input: any
  ): Promise<Map<string, any>>;

  // 执行互评
  conductPeerReviews(
    role: AgentRole,
    results: Map<string, any>
  ): Promise<PeerReview[]>;

  // 投票选择
  vote(
    role: AgentRole,
    method: 'best' | 'majority' | 'weighted'
  ): Promise<EvaluationResult>;

  // 获取执行状态
  getStatus(): Promise<ExecutionStatus>;
}
```

---

**文档结束**

> 本实现计划详细描述了多智能体并行执行与互评系统的完整技术方案。
> 预计开发周期: 6-7 周
> 预计工作量: 200-250 小时
