<template>
  <div class="control-panel">
    <div class="control-panel__header">
      <h2>瀑布流控制面板</h2>
      <div class="control-panel__stats">
        <span class="stat-item">
          <strong>渲染元素:</strong> {{ renderedCount }}
        </span>
        <span class="stat-item">
          <strong>总元素:</strong> {{ totalCount }}
        </span>
        <span class="stat-item">
          <strong>加载状态:</strong>
          {{ isFetching ? '加载中' : '空闲' }}
        </span>
      </div>
    </div>

    <div class="control-panel__body">
      <div class="control-group">
        <label class="control-label">布局模式</label>
        <select v-model="localSettings.layout" class="control-select">
          <option value="basic">基础布局</option>
          <option value="basicCentered">居中布局</option>
          <option value="flexible">灵活布局</option>
          <option value="uniformRow">统一行高</option>
        </select>
      </div>

      <div class="control-group">
        <label class="control-label">对齐方式</label>
        <select v-model="localSettings.align" class="control-select">
          <option value="start">左对齐</option>
          <option value="center">居中对齐</option>
          <option value="end">右对齐</option>
        </select>
      </div>

      <div class="control-group">
        <label class="control-label">
          列宽: {{ localSettings.columnWidth }}px
        </label>
        <input
          v-model.number="localSettings.columnWidth"
          type="range"
          min="150"
          max="400"
          step="10"
          class="control-slider"
        />
      </div>

      <div class="control-group">
        <label class="control-label">
          间距: {{ localSettings.gutterWidth }}px
        </label>
        <input
          v-model.number="localSettings.gutterWidth"
          type="range"
          min="0"
          max="50"
          step="2"
          class="control-slider"
        />
      </div>

      <div class="control-group">
        <label class="control-label">
          最小列数: {{ localSettings.minCols }}
        </label>
        <input
          v-model.number="localSettings.minCols"
          type="range"
          min="1"
          max="8"
          step="1"
          class="control-slider"
        />
      </div>

      <div class="control-group">
        <label class="control-checkbox">
          <input
            v-model="localSettings.virtualize"
            type="checkbox"
          />
          启用虚拟滚动
        </label>
      </div>

      <div class="control-group">
        <label class="control-checkbox">
          <input
            v-model="localSettings.dynamicHeights"
            type="checkbox"
          />
          动态高度检测
        </label>
      </div>

      <div class="control-group">
        <label class="control-label">
          虚拟滚动缓冲区: {{ (localSettings.virtualBufferFactor * 100).toFixed(0) }}%
        </label>
        <input
          v-model.number="localSettings.virtualBufferFactor"
          type="range"
          min="0"
          max="2"
          step="0.1"
          class="control-slider"
          :disabled="!localSettings.virtualize"
        />
      </div>
    </div>

    <div class="control-panel__actions">
      <button @click="resetSettings" class="control-button control-button--secondary">
        重置设置
      </button>
      <button @click="loadMoreImages" class="control-button control-button--primary">
        加载更多图片
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

export interface MasonrySettings {
  layout: 'basic' | 'basicCentered' | 'flexible' | 'uniformRow'
  align: 'start' | 'center' | 'end'
  columnWidth: number
  gutterWidth: number
  minCols: number
  virtualize: boolean
  dynamicHeights: boolean
  virtualBufferFactor: number
}

interface Props {
  settings: MasonrySettings
  renderedCount: number
  totalCount: number
  isFetching: boolean
}

interface Emits {
  (e: 'update:settings', settings: MasonrySettings): void
  (e: 'load-more'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localSettings = reactive<MasonrySettings>({ ...props.settings })

const defaultSettings: MasonrySettings = {
  layout: 'basic',
  align: 'center',
  columnWidth: 236,
  gutterWidth: 14,
  minCols: 3,
  virtualize: false,
  dynamicHeights: true,
  virtualBufferFactor: 0.7
}

// 监听设置变化并向上传递
watch(
  () => localSettings,
  (newSettings) => {
    emit('update:settings', { ...newSettings })
  },
  { deep: true }
)

// 监听外部设置变化
watch(
  () => props.settings,
  (newSettings) => {
    Object.assign(localSettings, newSettings)
  },
  { deep: true }
)

const resetSettings = () => {
  Object.assign(localSettings, defaultSettings)
}

const loadMoreImages = () => {
  emit('load-more')
}
</script>

<style scoped>
.control-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
  position: sticky;
  top: 20px;
  z-index: 100;
}

.control-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.control-panel__header h2 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.control-panel__stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

.stat-item strong {
  color: #333;
}

.control-panel__body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.control-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.control-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.control-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
}

.control-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #007bff;
  cursor: pointer;
}

.control-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #007bff;
  cursor: pointer;
  border: none;
}

.control-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.control-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.control-panel__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.control-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-button--primary {
  background: #007bff;
  color: white;
}

.control-button--primary:hover {
  background: #0056b3;
}

.control-button--secondary {
  background: #6c757d;
  color: white;
}

.control-button--secondary:hover {
  background: #545b62;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .control-panel__stats {
    justify-content: space-between;
  }

  .control-panel__body {
    grid-template-columns: 1fr;
  }

  .control-panel__actions {
    justify-content: stretch;
  }

  .control-button {
    flex: 1;
  }
}
</style>
