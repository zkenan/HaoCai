# XapiAiHaoCai 项目上下文

> 本文档供AI助手或新会话使用，阅读后可完整了解项目状态。
> 最后更新: 2026-06-18

---

## 一、项目是什么

耗材出入库管理系统，面向高校实习实训教研室。

**核心功能**：
- 耗材管理（增删改查、Excel批量导入）
- 入库管理（创建入库单、事务性库存增加、打印）
- 出库管理（创建出库单、库存校验、并发安全）
- 库存看板（ECharts图表、趋势分析、预警通知）
- 用户管理（多角色权限 admin/operator/viewer）
- 数据备份（JSON导出/导入、路径遍历防护）
- 操作日志（关键操作审计记录）

**技术栈**：
- 前端：Vue 3 + Vite + Element Plus + Pinia + ECharts
- 后端：Node.js + Express + MySQL (mysql2)
- 认证：JWT (jsonwebtoken)
- 部署：Docker（连接外部MySQL数据库）

---

## 二、做到什么程度（当前版本 v2.3）

### 已完成的功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 耗材管理 | CRUD、Excel导入、软删除撤销 | ✅ |
| 入库管理 | 创建入库单、事务、打印 | ✅ |
| 出库管理 | 创建出库单、库存校验、并发安全 | ✅ |
| 库存看板 | ECharts图表、趋势分析、预警 | ✅ |
| 用户管理 | 多角色、创建/编辑/删除 | ✅ |
| 数据备份 | JSON导出/导入 | ✅ |
| 操作日志 | 审计记录 | ✅ |
| 批量操作 | 批量删除耗材/入库/出库 | ✅ |
| 移动端适配 | 响应式布局 | ✅ |
| 快捷键 | E编辑、Delete删除 | ✅ |

### 已完成的基础设施

| 项目 | 状态 |
|------|------|
| Winston日志系统 | ✅ |
| express-validator输入校验 | ✅ |
| 错误监控中间件 | ✅ |
| 数据库迁移工具(Knex) | ✅ |
| API单元测试(jest+supertest) | ✅ |
| Docker镜像构建 | ✅ v2.3 |
| 外部MySQL数据库支持 | ✅ |
| 数据库自动升级 | ✅ |

### 已完成的安全修复

| 项目 | 状态 |
|------|------|
| 移除硬编码密钥/密码 | ✅ |
| SQL注入防护 | ✅ |
| 路径遍历防护 | ✅ |
| 竞态条件修复 | ✅ |
| CORS安全配置 | ✅ |
| 错误信息通用化 | ✅ |
| 密码重置二次认证 | ✅ |
| 删除用户关联检查 | ✅ |
| 备份导出排除密码 | ✅ |

---

## 三、下一步计划

### P10 — 审查修复（已全部完成）

- P10.1 功能修复（6项）✅
- P10.2 性能修复（7项）✅
- P10.3 安全修复（5项）✅

### 后续可选方向

| 方向 | 说明 | 优先级 |
|------|------|--------|
| 库存趋势时间筛选 | 图表支持自定义时间范围 | 低 |
| 数据导出PDF增强 | 专业报表模板 | 低 |
| 消息通知 | 邮件/webhook推送 | 中 |
| 移动端深度适配 | 底部导航、表格转卡片 | 中 |
| 操作撤销扩展 | 出库/出库单也支持撤销 | 中 |
| API文档 | Swagger/OpenAPI | 低 |

---

## 四、开发限制（红线规则）

### ⚠️ 入库单/出库单代码修改需请示用户

**这是用户明确要求的红线规则。** 修改以下文件前必须先请示用户批准：
- `client/src/views/StockIn.vue`
- `client/src/views/StockOut.vue`
- `server/routes/stock-in.js`
- `server/routes/stock-out.js`

### 安全红线

- SQL查询必须使用参数化查询（`?` 占位符）
- 生产环境不返回 `error.message`
- 文件上传必须校验类型和大小
- 路径操作必须用 `path.resolve()` 防遍历
- JWT密钥从环境变量读取，不硬编码

### 代码规范

- 无分号JS、2空格缩进、单引号
- 导入顺序：第三方库 → 内置模块 → 项目模块
- 所有开发任务必须先写入 PLAN.md，经批准后再执行
- 提交使用 Conventional Commits 格式

### 禁止事项

- 不要修改 `.env` 文件中的密码和密钥（除非用户要求）
- 不要删除 `uploads/` 目录下的用户数据
- 不要在代码中硬编码敏感信息
- 不要引入 CONVENTIONS.md 中禁止的技术栈（Sequelize/TypeScript/Webpack）
- 不要跳过 PLAN.md 直接开发

