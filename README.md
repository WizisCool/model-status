# Model Status

Model Status 是一个 AI 模型 API 监测站点。它会从 `https://ai.dooo.ng/v1/models` 拉取模型目录，使用 OpenAI 兼容的最小上下文流式对话探测每个模型的连通性，并把连通时延、首个 token 时延与总耗时持久化到本地 SQLite，再通过一个简洁但美观的前端页面展示 `90m / 24h / 7d / 30d` 四个固定时间维度的数据。

## 功能

- 拉取 AI 路由站模型列表并本地缓存
- 使用最小 prompt 对每个模型执行真实流式探测
- 记录连通时延、首 token 时延、总耗时与失败信息
- 本地 SQLite 持久化探测历史
- 仪表盘支持 `90m`、`24h`、`7d`、`30d`
- 支持卡片 / 列表两种浏览视图
- `npm run start` 可直接同时提供 API 与构建后的前端

## 目录

- `apps/api`：模型同步、探测、持久化、JSON API、生产静态托管
- `apps/web`：React + Vite 仪表盘界面
- `packages/shared`：前后端共用类型与时间范围工具

## 环境准备

推荐 Node 24+。

1. 安装依赖

```bash
npm install
```

2. 复制环境文件

```bash
copy .env.example .env
```

3. 在 `.env` 中填写真实 API Key，例如：

```env
API_BASE_URL=https://ai.dooo.ng/v1
MODELS_URL=https://ai.dooo.ng/v1/models
API_KEY=你的真实 key
DATABASE_FILE=./data/relay-radar.db
```

## 开发

```bash
npm run dev
```

- API 默认在 `http://localhost:3000`
- Web 默认在 `http://localhost:5173`
- Vite 会把 `/api/*` 代理到本地 API

## 构建与启动

```bash
npm run build
npm run start
```

`npm run start` 会启动 API 服务，并在检测到 `apps/web/dist` 存在时直接托管前端静态文件，因此生产模式只需要一个进程。

## 主要接口

- `GET /api/health`
- `GET /api/models`
- `POST /api/models/sync`
- `POST /api/probes/run`
- `GET /api/dashboard?range=90m|24h|7d|30d`

## 验证命令

```bash
npm run test
npm run typecheck
npm run build
```

## 指标定义

- **连通时延**：请求发出到上游响应建立成功
- **首 token 时延**：请求发出到收到第一个有效流式内容片段
- **总耗时**：请求发出到探测完成

## 说明

- 项目不会写入任何云端监控平台
- 所有历史数据都保存在本地数据库文件
- 探测失败不会被忽略，而是作为一等数据保留在历史中
