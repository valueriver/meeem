<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[100] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60 light:bg-black/30" @click="canClose && $emit('close')" />
      <div class="relative bg-neutral-900 light:bg-white border border-neutral-700 light:border-neutral-200 rounded-xl shadow-2xl w-96 max-h-[80vh] overflow-y-auto">

        <!-- 标题栏 -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-800 light:border-neutral-200">
          <span class="text-sm font-medium text-white light:text-neutral-900">控制面板</span>
          <button v-if="canClose" @click="$emit('close')" class="p-1.5 hover:bg-neutral-700 light:hover:bg-neutral-100 rounded-lg cursor-pointer">
            <svg class="w-5 h-5 text-neutral-300 light:text-neutral-500 hover:text-white light:hover:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-5 space-y-5">

          <!-- 1. 连接 -->
          <section class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0" :class="{
                'bg-green-500': wsStatus === 'connected',
                'bg-yellow-500 animate-pulse': wsStatus === 'connecting',
                'bg-red-500': wsStatus === 'disconnected'
              }" />
              <span class="text-xs text-neutral-400 light:text-neutral-500 font-medium">连接</span>
            </div>
            <input
              v-model="editUrl"
              placeholder="ws://localhost:3000/ws"
              class="w-full px-3 py-2 bg-neutral-800 light:bg-neutral-100 border border-neutral-700 light:border-neutral-300 rounded-lg text-sm text-neutral-200 light:text-neutral-800 focus:outline-none focus:border-blue-600"
              @keydown.enter="doConnect"
            />
            <button
              @click="doConnect"
              :disabled="wsStatus === 'connecting'"
              class="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm text-white cursor-pointer"
            >
              {{ wsStatus === 'connecting' ? '连接中...' : wsStatus === 'connected' ? '重新连接' : '连接' }}
            </button>
          </section>

          <div class="border-t border-neutral-800 light:border-neutral-200" />

          <!-- 2. API 配置 -->
          <section class="space-y-2">
            <span class="text-xs text-neutral-400 light:text-neutral-500 font-medium">API 配置</span>
            <input
              v-model="editApiUrl"
              placeholder="https://api.openai.com/v1/chat/completions"
              class="w-full px-3 py-2 bg-neutral-800 light:bg-neutral-100 border border-neutral-700 light:border-neutral-300 rounded-lg text-sm text-neutral-200 light:text-neutral-800 focus:outline-none focus:border-blue-600"
            />
            <input
              v-model="editApiKey"
              type="password"
              placeholder="API Key"
              class="w-full px-3 py-2 bg-neutral-800 light:bg-neutral-100 border border-neutral-700 light:border-neutral-300 rounded-lg text-sm text-neutral-200 light:text-neutral-800 focus:outline-none focus:border-blue-600"
            />
            <input
              v-model="editModel"
              placeholder="gpt-4o-mini"
              class="w-full px-3 py-2 bg-neutral-800 light:bg-neutral-100 border border-neutral-700 light:border-neutral-300 rounded-lg text-sm text-neutral-200 light:text-neutral-800 focus:outline-none focus:border-blue-600"
            />
          </section>

          <div class="border-t border-neutral-800 light:border-neutral-200" />

          <!-- 3. 提示词 -->
          <section class="space-y-2">
            <span class="text-xs text-neutral-400 light:text-neutral-500 font-medium">系统提示词</span>
            <p class="text-[11px] text-neutral-500 light:text-neutral-400">环境信息、置顶笔记、笔记 API 会自动追加</p>
            <textarea
              v-model="editPrompt"
              rows="8"
              class="w-full px-3 py-2 bg-neutral-800 light:bg-neutral-100 border border-neutral-700 light:border-neutral-300 rounded-lg text-sm text-neutral-200 light:text-neutral-800 resize-y focus:outline-none focus:border-blue-600"
            />
          </section>

          <div class="border-t border-neutral-800 light:border-neutral-200" />

          <!-- 4. 上下文轮数 -->
          <section class="space-y-2">
            <span class="text-xs text-neutral-400 light:text-neutral-500 font-medium">上下文轮数</span>
            <div class="flex gap-2">
              <button
                v-for="n in [10, 30, 100]"
                :key="n"
                @click="editRounds = n"
                class="flex-1 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                :class="editRounds === n ? 'bg-blue-600 text-white' : 'bg-neutral-800 light:bg-neutral-100 border border-neutral-700 light:border-neutral-300 text-neutral-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-900'"
              >
                {{ n }}
              </button>
            </div>
          </section>

          <div class="border-t border-neutral-800 light:border-neutral-200" />

          <!-- 5. 外观 -->
          <section class="space-y-2">
            <span class="text-xs text-neutral-400 light:text-neutral-500 font-medium">外观</span>
            <div class="flex gap-2">
              <button
                @click="$emit('set-theme', 'dark')"
                class="flex-1 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                :class="theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-neutral-800 light:bg-neutral-100 border border-neutral-700 light:border-neutral-300 text-neutral-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-900'"
              >
                深色
              </button>
              <button
                @click="$emit('set-theme', 'light')"
                class="flex-1 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                :class="theme === 'light' ? 'bg-blue-600 text-white' : 'bg-neutral-800 light:bg-neutral-100 border border-neutral-700 light:border-neutral-300 text-neutral-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-900'"
              >
                浅色
              </button>
            </div>
          </section>

        </div>

        <!-- 底部保存 -->
        <div class="px-5 py-4 border-t border-neutral-800 light:border-neutral-200 flex justify-end gap-2">
          <button v-if="canClose" @click="$emit('close')" class="px-4 py-2 text-sm text-neutral-400 hover:text-white light:hover:text-neutral-900 cursor-pointer">取消</button>
          <button @click="save" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white cursor-pointer">保存</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { wsStatus, wsUrl, connect as wsConnect } from '../ws.js';

const props = defineProps(['visible', 'systemPrompt', 'contextRounds', 'apiUrl', 'apiKey', 'model', 'theme']);
const emit = defineEmits(['close', 'update-settings', 'set-theme']);

const canClose = computed(() => wsStatus.value === 'connected');

// 连接
const editUrl = ref(wsUrl.value);
const doConnect = () => {
  const url = editUrl.value.trim();
  if (url) wsConnect(url);
};

// 设置编辑
const editPrompt = ref('');
const editRounds = ref(30);
const editApiUrl = ref('');
const editApiKey = ref('');
const editModel = ref('');

watch(() => props.visible, (v) => {
  if (v) {
    editPrompt.value = props.systemPrompt;
    editRounds.value = props.contextRounds;
    editApiUrl.value = props.apiUrl;
    editApiKey.value = props.apiKey;
    editModel.value = props.model;
    editUrl.value = wsUrl.value;
  }
});

const save = () => {
  emit('update-settings', {
    systemPrompt: editPrompt.value,
    contextRounds: editRounds.value,
    apiUrl: editApiUrl.value,
    apiKey: editApiKey.value,
    model: editModel.value
  });
  emit('close');
};

</script>
