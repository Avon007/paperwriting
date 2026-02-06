<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import type { Reference, OutlineItem, PaperState } from '../types';
import { Book, ListTree, FileOutput, Trash2, Plus, X, GripHorizontal, GripVertical } from 'lucide-vue-next';
import { useMultiResizable } from '../composables/useResizableLayout';

interface Props {
  paperState: PaperState;
  readOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false
});

const emit = defineEmits<{
  change: [updates: Partial<PaperState>];
}>();

// Layout state
const topSectionHeight = ref(45);
const referencePanelWidth = ref(50);
const { activeTarget, startResize, stopResize, calculateNewValue } = useMultiResizable();

// Template refs
const containerRef = ref<HTMLDivElement | null>(null);
const topRowRef = ref<HTMLDivElement | null>(null);

// Resize handlers
const startResizeVertical = () => startResize('workspace-vertical');
const startResizeHorizontal = () => startResize('workspace-horizontal');

// Handle mouse move
const onResize = (e: MouseEvent) => {
  if (activeTarget.value === 'workspace-vertical' && containerRef.value) {
    const newHeight = calculateNewValue(e, containerRef.value, 'vertical', 20, 80);
    if (newHeight !== null) topSectionHeight.value = newHeight;
  } else if (activeTarget.value === 'workspace-horizontal' && topRowRef.value) {
    const newWidth = calculateNewValue(e, topRowRef.value, 'horizontal', 20, 80);
    if (newWidth !== null) referencePanelWidth.value = newWidth;
  }
};

// Stop resizing on mouse up or leaving window
const onStopResize = () => {
  stopResize();
};

// Listen to resize target changes
watch(activeTarget, (newTarget) => {
  if (newTarget) {
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', onStopResize);
    window.addEventListener('mouseleave', onStopResize);
  } else {
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', onStopResize);
    window.removeEventListener('mouseleave', onStopResize);
  }
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onResize);
  window.removeEventListener('mouseup', onStopResize);
  window.removeEventListener('mouseleave', onStopResize);
});

// Reference handlers
const handleRefChange = (index: number, field: keyof Reference, value: string) => {
  const newRefs = [...props.paperState.references];
  newRefs[index] = { ...newRefs[index], [field]: value };
  emit('change', { references: newRefs });
};

const handleDeleteRef = (index: number) => {
  const newRefs = props.paperState.references.filter((_, i) => i !== index);
  emit('change', { references: newRefs });
};

// Outline handlers
const handleOutlineChange = (index: number, field: keyof OutlineItem, value: string) => {
  const newOutline = [...props.paperState.outline];
  newOutline[index] = { ...newOutline[index], [field]: value };
  emit('change', { outline: newOutline });
};

const handleDeleteOutlineItem = (index: number) => {
  const newOutline = props.paperState.outline.filter((_, i) => i !== index);
  emit('change', { outline: newOutline });
};

const handleAddOutlineItem = () => {
  const newId = Math.random().toString(36).substr(2, 9);
  emit('change', {
    outline: [
      ...props.paperState.outline,
      { id: newId, title: 'New Section', description: 'Description of the section...' }
    ]
  });
};
</script>

