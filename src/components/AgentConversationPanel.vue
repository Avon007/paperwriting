<script setup lang="ts">
import { computed } from 'vue';
import type { AgentConversation, AgentMessage } from '../types';
import { Search, FileText, Cpu, PenTool, Edit3, ChevronDown, ChevronUp } from 'lucide-vue-next';

interface Props {
  conversation: AgentConversation;
  expanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  expanded: true
});

const emit = defineEmits<{
  toggle: [];
}>();

// Agent icon mapping
const agentIconMap = {
  RESEARCHER: Search,
  OUTLINER: FileText,
  PLANNER: Cpu,
  WRITER: PenTool,
  EDITOR: Edit3
} as const;

// Agent color mapping for visual distinction
const agentColorMap = {
  RESEARCHER: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  OUTLINER: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  PLANNER: 'text-green-400 bg-green-400/10 border-green-400/30',
  WRITER: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  EDITOR: 'text-pink-400 bg-pink-400/10 border-pink-400/30'
};

// Group messages by step
const groupedMessages = computed(() => {
  const groups: Record<string, AgentMessage[]> = {};

  props.conversation.messages.forEach(msg => {
    if (!groups[msg.step]) {
      groups[msg.step] = [];
    }
    groups[msg.step].push(msg);
  });

  return groups;
});

// Format timestamp
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Check if message is a broadcast
const isBroadcast = (msg: AgentMessage) => msg.toAgent === 'ALL';

// Get message arrow direction
const getDirectionArrow = (msg: AgentMessage) => {
  return isBroadcast(msg) ? '📢' : '→';
};
</script>

<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
    <!-- Header -->
    <div
      @click="emit('toggle')"
      class="p-3 bg-zinc-950/50 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors"
    >
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <Cpu :size="18" class="text-blue-400" />
          <h3 class="text-sm font-semibold text-zinc-300">Agent Collaboration</h3>
        </div>

        <span class="px-2 py-0.5 rounded text-xs font-mono" :class="{
          'bg-yellow-500/20 text-yellow-400': conversation.status === 'active',
          'bg-green-500/20 text-green-400': conversation.status === 'completed',
          'bg-red-500/20 text-red-400': conversation.status === 'blocked'
        }">
          {{ conversation.status.toUpperCase() }}
        </span>

        <span class="text-xs text-zinc-500">
          {{ conversation.messages.length }} messages
        </span>
      </div>

      <component
        :is="expanded ? ChevronUp : ChevronDown"
        :size="18"
        class="text-zinc-500 transition-transform"
      />
    </div>

    <!-- Messages -->
    <div v-if="expanded" class="p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
      <div
        v-for="(messages, step) in groupedMessages"
        :key="step"
        class="space-y-2"
      >
        <!-- Step Header -->
        <div class="flex items-center gap-2 sticky top-0 bg-zinc-900 py-2 z-10">
          <div class="h-px flex-1 bg-gradient-to-r from-zinc-700 to-transparent"></div>
          <span class="text-xs font-bold text-zinc-500 uppercase tracking-wider">{{ step }}</span>
          <div class="h-px flex-1 bg-gradient-to-l from-zinc-700 to-transparent"></div>
        </div>

        <!-- Messages in this step -->
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="animate-fade-in"
        >
          <div
            class="border rounded-lg p-3 transition-all hover:shadow-md"
            :class="agentColorMap[msg.fromAgent]"
          >
            <!-- Message Header -->
            <div class="flex items-center gap-2 mb-2">
              <component
                :is="agentIconMap[msg.fromAgent]"
                :size="16"
                class="shrink-0"
              />
              <span class="font-bold text-sm">{{ msg.fromAgent }}</span>
              <span class="text-xs opacity-70">{{ getDirectionArrow(msg) }}</span>
              <span class="font-bold text-sm">{{ isBroadcast(msg) ? 'ALL' : msg.toAgent }}</span>
              <span class="ml-auto text-xs font-mono opacity-50">{{ formatTime(msg.timestamp) }}</span>
            </div>

            <!-- Message Content -->
            <div class="text-sm leading-relaxed whitespace-pre-wrap">{{ msg.content }}</div>

            <!-- Attachments -->
            <div v-if="msg.attachments" class="mt-3 pt-3 border-t border-current opacity-70">
              <div v-if="msg.attachments.references" class="text-xs">
                <span class="font-semibold">📎 References:</span> {{ msg.attachments.references.length }} papers
              </div>
              <div v-if="msg.attachments.outline" class="text-xs">
                <span class="font-semibold">📋 Outline:</span> {{ msg.attachments.outline.length }} sections
              </div>
              <div v-if="msg.attachments.tasks" class="text-xs">
                <span class="font-semibold">✅ Tasks:</span> {{ msg.attachments.tasks.length }} assigned
              </div>
              <div v-if="msg.attachments.content" class="text-xs">
                <span class="font-semibold">📝 Content:</span> {{ msg.attachments.content.length }} chars
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="conversation.messages.length === 0" class="text-center py-10">
        <Cpu :size="48" class="mx-auto text-zinc-700 mb-3" />
        <p class="text-sm text-zinc-600 italic">No agent messages yet.</p>
        <p class="text-xs text-zinc-700 mt-1">Messages will appear here as agents collaborate.</p>
      </div>
    </div>
  </div>
</template>
