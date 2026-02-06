import { ref, watch, onUnmounted } from 'vue';

// For multi-direction resize
export function useMultiResizable() {
  const activeTarget = ref<string | null>(null);

  const startResize = (target: string) => {
    activeTarget.value = target;
  };

  const stopResize = () => {
    activeTarget.value = null;
  };

  const calculateNewValue = (
    e: MouseEvent,
    container: HTMLElement,
    direction: 'horizontal' | 'vertical',
    min = 15,
    max = 85
  ): number | null => {
    if (!activeTarget.value) return null;

    const rect = container.getBoundingClientRect();
    let newValue: number;

    if (direction === 'horizontal') {
      newValue = ((e.clientX - rect.left) / rect.width) * 100;
    } else {
      newValue = ((e.clientY - rect.top) / rect.height) * 100;
    }

    return Math.max(min, Math.min(max, newValue));
  };

  watch(activeTarget, (target) => {
    if (target) {
      const cursor = target.includes('horizontal') ? 'col-resize' : 'row-resize';
      document.body.style.cursor = cursor;
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
  });

  onUnmounted(() => {
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  });

  return {
    activeTarget,
    startResize,
    stopResize,
    calculateNewValue
  };
}
