<template>
  <div class="flex-1 flex flex-col">
    <!-- 消息列表 -->
    <div ref="msgBox" class="flex-1 overflow-y-auto p-6 space-y-4">
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="flex"
        :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div class="max-w-[80%]">
          <div class="text-xs text-neutral-500 mb-1">
            {{ m.role === 'user' ? '你' : m.role === 'tool' ? 'bash' : 'AI' }}
          </div>
          <div
            class="px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words"
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
    <div class="p-4 border-t border-neutral-800 flex gap-3">
      <textarea
        v-model="input"
        @keydown.enter.exact.prevent="handleSend"
        placeholder="输入消息..."
        rows="1"
        class="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-600"
      />
      <button
        @click="handleSend"
        :disabled="busy || !input.trim()"
        class="px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm cursor-pointer"
      >
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps(['messages', 'busy']);
const emit = defineEmits(['send']);

const input = ref('');
const msgBox = ref(null);

const handleSend = () => {
  const text = input.value.trim();
  if (!text || props.busy) return;
  emit('send', text);
  input.value = '';
};

// 自动滚底
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight;
  });
});
</script>
