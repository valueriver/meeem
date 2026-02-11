<template>
  <div class="h-screen flex bg-neutral-900 text-neutral-200">
    <!-- 遮罩 -->
    <div
      v-if="sidebarOpen"
      @click="sidebarOpen = false"
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
    />

    <Sidebar
      :chats="chats"
      :chatId="chatId"
      :open="sidebarOpen"
      @new-chat="newChat(); sidebarOpen = false"
      @load-chat="(id) => { loadChat(id); sidebarOpen = false }"
      @rename-chat="renameChat"
      @delete-chat="deleteChat"
      @open-panel="panelOpen = true"
    />

    <Chat
      :messages="messages"
      :busy="busy"
      :hasMore="hasMore"
      :title="chatTitle"
      :wsStatus="wsStatus"
      @send="sendMessage"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
      @load-more="loadMore"
      @open-panel="panelOpen = true"
    />

    <ControlPanel
      :visible="panelOpen"
      :systemPrompt="systemPrompt"
      :contextRounds="contextRounds"
      :apiUrl="apiUrl"
      :apiKey="apiKey"
      :model="model"
      @close="panelOpen = false"
      @update-settings="updateSettings"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { connect, send, on, wsStatus } from './ws.js';
import Sidebar from './components/Sidebar.vue';
import Chat from './components/Chat.vue';
import ControlPanel from './components/ControlPanel.vue';

const chats = ref([]);
const chatId = ref(null);
const messages = ref([]);
const busy = ref(false);
const sidebarOpen = ref(false);
const panelOpen = ref(false);
const systemPrompt = ref('');
const contextRounds = ref(30);
const apiUrl = ref('');
const apiKey = ref('');
const model = ref('');
const hasMore = ref(false);
const loadedOffset = ref(0);

const chatTitle = computed(() => {
  if (!chatId.value) return '';
  const c = chats.value.find(c => c.id === chatId.value);
  return c?.title || '';
});

on('chat_list', (data) => {
  chats.value = data.chats;
});

on('chat_created', (data) => {
  chatId.value = data.chatId;
  send({ type: 'list_chats' });
});

const parseMessages = (raw) => {
  const list = [];
  for (const m of raw) {
    if (m.role === 'assistant' && m.tool_calls?.length) {
      for (const tc of m.tool_calls) {
        const args = JSON.parse(tc.function.arguments || '{}');
        list.push({ role: 'tool', content: `> ${args.command}` });
      }
      continue;
    }
    if ((m.role === 'user' || m.role === 'assistant' || m.role === 'tool') && m.content) {
      list.push({ role: m.role, content: m.content });
    }
  }
  return list;
};

on('chat_loaded', (data) => {
  hasMore.value = data.hasMore;
  loadedOffset.value = (data.offset || 0) + data.messages.length;
  const parsed = parseMessages(data.messages);
  if (data.offset > 0) {
    messages.value = [...parsed, ...messages.value];
  } else {
    messages.value = parsed;
  }
});

on('tool_call', (data) => {
  messages.value.push({ role: 'tool', content: `> ${data.command}` });
});

on('tool_result', (data) => {
  messages.value.push({ role: 'tool', content: data.content });
});

on('reply', (data) => {
  messages.value.push({ role: 'assistant', content: data.content });
  busy.value = false;
});

on('error', (data) => {
  messages.value.push({ role: 'assistant', content: `错误: ${data.content}` });
  busy.value = false;
});

on('chat_deleted', (data) => {
  if (chatId.value === data.chatId) {
    chatId.value = null;
    messages.value = [];
  }
});

on('settings', (data) => {
  systemPrompt.value = data.systemPrompt;
  contextRounds.value = data.contextRounds;
  apiUrl.value = data.apiUrl;
  apiKey.value = data.apiKey;
  model.value = data.model;
});

on('open', () => {
  send({ type: 'list_chats' });
  send({ type: 'get_settings' });
});

const newChat = () => {
  messages.value = [];
  chatId.value = null;
  send({ type: 'new_chat' });
};

const loadChat = (id) => {
  chatId.value = id;
  messages.value = [];
  loadedOffset.value = 0;
  hasMore.value = false;
  send({ type: 'load_chat', chatId: id, limit: 20, offset: 0 });
};

const loadMore = () => {
  if (!chatId.value || !hasMore.value) return;
  send({ type: 'load_chat', chatId: chatId.value, limit: 20, offset: loadedOffset.value });
};

const renameChat = (id, title) => {
  send({ type: 'rename_chat', chatId: id, title });
};

const deleteChat = (id) => {
  send({ type: 'delete_chat', chatId: id });
};

const updateSettings = (settings) => {
  send({ type: 'set_settings', ...settings });
};

const sendMessage = (text) => {
  messages.value.push({ role: 'user', content: text });
  send({ type: 'message', content: text });
  busy.value = true;
};

onMounted(connect);
</script>
