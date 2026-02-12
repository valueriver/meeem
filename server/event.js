import { chat } from './agent/chat.js';
import { createChat, listChats, getMessages, getMessagesPaged, saveMessage, renameChat, deleteChat, getSettings, saveSetting, listNotes, updateNote, deleteNote } from './db.js';
import { buildSystemPrompt } from './agent/prompt.js';

export const createSession = (send) => {
  let chatId = null;
  let messages = [];
  const settings = getSettings();
  let systemPrompt = settings.systemPrompt;
  let contextRounds = settings.contextRounds;
  let apiUrl = settings.apiUrl;
  let apiKey = settings.apiKey;
  let model = settings.model;

  // ask 模式的审批回调
  let approvalResolve = null;

  const handleMessage = async (data) => {
    // ping/pong
    if (data.type === 'ping') {
      send({ type: 'pong' });
      return;
    }

    // 用户批准/拒绝工具调用
    if (data.type === 'tool_approve') {
      if (approvalResolve) approvalResolve(true);
      return;
    }
    if (data.type === 'tool_reject') {
      if (approvalResolve) approvalResolve(false);
      return;
    }

    // 新建对话
    if (data.type === 'new_chat') {
      chatId = createChat(data.title);
      messages = [{ role: 'system', content: buildSystemPrompt(systemPrompt) }];
      send({ type: 'chat_created', chatId });
      return;
    }

    // 加载历史对话（分页）
    if (data.type === 'load_chat') {
      chatId = data.chatId;
      const offset = data.offset || 0;
      const limit = data.limit || 20;
      const result = getMessagesPaged(chatId, limit, offset);
      if (offset === 0) {
        messages = [{ role: 'system', content: buildSystemPrompt(systemPrompt) }, ...getMessages(chatId)];
      }
      send({ type: 'chat_loaded', messages: result.messages, total: result.total, hasMore: result.hasMore, offset });
      return;
    }

    // 对话列表
    if (data.type === 'list_chats') {
      send({ type: 'chat_list', chats: listChats() });
      return;
    }

    // 重命名对话
    if (data.type === 'rename_chat') {
      renameChat(data.chatId, data.title);
      send({ type: 'chat_list', chats: listChats() });
      return;
    }

    // 删除对话
    if (data.type === 'delete_chat') {
      deleteChat(data.chatId);
      if (chatId === data.chatId) { chatId = null; messages = []; }
      send({ type: 'chat_deleted', chatId: data.chatId });
      send({ type: 'chat_list', chats: listChats() });
      return;
    }

    // 获取设置
    if (data.type === 'get_settings') {
      send({ type: 'settings', systemPrompt, contextRounds, apiUrl, apiKey, model });
      return;
    }

    // 更新设置
    if (data.type === 'set_settings') {
      if (data.systemPrompt !== undefined) {
        systemPrompt = data.systemPrompt;
        saveSetting('systemPrompt', systemPrompt);
      }
      if (data.contextRounds !== undefined) {
        contextRounds = Number(data.contextRounds);
        saveSetting('contextRounds', contextRounds);
      }
      if (data.apiUrl !== undefined) {
        apiUrl = data.apiUrl;
        saveSetting('apiUrl', apiUrl);
      }
      if (data.apiKey !== undefined) {
        apiKey = data.apiKey;
        saveSetting('apiKey', apiKey);
      }
      if (data.model !== undefined) {
        model = data.model;
        saveSetting('model', model);
      }
      if (messages.length > 0) messages[0] = { role: 'system', content: buildSystemPrompt(systemPrompt) };
      send({ type: 'settings', systemPrompt, contextRounds, apiUrl, apiKey, model });
      return;
    }

    // 笔记列表
    if (data.type === 'list_notes') {
      send({ type: 'note_list', notes: listNotes() });
      return;
    }

    // 更新笔记
    if (data.type === 'update_note') {
      updateNote(data.id, data);
      send({ type: 'note_list', notes: listNotes() });
      return;
    }

    // 删除笔记
    if (data.type === 'delete_note') {
      deleteNote(data.id);
      send({ type: 'note_list', notes: listNotes() });
      return;
    }

    // 发送消息
    if (data.type === 'message') {
      if (!chatId) {
        chatId = createChat(data.content.slice(0, 20));
        messages = [{ role: 'system', content: buildSystemPrompt(systemPrompt) }];
        send({ type: 'chat_created', chatId });
      }

      messages[0] = { role: 'system', content: buildSystemPrompt(systemPrompt) };

      const userMsg = { role: 'user', content: data.content };
      messages.push(userMsg);
      saveMessage(chatId, userMsg);

      const mode = data.mode || 'auto';
      const waitForApproval = () => new Promise(resolve => { approvalResolve = resolve; });

      try {
        await chat(chatId, messages, send, { model, contextRounds, apiUrl, apiKey, mode, waitForApproval });
      } catch (e) {
        send({ type: 'error', content: e.message });
      }
      return;
    }
  };

  return { handleMessage };
};
