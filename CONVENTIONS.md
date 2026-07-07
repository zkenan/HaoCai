# XapiAiHaoCai 耗材管理系统 - 开发约定

## 项目信息

- **项目名称**: 耗材出入库管理系统
- **技术栈**: Vue 3 + Vite + Element Plus + Pinia (前端) | Node.js + Express + MySQL (后端)
- **版本**: 2.4.0
- **数据库**: 外部MySQL (通过 .env 配置连接)

---

## 代码风格

### JavaScript

- **无分号** — 语句结尾不加分号
- **缩进** — 2空格
- **引号** — 字符串使用单引号 `'`
- **命名** — 变量/函数 camelCase，常量 UPPER_SNAKE_CASE，文件/目录 kebab-case
- **导入顺序** — 第三方库 → 内置模块 → 项目模块（用空行分隔）

### Vue

- **组件命名** — PascalCase（如 `StockIn.vue`）
- **模板缩进** — 2空格
- **Props定义** — 使用对象声明式（不用数组）

### SQL

- **关键字大写** — SELECT, INSERT, UPDATE, WHERE 等
- **表名/列名** — 小写蛇形，用反引号转义
- **使用参数化查询** — 永远用 `?` 占位符，禁止字符串拼接

---

## Git工作流

### 分支策略

```
main          ← 稳定版本，可随时部署
  └── feature/xxx  ← 功能分支，完成后合并回main
```

- `main` — 主分支，始终保持可部署状态
- `feature/xxx` — 功能分支，命名格式 `feature/简短描述`

### 提交规范 (Conventional Commits)

```
<type>(<scope>): <description>

[可选正文]
```

| type | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | `feat(stock-out): 添加出库审批流程` |
| fix | 修复bug | `fix(auth): 修复登录token过期未跳转` |
| refactor | 重构 | `refactor(backup): 统一认证中间件` |
| docs | 文档 | `docs: 更新部署说明` |
| style | 样式调整 | `style: 调整侧边栏配色` |
| test | 测试 | `test(auth): 添加登录接口单元测试` |
| chore | 构建/工具 | `chore: 升级express到4.18.2` |

### 合并方式

- 单人开发，直接 `git merge feature/xxx` 到 main
- 合并后删除功能分支

---

## 技术选型约定

### 现有技术栈（不变）

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 | ^3.3.11 |
| 构建工具 | Vite | ^5.0.8 |
| UI组件库 | Element Plus | ^2.4.4 |
| 状态管理 | Pinia | ^2.1.7 |
| HTTP客户端 | Axios | ^1.6.2 |
| 后端框架 | Express | ^4.18.2 |
| 数据库驱动 | mysql2 | ^3.6.5 |
| 认证 | JWT (jsonwebtoken) | ^9.0.2 |

### 新增技术（按需引入）

| 用途 | 技术 | 引入时机 |
|------|------|----------|
| 数据可视化 | ECharts | 开发报表/看板功能时 |
| 数据库迁移 | Knex.js | 下次修改表结构时 |
| API测试 | Jest + supertest | 编写API测试时 |
| 输入校验 | express-validator | 需要复杂校验时 |

### 禁止引入

- Sequelize（项目已用原生mysql2，不切换ORM）
- TypeScript（项目规模不大，保持JavaScript）
- Webpack（已用Vite，不切换构建工具）

---

## 数据库规范

### 表结构变更流程

1. 在 `server/migrations/` 目录创建迁移文件（Knex格式）
2. 编写 up（变更）和 down（回滚）方法
3. 本地测试通过后提交
4. 部署时执行 `npx knex migrate:latest`

### 命名规范

- 表名 — 蛇形复数（如 `stock_in_records`）
- 列名 — 蛇形（如 `product_code`）
- 外键 — `<表名单数>_id`（如 `created_by`）
- 索引 — `idx_<表名>_<列名>`

### 安全规范

- 所有SQL使用参数化查询
- 生产环境不返回 `error.message`
- 敏感配置通过 `.env` 管理，不提交到git

---

## API设计规范

### RESTful风格

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/resource | 列表查询（分页: ?page=1&limit=20） |
| GET | /api/resource/:id | 详情查询 |
| POST | /api/resource | 创建 |
| PUT | /api/resource/:id | 更新 |
| DELETE | /api/resource/:id | 删除 |

### 响应格式

```json
{
  "message": "操作结果描述",
  "data": { },
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### 错误响应

```json
{
  "message": "用户可见的错误描述"
}
```

---

## 功能开发优先级

基于当前审查修复完成后的状态，后续开发方向：

1. **P0 — 用户管理增强**
   - 多用户注册/管理
   - 角色权限细化（admin/operator/viewer）
   - 操作日志审计

2. **P1 — 数据可视化**
   - ECharts图表集成
   - 库存趋势分析
   - 入出库统计报表
   - 数据导出PDF/Excel增强

3. **P2 — 其他增强**（后续按需）
   - 消息通知
   - 移动端适配
   - API开放
