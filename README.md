# meeem

> *Cogito, ergo sum.* — 我思故我在

一个极简的本地 AI Agent。只有两个原语：**bash** 和 **笔记**。

## 哲学

大多数 Agent 框架在做加法——更多工具、更多插件、更多抽象层。meeem 反其道而行。

**一个工具：bash。** 搜索、编码、部署、数据处理——任何你在终端能做的事，AI 都能做。不需要为每个能力写一个 tool，bash 本身就是万能工具。

**一个记忆：笔记。** AI 可以自主创建、检索、更新笔记。技能是什么？是一段脚本加一条说明——写进笔记就是 skill。工作流是什么？是一组步骤——记在笔记里就是 workflow。记忆即能力，知道怎么做就等于会做。

两个最小单元，组合出无限可能。AI 通过 bash 创造工具，通过笔记记住工具，通过记忆中的工具解决新问题，再把经验写回笔记。这是一个自我进化的循环。

笛卡尔说「我思故我在」。对 meeem 来说——它思考，所以它在；它记忆，所以它能。

## 快速开始

```bash
git clone https://github.com/valueriver/meeem.git
cd meeem
npm install
cp .env.example .env
```

```bash
npm run build   # 构建前端
npm start       # 启动服务
```

打开 http://localhost:3000 ，在控制面板中配置 API URL、API Key、Model 即可使用。

## 远程访问

meeem 支持通过中转服务从外网访问，两种部署方式可选：

### Cloudflare Worker

```bash
cd remote/worker
wrangler login
npm run build --prefix ../..
cp -r ../../ui/dist public
wrangler deploy
```

### Docker

```bash
cd remote/docker
npm run build --prefix ../..
cp -r ../../ui/dist public
docker build -t meeem-relay .
docker run -d -p 3000:3000 meeem-relay
```

部署后在 `.env` 中配置：

```
REMOTE=on
REMOTE_URL=wss://your-relay-server/ws
```

启动本地服务后，控制台会打印远程访问地址，在任意设备浏览器打开即可。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LOCAL_PORT` | 本地端口 | `3000` |
| `REMOTE` | 开启远程 | `on` |
| `REMOTE_URL` | 中转 WSS 地址 | - |

## 项目结构

```
index.js
server/
  app.js              # 启动入口
  http.js             # HTTP + 静态文件
  ws.js               # 本地 WebSocket
  remote.js           # 远程中转连接
  event.js            # 消息处理
  db.js               # SQLite
  agent/
    chat.js           # Agent 循环
    llm.js            # LLM 调用
    tools.js          # 工具定义（bash）
    runner.js         # bash 执行
    prompt.js         # 提示词构建
ui/
  src/
    App.vue
    ws.js
    components/
      Chat.vue
      Sidebar.vue
      ControlPanel.vue
remote/
  worker/             # Cloudflare Worker 中转
  docker/             # Docker 中转
```

## 技术栈

- Vue 3 + Vite + Tailwind CSS v4
- Node.js + WebSocket + SQLite
- Cloudflare Worker + Durable Object / Docker
- OpenAI Chat Completion API 兼容格式
