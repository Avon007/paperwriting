import { ref, reactive, watch } from 'vue';
import type { PaperState, WorkflowStep, WritingTask, OutlineItem, Reference } from '../types';
import {
  researchTopic,
  generateOutline,
  refineOutline,
  createWritingPlan,
  writeSection,
  polishPaper
} from '../services/geminiService';
import { useAgents } from './useAgents';
import { useChat } from './useChat';

export function usePaperWorkflow() {
  const { agents, updateAgent, addWriterAgent } = useAgents();
  const { addBotMessage, getHistoryContext } = useChat();

  const step = ref<WorkflowStep>('INPUT');
  const isLoading = ref(false);
  const topic = ref('');

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
    Object.assign(paper, {
      topic: '',
      references: [],
      outline: [],
      tasks: [],
      fullContent: '',
      finalPolish: ''
    });
  };

  return {
    // State
    step,
    isLoading,
    topic,
    paper,
    agents,

    // Actions
    performResearch,
    handleGenerateOutline,
    handleCreatePlan,
    handleStartWriting,
    handlePolish,
    handleRefineOutline,
    handleEditPaper,
    resetWorkflow,

    // Helpers
    handleError
  };
}
