# XapiAiHaoCai 项目上下文

> 本文档供AI助手或新会话使用，阅读后可完整了解项目状态。
> 最后更新: 2026-07-07

---

## 一、项目是什么

耗材出入库管理系统，面向高校实习实训教研室。

**核心功能**：
- 入库管理（创建入库单时直接录入/导入耗材信息，自动创建耗材记录）
- 出库管理（创建出库单、库存校验、并发安全行锁）
- 耗材管理（查看、编辑、删除已有耗材）
- 库存看板（ECharts图表、趋势分析、预警通知）
- 用户管理（多角色权限 admin/operator/viewer）
- 数据备份（JSON全量导出/导入，支持灾难恢复）
- 操作日志（关键操作审计记录）

**技术栈**：
- 前端：Vue 3 + Vite + Element Plus + Pinia + ECharts
- 后端：Node.js + Express + MySQL (mysql2)
- 认证：JWT (jsonwebtoken)
- 部署：Docker（连接外部MySQL数据库）

---

## 二、当前版本 v2.4.0

### 已完成的功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 入库管理 | 创建入库单时录入/导入耗材、自动创建耗材记录 | ✅ |
| 出库管理 | 创建出库单、库存校验、并发安全 | ✅ |
| 耗材管理 | 查看、编辑、删除已有耗材 | ✅ |
| 库存看板 | ECharts图表、趋势分析、预警 | ✅ |
| 用户管理 | 多角色、创建/编辑/删除 | ✅ |
| 数据备份 | JSON导出/导入、支持大数据量 | ✅ |
| 操作日志 | 审计记录 | ✅ |
| 批量操作 | 批量删除耗材/入库/出库 | ✅ |
| 删除逻辑 | 二次确认、删除/保留库存选择、级联删除 | ✅ |
| 打印功能 | 耗材入库单/出库单打印 | ✅ |

### 数据库表结构

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| consumables | 耗材表（含软删除） |
| stock_in_records | 入库单主表 |
| stock_in_items | 入库单明细（含耗材快照字段） |
| stock_out_records | 出库单主表 |
| stock_out_items | 出库单明细 |
| operation_logs | 操作日志表 |

### stock_in_items 新增字段（v2.4.0）

- `consumable_name` — 耗材名称快照
- `spec_model` — 规格型号快照
- `unit` — 单位快照
- `reporter` — 提报人快照

---

## 三、后续可选方向

| 方向 | 说明 | 优先级 |
|------|------|--------|
| 耗材数量叠加 | 同名同规格耗材入库时数量自动累加 | 中 |
| 库存趋势时间筛选 | 图表支持自定义时间范围 | 低 |
| 消息通知 | 邮件/webhook推送 | 中 |
| API文档 | Swagger/OpenAPI | 低 |

---

## 四、开发限制（红线规则）

### ⚠️ 入库单/出库单代码修改需请示用户

修改以下文件前必须先请示用户批准：
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
- 提交使用 Conventional Commits 格式

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
| `server/routes/consumables.js` | 耗材CRUD、库存查询 |
| `server/routes/stock-in.js` | 入库管理（事务+耗材创建） |
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
| `docker-compose.yml` | Docker编排 |

---

## 六、Docker镜像信息

| 项目 | 值 |
|------|-----|
| 镜像名 | `192.168.20.17:5001/xapiaihaocai:2.4` |
| 大小 | 617MB |
| 内部端口 | 3000 |
| 外部端口 | 13001 |
| 基础镜像 | node:18-slim |

### 部署到新服务器

```bash
# 拉取镜像
docker pull 192.168.20.17:5001/xapiaihaocai:2.4

# 创建配置
cp .env.example .env
vim .env  # 填入MySQL连接信息和JWT密钥

# 启动
docker compose up -d

# 访问
# http://服务器IP:13001
# 默认账号: admin / admin123
```

---

## 七、代码风格速查

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
