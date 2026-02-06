<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-vue-next';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  step: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sendMessage: [text: string];
}>();

const input = ref('');
const scrollRef = ref<HTMLDivElement | null>(null);

const placeholder = computed(() => {
  const placeholders: Record<string, string> = {
    INPUT: 'Enter your research topic...',
    RESEARCH: 'Refine topic or search queries...',
    OUTLINE: "Suggest changes to the outline (e.g., 'Add a section on...')",
    WRITING: 'Wait for writers...',
    POLISHING: 'Give editing instructions...'
  };
  return placeholders[props.step] || 'Type a message...';
});

const canSubmit = computed(() => {
  return !props.isLoading && input.value.trim().length > 0;
});

// Auto-scroll to bottom when new messages arrive
watch(
  () => [props.messages, props.isLoading],
  () => {
    nextTick(() => {
      scrollRef.value?.scrollTo({
        top: scrollRef.value.scrollHeight,
        behavior: 'smooth'
      });
    });
  },
  { deep: true }
);

const handleSubmit = () => {
  if (!canSubmit.value) return;
  emit('sendMessage', input.value.trim());
  input.value = '';
};
</script>

<template>
  <div class="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
    <!-- Header -->
    <div class="p-3 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
      <h3 class="text-sm font-semibold text-zinc-300 flex items-center gap-2">
        <Bot :size="16" class="text-blue-500" />
        System Chat
      </h3>
      <span class="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
        MODE: {{ step }}
      </span>
    </div>

    <!-- Messages Area -->
    <div
      ref="scrollRef"
      class="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 custom-scrollbar"
    >
      <div
        v-if="messages.length === 0"
        class="flex flex-col items-center justify-center h-full text-zinc-600 space-y-2"
      >
        <Sparkles :size="24" class="opacity-50" />
        <p class="text-xs">Start by defining your research topic.</p>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex w-full"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="flex max-w-[85%] gap-2"
          :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
        >
          <div
            class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-1"
            :class="
              msg.role === 'user'
                ? 'bg-zinc-800 text-zinc-400'
                : 'bg-blue-900/30 text-blue-400'
            "
          >
            <User v-if="msg.role === 'user'" :size="12" />
            <Bot v-else :size="12" />
          </div>

          <div
            class="p-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap"
            :class="
              msg.role === 'user'
                ? 'bg-zinc-800 text-zinc-200'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
            "
          >
            {{ msg.text }}
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="flex items-center gap-2 text-xs text-zinc-500 pl-9">
        <Loader2 :size="12" class="animate-spin" />
        <span>Thinking...</span>
      </div>
    </div>

    <!-- Input Area -->
    <form @submit.prevent="handleSubmit" class="p-3 bg-zinc-950 border-t border-zinc-800">
      <div class="relative flex items-center">
        <input
          v-model="input"
          type="text"
          :placeholder="placeholder"
          :disabled="isLoading"
          class="w-full pl-3 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-zinc-200 text-sm placeholder-zinc-600 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          :disabled="!canSubmit"
          class="absolute right-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-md disabled:opacity-50 transition-colors"
        >
          <Send :size="14" />
        </button>
      </div>
    </form>
  </div>
</template>
