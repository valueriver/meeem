<template>
  <div class="h-screen flex bg-neutral-900 text-neutral-200">
    <Sidebar :chats="chats" :chatId="chatId" @new-chat="newChat" @load-chat="loadChat" />
    <Chat :messages="messages" :busy="busy" @send="sendMessage" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { connect, send, on } from './ws.js';
import Sidebar from './components/Sidebar.vue';
import Chat from './components/Chat.vue';

const chats = ref([]);
const chatId = ref(null);
const messages = ref([]);
const busy = ref(false);

on('chat_list', (data) => {
  chats.value = data.chats;
});

on('chat_created', (data) => {
  chatId.value = data.chatId;
  send({ type: 'list_chats' });
});

on('chat_loaded', (data) => {
  messages.value = data.messages.filter(
    (m) => (m.role === 'user' && m.content) || (m.role === 'assistant' && m.content) || (m.role === 'tool' && m.content)
  );
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

on('open', () => {
  send({ type: 'list_chats' });
});

const newChat = () => {
  messages.value = [];
  chatId.value = null;
  send({ type: 'new_chat' });
};

const loadChat = (id) => {
  chatId.value = id;
  messages.value = [];
  send({ type: 'load_chat', chatId: id });
};

const sendMessage = (text) => {
  messages.value.push({ role: 'user', content: text });
  send({ type: 'message', content: text });
  busy.value = true;
};

onMounted(connect);
</script>
