# 耗材出入库管理系统

面向高校实习实训教研室的耗材管理工具，支持库存管理、出入库管理、数据备份等核心功能。

## 技术栈

- **前端**：Vue 3 + Vite + Element Plus + Pinia + ECharts
- **后端**：Node.js + Express + MySQL (mysql2)
- **认证**：JWT (jsonwebtoken)
- **部署**：Docker

## 功能特性

- ✅ **耗材管理**：增删改查、Excel批量导入
- ✅ **入库管理**：创建入库单、事务性库存增加、打印
- ✅ **出库管理**：创建出库单、库存校验、并发安全
- ✅ **库存看板**：ECharts图表、实时统计、库存预警
- ✅ **用户管理**：多角色权限控制（admin/operator/viewer）
- ✅ **数据备份**：JSON全量导出/导入
- ✅ **操作日志**：关键操作审计记录

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
│   ├── src/views/           # 页面组件（7个）
│   ├── src/router/          # 路由配置
│   ├── src/store/           # Pinia状态管理
│   └── src/utils/api.js     # HTTP请求封装
├── server/                  # 后端Node.js服务
│   ├── routes/              # API路由（8个）
│   ├── middleware/           # 认证、日志中间件
│   ├── utils/               # 工具函数
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

## 许可证

本项目仅供内部使用。

---

**版本**: v2.2 | **更新**: 2026-06-17
