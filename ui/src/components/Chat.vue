<template>
  <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
    <!-- 顶栏 -->
    <div class="flex items-center px-4 py-3 border-b border-neutral-800 light:border-neutral-200">
      <button @click="$emit('toggle-sidebar')" class="p-1 hover:bg-neutral-800 light:hover:bg-neutral-200 rounded-lg cursor-pointer md:hidden mr-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span class="text-sm text-neutral-400 truncate">{{ title }}</span>
      <button @click="$emit('open-panel')" class="ml-auto flex items-center gap-1.5 px-2 py-1 hover:bg-neutral-800 light:hover:bg-neutral-200 rounded-lg cursor-pointer text-xs text-neutral-500">
        <span class="w-2 h-2 rounded-full" :class="{
          'bg-green-500': wsStatus === 'connected',
          'bg-yellow-500': wsStatus === 'connecting',
          'bg-neutral-600': wsStatus === 'disconnected'
        }" />
        {{ wsStatus === 'connected' ? '已连接' : wsStatus === 'connecting' ? '连接中' : '未连接' }}
      </button>
    </div>

    <!-- 消息列表 -->
    <div ref="msgBox" @scroll="onScroll" class="flex-1 overflow-y-auto overflow-x-hidden p-6">
      <div class="max-w-2xl mx-auto space-y-4">
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
            <div v-else-if="m.role === 'assistant'" class="px-4 py-2.5 rounded-xl text-sm leading-relaxed bg-neutral-800 light:bg-neutral-100 markdown-body" v-html="renderMd(m.content)" />
            <div v-else-if="m.role === 'user'" class="px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-all bg-blue-600 text-white" style="overflow-wrap: anywhere; word-break: break-all;">{{ m.content }}</div>
            <div v-else-if="m.role === 'tool'" class="px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-all bg-neutral-800/50 light:bg-neutral-50 border border-neutral-700 light:border-neutral-300 font-mono text-xs text-green-400 light:text-green-700" style="overflow-wrap: anywhere; word-break: break-all;">{{ m.content }}</div>
          </div>
        </div>

        <div v-if="busy" class="flex justify-start">
          <div class="bg-neutral-800 light:bg-neutral-100 px-4 py-2.5 rounded-xl text-sm text-neutral-400">思考中...</div>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="px-4 pb-4 flex justify-center">
      <div class="w-full max-w-2xl border border-neutral-700 light:border-neutral-300 rounded-xl focus-within:border-blue-600 transition-colors">
        <textarea
          ref="textarea"
          v-model="input"
          @input="autoResize"
          @keydown.enter.exact="onEnter"
          @compositionstart="composing = true"
          @compositionend="composing = false"
          placeholder="输入消息..."
          rows="1"
          class="w-full px-4 py-3 bg-transparent text-sm resize-none focus:outline-none max-h-40 overflow-y-auto leading-relaxed"
        />
        <div class="flex items-center justify-between px-3 pb-2">
          <!-- 模式切换 -->
          <div class="relative">
            <button
              @click.stop="showMenu = !showMenu"
              class="flex items-center gap-1 text-xs cursor-pointer"
              :class="mode === 'auto' ? 'text-green-400 light:text-green-600' : 'text-yellow-400 light:text-yellow-600'"
            >
              <span class="transition-transform" :class="showMenu ? 'rotate-90' : ''">›</span>
              {{ mode === 'auto' ? 'Auto' : 'Ask' }}
            </button>
            <div v-if="showMenu" class="absolute bottom-full left-0 mb-2 bg-neutral-800 light:bg-white border border-neutral-700 light:border-neutral-200 rounded-lg overflow-hidden z-10 min-w-[140px] light:shadow-lg">
              <button
                @click="$emit('set-mode', 'auto'); showMenu = false"
                class="w-full px-3 py-2 text-left text-xs hover:bg-neutral-700 light:hover:bg-neutral-100 cursor-pointer"
                :class="mode === 'auto' ? 'text-green-400 light:text-green-600' : 'text-neutral-400 light:text-neutral-500'"
              >
                <div class="font-medium">Auto</div>
                <div class="text-neutral-500 mt-0.5">自动执行所有命令</div>
              </button>
              <button
                @click="$emit('set-mode', 'ask'); showMenu = false"
                class="w-full px-3 py-2 text-left text-xs hover:bg-neutral-700 light:hover:bg-neutral-100 cursor-pointer"
                :class="mode === 'ask' ? 'text-yellow-400 light:text-yellow-600' : 'text-neutral-400 light:text-neutral-500'"
              >
                <div class="font-medium">Ask</div>
                <div class="text-neutral-500 mt-0.5">每次执行前需确认</div>
              </button>
            </div>
          </div>
          <!-- 发送按钮 -->
          <button
            @click="handleSend"
            :disabled="busy || !input.trim()"
            class="p-1.5 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            :class="input.trim() && !busy ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'text-neutral-500'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });
