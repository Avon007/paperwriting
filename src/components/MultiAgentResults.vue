<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AgentInstance, EvaluationResult, Reference } from '../types';
import { Trophy, Medal, Award, Star, MessageSquare, ChevronDown, ChevronUp, MessageCircle } from 'lucide-vue-next';

interface Props {
  agents: AgentInstance[];
  evaluations: EvaluationResult[];
  role: 'RESEARCHER' | 'OUTLINER' | 'PLANNER' | 'WRITER' | 'EDITOR';
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectResult: [agentId: string];
  addComment: [agentId: string, comment: string];
}>();

// Track expanded state for each agent
const expandedAgents = ref<Set<string>>(new Set());

// Track comment input for each agent
const commentInputs = ref<Record<string, string>>({});

// Toggle expanded state
const toggleExpanded = (agentId: string) => {
  if (expandedAgents.value.has(agentId)) {
    expandedAgents.value.delete(agentId);
  } else {
    expandedAgents.value.add(agentId);
  }
  // Force reactivity
  expandedAgents.value = new Set(expandedAgents.value);
};

// Submit comment
const submitComment = (agentId: string) => {
  const comment = commentInputs.value[agentId]?.trim();
  if (comment) {
    emit('addComment', agentId, comment);
    commentInputs.value[agentId] = '';
  }
};

// Sort agents by score
const rankedAgents = computed(() => {
  return [...props.agents]
    .filter(agent => agent.result !== undefined)
    .sort((a, b) => b.score - a.score);
});

// Get rank icon
const getRankIcon = (rank: number) => {
  if (rank === 1) return Trophy;
  if (rank === 2) return Medal;
  if (rank === 3) return Award;
  return Star;
};

const getRankColor = (rank: number) => {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-zinc-300';
  if (rank === 3) return 'text-amber-600';
  return 'text-zinc-500';
};

// Get role-specific display
const getRoleDisplay = () => {
  const displays = {
    RESEARCHER: {
      title: '研究成果',
      icon: '🔍',
      unit: '篇文献'
    },
    OUTLINER: {
      title: '大纲方案',
      icon: '📐',
      unit: '个章节'
    },
    PLANNER: {
      title: '规划方案',
      icon: '🎯',
      unit: '个任务'
    },
    WRITER: {
      title: '写作版本',
      icon: '✍️',
      unit: '字'
    },
    EDITOR: {
      title: '润色版本',
      icon: '🎨',
      unit: '字'
    }
  };
  return displays[props.role];
};

// Format result display
const formatResult = (agent: AgentInstance) => {
  if (!agent.result) return '';

  const roleDisplay = getRoleDisplay();

  if (props.role === 'RESEARCHER') {
    const refs = agent.result as Reference[];
    return `${refs.length} ${roleDisplay.unit}`;
  }

  if (props.role === 'OUTLINER') {
    const outline = agent.result as any[];
    return `${outline.length} ${roleDisplay.unit}`;
  }

  if (props.role === 'WRITER' || props.role === 'EDITOR') {
    return `${(agent.result as string).length} ${roleDisplay.unit}`;
  }

  return '完成';
};

// Check if agent has peer reviews
const hasReviews = (agent: AgentInstance) => {
  return agent.peerReviewsReceived.length > 0;
};
</script>

