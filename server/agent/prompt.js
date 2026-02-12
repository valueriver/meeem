import { getPinnedNotes } from '../db.js';

const PORT = process.env.LOCAL_PORT || 3000;

export const buildSystemPrompt = (userPrompt) => {
  const notes = getPinnedNotes();
  const cwd = process.cwd();

  // 用户编辑的提示词作为主体
  let prompt = userPrompt || '';

  // 追加环境信息
  prompt += `\n\n## 环境
- 项目根目录：${cwd}
- 工作目录：${cwd}/workspace/
- 数据库：${cwd}/meeem.db（SQLite，表：chats, messages, notes, settings）`;

  // 追加置顶笔记
  if (notes.length > 0) {
    prompt += '\n\n## 置顶笔记\n';
    for (const n of notes) {
      prompt += `- [${n.id}] ${n.title}${n.content ? '\n  ' + n.content.split('\n').join('\n  ') : ''}\n`;
    }
  }

  // 追加笔记 API
  prompt += `\n\n## 笔记 API
通过 bash 执行 curl 管理笔记：

- 列表：curl -s localhost:${PORT}/api/note/list
- 搜索：curl -s localhost:${PORT}/api/note/search?q=关键词
- 详情：curl -s localhost:${PORT}/api/note/detail?id=ID
- 新增：curl -s -X POST localhost:${PORT}/api/note/create -H 'Content-Type: application/json' -d '{"title":"标题","content":"内容"}'
- 编辑：curl -s -X POST localhost:${PORT}/api/note/update -H 'Content-Type: application/json' -d '{"id":ID,"title":"新标题","content":"新内容"}'
- 置顶：curl -s -X POST localhost:${PORT}/api/note/update -H 'Content-Type: application/json' -d '{"id":ID,"pinned":1}'
- 删除：curl -s -X POST localhost:${PORT}/api/note/delete -H 'Content-Type: application/json' -d '{"id":ID}'`;

  return prompt;
};
