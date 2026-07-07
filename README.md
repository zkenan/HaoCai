# 耗材出入库管理系统

面向高校实习实训教研室的耗材管理工具，支持库存管理、出入库管理、数据备份等核心功能。

## 技术栈

- **前端**：Vue 3 + Vite + Element Plus + Pinia + ECharts
- **后端**：Node.js + Express + MySQL (mysql2)
- **认证**：JWT (jsonwebtoken)
- **部署**：Docker

## 功能特性

- ✅ **入库管理**：创建入库单时直接录入/导入耗材信息，自动创建耗材记录
- ✅ **出库管理**：创建出库单、库存校验、并发安全（行锁）
- ✅ **耗材管理**：查看、编辑、删除已有耗材
- ✅ **库存看板**：ECharts图表、趋势分析、库存预警通知
- ✅ **用户管理**：多角色权限控制（admin/operator/viewer）
- ✅ **数据备份**：JSON全量导出/导入，支持灾难恢复
- ✅ **操作日志**：关键操作审计记录
- ✅ **批量操作**：支持批量删除耗材、入库单、出库单
- ✅ **移动端适配**：响应式布局，支持手机浏览器

## 快速开始

### Docker部署（推荐）

```bash
# 1. 复制配置文件
cp .env.example .env

# 2. 修改配置（填入MySQL连接信息和JWT密钥）
vim .env

# 3. 启动服务
docker compose up -d

# 4. 访问系统
# http://服务器IP:13001
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
aihaocai/
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
DB_DATABASE=aihaocai
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

> 首次登录后请立即修改密码。

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

## 数据库自动升级

系统启动时自动检测数据库结构，补全缺失的表和字段，无需手动执行SQL。

## v2.4.0 更新日志

### 入库单重构
- 创建入库单时直接录入耗材信息（手动新建或Excel导入）
- 入库单中耗材支持单价修改、总价自动计算
- Excel导入从耗材管理页面移至入库单创建页面
- stock_in_items表增加耗材信息快照字段

### 删除逻辑优化
- 删除入库单时二次确认（输入入库单号/确认删除）
- 支持选择"删除库存数据"或"保留库存数据"
- 级联删除：删除库存时同时删除关联的出库单记录
- 共享耗材保护：被多个入库单引用的耗材不会被误删

### 数据备份修复
- 导出接口返回纯净JSON文件流（修复格式不匹配问题）
- 去除10000条记录限制，支持大数据量备份
- 导出保留用户密码字段，确保还原后可正常登录

### 打印标题更新
- 入库单打印标题改为"耗材入库单"
- 出库单打印标题改为"耗材出库单"
- 副标题"人工智能学院实习实训教研室"字号与标题统一并加粗

### Bug修复
- 出库单添加按钮事件冒泡导致多选
- 批量创建耗材时产品编号重复
- Excel模板下载显示[object Object]

## v2.3 更新日志

### 新增功能
- 用户管理页面（创建/编辑/删除用户、角色权限）
- 操作日志页面（查看所有操作记录）
- 库存趋势图表（按日/周/月统计入出库）
- 库存预警通知（webhook支持钉钉/企微）
- 批量删除功能（耗材、入库单、出库单）
- 软删除撤销（30秒内可恢复）
- 快捷键支持（E编辑、Delete删除）

### 安全修复
- 移除所有硬编码密钥和默认密码
- 修复SQL注入风险（backup.js列名白名单）
- 修复竞态条件（出库库存校验+扣减在同一事务）
- 修复路径遍历攻击（backup.js文件下载/删除）
- CORS安全配置（支持环境变量配置白名单）

## 许可证

本项目仅供内部使用。

---

**版本**: v2.4.0 | **更新**: 2026-07-07 | **Docker镜像**: 192.168.20.17:5001/xapiaihaocai:2.4
