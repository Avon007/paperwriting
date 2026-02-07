import { ref, watch } from 'vue';
import type { AgentConfig } from '../types';
import {
  DEFAULT_AGENT_CONFIG,
  AGENT_CONFIG_PRESETS,
  SPECIALIZATION_PRESETS,
  loadAgentConfig as loadConfig,
  saveAgentConfig as saveConfig,
  resetAgentConfig,
  estimateCost
} from '../config/agentConfig';

/**
 * Agent Configuration Management Composable
 * Provides UI-friendly configuration management
 */
export function useAgentConfigManager() {
  const config = ref<AgentConfig>(loadConfig());
  const selectedPreset = ref<string>('custom');

  // Watch for config changes and auto-save
  watch(
    config,
    (newConfig) => {
      saveConfig(newConfig);
    },
    { deep: true }
  );

  /**
   * Update configuration for a specific role
   */
  const updateRoleConfig = (
    role: keyof AgentConfig,
    updates: Partial<AgentConfig[keyof AgentConfig]>
  ) => {
    config.value[role] = { ...config.value[role], ...updates };
  };

  /**
   * Apply a preset configuration
   */
  const applyPreset = (presetName: string) => {
    if (presetName === 'custom') {
      return; // Don't override custom config
    }

    const preset = AGENT_CONFIG_PRESETS[presetName];
    if (preset) {
      config.value = JSON.parse(JSON.stringify(preset));
      selectedPreset.value = presetName;
    }
  };

  /**
   * Reset to default configuration
   */
  const resetToDefault = () => {
    config.value = JSON.parse(JSON.stringify(DEFAULT_AGENT_CONFIG));
    selectedPreset.value = 'basic';
  };

  /**
   * Get cost estimate for current configuration
   */
  const getCostEstimate = computed(() => {
    return estimateCost(config.value);
  });

  /**
   * Check if current config matches a preset
   */
  const detectPreset = computed(() => {
    // Simple comparison - could be more sophisticated
    for (const [name, preset] of Object.entries(AGENT_CONFIG_PRESETS)) {
      if (JSON.stringify(config.value) === JSON.stringify(preset)) {
        return name;
      }
    }
    return 'custom';
  });

  /**
   * Update preset when config changes
   */
  watch(
    config,
    () => {
      selectedPreset.value = detectPreset.value;
    },
    { deep: true }
  );

  /**
   * Get available presets
   */
  const getPresets = () => {
    return Object.keys(AGENT_CONFIG_PRESETS).map(name => ({
      value: name,
      label: {
        basic: '基础模式 (快速)',
        collaborative: '协作模式 (均衡)',
        power: '强力模式 (深度)',
        'research-focused': '研究优先 (全面)'
      }[name] || name
    }));
  };

  /**
   * Get specialization presets for a field
   */
  const getSpecializationPresets = () => {
    return Object.keys(SPECIALIZATION_PRESETS).map(field => ({
      value: field,
      label: {
        'computer-science': '计算机科学',
        medicine: '医学',
        engineering: '工程学',
        'social-science': '社会科学',
        humanities: '人文科学'
      }[field] || field
    }));
  };

  /**
   * Apply specialization preset to researcher role
   */
  const applySpecializationPreset = (field: string) => {
    const specializations = SPECIALIZATION_PRESETS[field];
    if (specializations) {
      updateRoleConfig('researcher', {
        count: Math.max(config.value.researcher.count, specializations.length),
        strategy: 'specialized',
        specializations
      });
    }
  };

  /**
   * Export configuration to JSON
   */
  const exportConfig = () => {
    return JSON.stringify(config.value, null, 2);
  };

  /**
   * Import configuration from JSON
   */
  const importConfig = (jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString);
      // Validate structure
      if (imported.researcher && imported.outliner && imported.planner && imported.writer && imported.editor) {
        config.value = imported;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import config:', error);
      return false;
    }
  };

  return {
    // State
    config,
    selectedPreset,
    costEstimate: getCostEstimate,
    currentPreset: detectPreset,

    // Methods
    updateRoleConfig,
    applyPreset,
    resetToDefault,
    getPresets,
    getSpecializationPresets,
    applySpecializationPreset,
    exportConfig,
    importConfig
  };
}

// Helper computed import
import { computed } from 'vue';
