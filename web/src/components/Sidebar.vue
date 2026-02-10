<template>
  <div class="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col">
    <div class="p-4 border-b border-neutral-800">
      <button @click="$emit('new-chat')" class="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm cursor-pointer">
        + 新对话
      </button>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div
        v-for="c in chats"
        :key="c.id"
        @click="$emit('load-chat', c.id)"
        class="px-3 py-2.5 rounded-lg text-sm cursor-pointer truncate"
        :class="c.id === chatId ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50'"
      >
        {{ c.title || c.id.slice(0, 8) }}
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps(['chats', 'chatId']);
defineEmits(['new-chat', 'load-chat']);
</script>
