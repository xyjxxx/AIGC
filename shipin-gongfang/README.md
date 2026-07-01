# 微创AI带货视频工坊

> 上传商品素材，一键生成专业带货视频

## 技术栈

| 层 | 方案 |
|----|------|
| 前端 | Next.js 16 + TypeScript + TailwindCSS v4 |
| 后端 | Python FastAPI + SQLAlchemy Async |
| 数据库 | MySQL 8.0 + Redis 7 |
| AI 平台 | OpenAI Codex / 字节豆包（用户自选） |
| 存储 | 本地磁盘存储 |

## 快速启动

### 1. 启动基础设施

```bash
docker-compose up -d
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 4. 访问

打开 http://localhost:3000

## 项目结构

```
shipin-gongfang/
├── frontend/          # Next.js 前端
│   └── src/app/       # 页面路由 + 组件
├── backend/           # FastAPI 后端
│   └── app/           # 路由 / 模型 / 服务
├── storage/           # 本地存储
│   ├── uploads/       # 用户上传
│   └── outputs/       # 生成输出
└── docker-compose.yml # MySQL + Redis
```

## 核心页面

| 路由 | 说明 |
|------|------|
| `/` | 首页（项目列表 + 创建入口） |
| `/project/[id]` | 项目详情（步骤导航） |
| `/project/[id]/script` | 模块一：AI 脚本生成 |
| `/project/[id]/storyboard` | 模块二：分镜画板 |
| `/project/[id]/images` | 模块三：分镜图生成 |
| `/project/[id]/video` | 模块四：视频合成 |
| `/templates` | 模板库 |
| `/settings` | 设置（AI 平台配置） |
