# 耗材出入库管理系统

面向高校实习实训教研室的耗材管理工具，支持库存管理、出入库管理、数据备份等核心功能。

## 技术栈

- **前端**：Vue 3 + Vite + Element Plus + Pinia + ECharts
- **后端**：Node.js + Express + MySQL (mysql2)
- **认证**：JWT (jsonwebtoken)
- **部署**：Docker

## 功能特性

- ✅ **耗材管理**：增删改查、Excel批量导入、软删除撤销
- ✅ **入库管理**：创建入库单、事务性库存增加、打印
- ✅ **出库管理**：创建出库单、库存校验、并发安全
- ✅ **库存看板**：ECharts图表、趋势分析、库存预警通知
- ✅ **用户管理**：多角色权限控制（admin/operator/viewer）
- ✅ **数据备份**：JSON全量导出/导入、路径遍历防护
- ✅ **操作日志**：关键操作审计记录
- ✅ **数据可视化**：库存分布饼图、入出库趋势折线图
- ✅ **批量操作**：支持批量删除耗材、入库单、出库单
- ✅ **移动端适配**：响应式布局，支持手机浏览器

## 快速开始

### Docker部署（推荐）

```bash
# 1. 复制配置文件
cp .env.example .env

# 2. 修改配置（填入MySQL连接信息）
vim .env

# 3. 启动服务
docker compose up -d

# 4. 访问系统
# http://localhost:3000
```

### 开发环境

```bash
# 安装依赖
npm run install-all

# 启动开发服务器
npm run dev
```

## 项目结构

```
XapiAiHaoCai/
├── client/                  # 前端Vue应用
│   ├── src/views/           # 页面组件（8个）
│   │   ├── Login.vue        # 登录页
│   │   ├── Inventory.vue    # 库存看板
│   │   ├── Consumables.vue  # 耗材管理
│   │   ├── StockIn.vue      # 入库管理
│   │   ├── StockOut.vue     # 出库管理
│   │   ├── Users.vue        # 用户管理
│   │   ├── Backup.vue       # 数据备份
│   │   └── Logs.vue         # 操作日志
│   ├── src/router/          # 路由配置
│   ├── src/store/           # Pinia状态管理
│   └── src/utils/api.js     # HTTP请求封装
├── server/                  # 后端Node.js服务
│   ├── routes/              # API路由（8个）
│   ├── middleware/           # 认证、日志、错误监控中间件
│   ├── utils/               # 工具函数
│   ├── validations/         # 输入校验规则
│   ├── migrations/          # 数据库迁移
│   └── __tests__/           # 单元测试
├── Dockerfile               # Docker镜像构建
├── docker-compose.yml       # Docker编排
├── .env.example             # 配置模板
└── README.md
```

## 环境变量配置

复制 `.env.example` 为 `.env` 并填入：

```bash
# 数据库配置（连接外部MySQL）
DB_HOST=你的MySQL服务器IP
DB_PORT=3306
DB_DATABASE=xapiaihaocai
DB_USER=数据库用户名
DB_PASSWORD=数据库密码

# JWT密钥（用 openssl rand -hex 32 生成）
JWT_SECRET=随机密钥

# 库存预警阈值（可选，默认10）
STOCK_ALERT_THRESHOLD=10

# CORS配置（可选，逗号分隔多个来源）
# CORS_ORIGINS=http://localhost:8080,http://your-domain.com
```

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |

## 常用命令

```bash
# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart
```

## v2.3 更新日志

### 新增功能
- 用户管理页面（创建/编辑/删除用户、角色权限）
- 操作日志页面（查看所有操作记录）
- 库存趋势图表（按日/周/月统计入出库）
- 库存预警通知（webhook支持钉钉/企微）
- 批量删除功能（耗材、入库单、出库单）
- 软删除撤销（30秒内可恢复）
- Excel导入结果详情（显示成功/失败条数）
- 快捷键支持（E编辑、Delete删除）

### 功能优化
- 入库单/出库单：送货人、库房负责人改为非必填
- 打印页面：移除审批人签字，保留两方签字
- 入库单打印：送货人签字 + 库房负责人签字（一左一右）
- 出库单打印：领用人签字 + 库房负责人签字（一左一右）
- 入库/出库面板列宽统一增加8px
- 登录后默认跳转工作台

### 安全修复
- 移除所有硬编码密钥和默认密码
- 修复SQL注入风险（backup.js列名白名单）
- 修复竞态条件（出库库存校验+扣减在同一事务）
- 修复路径遍历攻击（backup.js文件下载/删除）
- CORS安全配置（支持环境变量配置白名单）
- 密码重置需要管理员二次确认
- 删除用户前检查关联记录
- 错误信息不再泄露内部细节
- 备份导出排除用户密码字段

### 性能优化
- 批量删除从N+1查询优化为批量操作
- 库存统计从4次查询合并为1次
- 数据库添加索引（reporter、record_code等）
- 日期格式化改为应用层白名单映射

### 代码质量
- 引入Winston日志系统（替代console.log）
- 输入校验中间件（express-validator）
- 错误监控中间件
- 21个操作点添加结构化日志

### 前端优化
- CSS变量体系标准化
- 响应式布局（1080p/2K/4K自适应）
- 移动端适配（768px/480px断点）
- 操作列按钮间距优化

### Docker部署
- 支持外部MySQL数据库连接
- 数据库自动升级（检查并添加缺失字段）
- 镜像大小优化（91MB）

## 许可证

本项目仅供内部使用。

---

**版本**: v2.3 | **更新**: 2026-06-18 | **Docker镜像**: 192.168.20.17:5001/xapiaihaocai:2.3
