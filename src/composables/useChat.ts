import { ref, computed } from 'vue';
import type { ChatMessage } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useChat() {
  const messages = ref<ChatMessage[]>([]);
  const isLoading = ref(false);

  const addMessage = (text: string, role: 'user' | 'model') => {
    messages.value.push({ id: generateId(), role, text });
  };

  const addUserMessage = (text: string) => {
    addMessage(text, 'user');
  };

  const addBotMessage = (text: string) => {
    addMessage(text, 'model');
  };

  const getHistoryContext = (newMessage: string, maxMessages = 15) => {
    const history = messages.value
      .slice(-maxMessages)
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`)
      .join('\n');
    return `${history}\nUser: ${newMessage}`;
  };

  const clearMessages = () => {
    messages.value = [];
  };

  const messageCount = computed(() => messages.value.length);

  return {
    messages,
    isLoading,
    addUserMessage,
    addBotMessage,
    getHistoryContext,
    clearMessages,
    messageCount
  };
}
