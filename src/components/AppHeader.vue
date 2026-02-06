<script setup lang="ts">
import type { WorkflowStep } from '../types';
import { Cpu, RotateCcw } from 'lucide-vue-next';

interface Props {
  step: WorkflowStep;
}

defineProps<Props>();

const emit = defineEmits<{
  reset: [];
}>();
</script>

<template>
  <header class="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur sticky top-0 z-10 h-14">
    <div class="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="bg-blue-600 p-1.5 rounded-lg">
          <Cpu :size="18" class="text-white" />
        </div>
        <h1 class="text-lg font-bold tracking-tight text-white">
          ScholarGrid <span class="text-blue-500">AI</span>
        </h1>
      </div>

      <div class="flex items-center gap-4 text-xs font-mono">
        <button
          @click="emit('reset')"
          class="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
        >
          <RotateCcw :size="14" />
          <span class="hidden sm:inline">New Project</span>
        </button>
        <div class="h-4 w-px bg-zinc-800"></div>
        <div class="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800">
          <span
            class="w-2 h-2 rounded-full"
            :class="step === 'INPUT' ? 'bg-zinc-600' : 'bg-green-500'"
          ></span>
          STATUS: <span class="text-blue-400">{{ step }}</span>
        </div>
      </div>
    </div>
  </header>
</template>
