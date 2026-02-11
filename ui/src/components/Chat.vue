<template>
  <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
    <!-- 顶栏 -->
    <div class="flex items-center px-4 py-3 border-b border-neutral-800">
      <button @click="$emit('toggle-sidebar')" class="p-1 hover:bg-neutral-800 rounded-lg cursor-pointer md:hidden mr-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span class="text-sm text-neutral-400 truncate">{{ title }}</span>
      <button @click="$emit('open-panel')" class="ml-auto flex items-center gap-1.5 px-2 py-1 hover:bg-neutral-800 rounded-lg cursor-pointer text-xs text-neutral-500">
        <span class="w-2 h-2 rounded-full" :class="{
          'bg-green-500': wsStatus === 'connected',
          'bg-yellow-500': wsStatus === 'connecting',
          'bg-neutral-600': wsStatus === 'disconnected'
        }" />
        {{ wsStatus === 'connected' ? '已连接' : wsStatus === 'connecting' ? '连接中' : '未连接' }}
      </button>
    </div>

    <!-- 消息列表 -->
    <div ref="msgBox" @scroll="onScroll" class="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
      <div v-if="hasMore" class="flex justify-center">
        <span class="text-xs text-neutral-500">加载更多...</span>
      </div>
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="flex"
        :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div class="max-w-[80%] min-w-0 overflow-hidden">
          <div
            class="px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-all overflow-x-auto"
            style="overflow-wrap: anywhere; word-break: break-all;"
            :class="{
              'bg-blue-600 text-white': m.role === 'user',
              'bg-neutral-800': m.role === 'assistant',
              'bg-neutral-800/50 border border-neutral-700 font-mono text-xs text-green-400': m.role === 'tool'
            }"
          >
            {{ m.content }}
          </div>
        </div>
      </div>

      <div v-if="busy" class="flex justify-start">
        <div class="bg-neutral-800 px-4 py-2.5 rounded-xl text-sm text-neutral-400">思考中...</div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="p-4 border-t border-neutral-800 flex gap-3 items-end">
      <textarea
        ref="textarea"
        v-model="input"
        @input="autoResize"
        @keydown.enter.exact="onEnter"
        @compositionstart="composing = true"
        @compositionend="composing = false"
        placeholder="输入消息..."
        rows="1"
        class="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-600 max-h-40 overflow-y-auto leading-relaxed"
      />
      <button
        @click="handleSend"
        :disabled="busy || !input.trim()"
        class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm cursor-pointer shrink-0"
      >
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue';

const props = defineProps(['messages', 'busy', 'hasMore', 'title', 'wsStatus']);
const emit = defineEmits(['send', 'toggle-sidebar', 'load-more', 'open-panel']);

const input = ref('');
const msgBox = ref(null);
const textarea = ref(null);
const composing = ref(false);

const autoResize = () => {
  const el = textarea.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
};

const onEnter = (e) => {
  if (composing.value) return;
  e.preventDefault();
  handleSend();
};

const handleSend = () => {
  const text = input.value.trim();
  if (!text || props.busy) return;
  emit('send', text);
  input.value = '';
  nextTick(() => {
    if (textarea.value) textarea.value.style.height = 'auto';
  });
};

// 滚动到顶部加载更多
const onScroll = () => {
  const el = msgBox.value;
  if (!el || !props.hasMore) return;
  if (el.scrollTop < 50) {
    const oldHeight = el.scrollHeight;
    emit('load-more');
    // 加载后保持滚动位置
    nextTick(() => {
      el.scrollTop = el.scrollHeight - oldHeight;
    });
  }
};

// 自动滚底（仅新消息时）
let isLoadMore = false;
watch(() => props.messages.length, (newLen, oldLen) => {
  // 加载更多是往前拼接，不滚底
  if (oldLen > 0 && newLen - oldLen > 5) {
    return;
  }
  nextTick(() => {
    if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight;
  });
});
</script>
