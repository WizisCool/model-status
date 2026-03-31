<div align="center">
  <img src="apps/web/public/project-icon.svg" width="88" alt="Model Status 图标" />
  <h1>Model Status</h1>
  <p><strong>一个面向 OpenAI 兼容模型接口的本地优先监控面板。</strong></p>
</div>

## 项目简介

Model Status 用于监控 OpenAI 兼容模型接口的真实可用性。

它会定时同步上游模型目录，对模型执行真实探测请求，并将结果持久化到本地 SQLite，再通过公开首页和后台控制台展示：

- 连通延迟
- 首字延时
- 总耗时
- 最近状态
- 历史成功率

公开首页 `/` 为只读状态页，后台 `/admin` 用于管理上游、模型展示、调度参数、阈值与重试策略。

## 快速开始

### 源码运行

1. 安装依赖

```bash
npm install
```

2. 创建环境文件

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. 配置启动参数

```env
PORT=3000
HOST=0.0.0.0
WEB_ORIGIN=http://localhost:5173
DATABASE_FILE=./data/model-status.db
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=change-me
SESSION_SECRET=replace-this-in-production
```

4. 启动开发环境

```bash
npm run dev
```

默认地址：

- API: `http://localhost:3000`
- Web: `http://localhost:5173`

## Docker 部署

### 从 GHCR 直接拉取

```bash
docker pull ghcr.io/wiziscool/model-status:latest

docker run --rm -p 3000:3000 \
  -e ADMIN_BOOTSTRAP_PASSWORD=change-me \
  -e SESSION_SECRET=replace-this \
  -v ./data:/app/data \
  ghcr.io/wiziscool/model-status:latest
```

### Docker Compose

```yaml
services:
  model-status:
    image: ghcr.io/wiziscool/model-status:latest
    container_name: model-status
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      HOST: 0.0.0.0
      PORT: 3000
      WEB_ORIGIN: http://localhost:3000
      DATABASE_FILE: /app/data/model-status.db
      ADMIN_BOOTSTRAP_USERNAME: admin
      ADMIN_BOOTSTRAP_PASSWORD: change-me
      SESSION_SECRET: replace-this-in-production
    volumes:
      - ./data:/app/data
```

启动：

```bash
docker compose up -d
```

## 关键技术

- Node.js 24+
- TypeScript
- React 19 + Vite
- Tailwind CSS
- SQLite
- GitHub Actions + GHCR

## 公开接口

- `GET /api/health`
- `GET /api/dashboard?range=90m|24h|7d|30d`

## 许可证

本项目采用 [MIT License](LICENSE)。
