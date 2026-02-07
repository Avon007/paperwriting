import { ref, reactive, watch } from 'vue';
import type { PaperState, WorkflowStep, WritingTask, OutlineItem, Reference, Agent, AgentInstance, EvaluationResult } from '../types';
import {
  researchTopic,
  generateOutline,
  refineOutline,
  createWritingPlan,
  writeSection,
  polishPaper,
  runAgentCollaborationStep
} from '../services/geminiService';
import { useAgentChat } from './useAgentChat';
import { useMultiAgentResearch } from './useMultiAgentResearch';
import { loadAgentConfig } from '../config/agentConfig';

export function usePaperWorkflow(
  updateAgent: (id: string, status: Agent['status'], action?: string) => void,
  addWriterAgent: (id: string, name: string) => void,
  addBotMessage: (text: string) => void,
  getHistoryContext: (newMessage: string, maxMessages?: number) => string
) {
  const step = ref<WorkflowStep>('INPUT');
  const isLoading = ref(false);
  const topic = ref('');

  // Load agent config
  const agentConfig = loadAgentConfig();

  // Initialize multi-agent research system
  const {
    isLoading: isMultiAgentLoading,
    executionStatus,
    evaluationResults,
    agentInstances,
    executeMultiAgentResearch,
    getSummary,
    resetPool
  } = useMultiAgentResearch();

  // State for multi-agent results
  const showMultiAgentResults = ref(false);
  const currentMultiAgentRole = ref<'RESEARCHER' | 'OUTLINER' | 'PLANNER' | 'WRITER' | 'EDITOR'>('RESEARCHER');

  // Initialize agent chat system (Agency Swarm style)
  const {
    conversation,
    addMessage,
    getAgentContext,
    clearConversation,
    updateStep: updateConversationStep,
    formattedConversation
  } = useAgentChat();

  const paper = reactive<PaperState>({
    topic: '',
    references: [],
    outline: [],
    tasks: [],
    fullContent: '',
    finalPolish: ''
  });

  // Watch topic changes
  watch(topic, (newTopic) => {
    paper.topic = newTopic;
  });

  const handleError = (e: any, context: string) => {
    console.error(e);
    const msg = e.message || String(e);
    let userMsg = `Error during ${context}.`;

    if (
      msg.includes('429') ||
      msg.toLowerCase().includes('quota') ||
      msg.toLowerCase().includes('resource_exhausted')
    ) {
      userMsg = `⚠️ API Quota Exceeded (Speed Limit) during ${context}. I will automatically retry in a few seconds...`;
    } else if (
      msg.includes('400') ||
      msg.toLowerCase().includes('key') ||
      msg.includes('API key')
    ) {
      userMsg = `⚠️ Invalid API Key. Please check your .env file and ensure API_KEY is set correctly.`;
    }

    addBotMessage(userMsg);
  };

  const performResearch = async (instruction: string, isRefinement: boolean, history: string) => {
    const topicToSearch = isRefinement ? paper.topic : instruction;

    // Check if multi-agent research is enabled
    const useMultiAgent = agentConfig.researcher.count > 1;

    if (useMultiAgent) {
      // Multi-agent research workflow
      currentMultiAgentRole.value = 'RESEARCHER';
      showMultiAgentResults.value = true;

      addBotMessage(`🚀 启动多智能体研究模式 (${agentConfig.researcher.count} 个 RESEARCHER 智能体)...`);

      try {
        const result = await executeMultiAgentResearch(topicToSearch, (status) => {
          // Update execution status for UI feedback
          console.log('Multi-agent progress:', status);
        });

        // Use the best result
        paper.references = result.references;
        updateAgent('researcher', 'finished', `Found ${result.references.length} references (multi-agent)`);

        // Notify user
        const winnerMsg = result.winner
          ? `🏆 最佳方案由 ${result.winner.id} 提供 (得分: ${result.winner.score.toFixed(2)})`
          : '已完成多智能体研究';

        addBotMessage(`✅ 多智能体研究完成！\n${winnerMsg}\n\n共找到 ${result.references.length} 篇文献。\n${result.evaluations.length} 条互评已生成。`);
      } catch (e) {
        updateAgent('researcher', 'idle', 'Error');
        handleError(e, 'Multi-Agent Research');
      }
    } else {
      // Single-agent research workflow (original)
      updateAgent('researcher', 'working', `Scanning databases for: ${topicToSearch.slice(0, 30)}...`);
      try {
        const refs = await researchTopic(topicToSearch, history);
        paper.references = refs;
        updateAgent('researcher', 'finished', `Found ${refs.length} references`);
        addBotMessage(`I found ${refs.length} sources. Review them in the workspace.`);
      } catch (e) {
        updateAgent('researcher', 'idle', 'Error');
        handleError(e, 'Research');
      }
    }
  };

  const handleGenerateOutline = async () => {
    if (paper.references.length === 0) {
      addBotMessage('I need references first.');
      return;
    }
    isLoading.value = true;
    step.value = 'OUTLINE';
    updateAgent('outliner', 'working', 'Structuring arguments...');
    try {
      const outline = await generateOutline(paper.topic, paper.references);
      paper.outline = outline;
      updateAgent('outliner', 'finished', `Created ${outline.length} sections`);
      addBotMessage('Outline generated. You can edit it directly in the workspace.');
    } catch (e) {
      updateAgent('outliner', 'idle', 'Error');
      handleError(e, 'Outline Generation');
    } finally {
      isLoading.value = false;
    }
  };

  const handleCreatePlan = async () => {
    if (paper.outline.length === 0) return;
    isLoading.value = true;
    step.value = 'PLAN';
    updateAgent('planner', 'working', 'Assigning tasks to writer swarm...');
    try {
      const tasks = await createWritingPlan(paper.outline);
      paper.tasks = tasks;
      tasks.forEach(t => addWriterAgent(t.assignedAgent, `Unit ${t.id}`));
      updateAgent('planner', 'finished', 'Plan ready');
      addBotMessage("Writing plan created. Click 'Start Writing Swarm' to begin.");
    } finally {
      isLoading.value = false;
    }
  };

  const handleStartWriting = async () => {
    step.value = 'WRITING';
    isLoading.value = true;
    let currentContent = paper.fullContent;

    addBotMessage('Starting the writing process...');

    try {
      for (const task of paper.tasks) {
        updateAgent(task.assignedAgent, 'working', `Drafting: ${task.title}`);
        try {
          const sectionText = await writeSection(
            paper.topic,
            task,
            paper.outline,
            paper.references
          );
          const formattedSection = `\n\n## ${task.title}\n\n${sectionText}`;
          currentContent += formattedSection;
          paper.fullContent = currentContent;
          updateAgent(task.assignedAgent, 'finished', 'Section complete');

          // Wait 3 seconds between sections to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {
          updateAgent(task.assignedAgent, 'idle', 'Failed to write');
          console.error(e);
          addBotMessage(`⚠️ Failed to generate section: ${task.title}. Continuing...`);
        }
      }
      step.value = 'POLISHING';
      addBotMessage('Drafting complete. You can now Polish the text.');
    } catch (e) {
      handleError(e, 'Writing Process');
    } finally {
      isLoading.value = false;
    }
  };

  const handlePolish = async () => {
    isLoading.value = true;
    updateAgent('editor', 'working', 'Refining tone and flow...');
    try {
      const polished = await polishPaper(paper.fullContent);
      paper.fullContent = polished;
      updateAgent('editor', 'finished', 'Publication ready');
      step.value = 'COMPLETE';
      addBotMessage('Paper polished.');
    } catch (e) {
      handleError(e, 'Polishing');
      updateAgent('editor', 'idle', 'Error');
    } finally {
      isLoading.value = false;
    }
  };

  const handleRefineOutline = async (instruction: string, history: string) => {
    updateAgent('outliner', 'working', 'Refining outline structure...');
    try {
      const newOutline = await refineOutline(paper.outline, instruction, history);
      paper.outline = newOutline;
      updateAgent('outliner', 'finished', 'Outline updated');
      addBotMessage("I've updated the outline based on your feedback.");
    } catch (e) {
      updateAgent('outliner', 'idle', 'Error');
      handleError(e, 'Outline Refinement');
    }
  };

  const handleEditPaper = async (instruction: string, history: string) => {
    updateAgent('editor', 'working', 'Applying user edits...');
    try {
      const newText = await polishPaper(paper.fullContent, instruction, history);
      paper.fullContent = newText;
      updateAgent('editor', 'finished', 'Edits applied');
      addBotMessage("I've applied your edits to the manuscript.");
    } catch (e) {
      updateAgent('editor', 'idle', 'Error');
      handleError(e, 'Editing');
    }
  };

  const resetWorkflow = () => {
    topic.value = '';
    step.value = 'INPUT';
    clearConversation();
    Object.assign(paper, {
      topic: '',
      references: [],
      outline: [],
      tasks: [],
      fullContent: '',
      finalPolish: ''
    });
  };

  // ================== NEW AGENCY SWARM STYLE WORKFLOW ==================
  // This function runs a workflow step with inter-agent communication

  const runCollaborativeStep = async (workflowStep: WorkflowStep) => {
    isLoading.value = true;
    step.value = workflowStep;
    updateConversationStep(workflowStep);

    try {
      // Get conversation context for agents
      const agentContext = getAgentContext('RESEARCHER' as any); // Get full context

      // Run the collaborative step with inter-agent communication
      const { agentMessages, result } = await runAgentCollaborationStep(
        workflowStep,
        topic.value,
        {
          references: paper.references,
          outline: paper.outline,
          tasks: paper.tasks,
          content: paper.fullContent
        },
        agentContext
      );

      // Add all agent messages to the conversation
      agentMessages.forEach(msg => {
        addMessage(
          msg.from,
          msg.to,
          msg.content,
          workflowStep,
          result
        );
      });

      // Update paper state with results
      if (result.references) paper.references = result.references;
      if (result.outline) paper.outline = result.outline;
      if (result.tasks) {
        paper.tasks = result.tasks;
        // Add writer agents for each task
        result.tasks.forEach(task => {
          addWriterAgent(task.id, task.assignedAgent);
        });
      }
      if (result.content) {
        paper.fullContent = result.content;
        paper.finalPolish = result.content;
      }

      // Update agent statuses based on messages
      const lastMessage = agentMessages[agentMessages.length - 1];
      if (lastMessage) {
        updateAgent(
          lastMessage.from.toLowerCase(),
          'finished',
          `Message sent to ${lastMessage.to === 'ALL' ? 'all agents' : lastMessage.to}`
        );
      }

      // Notify user
      const stepNames: Record<WorkflowStep, string> = {
        INPUT: 'Input',
        RESEARCH: 'Research',
        OUTLINE: 'Outline',
        PLAN: 'Planning',
        WRITING: 'Writing',
        POLISHING: 'Polishing',
        COMPLETE: 'Complete'
      };
      addBotMessage(`✅ ${stepNames[workflowStep]} step completed! ${agentMessages.length} agent messages exchanged.`);

    } catch (e) {
      handleError(e, workflowStep);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // State
    step,
    isLoading,
    topic,
    paper,

    // Agent conversation state (NEW)
    conversation,
    formattedConversation,

    // Multi-agent state (NEW)
    showMultiAgentResults,
    currentMultiAgentRole,
    agentInstances,
    evaluationResults,
    executionStatus,

    // Actions
    performResearch,
    handleGenerateOutline,
    handleCreatePlan,
    handleStartWriting,
    handlePolish,
    handleRefineOutline,
    handleEditPaper,
    resetWorkflow,

    // NEW: Collaborative workflow actions
    runCollaborativeStep,

    // Multi-agent actions (NEW)
    getSummary,

    // Helpers
    handleError
  };
}
