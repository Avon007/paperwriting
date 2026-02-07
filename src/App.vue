<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { initializeAI } from './services/geminiService';
import { useAgents } from './composables/useAgents';
import { useChat } from './composables/useChat';
import { usePaperWorkflow } from './composables/usePaperWorkflow';
import { useMultiResizable } from './composables/useResizableLayout';
import AppHeader from './components/AppHeader.vue';
import AgentVisualizer from './components/AgentVisualizer.vue';
import PaperWorkspace from './components/PaperWorkspace.vue';
import ChatPanel from './components/ChatPanel.vue';
import ActionToolbar from './components/ActionToolbar.vue';
import AgentConversationPanel from './components/AgentConversationPanel.vue';

// Initialize composables
const { agents, updateAgent, addWriterAgent, resetAgents } = useAgents();
const { messages, isLoading, addUserMessage, addBotMessage, clearMessages, getHistoryContext } = useChat();

const {
  step,
  topic,
  paper,
  conversation,
  formattedConversation,
  performResearch,
  handleGenerateOutline,
  handleCreatePlan,
  handleStartWriting,
  handlePolish,
  handleRefineOutline,
  handleEditPaper,
  resetWorkflow
} = usePaperWorkflow(updateAgent, addWriterAgent, addBotMessage, getHistoryContext);

// Layout state
const leftPanelWidth = ref(35);
const leftPanelAgentHeight = ref(40);
const conversationExpanded = ref(false);
const { activeTarget, startResize, stopResize, calculateNewValue } = useMultiResizable();

// Template refs
const mainContainerRef = ref<HTMLDivElement | null>(null);
const leftPanelRef = ref<HTMLDivElement | null>(null);

// Initialize on mount
onMounted(() => {
  const envKey = import.meta.env.API_KEY;

  // Check if key is missing or is the placeholder
  if (!envKey || envKey.includes('Paste_Your_Gemini_API_Key_Here')) {
    addBotMessage(
      '⚠️ System Missing API Key.\n\nPlease open the `.env` file in the project root and paste your Google Gemini API Key:\n\nAPI_KEY=AIzaSy...'
    );
    return;
  }

  initializeAI(envKey);

  // Only add welcome message if empty (on mount) and we have a key
  if (messages.value.length === 0) {
    addBotMessage('Welcome to ScholarGrid AI. Please enter your research topic to begin.');
  }
});

// Handle send message from chat
const handleSendMessage = async (text: string) => {
  const envKey = import.meta.env.API_KEY;
  if (!envKey) {
    addBotMessage('⚠️ API Key is missing. Please configure .env file.');
    return;
  }

  addUserMessage(text);
  isLoading.value = true;

  try {
    switch (step.value) {
      case 'INPUT':
        topic.value = text;
        step.value = 'RESEARCH';
        await performResearch(text, false, '');
        break;

      case 'RESEARCH':
        addBotMessage('Updating research parameters...');
        await performResearch(text, true, getHistoryContext(text));
        break;

      case 'OUTLINE':
        await handleRefineOutline(text, getHistoryContext(text));
        break;

      case 'POLISHING':
      case 'COMPLETE':
        await handleEditPaper(text, getHistoryContext(text));
        break;

      default:
        addBotMessage("I'm currently focused on the active task.");
    }
  } finally {
    isLoading.value = false;
  }
};

// Handle reset
const handleReset = () => {
  if (
    window.confirm(
      'Are you sure you want to start a new project? All current research and writing will be lost.'
    )
  ) {
    resetWorkflow();
    resetAgents();
    clearMessages();
    addBotMessage('System reset. Ready for a new topic.');
  }
};

// Handle layout resize
const startResizeLayout = () => startResize('layout-width');

const startResizeLeftVertical = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    return;
  }
  startResize('left-vertical');
};

// Handle mouse move for layout resize
const onResize = (e: MouseEvent) => {
  if (activeTarget.value === 'layout-width' && mainContainerRef.value) {
    const newWidth = calculateNewValue(e, mainContainerRef.value, 'horizontal', 20, 70);
    if (newWidth !== null) leftPanelWidth.value = newWidth;
  } else if (activeTarget.value === 'left-vertical' && leftPanelRef.value) {
    const newHeight = calculateNewValue(e, leftPanelRef.value, 'vertical', 15, 85);
    if (newHeight !== null) leftPanelAgentHeight.value = newHeight;
  }
};

// Stop resizing on mouse up or leaving window
const onStopResize = () => {
  stopResize();
};

// Listen to mouse move for resizing
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
</script>

<template>
  <div class="min-h-screen bg-black text-zinc-200 font-sans selection:bg-blue-500/30">
    <AppHeader :step="step" @reset="handleReset" />

    <!-- Main Layout -->
    <main
      ref="mainContainerRef"
      class="max-w-[1600px] mx-auto p-4 md:p-6 flex flex-col lg:flex-row h-[calc(100vh-56px)] overflow-hidden gap-6 lg:gap-0"
    >
      <!-- Left Col: Agents & Chat -->
      <div
        ref="leftPanelRef"
        class="flex flex-col h-full min-h-0 w-full lg:w-[var(--left-width)] shrink-0 lg:pr-3 transition-[width] duration-0"
        :style="{ '--left-width': `${leftPanelWidth}%` }"
      >
        <!-- 1. Agents View (Resizable Height) -->
        <div
          class="overflow-hidden shrink-0 flex flex-col min-h-0 space-y-3"
          :style="{ height: `${leftPanelAgentHeight}%`, minHeight: '100px' }"
        >
          <div class="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2">
            <AgentVisualizer :agents="agents" />
          </div>

          <!-- Agent Conversation Panel -->
          <AgentConversationPanel
            v-if="conversation.messages.length > 0"
            :conversation="conversation"
            :expanded="conversationExpanded"
            @toggle="conversationExpanded = !conversationExpanded"
          />
        </div>

        <!-- 2. Action Toolbar -->
        <div @mousedown="startResizeLeftVertical">
          <ActionToolbar
            :step="step"
            :is-loading="isLoading"
            @generate-outline="handleGenerateOutline"
            @create-plan="handleCreatePlan"
            @start-writing="handleStartWriting"
            @polish="handlePolish"
          />
        </div>

        <!-- 3. Chat (Bottom - Fills remaining space) -->
        <div class="flex-1 min-h-0">
          <ChatPanel
            :messages="messages"
            :is-loading="isLoading"
            :step="step"
            @send-message="handleSendMessage"
          />
        </div>
      </div>

      <!-- Layout Resize Handle (Left vs Right) -->
      <div
        class="hidden lg:flex w-3 items-center justify-center cursor-col-resize hover:bg-zinc-800/50 transition-colors group z-50 shrink-0"
        @mousedown="startResize('layout-width')"
      >
        <div
          class="w-0.5 h-12 rounded-full transition-colors"
          :class="activeTarget === 'layout-width' ? 'bg-blue-500' : 'bg-zinc-800 group-hover:bg-blue-400'"
        />
      </div>

      <!-- Right Col: Workspace (Fills remaining space) -->
      <div class="flex-1 h-full min-h-0 w-full lg:pl-3">
        <PaperWorkspace
          :paper-state="paper"
          :read-only="step === 'WRITING'"
          @change="(updates) => Object.assign(paper, updates)"
        />
      </div>
    </main>
  </div>
</template>
