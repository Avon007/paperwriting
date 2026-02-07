<script setup lang="ts">
import { computed } from 'vue';
import { Settings, DollarSign, Clock, Zap } from 'lucide-vue-next';
import { useAgentConfigManager } from '../composables/useAgentConfigManager';

const {
  config,
  selectedPreset,
  costEstimate,
  updateRoleConfig,
  applyPreset,
  resetToDefault,
  getPresets,
  getSpecializationPresets,
  applySpecializationPreset,
  exportConfig,
  importConfig
} = useAgentConfigManager();

const emit = defineEmits<{
  close: [];
}>();

const presets = getPresets();
const specializationPresets = getSpecializationPresets();

// Role icons and colors
const roleInfo = {
  researcher: { icon: '🔍', label: 'RESEARCHER (研究助理)', color: 'purple' },
  outliner: { icon: '📐', label: 'OUTLINER (架构师)', color: 'blue' },
  planner: { icon: '🎯', label: 'PLANNER (规划师)', color: 'green' },
  writer: { icon: '✍️', label: 'WRITER (写作专员)', color: 'orange' },
  editor: { icon: '🎨', label: 'EDITOR (编辑)', color: 'pink' }
};

// Strategy options
const strategyOptions = [
  { value: 'parallel', label: '并行执行' },
  { value: 'specialized', label: '专业化' },
  { value: 'diverse', label: '多样化' },
  { value: 'collaborative', label: '协作' },
  { value: 'merge', label: '融合' },
  { value: 'sequential', label: '顺序' }
];

// Vote method options
const voteMethodOptions = [
  { value: 'best', label: '最佳' },
  { value: 'majority', label: '多数' },
  { value: 'weighted', label: '加权' },
  { value: 'consensus', label: '共识' }
];

// Handle preset change
const handlePresetChange = (preset: string) => {
  applyPreset(preset);
};

// Handle specialization preset
const handleSpecializationPreset = (field: string) => {
  applySpecializationPreset(field);
};

// Export configuration
const handleExport = () => {
  const json = exportConfig();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agent-config.json';
  a.click();
  URL.revokeObjectURL(url);
};

// Import configuration
const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        if (json && importConfig(json)) {
          alert('配置已导入！');
        } else {
          alert('导入失败：配置格式不正确');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
};

// Reset configuration
const handleReset = () => {
  if (confirm('确定要重置为默认配置吗？')) {
    resetToDefault();
  }
};
</script>