<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <span class="text-2xl">{{ getRoleDisplay().icon }}</span>
        {{ getRoleDisplay().title }}对比
      </h3>
      <span class="text-sm text-zinc-500">{{ rankedAgents.length }} 个结果</span>
    </div>

    <!-- Results Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="(agent, index) in rankedAgents"
        :key="agent.id"
        class="relative border rounded-lg p-3 transition-all hover:shadow-lg cursor-pointer"
        :class="{
          'ring-2 ring-yellow-500 bg-yellow-500/5': index === 0,
          'border-zinc-700 hover:border-zinc-600': index > 0
        }"
        @click="emit('selectResult', agent.id)"
      >
        <!-- Rank Badge -->
        <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          :class="{
            'bg-yellow-500 text-black': index === 0,
            'bg-zinc-600 text-white': index === 1,
            'bg-amber-700 text-white': index === 2,
            'bg-zinc-700 text-zinc-400': index > 2
          }"
        >
          <component :is="getRankIcon(index + 1)" :size="16" />
        </div>

        <!-- Agent Info -->
        <div class="mb-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-bold text-sm">{{ agent.id }}</span>
            <span v-if="agent.specialization" class="text-xs px-2 py-0.5 bg-zinc-700 rounded text-zinc-400">
              {{ agent.specialization }}
            </span>
          </div>
          <div class="text-xs text-zinc-500">
            状态: {{ agent.status === 'finished' ? '完成' : agent.status }}
          </div>
        </div>

        <!-- Score Display -->
        <div class="mb-3 p-2 bg-zinc-800 rounded">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-zinc-400">综合得分</span>
            <span class="text-lg font-bold" :class="getRankColor(index + 1)">
              {{ agent.score.toFixed(2) }}
            </span>
          </div>

          <!-- Dimension Scores (if available) -->
          <div v-if="hasReviews(agent)" class="grid grid-cols-2 gap-1 text-xs">
            <div v-if="agent.peerReviewsReceived.length > 0">
              <span class="text-zinc-500">质量:</span>
              <span class="ml-1">{{ (agent.peerReviewsReceived.reduce((sum, r) => sum + r.scores.quality, 0) / agent.peerReviewsReceived.length).toFixed(1) }}</span>
            </div>
            <div v-if="agent.peerReviewsReceived.length > 0">
              <span class="text-zinc-500">完整:</span>
              <span class="ml-1">{{ (agent.peerReviewsReceived.reduce((sum, r) => sum + r.scores.completeness, 0) / agent.peerReviewsReceived.length).toFixed(1) }}</span>
            </div>
            <div v-if="agent.peerReviewsReceived.length > 0">
              <span class="text-zinc-500">创新:</span>
              <span class="ml-1">{{ (agent.peerReviewsReceived.reduce((sum, r) => sum + r.scores.creativity, 0) / agent.peerReviewsReceived.length).toFixed(1) }}</span>
            </div>
            <div v-if="agent.peerReviewsReceived.length > 0">
              <span class="text-zinc-500">准确:</span>
              <span class="ml-1">{{ (agent.peerReviewsReceived.reduce((sum, r) => sum + r.scores.accuracy, 0) / agent.peerReviewsReceived.length).toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <!-- Result Preview with Expand -->
        <div class="mb-3">
          <div class="flex items-center justify-between mb-1">
            <div class="text-xs text-zinc-400">结果预览</div>
            <button
              @click="toggleExpanded(agent.id)"
              class="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {{ expandedAgents.has(agent.id) ? '收起' : '展开全部' }}
              <component :is="expandedAgents.has(agent.id) ? ChevronUp : ChevronDown" :size="14" />
            </button>
          </div>

          <!-- Preview or Full Result -->
          <div class="text-sm bg-zinc-800 rounded p-2" :class="expandedAgents.has(agent.id) ? 'max-h-96 overflow-y-auto' : 'max-h-24 overflow-y-auto'">
            <!-- RESEARCHER specific -->
            <template v-if="role === 'RESEARCHER'">
              <div v-if="Array.isArray(agent.result)">
                <div v-for="(ref, i) in (expandedAgents.has(agent.id) ? agent.result : agent.result.slice(0, 3))" :key="i" class="mb-2 last:mb-0 pb-2 last:pb-0 border-b border-zinc-700 last:border-0">
                  <div class="font-medium text-sm text-indigo-300">{{ ref.title }}</div>
                  <div class="text-xs text-zinc-400 mt-1">{{ ref.author }} ({{ ref.year }})</div>
                  <div class="text-xs text-zinc-500 mt-1">{{ ref.keyFinding }}</div>
                </div>
                <div v-if="!expandedAgents.has(agent.id) && agent.result.length > 3" class="text-xs text-zinc-500 italic">
                  ... 点击展开查看全部 {{ agent.result.length }} 篇文献
                </div>
              </div>
            </template>

            <!-- OUTLINER specific -->
            <template v-else-if="role === 'OUTLINER'">
              <div v-if="Array.isArray(agent.result)">
                <div v-for="(item, i) in (expandedAgents.has(agent.id) ? agent.result : agent.result.slice(0, 3))" :key="i" class="mb-2 last:mb-0 pb-2 last:pb-0 border-b border-zinc-700 last:border-0">
                  <div class="text-xs font-semibold text-blue-300">{{ item.id }}. {{ item.title }}</div>
                  <div class="text-xs text-zinc-400 mt-1">{{ item.description }}</div>
                </div>
                <div v-if="!expandedAgents.has(agent.id) && agent.result.length > 3" class="text-xs text-zinc-500 italic">
                  ... 点击展开查看全部 {{ agent.result.length }} 个章节
                </div>
              </div>
            </template>

            <!-- WRITER/EDITOR specific -->
            <template v-else-if="role === 'WRITER' || role === 'EDITOR'">
              <div class="text-xs text-zinc-300 whitespace-pre-wrap" :class="expandedAgents.has(agent.id) ? '' : 'line-clamp-3'">
                {{ agent.result as string }}
              </div>
              <div v-if="!expandedAgents.has(agent.id)" class="text-xs text-zinc-500 mt-1">
                {{ formatResult(agent) }} - 点击展开查看完整内容
              </div>
            </template>

            <!-- Generic fallback -->
            <template v-else>
              <div class="text-xs text-zinc-400">
                {{ formatResult(agent) }}
              </div>
            </template>
          </div>
        </div>

        <!-- Reviews Count -->
        <div v-if="hasReviews(agent)" class="flex items-center gap-1 text-xs text-zinc-500">
          <MessageSquare :size="12" />
          <span>{{ agent.peerReviewsReceived.length }} 条评审</span>
        </div>

        <!-- User Comment Input -->
        <div class="mt-3 pt-3 border-t border-zinc-700">
          <div class="flex items-center gap-1 text-xs text-zinc-400 mb-2">
            <MessageCircle :size="12" />
            <span>添加您的评论</span>
          </div>
          <div class="flex gap-2">
            <input
              v-model="commentInputs[agent.id]"
              type="text"
              :placeholder="`评价 ${agent.id} 的结果...`"
              class="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              @keyup.enter="submitComment(agent.id)"
            />
            <button
              @click="submitComment(agent.id)"
              :disabled="!commentInputs[agent.id]?.trim()"
              class="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded text-xs font-medium transition-colors"
            >
              发送
            </button>
          </div>
        </div>

        <!-- Winner Badge -->
        <div v-if="index === 0" class="mt-2 pt-2 border-t border-zinc-700">
          <div class="text-xs font-semibold text-yellow-400 text-center">
            🏆 最佳方案
          </div>
        </div>
      </div>
    </div>

    <!-- View Reviews Button -->
    <div v-if="rankedAgents.some(a => hasReviews(a))" class="mt-4 pt-4 border-t border-zinc-800">
      <button class="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded p-2 text-sm flex items-center justify-center gap-2">
        <MessageSquare :size="16" />
        查看详细评审过程
      </button>
    </div>
  </div>
</template>
