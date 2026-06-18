# XapiAiHaoCai 耗材管理系统 - 设计约定

> 设计风格参考: Mi Design (小米设计语言)
> 最后更新: 2026-06-16

---

## 一、设计系统

### 1.1 颜色体系

#### 主色

| 用途 | 色值 | 用途说明 |
|------|------|----------|
| Primary | `#3b82f6` | 按钮、链接、选中态、品牌色 |
| Primary Light | `#dbeafe` | 选中背景、标签底色 |
| Primary Dark | `#2563eb` | 悬停态、按下态 |

#### 语义色

| 用途 | 色值 | 浅色背景 | 使用场景 |
|------|------|----------|----------|
| Success | `#10b981` | `#d1fae5` | 成功、完成、入库 |
| Warning | `#f59e0b` | `#fef3c7` | 警告、库存预警 |
| Danger | `#ef4444` | `#fee2e2` | 错误、删除、出库 |
| Info | `#06b6d4` | `#cffafe` | 信息提示、待处理 |

#### 中性色

| 层级 | 色值 | 用途 |
|------|------|------|
| Text Primary | `#0f172a` | 标题、正文 |
| Text Secondary | `#64748b` | 副标题、说明文字 |
| Text Muted | `#94a3b8` | 占位符、禁用态 |
| Border | `#e2e8f0` | 分割线、边框 |
| Background | `#f1f5f9` | 页面底色 |
| Card BG | `#ffffff` | 卡片、弹窗背景 |

#### 侧边栏色

| 用途 | 色值 |
|------|------|
| 背景色 | `#0f172a` |
| 悬停色 | `#1e293b` |
| 文字色 | `#cbd5e1` |
| 选中文字 | `#ffffff` |
| 选中指示 | `#3b82f6` |

### 1.2 字体

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
  'Helvetica Neue', Arial, 'Microsoft YaHei', sans-serif;
```

| 层级 | 大小 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| H1 | 24px | 600 | 32px | 页面标题 |
| H2 | 20px | 600 | 28px | 卡片标题 |
| H3 | 16px | 600 | 24px | 区块标题 |
| Body | 14px | 400 | 22px | 正文内容 |
| Caption | 12px | 400 | 18px | 辅助说明、时间戳 |

### 1.3 间距系统

基于 **4px** 网格：

| Token | 值 | 用途 |
|-------|-----|------|
| xs | 4px | 图标与文字间距 |
| sm | 8px | 紧凑元素间距 |
| md | 12px | 按钮内边距、小间距 |
| lg | 16px | 卡片内边距、元素间距 |
| xl | 24px | 页面内边距、大间距 |
| 2xl | 32px | 区块间距 |

### 1.4 圆角

| 元素 | 圆角值 |
|------|--------|
| 按钮 | 8px |
| 输入框 | 8px |
| 卡片 | 12px |
| 弹窗 | 16px |
| 标签 | 6px |
| 头像 | 50%（圆形） |
| 小提示 | 4px |

### 1.5 阴影

| 层级 | 阴影值 | 用途 |
|------|--------|------|
| Shadow-sm | `0 1px 3px rgba(0,0,0,0.1)` | 卡片默认 |
| Shadow-md | `0 4px 6px rgba(0,0,0,0.1)` | 悬停态 |
| Shadow-lg | `0 10px 15px rgba(0,0,0,0.1)` | 弹窗、下拉菜单 |
| Shadow-xl | `0 20px 25px rgba(0,0,0,0.15)` | 模态框遮罩上层 |

### 1.6 动画

| 场景 | 属性 | 值 |
|------|------|-----|
| 通用过渡 | transition | `all 0.3s ease` |
| 颜色过渡 | transition | `color 0.2s, background-color 0.2s` |
| 弹窗出现 | animation | `fade-in 0.2s ease` |
| 列表项 | animation | `slide-up 0.3s ease` |

---

## 二、页面布局规范

### 2.1 整体结构

```
┌──────────┬────────────────────────────────┐
│          │  顶栏 (height: 60px)           │
│  侧边栏  ├────────────────────────────────┤
│ (220px)  │                                │
│          │  内容区 (padding: 24px)         │
│          │                                │
│          │                                │
└──────────┴────────────────────────────────┘
```

### 2.2 侧边栏

| 属性 | 值 |
|------|-----|
| 宽度 | 220px（固定） |
| 背景 | `#0f172a` |
| Logo区高度 | 80px |
| 菜单项高度 | 48px |
| 菜单组间距 | 24px |
| 菜单组标题 | 12px, `#94a3b8`, uppercase, letter-spacing: 1px |

