# XapiAiHaoCai 耗材管理系统 - 工程指引

> 本文件供AI助手使用，提供项目上下文和工作指引。

---

## 项目概况

耗材出入库管理系统，面向高校实习实训教研室，支持耗材管理、出入库、库存看板、数据备份。

**技术栈**: Vue 3 + Vite + Element Plus + Pinia (前端) | Express + MySQL (后端)

**部署方式**: Docker Compose (app + nginx) 连接外部MySQL数据库

**项目根目录**: `/home/luoqikai/mimo/XapiAiHaoCai`

---

## 关键文件速查

| 文件 | 用途 |
|------|------|
| `server/app.js` | Express入口，路由挂载、中间件、启动逻辑 |
| `server/config/db.js` | 数据库连接池，从.env读取配置 |
| `server/middleware/auth.js` | JWT认证、管理员权限中间件 |
| `server/routes/auth.js` | 登录、修改密码 |
| `server/routes/consumables.js` | 耗材CRUD、批量导入、库存查询 |
| `server/routes/stock-in.js` | 入库管理（事务） |
| `server/routes/stock-out.js` | 出库管理（事务+行锁） |
| `server/routes/backup.js` | 数据备份导出/导入（列名白名单） |
| `server/routes/files.js` | Excel模板下载、打印数据接口 |
| `server/utils/initDatabase.js` | 自动建库建表、默认账号初始化 |
| `server/utils/codeGenerator.js` | 编号生成（产品编号/入库单号/出库单号） |
| `client/src/router/index.js` | 前端路由配置 |
| `client/src/utils/api.js` | Axios请求封装（拦截器） |
| `client/src/store/user.js` | Pinia用户状态 |
| `client/src/views/*.vue` | 页面组件 |

---

## 工作流程

### 开发新功能

1. **先查计划**: 读取 `PLAN.md` 确认任务在计划中
2. **创建分支**: `git checkout -b feature/功能名`
3. **理解现有代码**: 读取相关文件，理解现有模式
4. **编写代码**: 遵循 `CONVENTIONS.md` 中的代码风格
5. **运行测试**: `cd server && node -e "require('./routes/xxx')"` 验证模块加载
6. **提交代码**: 使用 Conventional Commits 格式
7. **更新计划**: 在 `PLAN.md` 中勾选完成的任务

### 修复Bug

1. 复现问题，确认根因
2. 最小范围修复，不引入额外改动
3. 验证修复有效
4. 提交：`fix(scope): 问题描述`

### 修改数据库表结构

1. 使用Knex创建迁移文件：`npx knex migrate:make migration_name`
2. 编写 up/down 方法
3. 本地测试：`npx knex migrate:latest`
4. 提交迁移文件

---

## 编码注意事项

### 安全红线（不可违反）

- SQL查询必须使用参数化查询（`?` 占位符）
- 生产环境不返回 `error.message`
- 文件上传必须校验类型和大小
- 路径操作必须用 `path.resolve()` 防遍历
- JWT密钥从环境变量读取，不硬编码

### 数据库操作规范

- 写操作（INSERT/UPDATE/DELETE）使用事务
- 出库操作使用 `SELECT ... FOR UPDATE` 行锁
- 批量操作使用事务包裹
- 编号生成注意并发安全

### 前端规范

- API调用通过 `client/src/utils/api.js` 封装
- 状态管理使用Pinia（`client/src/store/`）
- UI组件使用Element Plus
- 路由守卫检查token存在性

---

## 环境配置

### .env 必须配置

```
DB_HOST=MySQL服务器地址
DB_PORT=3306
DB_DATABASE=xapiaihaocai
DB_USER=aihaocai
DB_PASSWORD=数据库密码
JWT_SECRET=JWT密钥（用node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 生成）
```

### 启动命令

```bash
# 开发模式（前后端分离）
npm run dev

# 后端单独启动
cd server && npm run dev

# Docker部署
./deploy-docker.sh
```

---

## 禁止事项

- 不要修改 `.env` 文件中的密码和密钥（除非用户要求）
- 不要删除 `uploads/` 目录下的用户数据
- 不要在代码中硬编码敏感信息
- 不要引入CONVENTIONS.md中禁止的技术栈
- 不要跳过PLAN.md直接开发（所有任务必须先入计划）
