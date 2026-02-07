<script setup lang="ts">
import { computed } from 'vue';
import type { AgentInstance, AgentRole } from '../types';
import { Search, FileText, Cpu, PenTool, Edit3 } from 'lucide-vue-next';

interface Props {
  agents: AgentInstance[];
}

const props = defineProps<Props>();

const agentRoles: AgentRole[] = ['RESEARCHER', 'OUTLINER', 'PLANNER', 'WRITER', 'EDITOR'];

const agentIconMap = {
  RESEARCHER: Search,
  OUTLINER: FileText,
  PLANNER: Cpu,
  WRITER: PenTool,
  EDITOR: Edit3
};

const agentColorMap = {
  RESEARCHER: 'border-purple-500 bg-purple-500/10 text-purple-400',
  OUTLINER: 'border-blue-500 bg-blue-500/10 text-blue-400',
  PLANNER: 'border-green-500 bg-green-500/10 text-green-400',
  WRITER: 'border-orange-500 bg-orange-500/10 text-orange-400',
  EDITOR: 'border-pink-500 bg-pink-500/10 text-pink-400'
};

const getStatusColor = (status: AgentInstance['status']) => {
  return {
    idle: 'text-zinc-500',
    working: 'text-blue-400 animate-pulse',
    reviewing: 'text-yellow-400',
    finished: 'text-green-400'
  }[status];
};

// Group agents by role
const groupedAgents = computed(() => {
  const groups: Record<AgentRole, AgentInstance[]> = {
    RESEARCHER: [],
    OUTLINER: [],
    PLANNER: [],
    WRITER: [],
    EDITOR: []
  };

  props.agents.forEach(agent => {
    groups[agent.role].push(agent);
  });

  return groups;
});
</script>

<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
      <Cpu :size="18" class="text-blue-400" />
      智能体池
    </h3>

    <div class="space-y-3">
      <div v-for="role in agentRoles" :key="role">
        <div v-if="groupedAgents[role].length > 0" class="space-y-2">
          <!-- Role Header -->
          <div class="flex items-center gap-2 text-sm">
            <component :is="agentIconMap[role]" :size="16" :class="agentColorMap[role].split(' ')[3]" />
            <span class="font-medium">{{ role }}</span>
            <span class="text-zinc-500">({{ groupedAgents[role].length }})</span>
          </div>

          <!-- Agent Cards -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="agent in groupedAgents[role]"
              :key="agent.id"
              class="border rounded p-2 transition-all"
              :class="[
                agentColorMap[agent.role],
                agent.status === 'working' ? 'animate-pulse' : ''
              ]"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold">{{ agent.id }}</span>
                <span class="text-xs" :class="getStatusColor(agent.status)">
                  {{ agent.status === 'idle' ? '空闲' :
                     agent.status === 'working' ? '工作中' :
                     agent.status === 'reviewing' ? '评审中' : '完成' }}
                </span>
              </div>

              <!-- Specialization -->
              <div v-if="agent.specialization" class="text-xs text-zinc-400 mb-1 truncate">
                {{ agent.specialization }}
              </div>

              <!-- Score -->
              <div v-if="agent.score > 0" class="text-xs">
                评分: <span class="font-bold">{{ agent.score.toFixed(1) }}</span>
              </div>

              <!-- Reviews count -->
              <div v-if="agent.peerReviewsReceived.length > 0" class="text-xs text-zinc-500">
                {{ agent.peerReviewsReceived.length }} 条评审
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="agents.length === 0" class="text-center py-8 text-zinc-500 text-sm">
      暂无智能体实例
    </div>
  </div>
</template>
