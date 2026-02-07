<script setup lang="ts">
import { computed } from 'vue';
import type { AgentInstance, PeerReview } from '../types';
import { MessageSquare, Star, TrendingUp, CheckCircle } from 'lucide-vue-next';

interface Props {
  agents: AgentInstance[];
  role: 'RESEARCHER' | 'OUTLINER' | 'PLANNER' | 'WRITER' | 'EDITOR';
}

const props = defineProps<Props>();

// Get all reviews across all agents
const allReviews = computed(() => {
  const reviews: Array<{ review: PeerReview; reviewer: AgentInstance; target: AgentInstance }> = [];

  props.agents.forEach(agent => {
    agent.peerReviewsReceived.forEach(review => {
      const reviewer = props.agents.find(a => a.id === review.reviewerId);
      if (reviewer) {
        reviews.push({ review, reviewer, target: agent });
      }
    });
  });

  // Sort by timestamp
  return reviews.sort((a, b) => a.review.timestamp - b.review.timestamp);
});

// Format timestamp
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Get score color
const getScoreColor = (score: number) => {
  if (score >= 8) return 'text-green-400';
  if (score >= 6) return 'text-yellow-400';
  if (score >= 4) return 'text-orange-400';
  return 'text-red-400';
};

// Group reviews by conversation
const conversationGroups = computed(() => {
  const groups: Array<{ id: string; reviewerId: string; targetId: string; timestamp: number; reviews: PeerReview[] }> = [];

  allReviews.value.forEach(item => {
    const existing = groups.find(g => g.reviewerId === item.review.reviewerId && g.targetId === item.review.targetId);

    if (existing) {
      existing.reviews.push(item.review);
    } else {
      groups.push({
        id: `${item.review.reviewerId}->${item.review.targetId}`,
        reviewerId: item.review.reviewerId,
        targetId: item.review.targetId,
        timestamp: item.review.timestamp,
        reviews: [item.review]
      });
    }
  });

  return groups.sort((a, b) => a.timestamp - b.timestamp);
});
</script>

<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <MessageSquare :size="20" class="text-purple-400" />
        智能体评审对话
      </h3>
      <div class="text-sm text-zinc-500">
        {{ conversationGroups.length }} 次评审
      </div>
    </div>

    <!-- No reviews state -->
    <div v-if="conversationGroups.length === 0" class="text-center py-8 text-zinc-500 text-sm">
      <MessageSquare :size="32" class="mx-auto mb-2 opacity-50" />
      <p>暂无评审对话</p>
      <p class="text-xs mt-1">当智能体完成互评后，对话将显示在这里</p>
    </div>

    <!-- Review conversations -->
    <div v-else class="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
      <div
        v-for="group in conversationGroups"
        :key="group.id"
        class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700"
      >
        <!-- Review Header -->
        <div class="flex items-center gap-2 mb-3 text-sm">
          <div class="font-bold text-purple-400">
            {{ agents.find(a => a.id === group.reviewerId)?.id }} 评审
          </div>
          <div class="text-zinc-500">→</div>
          <div class="font-bold text-blue-400">
            {{ agents.find(a => a.id === group.targetId)?.id }} 的作品
          </div>
          <div class="ml-auto text-xs text-zinc-500">
            {{ formatTime(group.timestamp) }}
          </div>
        </div>

        <!-- Reviews (could be multiple rounds) -->
        <div
          v-for="(review, index) in group.reviews"
          :key="review.id"
          class="space-y-2"
        >
          <!-- Scores -->
          <div class="grid grid-cols-4 gap-2 text-xs bg-zinc-900/50 rounded p-2">
            <div class="flex flex-col">
              <span class="text-zinc-500">质量</span>
              <span class="font-bold text-lg" :class="getScoreColor(review.scores.quality)">
                {{ review.scores.quality.toFixed(1) }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-zinc-500">完整</span>
              <span class="font-bold text-lg" :class="getScoreColor(review.scores.completeness)">
                {{ review.scores.completeness.toFixed(1) }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-zinc-500">创新</span>
              <span class="font-bold text-lg" :class="getScoreColor(review.scores.creativity)">
                {{ review.scores.creativity.toFixed(1) }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-zinc-500">准确</span>
              <span class="font-bold text-lg" :class="getScoreColor(review.scores.accuracy)">
                {{ review.scores.accuracy.toFixed(1) }}
              </span>
            </div>
          </div>

          <!-- Overall Score -->
          <div class="flex items-center gap-2 mb-2">
            <div class="flex items-center gap-1 text-sm">
              <Star :size="14" class="text-yellow-400" />
              <span class="text-zinc-400">综合得分:</span>
            </div>
            <span class="text-xl font-bold" :class="getScoreColor(review.overallScore)">
              {{ review.overallScore.toFixed(2) }}
            </span>
          </div>

          <!-- Comments -->
          <div class="bg-zinc-900 rounded p-3 text-sm">
            <div class="text-xs text-zinc-400 mb-1">评审意见:</div>
            <div class="text-zinc-300 whitespace-pre-wrap">{{ review.comments }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="conversationGroups.length > 0" class="mt-4 pt-4 border-t border-zinc-800">
      <div class="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div class="text-2xl font-bold text-purple-400">{{ conversationGroups.length }}</div>
          <div class="text-xs text-zinc-500">评审对话</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-blue-400">{{ agents.filter(a => a.peerReviewsReceived.length > 0).length }}</div>
          <div class="text-xs text-zinc-500">被评审智能体</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-green-400">
            {{ (allReviews.reduce((sum, item) => sum + item.review.overallScore, 0) / allReviews.length).toFixed(1) }}
          </div>
          <div class="text-xs text-zinc-500">平均得分</div>
        </div>
      </div>
    </div>
  </div>
</template>
