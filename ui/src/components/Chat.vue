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
          <!-- 工具调用卡片（auto 模式 + ask 模式） -->
          <div v-if="m.type === 'tool_call' || m.type === 'confirm' || m.type === 'tool_result'" class="tool-card">
            <div v-if="m.reason" class="tool-reason">{{ m.reason }}</div>
            <div v-if="m.command" class="tool-command">{{ m.command }}</div>
            <!-- ask 模式：待确认按钮 -->
            <div v-if="m.type === 'confirm' && m.pending" class="tool-actions">
              <button @click="$emit('tool-approve')" class="tool-btn tool-btn-approve">允许</button>
              <button @click="$emit('tool-reject')" class="tool-btn tool-btn-reject">拒绝</button>
            </div>
            <!-- ask 模式：已确认/已拒绝 -->
            <div v-else-if="m.type === 'confirm' && m.status" class="tool-status">{{ m.status === 'approved' ? '已允许' : '已拒绝' }}</div>
            <!-- 执行结果（可折叠） -->
            <div v-if="m.result || m.content" class="tool-output-wrap">
              <button @click="toggleResult(m)" class="tool-output-toggle">
                {{ m.expanded ? '▾ 收起输出' : '▸ 查看输出' }}
              </button>
              <div v-if="m.expanded" class="tool-output">{{ m.result || m.content }}</div>
            </div>
          </div>
          <!-- 普通消息 -->
          <div
            v-else
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
    <div class="p-4 border-t border-neutral-800 flex gap-3 items-stretch">
      <!-- 模式切换 -->
      <div class="relative shrink-0">
        <button
          @click.stop="showMenu = !showMenu"
          class="px-3 py-2.5 rounded-lg text-xs cursor-pointer border"
          :class="mode === 'auto' ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-yellow-900/30 border-yellow-700 text-yellow-400'"
        >
          {{ mode === 'auto' ? 'Auto' : 'Ask' }}
        </button>
        <div v-if="showMenu" class="absolute bottom-full left-0 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden z-10 min-w-[140px]">
          <button
            @click="$emit('set-mode', 'auto'); showMenu = false"
            class="w-full px-3 py-2 text-left text-xs hover:bg-neutral-700 cursor-pointer"
            :class="mode === 'auto' ? 'text-green-400' : 'text-neutral-400'"
          >
            <div class="font-medium">Auto</div>
            <div class="text-neutral-500 mt-0.5">自动执行所有命令</div>
          </button>
          <button
            @click="$emit('set-mode', 'ask'); showMenu = false"
            class="w-full px-3 py-2 text-left text-xs hover:bg-neutral-700 cursor-pointer"
            :class="mode === 'ask' ? 'text-yellow-400' : 'text-neutral-400'"
          >
            <div class="font-medium">Ask</div>
            <div class="text-neutral-500 mt-0.5">每次执行前需确认</div>
          </button>
        </div>
      </div>
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
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps(['messages', 'busy', 'hasMore', 'title', 'wsStatus', 'mode']);
const emit = defineEmits(['send', 'toggle-sidebar', 'load-more', 'open-panel', 'set-mode', 'tool-approve', 'tool-reject']);

// 切换工具结果展开/折叠
const toggleResult = (m) => {
  m.expanded = !m.expanded;
};

const input = ref('');
const msgBox = ref(null);
const textarea = ref(null);
const composing = ref(false);
const showMenu = ref(false);

const closeMenu = (e) => {
  if (showMenu.value) showMenu.value = false;
};
onMounted(() => document.addEventListener('click', closeMenu));
onUnmounted(() => document.removeEventListener('click', closeMenu));

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
    nextTick(() => {
      el.scrollTop = el.scrollHeight - oldHeight;
    });
  }
};

// 自动滚底
watch(() => props.messages.length, (newLen, oldLen) => {
  if (oldLen > 0 && newLen - oldLen > 5) return;
  nextTick(() => {
    if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight;
  });
});
</script>

<style scoped>
.tool-card {
  background: rgba(38, 38, 38, 0.5);
  border: 1px solid #404040;
  border-radius: 12px;
  overflow: hidden;
}
.tool-reason {
  padding: 8px 14px;
  font-size: 12px;
  color: #a3a3a3;
  background: rgba(38, 38, 38, 0.8);
  border-bottom: 1px solid #333;
}
.tool-command {
  padding: 10px 14px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #4ade80;
  word-break: break-all;
}
.tool-actions {
  padding: 8px 14px;
  border-top: 1px solid #333;
  display: flex;
  gap: 8px;
}
.tool-btn {
  padding: 4px 14px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: none;
}
.tool-btn-approve {
  background: #1a3a2a;
  color: #6ee7a0;
}
.tool-btn-approve:hover {
  background: #1e4d35;
}
.tool-btn-reject {
  background: #3a1a1a;
  color: #f87171;
}
.tool-btn-reject:hover {
  background: #4d1e1e;
}
.tool-status {
  padding: 6px 14px;
  border-top: 1px solid #333;
  font-size: 11px;
  color: #737373;
}
.tool-output-wrap {
  border-top: 1px solid #333;
}
.tool-output-toggle {
  padding: 6px 14px;
  font-size: 11px;
  color: #737373;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
}
.tool-output-toggle:hover {
  color: #a3a3a3;
}
.tool-output {
  padding: 8px 14px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: #a3a3a3;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  border-top: 1px solid #2a2a2a;
}
</style>
