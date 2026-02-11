import { tools } from './tools.js';
import { runTools } from './runner.js';
import { callLLM } from './llm.js';
import { saveMessage } from './db.js';

const MAX_ROUNDS = 20;

// send: 通过 ws 向前端推送消息的回调
// 截取最近 N 轮上下文（保留 system + 最近的消息）
const trimMessages = (messages, contextRounds) => {
  if (!contextRounds || messages.length <= contextRounds + 1) return messages;
  return [messages[0], ...messages.slice(-(contextRounds))];
};

export const chat = async (chatId, messages, send, { model, contextRounds, apiUrl, apiKey }) => {
  let round = 0;

  while (round++ < MAX_ROUNDS) {
    const trimmed = trimMessages(messages, contextRounds);
    const message = await callLLM({ messages: trimmed, tools, model, apiUrl, apiKey });

    // tool_calls → 执行工具 → 继续循环
    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      const assistantMsg = {
        role: 'assistant',
        content: message.content ?? null,
        tool_calls: message.tool_calls
      };
      messages.push(assistantMsg);
      saveMessage(chatId, assistantMsg);

      // 推送工具调用信息
      for (const tc of message.tool_calls) {
        const args = JSON.parse(tc.function.arguments || '{}');
        send({ type: 'tool_call', command: args.command });
      }

      const toolMessages = await runTools(message.tool_calls);

      for (const tm of toolMessages) {
        messages.push(tm);
        saveMessage(chatId, tm);
        send({ type: 'tool_result', content: tm.content });
      }

      continue;
    }

    // 普通回复 → 结束
    const text = message.content ?? '';
    const replyMsg = { role: 'assistant', content: text };
    messages.push(replyMsg);
    saveMessage(chatId, replyMsg);
    send({ type: 'reply', content: text });
    return text;
  }

  send({ type: 'reply', content: '(达到最大轮次限制)' });
  return '(达到最大轮次限制)';
};