<template>
  <div ref="containerRef" class="flex flex-col h-full w-full">
    <!-- Top Row: References & Outline -->
    <div
      ref="topRowRef"
      class="flex gap-0 min-h-[150px] overflow-hidden"
      :style="{ height: `${topSectionHeight}%` }"
    >
      <!-- References Panel -->
      <div
        class="flex flex-col h-full min-w-[200px]"
        :style="{ width: `${referencePanelWidth}%` }"
      >
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-full overflow-hidden shadow-sm">
          <div class="p-3 bg-zinc-950/50 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2">
              <Book :size="16" class="text-purple-400" />
              <h3 class="text-sm font-semibold text-zinc-300">References</h3>
            </div>
            <span class="text-xs text-zinc-500">{{ paperState.references.length }}</span>
          </div>

          <div class="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            <div
              v-if="paperState.references.length === 0"
              class="text-zinc-600 text-sm text-center mt-10 italic"
            >
              No references found.
            </div>

            <div
              v-for="(ref, idx) in paperState.references"
              :key="idx"
              class="group bg-zinc-950 p-3 rounded border border-zinc-800 text-xs hover:border-zinc-700 transition-colors relative"
            >
              <button
                @click="handleDeleteRef(idx)"
                class="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 :size="14" />
              </button>

              <input
                :value="ref.title"
                @input="handleRefChange(idx, 'title', ($event.target as HTMLInputElement).value)"
                class="bg-transparent font-bold text-indigo-300 w-full focus:outline-none mb-1"
              />

              <div class="flex gap-2 mb-1">
                <input
                  :value="ref.author"
                  @input="handleRefChange(idx, 'author', ($event.target as HTMLInputElement).value)"
                  class="bg-transparent text-zinc-400 w-1/2 focus:outline-none"
                />
                <input
                  :value="ref.year"
                  @input="handleRefChange(idx, 'year', ($event.target as HTMLInputElement).value)"
                  class="bg-transparent text-zinc-400 w-1/4 focus:outline-none"
                />
              </div>

              <textarea
                :value="ref.keyFinding"
                @input="handleRefChange(idx, 'keyFinding', ($event.target as HTMLTextAreaElement).value)"
                rows="2"
                class="bg-transparent text-zinc-500 italic w-full resize-none focus:outline-none focus:text-zinc-300"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Horizontal Resize Handle -->
      <div @mousedown="startResizeHorizontal">
        <div class="w-3 flex items-center justify-center cursor-col-resize hover:bg-zinc-800/50 transition-colors group z-20 shrink-0 mx-1">
          <GripVertical :size="14" class="text-zinc-800 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>

      <!-- Outline Panel -->
      <div class="flex-1 min-w-[200px] h-full">
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-full overflow-hidden shadow-sm">
          <div class="p-3 bg-zinc-950/50 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2">
              <ListTree :size="16" class="text-blue-400" />
              <h3 class="text-sm font-semibold text-zinc-300">Outline</h3>
            </div>
            <button
              @click="handleAddOutlineItem"
              class="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
              title="Add Section"
            >
              <Plus :size="16" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <div
              v-if="paperState.outline.length === 0"
              class="text-zinc-600 text-sm text-center mt-10 italic"
            >
              No outline generated.
            </div>

            <div
              v-for="(item, idx) in paperState.outline"
              :key="item.id"
              class="group flex gap-3 text-sm p-2 hover:bg-zinc-800/30 rounded transition-colors relative"
            >
              <button
                @click="handleDeleteOutlineItem(idx)"
                class="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X :size="14" />
              </button>

              <span class="font-mono text-zinc-600 font-bold pt-1">{{ idx + 1 }}.</span>

              <div class="flex-1 min-w-0">
                <input
                  :value="item.title"
                  @input="handleOutlineChange(idx, 'title', ($event.target as HTMLInputElement).value)"
                  class="bg-transparent font-medium text-zinc-200 w-full focus:outline-none border-b border-transparent focus:border-zinc-700 mb-1"
                />
                <textarea
                  :value="item.description"
                  @input="handleOutlineChange(idx, 'description', ($event.target as HTMLTextAreaElement).value)"
                  class="bg-transparent text-xs text-zinc-500 w-full resize-none focus:outline-none focus:text-zinc-400 h-full min-h-[2.5em]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vertical Resize Handle -->
    <div @mousedown="startResizeVertical">
      <div class="h-3 w-full flex items-center justify-center cursor-row-resize hover:bg-zinc-800/50 transition-colors group z-20 shrink-0 my-1">
        <GripHorizontal :size="14" class="text-zinc-800 group-hover:text-blue-500 transition-colors" />
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 min-h-[150px] bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-sm">
      <div class="p-3 bg-zinc-950/50 border-b border-zinc-800 flex justify-between items-center shrink-0">
        <div class="flex items-center gap-2">
          <FileOutput :size="16" class="text-emerald-400" />
          <h3 class="text-sm font-semibold text-zinc-300">Draft</h3>
        </div>
        <span class="text-xs font-mono text-zinc-500">
          {{ paperState.fullContent.length }} chars
        </span>
      </div>

      <textarea
        :value="paperState.fullContent"
        @input="emit('change', { fullContent: ($event.target as HTMLTextAreaElement).value })"
        placeholder="Paper content will appear here..."
        :readOnly="readOnly"
        class="flex-1 bg-zinc-950 p-6 text-zinc-300 font-serif leading-relaxed text-lg resize-none focus:outline-none selection:bg-emerald-900/30 custom-scrollbar disabled:opacity-50"
      />
    </div>
  </div>
</template>
