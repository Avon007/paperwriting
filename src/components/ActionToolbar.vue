<script setup lang="ts">
import { Play, SkipForward, RefreshCw, GripHorizontal } from 'lucide-vue-next';
import type { WorkflowStep } from '../types';

interface Props {
  step: WorkflowStep;
  isLoading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  generateOutline: [];
  createPlan: [];
  startWriting: [];
  polish: [];
}>();
</script>

<template>
  <div
    class="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap gap-2 shrink-0 cursor-row-resize hover:border-blue-500/50 transition-colors relative group my-2 shadow-lg z-10 select-none"
  >
    <!-- Grip Indicator -->
    <div class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

    <button
      v-if="step === 'RESEARCH'"
      @click="emit('generateOutline')"
      :disabled="isLoading"
      class="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
    >
      <SkipForward :size="14" /> Generate Outline
    </button>

    <button
      v-if="step === 'OUTLINE'"
      @click="emit('createPlan')"
      :disabled="isLoading"
      class="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
    >
      <SkipForward :size="14" /> Confirm & Plan
    </button>

    <button
      v-if="step === 'PLAN' || step === 'WRITING'"
      @click="emit('startWriting')"
      :disabled="step === 'WRITING' || isLoading"
      class="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
    >
      <Play :size="14" /> {{ step === 'WRITING' ? 'Writing...' : 'Start Writing Swarm' }}
    </button>

    <button
      v-if="step === 'POLISHING' || step === 'COMPLETE'"
      @click="emit('polish')"
      :disabled="isLoading"
      class="flex-1 bg-purple-700 hover:bg-purple-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
    >
      <RefreshCw :size="14" /> Polish Final Draft
    </button>

    <div
      v-if="step === 'INPUT'"
      class="w-full text-center text-xs text-zinc-500 py-2 flex items-center justify-center gap-2"
    >
      <GripHorizontal :size="14" class="opacity-50"/>
      <span>System Ready. Drag here to resize.</span>
      <GripHorizontal :size="14" class="opacity-50"/>
    </div>
  </div>
</template>
