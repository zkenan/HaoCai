# 耗材管理系统

耗材出入库管理系统是一个面向企业和组织的耗材管理工具，支持Excel批量导入、库存看板、出入库管理等核心功能。

## 技术栈

- **前端**：Vue 3 + Vite + Element Plus + Pinia
- **后端**：Node.js + Express + MySQL
- **打包工具**：pkg（将Node.js应用打包为.exe）

## 功能特性

- ✅ **耗材管理**：耗材信息维护、Excel批量导入导出
- ✅ **出入库管理**：支持扫码枪、Excel批量导入
- ✅ **库存看板**：实时库存监控和预警
- ✅ **权限管理**：多角色权限控制
- ✅ **主题定制**：支持自定义主题颜色和背景

## 快速开始

### 开发环境

```bash
# 安装依赖
npm run install-all

# 启动开发服务器
npm run dev
```

### 部署环境

```bash
# 使用打包脚本
.\打包系统.bat

# 或使用部署脚本
.\部署系统.bat
```

## 项目结构

```
XapiAiHaoCai/
├── client/          # 前端Vue应用
│   ├── src/
│   │   ├── api/     # API接口
│   │   ├── views/   # 页面组件
│   │   ├── stores/  # Pinia状态管理
│   │   └── utils/   # 工具函数
│   └── vite.config.js
├── server/          # 后端Node.js服务
│   ├── config/      # 配置文件
│   ├── routes/      # 路由处理
│   ├── middleware/  # 中间件
│   ── public/      # 前端静态文件
├── uploads/         # 上传文件存储
├── .gitignore
└── README.md
```

## 部署说明

1. 确保目标机器已安装MySQL数据库
2. 执行 `server/database.sql` 创建数据库和表
3. 修改 `database.json` 配置数据库连接信息
4. 运行 `耗材管理系统.exe` 启动服务
5. 浏览器访问 `http://localhost:3000`

## 注意事项

- **数据库配置**：首次使用需要修改 `database.json` 中的MySQL连接信息
- **端口占用**：系统默认使用3000端口，如有冲突请修改配置
- **浏览器兼容性**：建议使用Chrome或Edge浏览器

## 许可证

本项目仅供内部使用，未经许可不得传播。

## 作者

zkenan

---

**版本信息**：
- 最后更新：2026-05-16
- 打包版本：耗材管理系统.exe (55.9 MB)
