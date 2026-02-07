import type { AgentConfig } from '../types';

/**
 * Default agent configuration
 * Start with 3 RESEARCHER agents for testing multi-agent functionality
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  researcher: {
    count: 3,
    strategy: 'specialized',
    specializations: ['理论方法', '实验应用', '最新进展'],
    enablePeerReview: true,
    voteMethod: 'weighted'
  },
  outliner: {
    count: 1,
    strategy: 'parallel',
    enablePeerReview: false,
    voteMethod: 'best'
  },
  planner: {
    count: 1,
    strategy: 'collaborative',
    enablePeerReview: false,
    voteMethod: 'best'
  },
  writer: {
    count: 1,
    strategy: 'parallel',
    enablePeerReview: false,
    voteMethod: 'best'
  },
  editor: {
    count: 1,
    strategy: 'sequential',
    enablePeerReview: false,
    voteMethod: 'best'
  }
};

/**
 * Preset configurations for different use cases
 */
export const AGENT_CONFIG_PRESETS: Record<string, AgentConfig> = {
  /**
   * Basic Mode - Single agent per role
   * Fast, cost-effective, good for quick drafts
   */
  basic: {
    researcher: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
    outliner: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
    planner: { count: 1, strategy: 'collaborative', enablePeerReview: false, voteMethod: 'best' },
    writer: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
    editor: { count: 1, strategy: 'sequential', enablePeerReview: false, voteMethod: 'best' }
  },

  /**
   * Collaborative Mode - 2-3 agents per role with peer review
   * Balanced between quality and cost
   */
  collaborative: {
    researcher: {
      count: 3,
      strategy: 'specialized',
      specializations: ['理论方法', '实验应用', '最新进展'],
      enablePeerReview: true,
      voteMethod: 'weighted'
    },
    outliner: {
      count: 3,
      strategy: 'diverse',
      enablePeerReview: true,
      voteMethod: 'weighted'
    },
    planner: {
      count: 2,
      strategy: 'collaborative',
      enablePeerReview: true,
      voteMethod: 'majority'
    },
    writer: {
      count: 2,
      strategy: 'merge',
      enablePeerReview: true,
      voteMethod: 'weighted'
    },
    editor: {
      count: 2,
      strategy: 'parallel',
      enablePeerReview: true,
      voteMethod: 'consensus'
    }
  },

  /**
   * Power Mode - 5 agents per role with full peer review
   * Maximum quality, higher cost, best for important papers
   */
  power: {
    researcher: {
      count: 5,
      strategy: 'specialized',
      specializations: ['理论研究', '方法创新', '实验验证', '工程应用', '综述分析'],
      enablePeerReview: true,
      voteMethod: 'weighted'
    },
    outliner: {
      count: 5,
      strategy: 'diverse',
      enablePeerReview: true,
      voteMethod: 'weighted'
    },
    planner: {
      count: 3,
      strategy: 'collaborative',
      enablePeerReview: true,
      voteMethod: 'majority'
    },
    writer: {
      count: 3,
      strategy: 'merge',
      enablePeerReview: true,
      voteMethod: 'weighted'
    },
    editor: {
      count: 3,
      strategy: 'parallel',
      enablePeerReview: true,
      voteMethod: 'consensus'
    }
  },

  /**
   * Research-First Mode - Multiple researchers for comprehensive literature review
   * Good for research-heavy papers
   */
  'research-focused': {
    researcher: {
      count: 5,
      strategy: 'specialized',
      specializations: ['理论', '方法', '实验', '应用', '跨学科'],
      enablePeerReview: true,
      voteMethod: 'weighted'
    },
    outliner: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
    planner: { count: 1, strategy: 'collaborative', enablePeerReview: false, voteMethod: 'best' },
    writer: { count: 1, strategy: 'parallel', enablePeerReview: false, voteMethod: 'best' },
    editor: { count: 1, strategy: 'sequential', enablePeerReview: false, voteMethod: 'best' }
  }
};

/**
 * Specialization presets for different research areas
 */
export const SPECIALIZATION_PRESETS: Record<string, string[]> = {
  'computer-science': ['理论方法', '算法设计', '系统架构', '实验验证', '应用场景'],
  'medicine': ['基础研究', '临床试验', '药物开发', '诊断技术', '治疗方案'],
  'engineering': ['理论分析', '设计优化', '实验验证', '工程应用', '性能评估'],
  'social-science': ['理论框架', '实证研究', '数据分析', '案例研究', '政策建议'],
  'humanities': ['文献考证', '理论分析', '历史研究', '比较研究', '跨学科']
};

/**
 * Load configuration from localStorage
 */
export function loadAgentConfig(): AgentConfig {
  const saved = localStorage.getItem('agent-config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Failed to load agent config:', error);
      return DEFAULT_AGENT_CONFIG;
    }
  }
  return { ...DEFAULT_AGENT_CONFIG };
}

/**
 * Save configuration to localStorage
 */
export function saveAgentConfig(config: AgentConfig): void {
  localStorage.setItem('agent-config', JSON.stringify(config));
}

/**
 * Reset configuration to default
 */
export function resetAgentConfig(): AgentConfig {
  return { ...DEFAULT_AGENT_CONFIG };
}

/**
 * Get cost estimate for a configuration
 */
export function estimateCost(config: AgentConfig): {
  apiCalls: number;
  estimatedCostUSD: number;
  estimatedTime: string;
} {
  // Rough estimates
  const totalAgents = Object.values(config).reduce(
    (sum, roleConfig) => sum + roleConfig.count,
    0
  );

  const peerReviewMultiplier = Object.values(config).some(c => c.enablePeerReview) ? 2.5 : 1;
  const apiCalls = Math.floor(totalAgents * 10 * peerReviewMultiplier);
  const estimatedCostUSD = (apiCalls * 0.00045).toFixed(4);
  const estimatedMinutes = Math.ceil(apiCalls * 0.1);

  let timeString = '';
  if (estimatedMinutes < 60) {
    timeString = `${estimatedMinutes} 分钟`;
  } else {
    const hours = Math.floor(estimatedMinutes / 60);
    const mins = estimatedMinutes % 60;
    timeString = `${hours} 小时 ${mins} 分钟`;
  }

  return {
    apiCalls,
    estimatedCostUSD: parseFloat(estimatedCostUSD),
    estimatedTime: timeString
  };
}
