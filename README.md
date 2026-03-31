<div align="center">
  <img src="apps/web/public/project-icon.svg" width="88" alt="Model Status 图标" />
  <h1>Model Status</h1>
  <p><strong>一个面向 OpenAI 兼容模型接口的本地优先监控面板。</strong></p>
  <p>
    公开只读状态页，后台管理控制台，SQLite 持久化历史，可配置重试策略，
    并支持单进程或 Docker 部署。
  </p>
  <p>
    <a href="#功能特性">功能特性</a> ·
    <a href="#快速开始">快速开始</a> ·
    <a href="#docker-部署">Docker 部署</a> ·
    <a href="#架构说明">架构说明</a>
  </p>
  <p>
    <a href="https://github.com/WizisCool/model-status/actions/workflows/docker-image.yml">
      <img src="https://github.com/WizisCool/model-status/actions/workflows/docker-image.yml/badge.svg" alt="Docker 镜像工作流" />
    </a>
  </p>
</div>

## 项目简介

Model Status 用于监控 OpenAI 兼容模型接口的真实可用性，而不是只检查服务端口是否在线。

它会按计划执行真实探测请求，记录：

- 连通延迟
- 首字延时
- 总耗时
- 最终探测状态
- 历史成功率

所有运行时设置和历史数据都保存在本地 SQLite 中。公开首页 `/` 只提供只读监控视图，后台 `/admin` 用于管理上游、调度、重试、模型展示与系统设置。

## 功能特性

- 本地优先，不依赖云端监控平台
- 支持从多个上游同步模型目录
- 基于真实流式请求执行探测，而不是伪健康检查
- 支持 `90m`、`24h`、`7d`、`30d` 四个固定时间维度
- 支持列表 / 卡片两种前台展示模式
- 支持后台调整探测间隔、超时、并发、阈值与重试次数
- 支持针对失败和降级结果分别配置重试次数
- 成功率计算与前端最终状态展示保持一致
- SQLite 作为运行时单一数据源
- 生产环境可由 API 进程直接托管前端构建产物
- 已提供 Dockerfile 与 GitHub Actions 自动构建镜像工作流

## 使用场景

- 自建 AI 网关 / 路由服务可用性监控
- 多模型上游质量对比
- 对外公开状态页
- 团队内部模型接入验收
- 本地或私有环境中的轻量监控面板

## 技术栈

- Node.js 24+
- npm `11.10.1`
- TypeScript
- 原生 Node HTTP 服务
- React 19 + Vite
- Tailwind CSS
- SQLite
- Vitest
- GitHub Actions
- GHCR

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建环境文件

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. 配置启动参数

这些变量只用于启动阶段。  
运行中的上游、探测参数、阈值和重试策略应在后台中配置，并持久化到 SQLite。

```env
PORT=3000
HOST=0.0.0.0
WEB_ORIGIN=http://localhost:5173
DATABASE_FILE=./data/model-status.db
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=change-me
SESSION_SECRET=replace-this-in-production
```

### 4. 开发模式启动

```bash
npm run dev
```

默认地址：

- API: `http://localhost:3000`
- Web: `http://localhost:5173`

### 5. 生产构建与启动

```bash
npm run build
npm run start
```

当 `apps/web/dist` 存在时，API 服务会直接托管前端静态资源，因此生产模式只需要一个进程。

## Docker 部署

仓库已内置生产 Dockerfile。

### 本地构建镜像

```bash
docker build -t model-status:local .
```

### 本地运行容器

```bash
docker run --rm -p 3000:3000 \
  -e ADMIN_BOOTSTRAP_PASSWORD=change-me \
  -e SESSION_SECRET=replace-this \
  -v model-status-data:/app/data \
  model-status:local
```

### 从 GHCR 拉取

```bash
docker pull ghcr.io/wiziscool/model-status:latest
```

## 配置说明

### 启动期环境变量

| 变量名 | 用途 | 默认值 |
|---|---|---|
| `HOST` | 服务监听地址 | `0.0.0.0` |
| `PORT` | 服务端口 | `3000` |
| `WEB_ORIGIN` | 后台允许来源 | `http://localhost:5173` |
| `DATABASE_FILE` | SQLite 文件路径 | `./data/model-status.db` |
| `ADMIN_BOOTSTRAP_USERNAME` | 初始管理员用户名 | `admin` |
| `ADMIN_BOOTSTRAP_PASSWORD` | 初始管理员密码 | 空 |
| `SESSION_SECRET` | Session 签名密钥 | 空 |

### 运行期后台配置

这些配置存储在 SQLite 中，通过 `/admin` 管理：

- 站点标题与副标题
- 概览卡片显示开关
- 探测间隔
- 模型同步间隔
- 请求超时
- 探测并发数
- 最大 token 数
- 温度参数
- 失败重试次数
- 降级重试次数
- 成功 / 降级阈值
- 上游地址与 API Key
- 模型显示名称、图标、顺序与可见性

## 验证命令

```bash
npm run test
npm run typecheck
npm run build
```

## 目录结构

```text
apps/api         后端服务、鉴权、调度、探测、数据聚合、静态托管
apps/web         前台监控页与后台控制台
packages/shared  前后端共享类型与常量
data/            本地 SQLite 数据文件
```

## 架构说明

运行流程大致如下：

1. API 读取启动环境变量并初始化数据库
2. 系统从 SQLite 载入运行时设置
3. 调度器按固定节拍执行模型同步与探测
4. 探测结果写入 SQLite 历史表
5. 前台与后台基于聚合后的数据渲染状态页
6. 生产环境由 API 进程直接提供前端构建文件

## 公开接口

### 前台公开接口

- `GET /api/health`
- `GET /api/dashboard?range=90m|24h|7d|30d`

### 后台管理接口

- `GET /api/admin/session`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `GET /api/admin/dashboard`
- `PUT /api/admin/models`
- `POST /api/admin/actions/sync-models`
- `POST /api/admin/actions/run-probes`

## 发布说明

为了保持公开仓库整洁，以下内容不会进入版本控制：

- `.codex/`
- 所有 `AGENTS.md`
- 本地 `.env*`
- `data/` 下数据库文件
- 本地辅助脚本与临时文件
- Cookie、缓存、构建产物

## 许可证

仓库公开发布前，建议补充正式 `LICENSE` 文件。
