<script setup lang="ts">
import { computed } from 'vue';
import { Bot, Search, FileText, PenTool, Edit3, Cpu, CheckCircle2, CircleDashed } from 'lucide-vue-next';
import type { Agent } from '../types';

interface Props {
  agents: Agent[];
}

const props = defineProps<Props>();

const agentIconMap = {
  RESEARCHER: Search,
  OUTLINER: FileText,
  PLANNER: Cpu,
  WRITER: PenTool,
  EDITOR: Edit3
} as const;

const getAgentIcon = (role: string) => {
  return agentIconMap[role as keyof typeof agentIconMap] || Bot;
};

const getAgentStatusClasses = (status: Agent['status']) => {
  const baseClasses = 'relative overflow-hidden p-3 rounded-lg border transition-all duration-300';

  const statusClasses = {
    idle: 'bg-zinc-900 border-zinc-800 opacity-50',
    working: 'bg-blue-950/30 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    finished: 'bg-zinc-900 border-zinc-700 opacity-70'
  };

  return `${baseClasses} ${statusClasses[status]}`;
};
</script>

<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-lg">
    <h3 class="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-4">
      Active Neural Agents
    </h3>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="agent in agents"
        :key="agent.id"
        :class="getAgentStatusClasses(agent.status)"
      >
        <!-- Active indicator -->
        <div
          v-if="agent.status === 'working'"
          class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"
        />

        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div
            class="p-2 rounded-md"
            :class="
              agent.status === 'working'
                ? 'bg-blue-900/50 text-blue-400'
                : 'bg-zinc-800 text-zinc-500'
            "
          >
            <component :is="getAgentIcon(agent.role)" :size="18" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center mb-1">
              <span class="font-bold text-sm text-zinc-200 truncate">{{ agent.name }}</span>
              <CircleDashed
                v-if="agent.status === 'working'"
                :size="14"
                class="text-blue-400 animate-spin"
              />
              <CheckCircle2 v-else-if="agent.status === 'finished'" :size="14" class="text-emerald-500" />
            </div>
            <p class="text-xs text-zinc-500 truncate font-mono">
              {{ agent.currentAction || 'Idle' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