### 2.3 顶栏

| 属性 | 值 |
|------|-----|
| 高度 | 60px |
| 背景 | `#ffffff` |
| 阴影 | `0 1px 3px rgba(0,0,0,0.05)` |
| 左侧 | 页面标题 (16px, 600) |
| 右侧 | 搜索框 + 用户头像下拉 |

### 2.4 内容区

| 属性 | 值 |
|------|-----|
| 背景 | `#f1f5f9` |
| 内边距 | 24px |
| 最大宽度 | 不限（流式布局） |
| 卡片间距 | 24px |

### 2.5 页面模板

```vue
<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 页面头部：标题 + 操作按钮 -->
      <div class="page-header">
        <div class="header-left">
          <h3>页面标题</h3>
        </div>
        <div class="header-right">
          <el-button type="primary">主要操作</el-button>
        </div>
      </div>
      
      <!-- 搜索/筛选区 -->
      <div class="filter-section">
        <el-input placeholder="搜索..." />
        <el-select>...</el-select>
      </div>
      
      <!-- 数据表格 -->
      <el-table>...</el-table>
      
      <!-- 分页 -->
      <el-pagination />
    </div>
  </div>
</template>
```

---

## 三、组件设计规范

### 3.1 按钮

| 类型 | 样式 | 用途 |
|------|------|------|
| Primary | 蓝色背景 (#3b82f6), 白色文字 | 主要操作（新建、提交） |
| Success | 绿色背景 (#10b981), 白色文字 | 确认操作 |
| Danger | 红色边框, 红色文字 | 删除操作 |
| Default | 白色背景, 灰色边框 | 次要操作（取消、返回） |
| Text | 无背景无边框, 蓝色文字 | 链接式操作（查看详情） |

**按钮尺寸**:

| 尺寸 | 高度 | 内边距 | 字号 |
|------|------|--------|------|
| Large | 40px | 16px 24px | 14px |
| Default | 32px | 8px 16px | 14px |
| Small | 24px | 4px 8px | 12px |

### 3.2 表格

| 属性 | 值 |
|------|-----|
| 行高 | 52px |
| 表头背景 | `#f8fafc` |
| 表头文字 | 12px, 600, `#64748b` |
| 单元格文字 | 14px, 400, `#0f172a` |
| 边框 | `1px solid #e2e8f0` |
| 悬停行 | `#f8fafc` |
| 斑马纹 | 交替 `#ffffff` / `#f8fafc` |
| 操作列 | 固定右侧, 宽度根据按钮数自适应 |

### 3.3 表单

| 属性 | 值 |
|------|-----|
| 标签位置 | 顶部 (label-position: top) |
| 标签样式 | 14px, 500, `#0f172a` |
| 输入框高度 | 32px |
| 输入框圆角 | 8px |
| 输入框边框 | `1px solid #e2e8f0` |
| 输入框聚焦 | `border-color: #3b82f6`, `box-shadow: 0 0 0 2px #dbeafe` |
| 错误态 | `border-color: #ef4444` |
| 表单项间距 | 20px |
| 表单操作间距 | 32px |

### 3.4 卡片

| 属性 | 值 |
|------|-----|
| 背景 | `#ffffff` |
| 圆角 | 12px |
| 内边距 | 24px |
| 阴影 | `0 1px 3px rgba(0,0,0,0.1)` |
| 悬停阴影 | `0 10px 15px rgba(0,0,0,0.1)` |
| 标题字号 | 16px, 600 |
| 标题底部分割线 | `1px solid #e2e8f0` |

### 3.5 弹窗 (Dialog)

| 属性 | 值 |
|------|-----|
| 圆角 | 16px |
| 宽度 | 500px (默认), 700px (详情), 900px (打印预览) |
| 遮罩颜色 | `rgba(0,0,0,0.5)` |
| 头部字号 | 16px, 600 |
| 内容区内边距 | 24px |
| 底部操作区 | 右对齐, 间距 12px |

### 3.6 标签 (Tag)

| 类型 | 背景 | 文字 | 用途 |
|------|------|------|------|
| Primary | `#dbeafe` | `#2563eb` | 默认状态 |
| Success | `#d1fae5` | `#059669` | 已完成、入库 |
| Warning | `#fef3c7` | `#d97706` | 待处理、预警 |
| Danger | `#fee2e2` | `#dc2626` | 已删除、异常 |
| Info | `#cffafe` | `#0891b2` | 信息标注 |

**标签尺寸**:

| 尺寸 | 高度 | 内边距 | 字号 | 圆角 |
|------|------|--------|------|------|
| Large | 28px | 8px 12px | 14px | 6px |
| Default | 22px | 4px 8px | 12px | 4px |
| Small | 18px | 2px 6px | 10px | 3px |

### 3.7 统计卡片 (Dashboard)

```
┌─────────────────────────┐
│  图标 + 数值 (28px, 700)  │
│  标题 (14px, #64748b)     │
│  趋势 (12px, +12% 绿色)  │
└─────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 最小宽度 | 200px |
| 图标大小 | 40px |
| 数值字号 | 28px, 700 |
| 标题字号 | 14px, 400, `#64748b` |
| 趋势字号 | 12px |
| 内边距 | 20px |
| 图标背景 | 语义色浅色背景 |

### 3.8 空状态

```
┌─────────────────────────┐
│       [空状态图标]        │
│    暂无数据 (16px, #64748b) │
│   [操作按钮] (可选)       │
└─────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 图标大小 | 80px |
| 图标颜色 | `#cbd5e1` |
| 文字颜色 | `#64748b` |
| 垂直居中 | display: flex, flex-direction: column, align-items: center |

---

## 四、交互反馈规范

### 4.1 加载状态

| 场景 | 实现方式 |
|------|----------|
| 页面加载 | Skeleton 骨架屏 (Element Plus `el-skeleton`) |
| 按钮提交 | 按钮内 loading 图标 + 禁用点击 |
| 表格加载 | `v-loading` 指令覆盖表格 |
| 局部加载 | `el-skeleton` 占位块 |

**骨架屏规则**:
- 使用 `animate-pulse` 动画
- 灰色占位条 (#e2e8f0)
- 与实际内容布局一致
- 加载完成后淡入替换

### 4.2 操作反馈

| 场景 | 反馈方式 |
|------|----------|
| 操作成功 | `ElMessage.success('操作成功')` (绿色, 3秒) |
| 操作失败 | `ElMessage.error('操作失败')` (红色, 3秒) |
| 警告提示 | `ElMessage.warning('提示内容')` (黄色, 3秒) |
| 确认操作 | `ElMessageBox.confirm()` 二次确认弹窗 |
| 删除操作 | 必须二次确认，按钮显示"确定删除" |

### 4.3 错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络错误 | `ElMessage.error('网络错误，请检查连接')` |
| 401 未认证 | 跳转登录页, `ElMessage.warning('登录已过期')` |
| 403 无权限 | `ElMessage.error('权限不足')` |
| 404 不存在 | `ElMessage.warning('数据不存在')` |
| 500 服务器错误 | `ElMessage.error('服务器错误，请稍后重试')` |

### 4.4 表单校验

| 规则 | 提示文案 |
|------|----------|
| 必填 | `此项为必填项` |
| 长度超限 | `不能超过X个字符` |
| 格式错误 | `格式不正确` |
| 密码不一致 | `两次输入密码不一致` |
| 校验时机 | 失焦时校验 (blur), 提交时全量校验 |

### 4.5 空状态引导

| 场景 | 展示内容 |
|------|----------|
| 列表为空 | "暂无数据" + "立即新建"按钮 |
| 搜索无结果 | "未找到匹配结果" + 清除搜索按钮 |
| 无权限 | "权限不足，无法访问" |

---

## 五、响应式规范

### 5.1 断点

| 断点 | 宽度 | 布局调整 |
|------|------|----------|
| Desktop L | ≥1440px | 完整布局，侧边栏220px |
| Desktop M | 1024-1439px | 侧边栏收起到图标模式 (64px) |
| Tablet | 768-1023px | 侧边栏隐藏，汉堡菜单切换 |
| Mobile | <768px | 单列布局，底部导航 |

### 5.2 适配策略

| 元素 | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| 侧边栏 | 220px固定 | 64px图标 | 隐藏，抽屉切换 |
| 顶栏 | 60px | 60px | 56px |
| 内容区 | 24px内边距 | 16px内边距 | 12px内边距 |
| 表格 | 完整列 | 精简列 | 卡片列表 |
| 弹窗 | 居中 500px | 全宽 90% | 全屏 |

### 5.3 表格响应式

- **Desktop**: 完整表格展示所有列
- **Tablet**: 隐藏次要列（创建时间、备注）
- **Mobile**: 表格转为卡片列表布局

---

## 六、图标与动效

### 6.1 图标规范

| 属性 | 值 |
|------|-----|
| 图标库 | @element-plus/icons-vue |
| 图标大小 | 16px (菜单), 14px (按钮内), 20px (统计卡片) |
| 图标颜色 | 继承父元素文字颜色 |
| 图标间距 | 图标与文字间距 8px |

**现有图标映射**:

| 功能 | 图标 |
|------|------|
| 工作台/概览 | `DataAnalysis` |
| 耗材管理 | `Goods` |
| 入库 | `Upload` |
| 出库 | `Download` |
| 数据备份 | `FolderChecked` |
| 搜索 | `Search` |
| 修改密码 | `Lock` |
| 退出 | `SwitchButton` |
| 新增 | `Plus` |
| 编辑 | `Edit` |
| 删除 | `Delete` |
| 查看 | `View` |
| 导入 | `Upload` |
| 导出 | `Download` |
| 打印 | `Printer` |

### 6.2 动效规范

| 场景 | 动画 | 时长 | 缓动 |
|------|------|------|------|
| 页面切换 | fade | 0.2s | ease |
| 弹窗出现 | fade + scale(0.95→1) | 0.2s | ease-out |
| 弹窗关闭 | fade | 0.15s | ease-in |
| 下拉菜单 | slide-down + fade | 0.2s | ease-out |
| 卡片悬停 | box-shadow | 0.3s | ease |
| 按钮悬停 | background-color | 0.2s | ease |
| 列表加载 | slide-up + fade | 0.3s | ease (stagger 50ms) |
| 数值变化 | 计数器动画 | 0.5s | ease-out |
| 骨架屏 | pulse | 1.5s | infinite |

### 6.3 过渡类

```css
/* Vue transition 组件命名 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active { transition: all 0.3s ease; }
.slide-up-enter-from { opacity: 0; transform: translateY(10px); }
```

---

## 七、设计Token总览

```css
:root {
  /* 主色 */
  --color-primary: #3b82f6;
  --color-primary-light: #dbeafe;
  --color-primary-dark: #2563eb;
  
  /* 语义色 */
  --color-success: #10b981;
  --color-success-light: #d1fae5;
  --color-warning: #f59e0b;
  --color-warning-light: #fef3c7;
  --color-danger: #ef4444;
  --color-danger-light: #fee2e2;
  --color-info: #06b6d4;
  --color-info-light: #cffafe;
  
  /* 中性色 */
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;
  --color-bg-page: #f1f5f9;
  --color-bg-card: #ffffff;
  
  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  
  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 50%;
  
  /* 阴影 */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  
  /* 动画 */
  --transition-fast: all 0.2s ease;
  --transition-normal: all 0.3s ease;
}
```
