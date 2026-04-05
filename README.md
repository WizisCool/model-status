<div align="center">
  <p>
    <img
      src="https://socialify.git.ci/wiziscool/model-status/image?custom_description=%E9%9D%A2%E5%90%91+OpenAI+%E5%85%BC%E5%AE%B9%E6%A8%A1%E5%9E%8B%E6%8E%A5%E5%8F%A3%E7%9A%84%E6%A8%A1%E5%9E%8B%E7%8A%B6%E6%80%81%E7%9B%91%E6%8E%A7%E9%9D%A2%E6%9D%BF&description=1&font=Inter&language=1&name=1&owner=1&pattern=Plus&stargazers=1&theme=Auto"
      alt="Model Status Socialify"
    />
  </p>
  <img src="apps/web/public/project-icon.svg" width="88" alt="Model Status 图标" />
  <h1>Model Status</h1>
  <p>
    Demo:
    <a href="https://ai.dooo.ng/status">https://ai.dooo.ng/status</a>
  </p>
  <p><strong>一个OpenAI 兼容模型接口的模型状态监控面板。</strong></p>
</div>

## 项目简介

Model Status 用于监控 OpenAI 兼容模型接口的真实可用性。

它会定时同步上游模型目录，对模型执行真实探测请求，并将结果持久化到本地 SQLite，再通过公开首页和后台控制台展示：

- 连通延迟
- 首字延时
- 总耗时
- 最近状态
- 历史成功率

公开首页 `/` 为公开状态页，后台 `/admin` 用于管理上游、模型展示、调度参数、阈值与重试策略。

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
ACCESS_URL=
DATABASE_FILE=./data/model-status.db
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=change-me
SESSION_SECRET=replace-this-in-production
```

如果站点通过反向代理挂载到子路径，例如 `https://ai.dooo.ng/status`，请将 `ACCESS_URL` 设置为完整访问地址：

```env
ACCESS_URL=https://ai.dooo.ng/status
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
    volumes:
      - ./data:/app/data
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

```

启动：

```bash
docker compose up -d
```

## 技术栈

- Node.js 24+
- TypeScript
- React 19 + Vite
- SQLite

## 公开接口

- `GET /api/health`
- `GET /api/dashboard?range=90m|24h|7d|30d`

## 许可证

本项目采用 [MIT License](LICENSE)。
