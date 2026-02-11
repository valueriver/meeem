# meeem

本地运行的 LLM Agent，通过 bash 工具与你的机器交互。

## 特性

- **多模型支持**：OpenAI / Claude / Gemini，统一 OpenAI 兼容格式调用
- **Agent 循环**：自动执行 bash 命令，支持多轮工具调用
- **笔记系统**：AI 可通过 API 自主管理笔记，置顶笔记自动注入提示词
- **对话管理**：SQLite 持久化，支持重命名、删除、分页加载
- **WebSocket 实时通信**：前后端通过 WS 双向交互
- **响应式 UI**：桌面端侧边栏 + 移动端抽屉式菜单

## 快速开始

```bash
git clone https://github.com/valueriver/meeem.git
cd meeem
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Key

# 开发模式（前端热更新 + 后端同时启动）
npm run dev

# 生产模式
npm run build
npm start
```

访问 http://localhost:5173（开发）或 http://localhost:3000（生产）。

## 项目结构

```
index.js              # 入口
server/
  app.js              # 服务启动（组装 HTTP + WS）
  http.js             # HTTP 静态文件 + 笔记 API
  ws.js               # WebSocket 消息处理
  chat.js             # Agent 循环（工具调用 + LLM）
  llm.js              # LLM API 调用
  models.js           # 模型配置（多 provider）
  tools.js            # 工具定义（bash）
  runner.js            # 工具执行
  prompt.js           # System prompt 构建（注入笔记）
  db.js               # SQLite 数据库
web/
  src/
    App.vue           # 根组件
    components/
      Chat.vue        # 聊天区域
      Sidebar.vue     # 侧边栏
    ws.js             # WebSocket 客户端
```

## 笔记 API

AI 通过 bash 执行 curl 调用本地 API 管理笔记：

| 操作 | 接口 |
|------|------|
| 列表 | `GET /api/note/list` |
| 搜索 | `GET /api/note/search?q=关键词` |
| 详情 | `GET /api/note/detail?id=1` |
| 新增 | `POST /api/note/create` |
| 编辑 | `POST /api/note/update` |
| 删除 | `POST /api/note/delete` |

置顶的笔记会自动注入到 system prompt，AI 会主动将重要信息保存为笔记。

## 技术栈

- **前端**：Vue 3 + Vite + Tailwind CSS v4
- **后端**：Node.js + WebSocket (ws) + SQLite (better-sqlite3)
- **LLM**：OpenAI Chat Completion API（兼容格式）
