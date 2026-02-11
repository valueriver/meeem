<template>
  <div
    class="bg-neutral-950 border-r border-neutral-800 flex flex-col w-64
      fixed inset-y-0 left-0 z-50 transition-transform duration-200
      md:static md:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="p-4 border-b border-neutral-800">
      <button @click="$emit('new-chat')" class="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm cursor-pointer">
        + 新对话
      </button>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div
        v-for="c in chats"
        :key="c.id"
        class="group flex items-center rounded-lg text-sm cursor-pointer"
        :class="c.id === chatId ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50'"
      >
        <!-- 编辑模式 -->
        <template v-if="editing === c.id">
          <input
            ref="editInput"
            v-model="editTitle"
            @keydown.enter="confirmRename(c.id)"
            @keydown.escape="editing = null"
            @blur="confirmRename(c.id)"
            class="flex-1 px-3 py-2 bg-neutral-700 rounded-lg text-sm text-white outline-none"
          />
        </template>

        <!-- 正常模式 -->
        <template v-else>
          <div @click="$emit('load-chat', c.id)" class="flex-1 px-3 py-2.5 truncate">
            {{ c.title || c.id.slice(0, 8) }}
          </div>
          <div class="hidden group-hover:flex items-center pr-2 gap-1" :class="{ '!flex': deleting === c.id }">
            <button v-if="deleting !== c.id" @click.stop="startRename(c)" class="p-1 hover:bg-neutral-700 rounded cursor-pointer" title="重命名">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <span v-if="deleting === c.id" class="text-xs text-red-400">确认?</span>
            <button @click.stop="confirmDelete(c.id)" class="p-1 rounded cursor-pointer" :class="deleting === c.id ? 'bg-red-600 text-white' : 'hover:bg-red-900/50'" title="删除">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- 底部控制面板入口 -->
    <div class="p-3 border-t border-neutral-800">
      <div @click="$emit('open-panel')" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 cursor-pointer text-xs">
        <svg class="w-4 h-4 text-neutral-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-neutral-500">控制面板</span>
        <span class="ml-auto w-2 h-2 rounded-full shrink-0" :class="{
          'bg-green-500': wsStatus === 'connected',
          'bg-yellow-500 animate-pulse': wsStatus === 'connecting',
          'bg-red-500': wsStatus === 'disconnected'
        }" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { wsStatus, wsUrl } from '../ws.js';

defineProps(['chats', 'chatId', 'open']);
const emit = defineEmits(['new-chat', 'load-chat', 'rename-chat', 'delete-chat', 'open-panel']);

const statusText = computed(() => {
  if (wsStatus.value === 'connected') return wsUrl.value;
  if (wsStatus.value === 'connecting') return '连接中...';
  return '未连接';
});

// 重命名
const editing = ref(null);
const editTitle = ref('');
const editInput = ref(null);

const startRename = (c) => {
  editing.value = c.id;
  editTitle.value = c.title || '';
  nextTick(() => editInput.value?.[0]?.focus());
};

const confirmRename = (id) => {
  if (editing.value !== id) return;
  const title = editTitle.value.trim();
  if (title) emit('rename-chat', id, title);
  editing.value = null;
};

// 删除
const deleting = ref(null);
let deleteTimer = null;

const confirmDelete = (id) => {
  if (deleting.value === id) {
    clearTimeout(deleteTimer);
    deleting.value = null;
    emit('delete-chat', id);
  } else {
    deleting.value = id;
    deleteTimer = setTimeout(() => { deleting.value = null; }, 2000);
  }
};
</script>