<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <Settings :size="24" class="text-blue-400" />
        <h2 class="text-xl font-bold">智能体配置</h2>
      </div>
      <button @click="emit('close')" class="text-zinc-400 hover:text-white">
        ✕
      </button>
    </div>

    <!-- Preset Selection -->
    <div class="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
      <label class="text-sm text-zinc-400 mb-2 block">预设配置</label>
      <select
        :value="selectedPreset"
        @change="handlePresetChange(($event.target as HTMLSelectElement).value)"
        class="w-full bg-zinc-700 border border-zinc-600 rounded p-2 text-white"
      >
        <option value="basic">🟢 基础模式 (快速)</option>
        <option value="collaborative">🟡 协作模式 (均衡)</option>
        <option value="power">🔴 强力模式 (深度)</option>
        <option value="research-focused">🔵 研究优先 (全面)</option>
        <option value="custom">⚪ 自定义</option>
      </select>
    </div>

    <!-- Specialization Presets -->
    <div class="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
      <label class="text-sm text-zinc-400 mb-2 block">专业化预设</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in specializationPresets"
          :key="preset.value"
          @click="handleSpecializationPreset(preset.value)"
          class="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded text-sm transition-colors"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <!-- Cost Estimation -->
    <div class="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
      <div class="flex items-center gap-2 mb-3">
        <DollarSign :size="18" class="text-yellow-500" />
        <span class="font-semibold text-yellow-400">成本预估</span>
      </div>
      <div class="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div class="text-zinc-400">API 调用</div>
          <div class="font-bold text-lg">{{ costEstimate.apiCalls }}</div>
        </div>
        <div>
          <div class="text-zinc-400">预计成本</div>
          <div class="font-bold text-lg text-green-400">${{ costEstimate.estimatedCostUSD }}</div>
        </div>
        <div>
          <div class="text-zinc-400">预计时间</div>
          <div class="font-bold text-lg text-blue-400">{{ costEstimate.estimatedTime }}</div>
        </div>
      </div>
    </div>

    <!-- Role Configurations -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold mb-4">角色配置</h3>

      <!-- RESEARCHER -->
      <div class="role-config bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl">🔍</span>
          <span class="font-medium">RESEARCHER (研究助理)</span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label class="text-zinc-400 block mb-1">数量</label>
            <input
              type="number"
              :value="config.researcher.count"
              @input="updateRoleConfig('researcher', { count: Number(($event.target as HTMLInputElement).value) })"
              min="1"
              max="5"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            />
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">策略</label>
            <select
              :value="config.researcher.strategy"
              @change="updateRoleConfig('researcher', { strategy: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="strategy in strategyOptions" :key="strategy.value" :value="strategy.value">
                {{ strategy.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">互评</label>
            <div class="flex items-center h-10">
              <input
                type="checkbox"
                :checked="config.researcher.enablePeerReview"
                @change="updateRoleConfig('researcher', { enablePeerReview: ($event.target as HTMLInputElement).checked })"
                class="w-5 h-5"
              />
            </div>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">投票</label>
            <select
              :value="config.researcher.voteMethod"
              @change="updateRoleConfig('researcher', { voteMethod: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="method in voteMethodOptions" :key="method.value" :value="method.value">
                {{ method.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Specializations (if specialized strategy) -->
        <div v-if="config.researcher.strategy === 'specialized'" class="mt-3 pt-3 border-t border-zinc-700">
          <label class="text-zinc-400 block mb-2 text-sm">专业化方向</label>
          <input
            type="text"
            :value="(config.researcher.specializations || []).join(', ')"
            @input="updateRoleConfig('researcher', { specializations: ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()) })"
            placeholder="理论方法, 实验应用, 最新进展"
            class="w-full bg-zinc-700 border border-zinc-600 rounded p-2 text-sm"
          />
        </div>
      </div>

      <!-- OUTLINER -->
      <div class="role-config bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl">📐</span>
          <span class="font-medium">OUTLINER (架构师)</span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label class="text-zinc-400 block mb-1">数量</label>
            <input
              type="number"
              :value="config.outliner.count"
              @input="updateRoleConfig('outliner', { count: Number(($event.target as HTMLInputElement).value) })"
              min="1"
              max="5"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            />
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">策略</label>
            <select
              :value="config.outliner.strategy"
              @change="updateRoleConfig('outliner', { strategy: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="strategy in strategyOptions" :key="strategy.value" :value="strategy.value">
                {{ strategy.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">互评</label>
            <div class="flex items-center h-10">
              <input
                type="checkbox"
                :checked="config.outliner.enablePeerReview"
                @change="updateRoleConfig('outliner', { enablePeerReview: ($event.target as HTMLInputElement).checked })"
                class="w-5 h-5"
              />
            </div>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">投票</label>
            <select
              :value="config.outliner.voteMethod"
              @change="updateRoleConfig('outliner', { voteMethod: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="method in voteMethodOptions" :key="method.value" :value="method.value">
                {{ method.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- PLANNER -->
      <div class="role-config bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl">🎯</span>
          <span class="font-medium">PLANNER (规划师)</span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label class="text-zinc-400 block mb-1">数量</label>
            <input
              type="number"
              :value="config.planner.count"
              @input="updateRoleConfig('planner', { count: Number(($event.target as HTMLInputElement).value) })"
              min="1"
              max="5"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            />
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">策略</label>
            <select
              :value="config.planner.strategy"
              @change="updateRoleConfig('planner', { strategy: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="strategy in strategyOptions" :key="strategy.value" :value="strategy.value">
                {{ strategy.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">互评</label>
            <div class="flex items-center h-10">
              <input
                type="checkbox"
                :checked="config.planner.enablePeerReview"
                @change="updateRoleConfig('planner', { enablePeerReview: ($event.target as HTMLInputElement).checked })"
                class="w-5 h-5"
              />
            </div>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">投票</label>
            <select
              :value="config.planner.voteMethod"
              @change="updateRoleConfig('planner', { voteMethod: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="method in voteMethodOptions" :key="method.value" :value="method.value">
                {{ method.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- WRITER -->
      <div class="role-config bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl">✍️</span>
          <span class="font-medium">WRITER (写作专员)</span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label class="text-zinc-400 block mb-1">数量/章节</label>
            <input
              type="number"
              :value="config.writer.count"
              @input="updateRoleConfig('writer', { count: Number(($event.target as HTMLInputElement).value) })"
              min="1"
              max="5"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            />
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">策略</label>
            <select
              :value="config.writer.strategy"
              @change="updateRoleConfig('writer', { strategy: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="strategy in strategyOptions" :key="strategy.value" :value="strategy.value">
                {{ strategy.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">互评</label>
            <div class="flex items-center h-10">
              <input
                type="checkbox"
                :checked="config.writer.enablePeerReview"
                @change="updateRoleConfig('writer', { enablePeerReview: ($event.target as HTMLInputElement).checked })"
                class="w-5 h-5"
              />
            </div>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">投票</label>
            <select
              :value="config.writer.voteMethod"
              @change="updateRoleConfig('writer', { voteMethod: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="method in voteMethodOptions" :key="method.value" :value="method.value">
                {{ method.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- EDITOR -->
      <div class="role-config bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl">🎨</span>
          <span class="font-medium">EDITOR (编辑)</span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label class="text-zinc-400 block mb-1">数量</label>
            <input
              type="number"
              :value="config.editor.count"
              @input="updateRoleConfig('editor', { count: Number(($event.target as HTMLInputElement).value) })"
              min="1"
              max="5"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            />
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">策略</label>
            <select
              :value="config.editor.strategy"
              @change="updateRoleConfig('editor', { strategy: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="strategy in strategyOptions" :key="strategy.value" :value="strategy.value">
                {{ strategy.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">互评</label>
            <div class="flex items-center h-10">
              <input
                type="checkbox"
                :checked="config.editor.enablePeerReview"
                @change="updateRoleConfig('editor', { enablePeerReview: ($event.target as HTMLInputElement).checked })"
                class="w-5 h-5"
              />
            </div>
          </div>

          <div>
            <label class="text-zinc-400 block mb-1">投票</label>
            <select
              :value="config.editor.voteMethod"
              @change="updateRoleConfig('editor', { voteMethod: ($event.target as HTMLSelectElement).value as any })"
              class="w-full bg-zinc-700 border border-zinc-600 rounded p-2"
            >
              <option v-for="method in voteMethodOptions" :key="method.value" :value="method.value">
                {{ method.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="mt-6 flex gap-3">
      <button
        @click="handleExport"
        class="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded p-2 text-sm"
      >
        导出配置
      </button>
      <button
        @click="handleImport"
        class="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded p-2 text-sm"
      >
        导入配置
      </button>
      <button
        @click="handleReset"
        class="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded p-2 text-sm border border-red-600/50"
      >
        重置
      </button>
    </div>
  </div>
</template>