const renderMd = (text) => marked.parse(text || '');

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

/* 浅色模式 */
:global(.light) .tool-card {
  background: #f5f5f5;
  border-color: #e5e5e5;
}
:global(.light) .tool-reason {
  color: #737373;
  background: #fafafa;
  border-bottom-color: #e5e5e5;
}
:global(.light) .tool-command {
  color: #16a34a;
}
:global(.light) .tool-actions {
  border-top-color: #e5e5e5;
}
:global(.light) .tool-btn-approve {
  background: #dcfce7;
  color: #16a34a;
}
:global(.light) .tool-btn-approve:hover {
  background: #bbf7d0;
}
:global(.light) .tool-btn-reject {
  background: #fee2e2;
  color: #dc2626;
}
:global(.light) .tool-btn-reject:hover {
  background: #fecaca;
}
:global(.light) .tool-status {
  border-top-color: #e5e5e5;
  color: #a3a3a3;
}
:global(.light) .tool-output-wrap {
  border-top-color: #e5e5e5;
}
:global(.light) .tool-output-toggle {
  color: #a3a3a3;
}
:global(.light) .tool-output-toggle:hover {
  color: #737373;
}
:global(.light) .tool-output {
  color: #525252;
  border-top-color: #f0f0f0;
}

/* Markdown 样式 */
.markdown-body :deep(p) {
  margin: 0.5em 0;
}
.markdown-body :deep(p:first-child) {
  margin-top: 0;
}
.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  font-weight: 600;
  margin: 0.8em 0 0.4em;
}
.markdown-body :deep(h1) { font-size: 1.25em; }
.markdown-body :deep(h2) { font-size: 1.125em; }
.markdown-body :deep(h3) { font-size: 1em; }
.markdown-body :deep(code) {
  background: rgba(255,255,255,0.1);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.85em;
  font-family: ui-monospace, monospace;
}
.markdown-body :deep(pre) {
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 0.5em 0;
}
.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 0.8em;
  white-space: pre;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5em;
  margin: 0.4em 0;
}
.markdown-body :deep(li) {
  margin: 0.2em 0;
}
.markdown-body :deep(blockquote) {
  border-left: 3px solid #525252;
  padding-left: 12px;
  color: #a3a3a3;
  margin: 0.5em 0;
}
.markdown-body :deep(a) {
  color: #60a5fa;
  text-decoration: underline;
}
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #404040;
  margin: 0.8em 0;
}
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
  font-size: 0.85em;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #404040;
  padding: 6px 10px;
  text-align: left;
}
.markdown-body :deep(th) {
  background: rgba(255,255,255,0.05);
}

/* Markdown 浅色模式 */
:global(.light) .markdown-body :deep(code) {
  background: rgba(0,0,0,0.06);
}
:global(.light) .markdown-body :deep(pre) {
  background: #f5f5f5;
}
:global(.light) .markdown-body :deep(blockquote) {
  border-left-color: #d4d4d4;
  color: #737373;
}
:global(.light) .markdown-body :deep(a) {
  color: #2563eb;
}
:global(.light) .markdown-body :deep(hr) {
  border-top-color: #e5e5e5;
}
:global(.light) .markdown-body :deep(th),
:global(.light) .markdown-body :deep(td) {
  border-color: #e5e5e5;
}
:global(.light) .markdown-body :deep(th) {
  background: rgba(0,0,0,0.03);
}
</style>
