# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

前端使用如下框架进行前端内容开发：VUE3+TypeScript+Pinia+ArcoDesign+pnpm+Vite

## Project Overview

ScholarGrid AI is a Vue 3 + TypeScript application that helps users write academic papers through AI-powered agents. The app uses Google Gemini API to coordinate multiple AI agents (Researcher, Outliner, Planner, Writers, Editor) that collaborate on paper creation.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

The app requires a Google Gemini API key. Set it in `.env` (not `.env.local`):

```
API_KEY=your_gemini_api_key_here
```

The app checks for the API key on mount and displays a warning if missing or invalid.

## Architecture

### Multi-Agent Workflow System

The application is built around a **state machine** that progresses through defined workflow steps:

1. **INPUT** → User enters research topic
2. **RESEARCH** → Researcher agent finds references
3. **OUTLINE** → Outliner agent creates paper structure
4. **PLAN** → Planner agent assigns tasks to writer agents
5. **WRITING** → Multiple writer agents draft sections in parallel
6. **POLISHING** → Editor agent refines the full draft
7. **COMPLETE** → Final paper ready

The `step` ref in `usePaperWorkflow` composable controls which actions are available.

### Composables Architecture

The app uses Vue 3 Composition API with **composables for logic separation**:

- **`usePaperWorkflow`** - Core state machine managing the writing workflow, paper state, and coordinating all AI operations
- **`useAgents`** - Manages agent state (idle/working/finished) and dynamic writer agent creation
- **`useChat`** - Handles chat messages, auto-scrolling, and conversation history context
- **`useMultiResizable`** - Reusable resizable panel logic (used for both main layout and workspace sub-panels)

**Key pattern**: Composables compose other composables. `usePaperWorkflow` uses `useAgents` and `useChat` internally. When working with workflow logic, you'll typically interact with `usePaperWorkflow` rather than the lower-level composables directly.

### Component Structure

Components follow **single responsibility principle** and are organized by function:

- **Layout Components**: `AppHeader`, `ActionToolbar`, `ResizeHandle`
- **Agent Display**: `AgentVisualizer` - Grid of agent status cards
- **Workspace**: `PaperWorkspace` - Complex panel with references, outline editor, and draft textarea (all independently resizable)
- **Communication**: `ChatPanel` - Main chat interface with step-aware placeholders
- **Legacy**: `ChatInterface` (fantasy themed variant), `ApprovalDashboard` (unused, can be removed)

### Resizable Panels

The app has **nested resizable layouts**:
1. Main layout: Left panel (agents + chat) vs Right panel (workspace)
2. Left panel: Agents view vs Chat panel
3. Workspace: References vs Outline (horizontal), then vs Draft (vertical)

All resizing uses the `useMultiResizable` composable which:
- Tracks an `activeTarget` string to identify which resize handle is active
- Calculates new percentages based on mouse position relative to container
- Automatically sets cursor style and prevents text selection during drag

### AI Service Integration

The `geminiService.ts` provides:
- **Exponential backoff retry** - Handles 429 quota errors automatically (5 retries, 4s initial delay, 1.5x backoff)
- **Structured output** - Uses `responseMimeType: 'application/json'` and `responseSchema` for type-safe responses
- **Rate limit awareness** - 3-second delays between section writes to avoid hitting free tier limits

### State Management Patterns

- **Paper state** is a `reactive` object in `usePaperWorkflow` containing references, outline, tasks, and content
- **Components receive paper state via props** and emit change events with partial updates
- **Never mutate paper state directly** - always emit `@change` events with `Partial<PaperState>`

### Chat Context Management

When users provide input during RESEARCH, OUTLINE, or POLISHING steps, the app includes **conversation history** (last 15 messages) as context to Gemini API. This allows the AI to maintain coherence across refinements.

## Working with This Codebase

### Adding a New Workflow Step

1. Add the step to `WorkflowStep` type in `types.ts`
2. Update `ActionToolbar.vue` to show appropriate button for the new step
3. Add handler in `usePaperWorkflow` (similar to `handleRefineOutline`)
4. Update `ChatPanel.vue` placeholder text for the new step
5. Wire up the action in `App.vue`'s `handleSendMessage` switch statement

### Modifying Agent Behavior

Agents are defined in `INITIAL_AGENTS` constant in `useAgents.ts`. The system supports dynamic agent creation - see `addWriterAgent` which is called when the planner creates writing tasks.

### Understanding Paper Data Flow

```
User input → ChatPanel → App.handleSendMessage → usePaperWorkflow handlers
                                    ↓
                        Gemini API calls (with retry logic)
                                    ↓
                        Update paper.reactive state
                                    ↓
                        PaperWorkspace receives via props
                                    ↓
                        User edits → @change event → Object.assign(paper, updates)
```

### Common Pitfalls

- **Rate limits**: The free Gemini tier has strict limits. The app includes 3-second delays between section writes and exponential backoff retries, but adding parallel operations may trigger 429 errors
- **Component props**: When passing `paper` state to components, use `:paper-state="paper"` not `:paper="paper"` to match the prop name
- **Resize handlers**: Always check if the click target is a button before starting resize (see `startResizeLeftVertical` in App.vue)
- **History context**: Chat history is only included for specific steps (RESEARCH, OUTLINE, POLISHING). The INPUT step starts fresh without history.

## File Organization Notes

- `composables/` - All reusable logic, no UI components
- `services/` - External API integrations (currently just Gemini)
- `components/` - Vue SFCs using `<script setup lang="ts">` pattern
- `types.ts` - Shared TypeScript interfaces used across composables and components