---

## 五、关键文件速查

### 后端

| 文件 | 用途 |
|------|------|
| `server/app.js` | Express入口，路由挂载、中间件 |
| `server/config/db.js` | 数据库连接池（.env配置） |
| `server/middleware/auth.js` | JWT认证、管理员权限 |
| `server/middleware/errorMonitor.js` | 错误监控中间件 |
| `server/middleware/logger.js` | 操作日志中间件 |
| `server/routes/auth.js` | 登录、修改密码 |
| `server/routes/consumables.js` | 耗材CRUD、批量导入、库存查询 |
| `server/routes/stock-in.js` | 入库管理（事务） |
| `server/routes/stock-out.js` | 出库管理（事务+行锁） |
| `server/routes/backup.js` | 数据备份导出/导入 |
| `server/routes/files.js` | Excel模板、打印数据接口 |
| `server/routes/users.js` | 用户管理 |
| `server/routes/logs.js` | 操作日志查询 |
| `server/utils/initDatabase.js` | 自动建库建表、升级 |
| `server/utils/codeGenerator.js` | 编号生成 |
| `server/utils/logger.js` | Winston日志 |
| `server/utils/notification.js` | 库存预警通知 |
| `server/validations/index.js` | 输入校验规则 |

### 前端

| 文件 | 用途 |
|------|------|
| `client/src/router/index.js` | 路由配置 |
| `client/src/utils/api.js` | Axios请求封装 |
| `client/src/store/user.js` | Pinia用户状态 |
| `client/src/styles/global.css` | CSS变量、全局样式 |
| `client/src/layout/MainLayout.vue` | 主布局（侧边栏+顶栏） |
| `client/src/views/Login.vue` | 登录页 |
| `client/src/views/Inventory.vue` | 库存看板 |
| `client/src/views/Consumables.vue` | 耗材管理 |
| `client/src/views/StockIn.vue` | 入库管理 ⚠️ |
| `client/src/views/StockOut.vue` | 出库管理 ⚠️ |
| `client/src/views/Users.vue` | 用户管理 |
| `client/src/views/Backup.vue` | 数据备份 |
| `client/src/views/Logs.vue` | 操作日志 |

### 配置/部署

| 文件 | 用途 |
|------|------|
| `.env` | 环境变量（敏感，不提交git） |
| `.env.example` | 配置模板 |
| `Dockerfile` | Docker镜像构建 |
| `docker-compose.yml` | Docker编排（app服务） |
| `deploy-docker.sh` | 一键部署脚本 |

### 文档

| 文件 | 用途 |
|------|------|
| `README.md` | 项目说明、更新日志 |
| `CONVENTIONS.md` | 代码规范、技术选型 |
| `DESIGN.md` | 设计系统、UI规范 |
| `PLAN.md` | 开发计划、进度追踪 |
| `AGENTS.md` | AI工程指引 |
| `本文档` | 项目上下文（供新会话使用） |

---

## 六、环境配置

### .env 配置

```bash
# 数据库（连接外部MySQL）
DB_HOST=MySQL服务器IP
DB_PORT=3306
DB_DATABASE=xapiaihaocai
DB_USER=数据库用户名
DB_PASSWORD=数据库密码

# JWT密钥
JWT_SECRET=随机密钥

# 其他
PORT=3000
NODE_ENV=production
STOCK_ALERT_THRESHOLD=10
```

### 启动命令

```bash
# Docker部署
docker compose up -d

# 开发模式
npm run dev

# 后端单独启动
cd server && node app.js
```

### 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |

---

## 七、Docker镜像信息

| 项目 | 值 |
|------|-----|
| 镜像名 | `192.168.20.17:5001/xapiaihaocai:2.3` |
| 大小 | 452MB |
| 内部端口 | 3000 |
| 基础镜像 | node:18-slim |

### 部署到新服务器

```bash
# 拉取镜像
docker pull 192.168.20.17:5001/xapiaihaocai:2.3

# 创建配置
cp .env.example .env
vim .env  # 填入MySQL连接信息

# 修改docker-compose.yml中的image为
# image: 192.168.20.17:5001/xapiaihaocai:2.3

# 启动
docker compose up -d
```

---

## 八、代码风格速查

```javascript
// 无分号、2空格、单引号
const express = require('express')

// 导入顺序：第三方 → 内置 → 项目
const cors = require('cors')
const path = require('path')
const db = require('./config/db')

// 日志使用Winston
logger.info('操作描述', { key: value })
logger.error('错误描述', { error: err.message, stack: err.stack })

// API响应格式
res.json({ message: '操作成功', data: {...} })
res.status(400).json({ message: '错误描述' })
```
