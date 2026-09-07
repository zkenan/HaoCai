# Changelog

本文件记录 HaoCai 耗材出入库管理系统的所有重要版本变更。版本号遵循语义化，Docker 镜像
tag 与版本号保持一致（如 `xapiaihaocai:2.4.9`）。

> 说明：v2.4.1–v2.4.6 期间采用 working-tree 累积开发，未单独打 commit / tag，
> 相关改动已并入 v2.4.7 及之后的版本中，故此处从 v2.4.0 直接衔接 v2.4.7。

---

## [Unreleased]

### Changed
- 仓库清理：删除 `client/.gitignore`（0 字节空文件）、`server/.gitignore`（与根目录重复）
- 历史开发计划 `PLAN.md` 归档至 `docs/archive/PLAN.md`
- `PROJECT_CONTEXT.md` / `CONVENTIONS.md` / `AGENTS.md` 版本标记更新至 v2.4.9
- `.gitignore` 移除 `package-lock.json`，纳入 client/ 与 server/ 两个 lock 文件以锁定依赖版本
- 归档早期裸机部署脚本 `deploy-docker.sh` / `deploy-linux.sh` / `install-docker.sh` 至 `docs/archive/`
- 根 `package.json` 移除 `deploy:docker`、`deploy:linux` 两个脚本入口
- `docker-compose.yml` 增加 `build` 配置，修复新设备 clone 后无本地镜像导致无法启动的问题

---

## [2.4.9] - 2026-09-04

### Added
- 工作台「库存总量 / 本月入库 / 本月出库」三张卡片可点击，点击弹出抽屉展示明细列表
- 后端 `/stock/stats` 的 `totalStockIn` / `totalStockOut` 改为真实「本月」口径
  （`DATE_FORMAT(NOW(), '%Y-%m-01')`）
- 入库 / 出库接口新增 `start_date` / `end_date` / `keyword` 筛选参数
- 新增「补货建议」页（`client/src/views/Replenish.vue`）+ 归属接口（`server/routes/ownerships.js`）
- 新增「分类管理」页（`client/src/views/Categories.vue`）+ 分类接口（`server/routes/categories.js`）

### Changed
- 抽屉内点击明细行可跳转到对应出入库详情页

### Fixed
- 删除库存分布 / 工作台卡片中 3 处硬编码假数据（如「较上周增长 12%」）

### Database
- 迁移 `20260903_01`：新建 `categories` 表；`consumables` 增加 `category_id` / `ownership` / `safety_stock`
- 迁移 `20260903_02`：新建 `ownership_options` 表，预置 4 个归属字典（部门公用 / 办公室 / 教学实验 / 项目专用）
- 迁移 `20260903_03`：`ownership_options` 增加 `need_replenish` 开关；`consumables` 增加 `ownership_id` 并按归属名回填

---

## [2.4.8] - 2026-09-03

### Changed
- 库存预警与补货建议口径统一：**仅当归属开关 `need_replenish=1` 且库存低于安全库存时才计入告警**
- 涉及 `server/utils/notification.js` 的 `checkStockAlert`、`server/routes/consumables.js` 的
  `GET /` 与 `GET /stock/inventory` 告警分支，均增加 `LEFT JOIN ownership_options ... AND oo.need_replenish = 1`

---

## [2.4.7] - 2026-09-03

### Fixed
- Excel 导出后重新导入失败：表头解析兼容带星号格式（名称* / 数量* / 归属* / 分类*）
- 新增 `server/utils/excelTemplate.js` 统一模板生成与解析逻辑

---

## [2.4.0] - 2026-07-07

### Added
- 入库单重构：创建入库单时直接录入耗材信息（手动新建或 Excel 导入）
- 入库单中耗材支持单价修改、总价自动计算
- Excel 导入从耗材管理页面移至入库单创建页面
- `stock_in_items` 表增加耗材信息快照字段

### Changed
- 删除入库单时二次确认（输入入库单号 / 确认删除）
- 支持选择「删除库存数据」或「保留库存数据」
- 级联删除：删除库存时同时删除关联的出库单记录
- 共享耗材保护：被多个入库单引用的耗材不会被误删
- 数据备份导出返回纯净 JSON 文件流，去除 10000 条记录限制
- 入库单 / 出库单打印标题分别改为「耗材入库单 / 耗材出库单」

### Fixed
- 出库单添加按钮事件冒泡导致多选
- 批量创建耗材时产品编号重复
- Excel 模板下载显示 `[object Object]`

---

## [2.3] - 2026-06

### Added
- 用户管理页面（创建 / 编辑 / 删除用户、角色权限）
- 操作日志页面（查看所有操作记录）
- 库存趋势图表（按日 / 周 / 月统计入出库）
- 库存预警通知（webhook 支持钉钉 / 企微）
- 批量删除功能（耗材、入库单、出库单）
- 软删除撤销（30 秒内可恢复）
- 快捷键支持（E 编辑、Delete 删除）

### Security
- 移除所有硬编码密钥和默认密码
- 修复 SQL 注入风险（backup.js 列名白名单）
- 修复竞态条件（出库库存校验 + 扣减在同一事务）
- 修复路径遍历攻击（backup.js 文件下载 / 删除）
- CORS 安全配置（支持环境变量配置白名单）
