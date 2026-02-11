import { getPinnedNotes } from './db.js';

const PORT = process.env.PORT || 3000;

export const buildSystemPrompt = (userPrompt) => {
  const notes = getPinnedNotes();
  let prompt = userPrompt;

  if (notes.length > 0) {
    prompt += '\n\n## 置顶笔记\n以下是置顶的笔记，请在回答时参考：\n';
    for (const n of notes) {
      prompt += `- [${n.id}] ${n.title}${n.content ? '\n  ' + n.content.split('\n').join('\n  ') : ''}\n`;
    }
  }

  prompt += `\n\n## 笔记管理 API
你可以通过 bash 执行 curl 命令来管理笔记（用于记住用户偏好、项目信息等长期知识）：

- 查看所有笔记：curl -s http://localhost:${PORT}/api/note/list
- 搜索笔记：curl -s http://localhost:${PORT}/api/note/search?q=关键词
- 查看笔记详情：curl -s http://localhost:${PORT}/api/note/detail?id=ID
- 新增笔记：curl -s -X POST http://localhost:${PORT}/api/note/create -H 'Content-Type: application/json' -d '{"title":"标题","content":"内容"}'
- 编辑笔记：curl -s -X POST http://localhost:${PORT}/api/note/update -H 'Content-Type: application/json' -d '{"id":ID,"title":"新标题","content":"新内容"}'
- 置顶/取消置顶：curl -s -X POST http://localhost:${PORT}/api/note/update -H 'Content-Type: application/json' -d '{"id":ID,"pinned":1}'
- 删除笔记：curl -s -X POST http://localhost:${PORT}/api/note/delete -H 'Content-Type: application/json' -d '{"id":ID}'

置顶的笔记会自动注入到你的提示词中。当用户告诉你重要信息（偏好、项目背景、常用配置等），你应该主动创建笔记并置顶。`;

  return prompt;
};
