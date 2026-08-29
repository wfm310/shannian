# iOS Human Interface Guidelines 原生设计规范

> 本文档是项目移动端界面设计的**最高标准**，以 Apple iOS Human Interface Guidelines 为蓝本，定义 iOS 原生 APP 级别的设计规范、交互体验和组件标准。
> 本文档与 `移动端设计规范.md` 并存：后者是项目实现层的快速参考，本文档是完整规范和验收标准。
> 任何移动端组件、页面、交互的实现，必须通过本文档的逐项检查。如有冲突，以本文档为准。

***

## 目录

- [1. 设计原则](#1-设计原则)
- [2. 设计令牌系统](#2-设计令牌系统)
- [3. 布局与导航](#3-布局与导航)
- [4. 全组件规范](#4-全组件规范)
- [5. 交互与体验](#5-交互与体验)
- [6. 组件转换规则](#6-组件转换规则pc--移动端)
- [7. 各模块适配清单](#7-各模块适配清单)
- [8. 视图布局规范](#8-视图布局规范)

***

## 1. 设计原则

| 原则         | 说明                                            | 对齐 iOS HIG                  |
| ---------- | --------------------------------------------- | --------------------------- |
| App 化体验    | 移动端不是缩小版网页，而是原生 App 级体验：全屏沉浸、底部导航、手势操作        | HIG: App-like experience    |
| 触摸优先       | 所有交互元素按手指触控设计，不依赖 hover 逻辑                    | HIG: Touch-first design     |
| 清晰层次       | 信息层次靠排版和间距而非装饰，内容为王                           | HIG: Clarity                |
| 尊重手势       | 支持 iOS 用户习惯的手势：下拉关闭、左滑返回、长按菜单                 | HIG: Direct manipulation    |
| 品牌一致       | 主色 #111827、品牌色 #FFB020，全局统一，不随意引入新色彩          | 项目色彩约束                      |
| iOS HIG 对齐 | 系统字体优先、磨砂毛玻璃、18px 卡片圆角、44px 触摸热区、弹簧动画         | HIG 全面对齐                    |
| 选中态克制      | 所有选中/活跃态使用 foreground（#111827），不使用品牌色         | 品牌色仅用于内容数据强调                |
| 无障碍内建      | 从设计阶段内建无障碍：VoiceOver 标签、Dynamic Type 支持、色彩对比度 | HIG: Inclusivity            |
| 暗黑模式原生     | 所有颜色支持暗黑模式自动适配，使用语义色令牌而非硬编码                   | HIG: Dark Mode              |
| 动效有意义      | 动画服务于功能反馈，不做无意义装饰动画                           | HIG: Animation with purpose |

***

## 2. 设计令牌系统

### 2.1 颜色系统

#### 2.1.1 基础语义色

| 令牌                   | 浅色值     | 深色值     | 用途          | iOS 对应                    |
| -------------------- | ------- | ------- | ----------- | ------------------------- |
| `--foreground`       | #111827 | #FAFAFA | 主文字色、选中/活跃态 | label                     |
| `--muted-foreground` | #6B7280 | #9CA3AF | 次要文字、非活跃态   | secondaryLabel            |
| `--background`       | #FFFFFF | #1C1C1E | 页面背景        | systemBackground          |
| `--card`             | #FFFFFF | #2C2C2E | 卡片背景        | secondarySystemBackground |
| `--secondary`        | #F3F4F6 | #38383A | 分组背景、次要容器   | tertiarySystemBackground  |
| `--border`           | #E5E7EB | #3A3A3C | 分隔线、边框      | separator                 |
| `--destructive`      | #EF4444 | #FF453A | 错误、删除       | systemRed                 |
| `--primary`          | #111827 | #E5E5E7 | 主按钮、品牌前景    | label                     |

#### 2.1.2 品牌色

| 令牌                   | 值       | 用途                          |
| -------------------- | ------- | --------------------------- |
| `--brand`            | #FFB020 | 品牌色，仅用于：紧急优先级标记、关键数据强调、品牌标识 |
| `--brand-foreground` | #FFFFFF | 品牌色上的文字                     |

> **选中态规则**：所有交互组件选中/活跃态使用 `foreground`，不使用品牌色。品牌色仅用于内容数据强调。

#### 2.1.3 iOS 系统语义色

| 语义色        | 浅色值     | 深色值     | 用途           |
| ---------- | ------- | ------- | ------------ |
| iOS Blue   | #007AFF | #0A84FF | 链接色、系统操作按钮   |
| iOS Green  | #34C759 | #30D158 | 开关 ON 态、成功状态 |
| iOS Amber  | #FF9500 | #FF9F0A | 进行中状态、警告     |
| iOS Red    | #FF3B30 | #FF453A | 错误、删除、危险操作   |
| iOS Orange | #FF9500 | #FF9F0A | 警告           |
| iOS Purple | #AF52DE | #BF5AF2 | 特殊标识         |
| iOS Indigo | #5856D6 | #5E5CE6 | 已转化/已完成标识    |

#### 2.1.4 状态色映射

| 状态                 | 语义色                 | Tailwind                 | iOS 对应       |
| ------------------ | ------------------- | ------------------------ | ------------ |
| 待处理 (pending)      | muted-foreground/40 | `bg-muted-foreground/40` | systemGray   |
| 进行中 (in\_progress) | amber-500           | `bg-amber-500`           | systemOrange |
| 已完成 (completed)    | emerald-500         | `bg-emerald-500`         | systemGreen  |
| 已转化 (converted)    | indigo-500          | `bg-indigo-500`          | systemIndigo |
| 错误 (error)         | red-500             | `bg-red-500`             | systemRed    |

#### 2.1.5 颜色使用规则

- **选中/活跃态**：统一 `foreground`（#111827），不用品牌色
- **品牌色**：仅用于紧急优先级标记、关键数据强调、品牌标识
- **状态色**：使用语义色（amber/emerald/indigo），不用品牌色
- **链接色**：使用 `text-blue-500`（iOS Blue 近似）
- **Switch ON 态**：使用 iOS Green（#34C759），需在组件中覆盖
- **暗黑模式**：所有颜色通过 CSS 变量自动适配，禁止硬编码色值
- **文本选择色**：`::selection` 使用 `bg-foreground/15`（前景色 15% 透明度），文字保持原色；暗黑模式 `bg-foreground/20`

### 2.2 字体系统

#### 2.2.1 文本样式表（对齐 iOS HIG Text Styles）

> iOS 原生使用 pt（磅），Web 开发中 1pt = 1px（viewport 处理缩放）。下表 px 值与 iOS pt 值一一对应。

| 用途     | iOS 样式         | 字号          | 字重       | 行高   | 字间距          | Tailwind                                                                    |
| ------ | -------------- | ----------- | -------- | ---- | ------------ | --------------------------------------------------------------------------- |
| 大标题    | Large Title    | 34px        | regular  | 1.21 | +0.011em     | `text-[34px] font-normal leading-[1.21] tracking-[0.011em]`                 |
| 页面标题   | Title 1        | 28px        | bold     | 1.21 | +0.013em     | `text-[28px] font-bold leading-[1.21] tracking-[0.013em]`                   |
| 分区大标题  | Title 2        | 22px        | bold     | 1.27 | +0.016em     | `text-[22px] font-bold leading-[1.27] tracking-[0.016em]`                   |
| 导航栏标题  | Title 3        | 20px        | semibold | 1.25 | +0.021em     | `text-[20px] font-semibold leading-[1.25] tracking-[0.021em]`               |
| 卡片标题   | Headline       | 17px        | semibold | 1.29 | -0.021em     | `text-[17px] font-semibold leading-[1.29] tracking-[-0.021em]`              |
| 正文     | Body           | 17px        | regular  | 1.29 | -0.022em     | `text-[17px] font-normal leading-[1.29] tracking-[-0.022em]`                |
| 说明文字   | Callout        | 16px        | regular  | 1.31 | -0.009em     | `text-[16px] font-normal leading-[1.31] tracking-[-0.009em]`                |
| 子标题    | Subheadline    | 15px        | regular  | 1.33 | -0.005em     | `text-[15px] font-normal leading-[1.33] tracking-[-0.005em]`                |
| 脚注     | Footnote       | 13px        | regular  | 1.38 | +0.006em     | `text-[13px] font-normal leading-[1.38] tracking-[0.006em]`                 |
| 分区标题   | Section Header | 13px        | regular  | 1.38 | +0.06em 大写   | `text-[13px] font-normal uppercase tracking-[0.06em]`                       |
| 辅助文字1  | Caption 1      | 12px        | regular  | 1.33 | -0.005em     | `text-xs font-normal leading-[1.33] tracking-[-0.005em]`                    |
| 辅助文字2  | Caption 2      | 11px        | regular  | 1.18 | +0.006em     | `text-[11px] font-normal leading-[1.18] tracking-[0.006em]`                 |
| Tab 标签 | (项目自定义)        | 10px        | medium   | 1.2  | 0            | `text-[10px] font-medium leading-[1.2]`                                     |
| 大数字    | (项目自定义)        | 17px / 34px | bold     | 1.21 | tabular-nums | `text-[17px] font-bold tabular-nums` / `text-[34px] font-bold tabular-nums` |

#### 关键修正说明

| 修正项    | 修正前（旧文档）                  | 修正后（对齐 iOS）               | 原因                                         |
| ------ | ------------------------- | ------------------------- | ------------------------------------------ |
| 正文字号   | 15px                      | 17px                      | iOS Body 标准为 17pt                          |
| 正文行高   | 未指定                       | 1.29                      | iOS Body 行高 22pt / 17pt = 1.29             |
| 正文字间距  | 0                         | -0.022em                  | iOS Body tracking 为负值（字符略收紧）               |
| 大标题字重  | bold                      | regular                   | iOS Large Title 使用 regular（非 bold），由字号体现层次 |
| 大标题字号  | 28px                      | 34px                      | iOS Large Title 标准为 34pt                   |
| 大标题字间距 | -0.02em（负值）               | +0.011em（正值）              | iOS Large Title tracking 为正（字符略放宽）         |
| 卡片标题字重 | medium                    | semibold                  | iOS Headline 使用 semibold                   |
| 卡片标题字号 | 15px                      | 17px                      | iOS Headline 标准为 17pt                      |
| 导航栏标题  | 16px semibold（标注 Title 3） | 20px semibold（实际 Title 3） | 旧文档 16px 不匹配任何 iOS 标准样式                    |
| 分区标题字号 | 11px                      | 13px                      | iOS section header 通常用 Footnote 13pt       |
| 行高     | 全部未指定                     | 每个样式都有行高                  | iOS 每个文本样式都有精确行高                           |
| 字间距    | 大部分为 0                    | 每个样式都有精确值                 | iOS 每个文本样式都有精确 tracking                    |

#### 2.2.2 字体栈

```css
--font-sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Inter", sans-serif;
```

- `-apple-system` 在 iOS 上自动解析为 San Francisco（SF Pro），并根据字号自动切换 Text/Display 光学变体（< 20px 用 Text，>= 20px 用 Display）
- **禁止**显式列出 `"SF Pro Text"` 和 `"SF Pro Display"`——`-apple-system` 已自动处理切换，显式列出会导致非 iOS 平台字体解析问题
- 中文环境自动切换到 PingFang SC（苹方）
- Inter 作为非 Apple 设备的 fallback
- 技术实现：`--font-sans` 变量定义在 `globals.css` :root

#### 2.2.3 Dynamic Type 支持

iOS 原生所有文本样式默认支持 Dynamic Type（用户在「设置 > 显示与文字大小」中调整字号时自动缩放）。Web 端实现方案：

| 方案          | 说明                                             | 适用场景         |
| ----------- | ---------------------------------------------- | ------------ |
| `rem` 单位    | 使用 `text-[1.0625rem]` 替代 `text-[17px]`，响应根字号设置 | 需要完全支持用户字号偏好 |
| Tailwind 默认 | Tailwind 的 `text-sm` 等默认使用 `rem`               | 简化实现         |
| `px` + 响应式  | 使用 `px` 值，通过 `@media` 响应大字号偏好                  | 兼容性优先        |

> **当前项目策略**：统一使用 `px` 值（与设计稿一一对应），后续如需支持 Dynamic Type，批量替换为 `rem`。Tailwind 的 arbitrary value `text-[17px]` 生成 `font-size: 17px`，可按需改为 `text-[1.0625rem]`。

#### 2.2.4 字重映射

| CSS 字重   | 数值  | iOS 对应   | Tailwind         |
| -------- | --- | -------- | ---------------- |
| regular  | 400 | regular  | `font-normal`    |
| medium   | 500 | medium   | `font-medium`    |
| semibold | 600 | semibold | `font-semibold`  |
| bold     | 700 | bold     | `font-bold`      |
| heavy    | 800 | heavy    | `font-extrabold` |
| black    | 900 | black    | `font-black`     |

#### 2.2.5 数字格式化

| 场景    | 规则                                   | Tailwind / CSS                                        |
| ----- | ------------------------------------ | ----------------------------------------------------- |
| 大数字展示 | 使用 `tabular-nums`（等宽数字），避免数字跳动导致布局抖动 | `tabular-nums` 或 `font-variant-numeric: tabular-nums` |
| 千分位   | 金额/计数超过 999 时显示千分位逗号                 | JS `toLocaleString()`                                 |
| 小数对齐  | 表格/列表中数字右对齐                          | `text-right tabular-nums`                             |
| 百分比   | 整数百分比不加小数，带小数保留一位                    | `42%` / `42.5%`                                       |
| 变化量   | 正数前加 `+`，负数前加 `-`                    | `+12.5%` / `-3.2%`                                    |
| 进度计数  | 格式 "已完成 X/Y"                         | `已完成 2/4 个维度`                                         |

> **规则**：所有数据展示场景（KPI、统计、指标、分数）必须使用 `tabular-nums`，防止数字宽度变化导致布局抖动。

### 2.3 间距系统

| 用途       | 移动端                         | 桌面端         | Tailwind                           |
| -------- | --------------------------- | ----------- | ---------------------------------- |
| 页面水平内边距  | 20px                        | 24px / 32px | `px-5 md:px-6 lg:px-8`             |
| 导航栏水平内边距 | 16px                        | 16px        | `px-4`                             |
| 卡片内边距    | 18px                        | 18px        | `p-[18px]`                         |
| 组件内边距    | 16px                        | 16px        | `p-4`                              |
| 卡片间距     | 12px                        | 16px        | `gap-3 sm:gap-4`                   |
| 分区间距     | 24px                        | 24px        | `space-y-6`                        |
| 列表行间距    | 0px（分隔线连接）                  | 0px         | border-b                           |
| 列表组间距    | 20px                        | 20px        | `space-y-5`                        |
| 底部安全区    | env(safe-area-inset-bottom) | -           | `pb-[env(safe-area-inset-bottom)]` |
| 顶部安全区    | env(safe-area-inset-top)    | -           | `h-[env(safe-area-inset-top)]`     |

### 2.4 圆角系统

| 元素          | 圆角        | Tailwind           | iOS 对应                     |
| ----------- | --------- | ------------------ | -------------------------- |
| 卡片          | 18px      | `rounded-[18px]`   | 12pt (large corner radius) |
| Sheet 顶部    | 18px      | `rounded-t-[18px]` | -                          |
| Sheet 内分组容器 | 18px      | `rounded-[18px]`   | -                          |
| Alert 弹窗    | 14px      | `rounded-[14px]`   | 13pt (alert corner radius) |
| 徽章/药丸       | 全圆        | `rounded-full`     | capsule                    |
| 按钮          | 全圆 (pill) | `rounded-full`     | capsule (iOS 18+)          |
| 输入框         | 12px      | `rounded-xl`       | 8pt (medium corner radius) |
| 分组内列表行      | 0（行内直角）   | 无                  | inset grouped 行间无圆角        |
| 进度条         | 全圆        | `rounded-full`     | capsule                    |
| 圆形头像        | 全圆        | `rounded-full`     | -                          |

> **圆角令牌**：`--radius-4xl: 1.125rem`（18px），Card 组件自动生效。禁止使用 20px 或其他非标准圆角。

### 2.5 阴影与层次

| 层级 | 场景       | Tailwind / CSS                         | iOS 对应 |
| -- | -------- | -------------------------------------- | ------ |
| 0  | 默认背景     | 无阴影                                    | -      |
| 1  | 卡片 hover（桌面端） | `hover:shadow-md`                      | -      |
| 2  | 悬浮元素     | `shadow-lg`                            | -      |
| 3  | 底部 Tab 栏 | `shadow-[0_8px_24px_rgba(0,0,0,0.08)]` | -      |
| 4  | Sheet 弹层 | `shadow-xl`（Sheet 组件内置）                | -      |
| 5  | Alert 弹窗 | `shadow-2xl`                           | -      |

#### iOS 阴影令牌（globals.css 定义）

```css
--shadow-ios-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
--shadow-ios-md: 0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04);
--shadow-ios-lg: 0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04);
```

### 2.6 毛玻璃与材质

| 场景           | 效果        | Tailwind / CSS                      |
| ------------ | --------- | ----------------------------------- |
| sticky 顶栏    | 半透明磨砂毛玻璃  | `bg-background/80 backdrop-blur-xl` |
| 底部 Tab 栏     | 半透明磨砂毛玻璃  | `bg-background/80 backdrop-blur-xl` |
| 维度 Tab 栏（吸顶） | 半透明磨砂毛玻璃  | `bg-background/80 backdrop-blur-xl` |
| Sheet 遮罩     | 半透明 + 轻磨砂 | `bg-black/30 backdrop-blur-sm`      |
| Alert 遮罩     | 深色半透明     | `bg-black/40`                       |
| 底部工具栏        | 半透明磨砂     | `bg-background/80 backdrop-blur-xl` |

> **规则**：所有 sticky/fixed 顶栏和底栏必须使用磨砂毛玻璃效果，不允许使用纯实色背景。

### 2.7 动画令牌

#### 缓动曲线

| 令牌                  | 曲线                                  | 用途               | iOS 对应          |
| ------------------- | ----------------------------------- | ---------------- | --------------- |
| `--ease-ios-spring` | `cubic-bezier(0.16, 1, 0.3, 1)`     | Sheet 弹出/关闭、页面转场 | spring          |
| `--ease-ios-out`    | `cubic-bezier(0.0, 0.0, 0.2, 1)`    | 减速退出             | ease-out        |
| `--ease-ios-in-out` | `cubic-bezier(0.4, 0.0, 0.2, 1)`    | 标准               | ease-in-out     |
| `--ease-ios-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Tab 滑动指示器        | spring (bounce) |

#### 时长

| 场景            | 动画                      | 时长         | 缓动                                  |
| ------------- | ----------------------- | ---------- | ----------------------------------- |
| Sheet 弹出      | 底部上滑                    | 300ms      | `cubic-bezier(0.16,1,0.3,1)` iOS 弹簧 |
| Sheet 关闭      | 底部下滑                    | 300ms      | `cubic-bezier(0.16,1,0.3,1)` iOS 弹簧 |
| Sheet 下拉关闭    | 跟手拖拽 → 松手弹回/滑走          | 跟手 + 200ms | iOS 弹簧回弹                            |
| Alert 弹出      | 中心缩放+淡入                 | 200ms      | `cubic-bezier(0.16,1,0.3,1)`        |
| Alert 关闭      | 中心缩放+淡出                 | 200ms      | `cubic-bezier(0.0,0.0,0.2,1)`       |
| 卡片 hover（桌面端） | 上移 + 阴影                 | 200ms      | `ease-out`                          |
| 卡片按下          | 缩小 + 透明度                | 即时         | -                                   |
| Tab 切换（文字/图标） | 色彩渐变                    | 300ms      | `cubic-bezier(0.16,1,0.3,1)` iOS 弹簧 |
| Tab 滑动指示器     | 滑块位移                    | 300ms      | `cubic-bezier(0.34,1.56,0.64,1)` 弹簧 |
| 内容切换          | 交叉淡入淡出                  | 200ms      | `ease-in-out`                       |
| 按钮按下          | `active:opacity-60` | 即时         | iOS highlighted 态（透明度变化）           |
| 骨架屏 shimmer   | 左→右扫过                   | 1.5s       | `linear` infinite                   |
| 列表项点击高亮       | 背景色出现                   | 100ms      | `ease-out`                          |
| 下拉刷新          | 旋转 + 弹回                 | 跟手 + 200ms | iOS 弹簧                              |
| 长按菜单          | 缩放+淡入                   | 150ms      | `cubic-bezier(0.16,1,0.3,1)`        |

### 2.8 安全区

| 区域       | CSS                           | 说明                    |
| -------- | ----------------------------- | --------------------- |
| 顶部       | `env(safe-area-inset-top)`    | iPhone 刘海/状态栏         |
| 底部       | `env(safe-area-inset-bottom)` | iPhone Home Indicator |
| 左侧       | `env(safe-area-inset-left)`   | 横屏刘海                  |
| 右侧       | `env(safe-area-inset-right)`  | 横屏刘海                  |
| viewport | `viewport-fit: cover`         | 全屏覆盖                  |

#### 实现规则

- 顶部占位条：`h-[env(safe-area-inset-top)]`
- 底部 Tab 栏：`pb-[env(safe-area-inset-bottom)]`
- 内容区底部留白：`pb-[calc(3.5rem+env(safe-area-inset-bottom))]`（Tab 栏高度 + Home 指示条）
- 底部工具栏：`pb-[calc(0.625rem+env(safe-area-inset-bottom))]`
- Sheet 底部：`pb-[env(safe-area-inset-bottom)]`
- 禁止缩放：`maximumScale: 1, userScalable: false`

### 2.9 断点

| 断点      | 宽度范围      | 布局策略                         |
| ------- | --------- | ---------------------------- |
| Mobile  | < 1024px  | 底部 Tab 栏 + 全宽内容 + Sheet 底部弹出 |
| Desktop | >= 1024px | 左侧边栏 + 顶栏 + 内容区              |

- 技术实现：`useIsDesktop()` Hook，检测 `min-width: 1024px`
- 移动端初始值默认为 `false`（SSR 安全），客户端挂载后修正
- **禁止**在页面内自行实现 `window.innerWidth` 检测，必须复用 `useIsDesktop()`

#### 2.9.1 iPhone 尺寸适配

| 设备                   | 逻辑宽度     | 布局策略    | 说明              |
| -------------------- | -------- | ------- | --------------- |
| iPhone SE            | 375px    | 单列，紧凑间距 | 最小目标设备，需确保不溢出   |
| iPhone 13/14         | 390px    | 单列      | 标准基准宽度          |
| iPhone 14/15 Plus    | 428px    | 单列      | 大屏，间距可微增        |
| iPhone 14/15 Pro Max | 430px    | 单列      | 最大宽度，同 Plus 策略  |
| iPad                 | >= 768px | 视桌面端处理  | >= 1024px 走桌面布局 |

> **规则**：移动端以 375px（SE）为最小适配基准，确保所有布局在 375px 宽度下不溢出、不截断关键信息。间距使用固定 px 值（20px 页面内边距），不使用百分比，保证不同设备一致性。

### 2.10 图标系统规范

#### 2.10.1 图标尺寸

| 场景        | 尺寸   | Tailwind      |
| --------- | ---- | ------------- |
| 导航栏按钮图标   | 22px | `size-[22px]` |
| Tab 栏图标   | 22px | `size-[22px]` |
| 行内图标（列表行） | 18px | `size-[18px]` |
| 卡片标题左侧图标  | 18px | `size-[18px]` |
| 表单输入框图标   | 16px | `size-4`      |
| 按钮内图标     | 16px | `size-4`      |
| 徽章内图标     | 12px | `size-3`      |
| 空状态图标     | 32px | `size-8`      |
| Toast 图标  | 16px | `size-4`      |
| 行右箭头      | 17px | `size-[17px]` |

#### 2.10.2 图标线宽

| 状态     | strokeWidth | 说明   |
| ------ | ----------- | ---- |
| 选中/活跃态 | 2.5         | 视觉加重 |
| 默认态    | 2.0         | 标准线宽 |
| 禁用态    | 1.5         | 视觉弱化 |

> **规则**：统一使用 lucide-react 图标库，禁止混用其他图标库。图标线宽通过 `strokeWidth` prop 控制，不通过 CSS `stroke-width`。

#### 2.10.3 填充与描边

| 场景          | 样式                  | 说明  |
| ----------- | ------------------- | --- |
| Tab 栏选中态    | 描边（strokeWidth 2.5） | 不填充 |
| 空状态         | 描边                  | 中性灰 |
| Toast 成功/失败 | 描边                  | 语义色 |
| 数据强调图标      | 描边                  | 语义色 |

### 2.11 渐变使用规则

| 场景      | 渐变     | Tailwind / CSS                            |
| ------- | ------ | ----------------------------------------- |
| 空状态图标容器 | 极浅灰渐变  | `bg-gradient-to-b from-muted to-muted/50` |
| 品牌强调区域  | 品牌色微渐变 | `bg-gradient-to-r from-brand to-brand/80` |

> **规则**：iOS 原生设计极少使用渐变。仅在空状态背景和品牌标识区域允许。禁止在卡片、按钮、导航栏等常规元素上使用渐变。渐变方向统一为 `to-b`（从上到下）或 `to-r`（从左到右），禁止斜向渐变。

***

## 3. 布局与导航

### 3.1 页面骨架

```
┌──────────────────────────┐
│ safe-area top (占位条)     │  ← env(safe-area-inset-top)
├──────────────────────────┤
│ sticky header (PageHeader) │  ← 标题 + 操作按钮，固定不滚
├──────────────────────────┤
│                          │
│    滚动内容区              │  ← flex-1, overflow-y-auto
│                          │
│                          │
├──────────────────────────┤
│ 底部 Tab 栏               │  ← fixed bottom-0, h-14 + safe-area
└──────────────────────────┘
```

- 容器高度：`mobile-vh` 类（`height: 100vh` 回退 + `height: 100svh`）
- 内容区底部留白：`pb-[calc(3.5rem+env(safe-area-inset-bottom))]`
- 内容区滚动：`overflow-y-auto touch-scroll`
- iOS 平滑滚动：`-webkit-overflow-scrolling: touch`（globals.css 全局）

### 3.2 导航栏 (PageHeader)

所有页面统一使用 `PageHeader` 组件。

| 规则      | 说明                          | Tailwind / 值                                              |
| ------- | --------------------------- | --------------------------------------------------------- |
| 定位      | `sticky top-0 z-40`，滚动时固定顶部 | `sticky top-0 z-40`                                       |
| 背景      | 磨砂毛玻璃，iOS 风格                | `bg-background/70 backdrop-blur-xl`                       |
| 左右内边距   | 20px                        | `px-5`                                                    |
| 顶部间距    | 动态安全区高度，PageHeader 统一管理     | `style={{ height: 'env(safe-area-inset-top)' }}` + `pt-3` 内容区间距 |
| 底部分隔    | 弱化细线，30% 透明度                | `h-px bg-border/30`                                       |
| 标题字号    | 统一使用 Title 1：28px bold | `text-[28px] font-bold leading-[1.21] tracking-[0.013em]` |
| 标题与描述间距 | 12px                        | `mt-3`                                                    |
| 描述文字    | 15px 次级色，单行截断（Subheadline）  | `text-[15px] text-muted-foreground truncate`              |
| 右侧操作区   | 按钮/搜索框等，44px 触摸热区           | `actions` prop                                            |
| 底部内容区   | 搜索框、筛选标签等                   | `children` prop                                           |

#### API

```tsx
<PageHeader
  title="页面标题"
  description="页面描述文字"
  actions={<Button>新建</Button>}
  searchEnabled={true}
  searchValue={searchText}
  onSearchChange={setSearchText}
  createEnabled={true}
  onCreate={handleCreate}
>
  {/* 底部内容：视图切换、筛选标签等 */}
</PageHeader>
```

### 3.3 底部 Tab 栏

参照 iOS App Store TabBar 风格。

#### 整体容器

| 规则   | 说明                                                |
| ---- | ------------------------------------------------- |
| 定位   | `fixed bottom-5 inset-x-0 z-50`，悬浮在底部上方           |
| 高度   | `h-[60px]` + `pb-[env(safe-area-inset-bottom)]`   |
| 形态   | 药丸形（胶囊形）`rounded-full`                            |
| 背景   | 半透明磨砂毛玻璃：`bg-background/80 backdrop-blur-xl`      |
| 阴影   | iOS 风格柔和阴影 `shadow-[0_8px_24px_rgba(0,0,0,0.08)]` |
| 左右边距 | `px-5`（20px），不贴屏幕边缘                               |
| 底部间距 | `bottom-5`（20px），距离屏幕底部                           |

#### 左侧：可横向滚动 Tab 标签组

| 规则     | 说明                                                                             |
| ------ | ------------------------------------------------------------------------------ |
| 布局     | 图标在上，文字在下，水平排列                                                                 |
| 滚动     | `overflow-x-auto`，数量多时可左右滑动浏览                                                  |
| Tab 项目 | icon 22px + 文字 10px，`min-w-[92px]`，`shrink-0`（药丸内约 3 个可见 Tab）              |
| 选中态    | 药丸形背景高亮：`bg-secondary/80 rounded-full` + `text-foreground` + `strokeWidth 2.5` |
| 非选中态   | `text-muted-foreground` + `strokeWidth 2` + `font-medium`                      |
| 自动定位   | 路由变化时自动 `scrollIntoView({ inline: 'center' })`                                 |

#### 右侧：闪念快记圆形按钮

| 规则   | 说明                                        |
| ---- | ----------------------------------------- |
| 尺寸   | `size-[60px]` 圆形                          |
| 背景   | 磨砂毛玻璃 `bg-background/80 backdrop-blur-xl` |
| 间距   | 与左侧 Tab 容器间距 `gap-2`（8px）                 |
| 色调   | 中性灰色（muted-foreground），不使用品牌色             |
| 按下反馈 | 缩小到 95%，松手回弹（`active:scale-95`）           |

### 3.4 内容区

| 规则    | 说明                                              |
| ----- | ----------------------------------------------- |
| 水平内边距 | `px-5`（20px），全局统一                               |
| 顶部间距  | `pt-4`（与 sticky header 的间距）                     |
| 卡片网格  | 移动端单列                                           |
| 卡片间距  | `gap-3`（12px）                                   |
| 空状态   | 居中，`py-16`，图标+标题+描述+操作按钮                        |
| 底部留白  | `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` |

### 3.5 底部工具栏 (Bottom Action Bar)

| 规则    | 说明                           | Tailwind                                          |
| ----- | ---------------------------- | ------------------------------------------------- |
| 定位    | flex-shrink-0，固定在 Sheet/页面底部 | `flex-shrink-0`                                   |
| 背景    | 磨砂毛玻璃                        | `bg-background/80 backdrop-blur-xl`               |
| 顶部分隔  | 50% 透明度细线                    | `border-t border-border/50`                       |
| 上下间距  | 10px                         | `py-2.5`                                          |
| 底部安全区 | 留出 Home 指示条空间                | `pb-[calc(0.625rem+env(safe-area-inset-bottom))]` |
| 按钮高度  | 最小 44px                      | `h-11`                                            |
| 按钮形态  | 药丸形                          | `rounded-full`                                    |
| 按钮间距  | 8px-10px                     | `gap-2` 或 `gap-2.5`                               |

### 3.6 Sheet 弹层布局

| 规则     | 说明                                               |
| ------ | ------------------------------------------------ |
| 最大高度   | `max-h-[90vh]`（详情）或 `max-h-[85vh]`（表单/选择）        |
| 结构     | `flex flex-col`：导航栏（固定）+ 内容区（flex-1 滚动）+ 底部栏（固定） |
| 顶部圆角   | 18px `rounded-t-[18px]`                          |
| 顶部拖拽手柄 | 36px 宽 × 4px 高，圆角，15% foreground 透明度             |
| 遮罩     | `bg-black/30 backdrop-blur-sm`                   |
| 弹出动画   | 底部上滑 300ms `cubic-bezier(0.16,1,0.3,1)`          |
| 下拉关闭   | 支持手指向下拖拽关闭，拖拽距离 > 25% 高度时自动关闭                    |
| 内容区滚动  | `flex-1 overflow-y-auto`                         |

### 3.7 滚动行为

| 规则         | 说明            | CSS                                                                |
| ---------- | ------------- | ------------------------------------------------------------------ |
| iOS 平滑滚动   | 全局开启          | `-webkit-overflow-scrolling: touch`                                |
| 隐藏滚动条      | 所有滚动容器        | `scrollbar-width: none` + `*::-webkit-scrollbar { display: none }` |
| 垂直滚动容器     | 允许垂直滑动，阻止水平   | `touch-action: pan-y`                                              |
| 全局触摸优化     | 消除 300ms 点击延迟 | `html { touch-action: manipulation }`                              |
| 点击高亮       | 消除默认蓝色高亮      | `html { -webkit-tap-highlight-color: transparent }`                |
| 水平滚动容器     | 含上述所有规则       | `.touch-scroll` 类                                                  |
| 隐藏遮罩层防触摸阻挡 | <br />        | `[data-slot$="-overlay"][hidden] { pointer-events: none }`         |

### 3.8 ~~Large Title 导航栏（滚动折叠）~~（不适用于本项目）

> Large Title 是 iOS 导航栏的滚动折叠模式（34px → 20px），适用于原生 App 的 UINavigationController 大标题模式。
> 本项目 PageHeader 统一使用 **Title 1（28px bold）** 作为页面标题，不使用 Large Title 滚动折叠。

### 3.9 Settings 设置页模式

> iOS 原生设置页面模式：分组列表 + 行内控件（Switch / 值标签 / 箭头）。

| 规则        | 说明                             | Tailwind                                                        |
| --------- | ------------------------------ | --------------------------------------------------------------- |
| 分组容器      | 圆角 18px，`bg-secondary/15`      | `rounded-[18px] bg-secondary/15`                                |
| 分组标题      | 13px 大写，muted-foreground，左对齐   | `text-[13px] uppercase tracking-[0.06em] text-muted-foreground` |
| 设置行       | 最小 44px 高，左标签 + 右控件            | `min-h-[44px] px-4 flex items-center justify-between`           |
| 行内 Switch | 右对齐                            | Switch 组件                                                       |
| 行内值       | 右侧显示当前值 + chevron              | `text-muted-foreground` + `<ChevronRight>`                      |
| 行内箭头      | 右侧 chevron，表示可进入子页面            | `ChevronRight className="size-4 text-muted-foreground/40"`      |
| 分隔线       | 行间 `border-b border-border/40` | 最后一行无分隔线                                                        |
| 分组间距      | 20px                           | `space-y-5`                                                     |
| 分组页脚      | 13px muted-foreground，左对齐      | `text-[13px] text-muted-foreground`                             |

### 3.10 横屏模式

| 规则   | 说明                                          |
| ---- | ------------------------------------------- |
| 布局策略 | 移动端横屏视为桌面端布局（>= 1024px 时已有处理），非横屏专用         |
| 安全区  | 左右刘海通过 `env(safe-area-inset-left/right)` 适配 |
| 旋转动画 | 不做横竖屏切换动画，跟随系统旋转                            |
| 禁止旋转 | 表单填写场景可锁定竖屏（`screen.orientation.lock`）      |
| 最小宽度 | 横屏最小宽度 667px（iPhone SE 横屏），确保布局可用           |

> **规则**：项目移动端以竖屏为主。横屏时自动走桌面端布局逻辑（>= 1024px），不单独设计横屏布局。仅在必要时锁定竖屏。

### 3.11 引导页 / 首次启动

| 规则    | 说明                                            | Tailwind                                           |
| ----- | --------------------------------------------- | -------------------------------------------------- |
| 全屏    | 占满视口，无导航栏和 Tab 栏                              | `h-[100svh]`                                       |
| 背景色   | 与品牌色协调，可用浅色渐变                                 | `bg-gradient-to-b from-background to-secondary/30` |
| 插图    | 居中，占据视觉焦点                                     | `size-32` 或更大                                      |
| 标题    | 24px bold，居中                                  | `text-[24px] font-bold text-center`                |
| 描述    | 15px regular，muted-foreground，居中              | `text-[15px] text-muted-foreground text-center`    |
| 页码指示  | 底部小圆点，当前页为 foreground，其余为 muted-foreground/30 | `size-2 rounded-full`                              |
| 跳过按钮  | 右上角，15px muted-foreground                     | `text-[15px] text-muted-foreground`                |
| 下一步按钮 | 底部，44px 高，药丸形                                 | `h-11 rounded-full`                                |
| 滑动手势  | 左右滑动切换页面                                      | `touch-action: pan-y`                              |
| 切换动画  | 水平滑动 + 淡入淡出                                   | 300ms `cubic-bezier(0.16,1,0.3,1)`                 |
| 最后一页  | 按钮变为 "开始使用"                                   | 点击后关闭引导，写入 localStorage 标记                         |

***

## 4. 全组件规范

### 4.1 Sheet 弹层

> 移动端的核心弹层组件。所有 Dialog/Popover/DropdownMenu 在移动端都转换为 Sheet side=bottom。

#### 4.1.1 基础 Sheet

| 规则           | 说明                                                                   |
| ------------ | -------------------------------------------------------------------- |
| 位置           | 底部弹出 `side="bottom"`                                                 |
| 顶部圆角         | 18px                                                                 |
| 拖拽手柄         | 36×4px，`bg-foreground/15`，居中，pt-2.5                                  |
| 遮罩           | `bg-black/30 backdrop-blur-sm`                                       |
| 弹出动画         | 300ms `cubic-bezier(0.16,1,0.3,1)`                                   |
| 下拉关闭         | 支持拖拽关闭（引入 vaul 或自定义手势）                                               |
| initialFocus | 所有 Sheet 必须设置 `initialFocus={false}`                                 |
| autoFocus    | Sheet 内 Input/Textarea 禁止 autoFocus（编辑场景除外，需配合 initialFocus={false}） |

#### 4.1.2 Sheet 内导航栏模式

```tsx
{/* iOS 风格 Sheet 顶部导航栏 */}
<div className="flex items-center justify-between px-5 h-11 flex-shrink-0 border-b border-border/30">
  <button className="text-[17px] font-normal text-muted-foreground active:text-foreground active:opacity-60 transition-colors">
    取消
  </button>
  <span className="text-[17px] font-semibold text-foreground">
    标题
  </span>
  <button className="text-[17px] font-semibold text-foreground active:opacity-60 disabled:opacity-30 transition-opacity">
    确认
  </button>
</div>
```

- 左侧：取消按钮（muted-foreground 色，按下变 foreground）
- 中间：标题（semibold，居中绝对定位）
- 右侧：确认/提交按钮（semibold，foreground 色）
- 底部分隔线：`border-b border-border/30`

#### 4.1.3 Sheet 底部安全区

所有 Sheet 底部必须添加安全区占位：`<div className="pb-[env(safe-area-inset-bottom)]" />`

### 4.2 Alert 弹窗

> iOS 原生风格的确认弹窗。**禁止使用浏览器原生** **`confirm()`** **/** **`alert()`**。

| 规则           | 说明                                              |
| ------------ | ----------------------------------------------- |
| 位置           | 屏幕居中                                            |
| 圆角           | 14px `rounded-[14px]`                           |
| 宽度           | 270px（iOS 标准）或 `max-w-[270px]`                  |
| 遮罩           | `bg-black/40`（比 Sheet 遮罩更深）                     |
| 弹出动画         | 200ms 缩放+淡入 `cubic-bezier(0.16,1,0.3,1)`        |
| 标题           | 17px semibold，居中                                |
| 描述           | 13px regular，居中，muted-foreground                |
| 按钮排列         | 水平排列（2 按钮）或垂直排列（3+ 按钮）                          |
| 按钮高度         | 44px                                            |
| 按钮分隔线        | `border-t border-border/30`（水平）或 `border-l`（垂直） |
| 确认按钮         | 前景色文字                                           |
| 取消按钮         | muted-foreground 文字                             |
| 危险按钮         | `text-destructive`（红色）                          |
| initialFocus | false                                           |

#### 自定义实现要求

```tsx
{/* iOS Alert 弹窗结构 */}
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
  <div className="w-[270px] rounded-[14px] bg-card overflow-hidden">
    {/* 标题 + 描述 */}
    <div className="px-4 pt-4 pb-3 text-center">
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
      )}
    </div>
    {/* 按钮分隔线 */}
    <div className="h-px bg-border/30" />
    {/* 按钮区 */}
    <div className="flex">
      <button className="flex-1 h-11 text-[17px] text-muted-foreground active:bg-secondary/40">
        取消
      </button>
      <div className="w-px bg-border/30" />
      <button className="flex-1 h-11 text-[17px] text-foreground font-medium active:bg-secondary/40">
        确认
      </button>
    </div>
  </div>
</div>
```

### 4.3 Action Sheet 操作表

> 用于提供多个操作选项的底部弹层。替代移动端的 DropdownMenu。

| 规则     | 说明                                          |
| ------ | ------------------------------------------- |
| 位置     | 底部弹出                                        |
| 顶部圆角   | 18px                                        |
| 标题     | 13px center，muted-foreground（可选）            |
| 选项     | 全宽，44px 高，15px 字号，居中文字                      |
| 选项分隔线  | `border-b border-border/30`（行内直角，不圆角）       |
| 选中态    | `text-foreground font-medium` + 右侧 Check 图标 |
| 点击反馈   | `active:bg-secondary/40`                    |
| 危险操作   | `text-destructive`                          |
| 取消按钮   | 独立分组，与操作选项之间有 8px 间距                        |
| 取消按钮样式 | 44px 高，15px semibold，居中                     |
| 自动关闭   | 点击任意选项后自动关闭                                 |

#### 与 IOSSelectSheet 的区别

| IOSSelectSheet        | Action Sheet                  |
| --------------------- | ----------------------------- |
| 用于选择某个值（类似 Picker）    | 用于执行某个操作（类似 Context Menu）     |
| 选中项有 Check 标记         | 无选中标记，点击即执行                   |
| 选中态 `bg-foreground/5` | 点击反馈 `active:bg-secondary/40` |

### 4.4 列表与单元格

#### 4.4.1 iOS 分组列表 (Inset Grouped)

| 规则    | 说明                             | Tailwind                                                                    |
| ----- | ------------------------------ | --------------------------------------------------------------------------- |
| 分组容器  | 圆角 18px，`bg-secondary/15`      | `rounded-[18px] bg-secondary/15`                                            |
| 容器内边距 | 水平 0，垂直 0（行内无内边距）              | 无                                                                           |
| 列表行   | 最小 44px 高，水平 16px 内边距          | `min-h-[44px] px-4`                                                         |
| 分隔线   | 行间，`border-b border-border/40` | `border-b border-border/40`                                                 |
| 最后一行  | 无分隔线                           | `isLast ? "" : "border-b"`                                                  |
| 行内布局  | 左标签 + 右值/箭头                    | flex justify-between                                                        |
| 行点击反馈 | `active:bg-muted/50`           | `active:bg-muted/50`                                                        |
| 行右箭头  | chevron，muted-foreground/40    | `<ChevronRight className="size-4 text-muted-foreground/40" />`              |
| 分组标题  | 13px 大写，muted-foreground       | `text-[13px] font-normal uppercase tracking-[0.06em] text-muted-foreground` |
| 分组间距  | 20px                           | `space-y-5`                                                                 |

#### 4.4.2 卡片列表（非分组场景）

| 规则           | 说明                                 | Tailwind                                                            |
| ------------ | ---------------------------------- | ------------------------------------------------------------------- |
| 布局           | 移动端单列                              | -                                                                   |
| 圆角           | 18px                               | `rounded-[18px]`                                                    |
| 内边距          | 18px                               | `p-[18px]`                                                          |
| 背景           | `bg-card`                          | `bg-card`                                                           |
| 边框           | `border border-border`             | `border border-border`                                              |
| 间距           | 12px                               | `space-y-3`                                                         |
| 点击反馈         | `active:bg-secondary/30`           | `active:bg-secondary/30`                                            |
| hover 效果（桌面） | 上移+阴影+边框加深                         | `hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10` |
| 过渡           | `transition-all`                   | `transition-all`                                                    |
| 光标           | `cursor-pointer`                   | `cursor-pointer`                                                    |
| 状态圆点         | 9px，语义色                            | `size-[9px] rounded-full`                                           |
| 标题           | 17px semibold，2 行截断                | `text-[17px] font-semibold leading-[1.29] line-clamp-2`             |
| 搁置态          | `opacity-60`，桌面端 hover 恢复 `opacity-85` | `opacity-60 hover:opacity-85`                                       |
| 右箭头          | 17px chevron，muted-foreground/30   | `ChevronRight className="size-[17px] text-muted-foreground/30"`     |

#### 4.4.3 Sticky Section Headers（吸顶分区标题）

> iOS 分组列表滚动时，Section Header 吸顶固定，直到下一组 Header 顶上来时才滚走。

| 规则   | 说明                               | Tailwind                                                        |
| ---- | -------------------------------- | --------------------------------------------------------------- |
| 吸顶行为 | 滚动到顶部时固定，下一组 Header 推动时滚走        | `sticky top-0 z-10`                                             |
| 背景   | 磨砂毛玻璃，半透明                        | `bg-background/80 backdrop-blur-xl`                             |
| 标题样式 | 13px 大写，muted-foreground         | `text-[13px] uppercase tracking-[0.06em] text-muted-foreground` |
| 内边距  | 上下 6px，水平 20px                   | `py-1.5 px-5`                                                   |
| 分隔线  | 底部弱化细线（可选）                       | `border-b border-border/30`                                     |
| 实现方式 | 使用 CSS `position: sticky` 在滚动容器内 | `sticky top-[env(safe-area-inset-top)]`                         |

#### 4.4.4 列表行 Swipe Actions（滑动操作）

> iOS 原生列表行支持左滑/右滑出现操作按钮。

| 规则   | 说明                    | Tailwind / 实现                                   |
| ---- | --------------------- | ----------------------------------------------- |
| 右滑   | 显示左侧操作（如：标记、归档）       | transform translateX 正方向                        |
| 左滑   | 显示右侧操作（如：删除、分享）       | transform translateX 负方向                        |
| 按钮宽度 | 每个按钮 75px             | `w-[75px]`                                      |
| 按钮高度 | 与列表行同高                | `h-full`                                        |
| 按钮颜色 | 操作色：绿（标记）/蓝（归档）/红（删除） | `bg-emerald-500` / `bg-blue-500` / `bg-red-500` |
| 按钮图标 | 22px 白色               | `size-[22px] text-white`                        |
| 按钮文字 | 11px 白色               | `text-[11px] text-white`                        |
| 滑动阈值 | 滑动距离 > 50% 按钮宽度时执行操作  | 手势检测                                            |
| 回弹   | 松手后未达阈值自动回弹           | 300ms `cubic-bezier(0.16,1,0.3,1)`              |
| 手势冲突 | 垂直滚动时禁止水平滑动           | `touch-action: pan-y`，水平检测时阻止垂直                 |
| 单行展开 | 同时只允许一行展开操作           | 展开新行时自动收起其他行                                    |

#### 实现方案

```tsx
// swipeOffset: 0 = 关闭，正数 = 右滑，负数 = 左滑
const [swipeOffset, setSwipeOffset] = useState(0)

<div className="relative overflow-hidden">
  {/* 操作按钮层 */}
  <div className="absolute inset-0 flex">
    <div className="ml-auto flex">
      <button className="w-[75px] h-full bg-emerald-500 flex flex-col items-center justify-center gap-1">
        <Check className="size-[22px] text-white" />
        <span className="text-[11px] text-white">标记</span>
      </button>
      <button className="w-[75px] h-full bg-red-500 flex flex-col items-center justify-center gap-1">
        <Trash className="size-[22px] text-white" />
        <span className="text-[11px] text-white">删除</span>
      </button>
    </div>
  </div>
  {/* 列表行内容 */}
  <div
    className="relative bg-background transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
    style={{ transform: `translateX(${swipeOffset}px)` }}
  >
    {/* 行内容 */}
  </div>
</div>
```

> **适用场景**：待办列表、对标列表、闪念列表。卡片列表不使用 Swipe Actions（用长按菜单替代）。

### 4.5 表单

| 规则           | 说明                                                        |
| ------------ | --------------------------------------------------------- |
| 布局           | 移动端单列排布，不并排                                               |
| 标签           | 上方排列，不内联                                                  |
| 分组           | 用 `IOSGroupCard` 分组容器 + 13px 大写分区标题（Section Header）              |
| 输入框          | 全宽，最小高度 44px `h-11`                                       |
| Textarea     | `min-h-16`（field-sizing-content 自适应）                      |
| 弹出方式         | 移动端用 `Sheet side=bottom`（非 Dialog 居中）                     |
| 底部按钮         | 全宽 flex-1，固定底部，不随内容滚动                                     |
| 最大高度         | `max-h-[90vh] flex flex-col`，内容区 `flex-1 overflow-y-auto` |
| 只读模式         | 渲染纯文本元素（`<div>`/`<span>`），不用 readOnly Input               |
| initialFocus | 所有表单 Sheet 设置 `initialFocus={false}`                      |
| autoFocus    | 禁止在 Input/Textarea 上使用 autoFocus                          |
| 输入框样式        | `bg-muted/30 border-0 rounded-xl h-11 text-[17px]`        |
| 搜索框          | 44px 高 `h-11`                                             |
| 表单行          | `min-h-[44px] px-4`，分隔线连接                                 |

#### 4.5.1 输入类型与键盘

| 数据类型 | inputMode | 键盘类型           | 说明    |
| ---- | --------- | -------------- | ----- |
| 纯文本  | `text`    | 标准键盘           | 默认    |
| 数字   | `numeric` | 数字键盘           | 评分、数量 |
| 小数   | `decimal` | 带小数点数字键盘       | 金额    |
| 电话   | `tel`     | 电话键盘           | 联系方式  |
| 邮箱   | `email`   | 邮箱键盘（带 @）      | 邮箱    |
| 网址   | `url`     | URL 键盘（带 .com） | 链接    |
| 搜索   | `search`  | 搜索键盘（带搜索键）     | 搜索框   |

> **规则**：根据数据类型设置 `inputMode` 属性，确保弹出正确键盘。数字输入框必须隐藏 spinner 箭头（全局 CSS 已处理）。

#### 4.5.2 字符计数器

| 规则   | 说明                    | Tailwind                        |
| ---- | --------------------- | ------------------------------- |
| 显示时机 | 输入达到 80% 最大长度时显示      | JS 检测                           |
| 位置   | 输入框右下角，外侧             | `text-right mt-1`               |
| 样式   | 12px muted-foreground | `text-xs text-muted-foreground` |
| 超限提示 | 超过最大长度时变红色            | `text-destructive`              |
| 格式   | "当前/最大"               | `42/200`                        |

### 4.6 按钮

#### 4.6.1 按钮样式

| 样式              | 用途            | Tailwind                                    |
| --------------- | ------------- | ------------------------------------------- |
| Filled（实心）      | 主操作（提交、保存、创建） | `bg-primary text-primary-foreground`        |
| Outline（描边）     | 次要操作（取消、返回）   | `border border-border bg-background`        |
| Plain（纯文字）      | 行内链接操作（添加、更多） | `text-foreground` 或 `text-muted-foreground` |
| Destructive（危险） | 删除、退出         | `text-destructive`                          |
| Pill（药丸）        | 底部工具栏按钮       | `rounded-full`                              |

#### 4.6.2 按钮尺寸

| 类型       | 移动端         | 桌面端         | Tailwind            |
| -------- | ----------- | ----------- | ------------------- |
| 图标按钮     | 44px × 44px | 32px × 32px | `size-11 lg:size-8` |
| 主操作按钮    | 44px 高      | 32px 高      | `h-11 lg:h-8`       |
| 搜索框      | 44px 高      | 32px 高      | `h-11 lg:h-8`       |
| 表单输入框    | 44px 高      | 32px 高      | `h-11 lg:h-8`       |
| 底部工具栏按钮  | 最小 44px 高   | 36px 高      | `h-11` (mobile)     |
| 空状态按钮    | 44px 高      | 36px 高      | `h-11`              |
| Textarea | `min-h-16`  | 标准          | `min-h-16`          |

#### 4.6.3 按钮交互

| 交互     | 效果       | 实现                      |
| ------ | -------- | ----------------------- |
| 按下     | 透明度降低（iOS highlighted 态） | `active:opacity-60` |
| 按下（次要） | 透明度降低    | `active:opacity-60`     |
| 按下（药丸） | 缩小到 95%  | `active:scale-95`       |
| 禁用     | 50% 透明度  | `disabled:opacity-50`   |
| 过渡     | 200ms    | `transition-all`        |

### 4.7 开关 (Switch)

| 规则      | 说明                                                      |
| ------- | ------------------------------------------------------- |
| ON 态颜色  | iOS Green `#34C759`（在组件中覆盖 `data-checked:bg-[#34C759]`） |
| OFF 态颜色 | `bg-input/90`（系统灰）                                      |
| 尺寸      | 默认 `h-5 w-8`（20×32px），小尺寸 `h-4 w-6`                     |
| 拇指      | `bg-background` 白色圆形，有阴影                                |
| 过渡      | `transition-all`                                        |
| 行高      | 列表行中 `min-h-[44px]`                                     |

### 4.8 分段控制器 (Segmented Control)

> 用于维度切换、视图切换等场景。iOS 风格的分段控制器。

| 规则    | 说明                        | Tailwind                               |
| ----- | ------------------------- | -------------------------------------- |
| 容器    | 圆角 10px，`bg-secondary/20` | `rounded-[10px] bg-secondary/20 p-0.5` |
| 选中段   | 白色背景 + 阴影                 | `bg-background shadow-sm`              |
| 非选中段  | muted-foreground 文字       | `text-muted-foreground`                |
| 选中文字  | foreground + semibold     | `text-foreground font-semibold`        |
| 滑动指示器 | 滑块从旧位置滑动到新位置              | 300ms `cubic-bezier(0.34,1.56,0.64,1)` |
| 等宽    | 各段等宽 `flex-1`             | `flex-1`                               |
| 高度    | 32px（移动端紧凑）               | `h-8`                                  |
| 文字    | 13px medium               | `text-[13px] font-medium`              |
| 过渡    | 150ms 色彩渐变                | `transition-colors`                    |

#### 滑动指示器实现

```tsx
{/* 滑块使用绝对定位 + transform 过渡 */}
<div className="relative">
  {/* 滑块背景 */}
  <div
    className="absolute top-0.5 left-0.5 h-[calc(100%-4px)] rounded-[8px] bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
    style={{ width: `calc(${100/segments.length}% - 4px)`, transform: `translateX(${activeIndex * 100}%)` }}
  />
  {/* 文字层 */}
  <div className="relative flex">
    {segments.map((seg, i) => (
      <button className="flex-1 h-8 flex items-center justify-center text-[13px] transition-colors"
        style={{ color: i === activeIndex ? 'var(--foreground)' : 'var(--muted-foreground)', fontWeight: i === activeIndex ? 600 : 400 }}>
        {seg.label}
      </button>
    ))}
  </div>
</div>
```

### 4.9 搜索

| 规则    | 说明                             |
| ----- | ------------------------------ |
| 搜索框高度 | 44px `h-11`                    |
| 搜索框样式 | `bg-secondary/20 rounded-full` |
| 搜索图标  | 左侧，muted-foreground            |
| 取消按钮  | 右侧，15px，muted-foreground，输入时显示 |
| 自动聚焦  | 搜索 Sheet 打开时可自动聚焦搜索框           |
| 空结果   | "无搜索结果" 居中显示                   |
| 搜索历史  | 可选，显示在搜索框下方                    |
| 实时搜索  | 输入时即时过滤                        |

#### 4.9.1 搜索激活模式

> iOS 原生搜索是点击搜索图标后搜索栏从导航栏展开。

| 规则   | 说明                           | Tailwind / 实现                       |
| ---- | ---------------------------- | ----------------------------------- |
| 非激活态 | 导航栏右侧搜索图标按钮，44px             | `size-11`                           |
| 激活动画 | 搜索栏从右侧滑入，覆盖标题区域              | 300ms `cubic-bezier(0.16,1,0.3,1)`  |
| 激活态  | 搜索栏占满导航栏，左侧搜索图标 + 输入框 + 右侧取消 | flex 布局                             |
| 取消按钮 | 右侧"取消"，15px，muted-foreground | `text-[15px] text-muted-foreground` |
| 自动聚焦 | 激活后自动聚焦输入框                   | `autoFocus`（搜索场景允许）                 |
| 退出   | 点击取消或点击遮罩退出搜索态               | 恢复标题                                |
| 清空按钮 | 输入框右侧出现清空（x）按钮               | `size-5 text-muted-foreground`      |

#### 4.9.2 搜索防抖

| 规则   | 说明                              | <br />            |
| ---- | ------------------------------- | ----------------- |
| 防抖时间 | 300ms                           | <br />            |
| 实现方式 | `useDebouncedValue(value, 300)` | <br />            |
| 防抖前  | 立即更新 UI（如清空按钮显示）                | <br />            |
| 防抖后  | 300ms 无新输入后执行搜索                 | <br />            |
| 取消请求 | 新搜索发起时取消上一次未完成请求                | `AbortController` |
| 最小字符 | 不足 1 字符时不触发搜索                   | 空输入显示全部           |

### 4.10 筛选与排序

| 规则   | 说明                                            |
| ---- | --------------------------------------------- |
| 入口   | PageHeader 底部区域，44px 触摸热区按钮                   |
| 弹出方式 | Sheet side=bottom                             |
| 选项布局 | 全宽列表行，44px 高                                  |
| 选中态  | `bg-secondary/60` + 右侧 Check 图标（foreground 色） |
| 点击反馈 | `active:bg-secondary/40`                      |
| 计数   | 每个选项右侧显示数量，12px muted-foreground              |
| 关闭方式 | 选择后自动关闭，或点击遮罩关闭                               |

### 4.11 骨架屏

| 规则         | 说明                                               |
| ---------- | ------------------------------------------------ |
| 布局         | 与实际内容相同的布局结构                                     |
| 形状         | 圆角与实际元素一致                                        |
| 颜色         | `bg-secondary`（系统灰）                              |
| shimmer 动画 | 从左到右微光扫过，1.5s 循环                                 |
| 延迟显示       | 150ms 延迟（`useDelayedLoading(loading, 150)`），避免闪烁 |
| 尺寸         | 与实际内容尺寸完全一致                                      |

#### Shimmer 动画 CSS

```css
@keyframes ios-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(90deg, var(--secondary) 25%, var(--muted) 50%, var(--secondary) 75%);
  background-size: 200% 100%;
  animation: ios-shimmer 1.5s linear infinite;
}
```

### 4.12 空状态

| 规则   | 说明                                      | Tailwind                                    |
| ---- | --------------------------------------- | ------------------------------------------- |
| 位置   | 居中，flex col items-center justify-center | `flex flex-col items-center justify-center` |
| 间距   | `py-16`                                 | `py-16`                                     |
| 图标   | 64px 圆形容器，`bg-muted`                    | `size-16 rounded-full bg-muted`             |
| 图标尺寸 | 32px，muted-foreground                   | `size-8 text-muted-foreground`              |
| 标题   | 16px semibold                           | `text-base font-semibold`                   |
| 描述   | 15px muted-foreground（Subheadline）    | `text-[15px] text-muted-foreground`          |
| 操作按钮 | 44px 高，semibold                         | `h-11 font-semibold`                        |
| 元素间距 | 标题→描述 4px，描述→按钮 16px                    | `mb-1`, `mb-4`                              |

### 4.13 Toast 通知

| 规则   | 说明                                  |
| ---- | ----------------------------------- |
| 位置   | 屏幕底部，Tab 栏上方                        |
| 样式   | 圆角 14px，`bg-foreground`（深色背景）+ 白色文字 |
| 文字   | 15px regular（Subheadline）           |
| 图标   | 成功/失败图标，16px                        |
| 显示时长 | 2-3 秒自动消失                           |
| 动画   | 底部上滑 + 淡入，下滑 + 淡出                   |
| 最大宽度 | 屏幕宽度 - 32px 左右内边距                   |
| 技术实现 | 使用 `sonner` 库                       |

### 4.14 上下文菜单

| 规则    | 说明                                       |
| ----- | ---------------------------------------- |
| 触发方式  | 长按 500ms                                 |
| 预览    | 长按时先显示元素预览（缩放+模糊背景）                      |
| 菜单    | 预览上方弹出操作列表                               |
| 菜单样式  | 圆角 14px，`bg-card`，阴影                     |
| 菜单项   | 44px 高，15px 文字，左图标+文字                    |
| 分隔线   | `border-b border-border/30`              |
| 危险操作  | `text-destructive` 图标和文字                 |
| 动画    | 150ms 缩放+淡入 `cubic-bezier(0.16,1,0.3,1)` |
| 关闭    | 点击任意项或点击遮罩关闭                             |
| 移动端实现 | Sheet side=bottom（底部操作表形式）               |

### 4.15 卡片

| 规则    | 说明                                                        | Tailwind                                                            |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| 布局    | 移动端单列                                                     | -                                                                   |
| 圆角    | 18px                                                      | `rounded-[18px]`                                                    |
| 内边距   | 18px                                                      | `p-[18px]`                                                          |
| 优先级标识 | 左侧 3px 色条（urgent 品牌色）                                     | `border-l-[3px] border-brand`                                       |
| 搁置态   | `opacity-60`                                              | `opacity-60`                                                        |
| 标题    | 17px semibold，2 行截断                                       | `text-[17px] font-semibold leading-[1.29] line-clamp-2`             |
| 分数    | 16px bold tabular-nums                                    | `text-base font-bold tabular-nums`                                  |
| hover（桌面端） | `-translate-y-0.5` + `shadow-md` + `border-foreground/10` | `hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10` |
| 点击    | 整卡可点击                                                     | `cursor-pointer`                                                    |
| 点击反馈  | `active:bg-secondary/30`                                  | `active:bg-secondary/30`                                            |
| 过渡    | `transition-all`                                          | `transition-all`                                                    |

### 4.16 进度指示器

#### 4.16.1 步骤进度点

| 规则  | 说明                       |
| --- | ------------------------ |
| 点尺寸 | 5px 圆形                   |
| 已完成 | `bg-foreground`          |
| 未完成 | `bg-muted-foreground/20` |
| 间距  | 3px                      |

#### 4.16.2 底部进度文字

| 规则 | 说明                    |
| -- | --------------------- |
| 文字 | 12px muted-foreground |
| 格式 | "已完成 X/4 个维度"         |

### 4.17 徽章与标签

| 规则  | 说明            | Tailwind                    |
| --- | ------------- | --------------------------- |
| 形态  | 全圆药丸          | `rounded-full`              |
| 内边距 | 水平 8px，垂直 2px | `px-2 py-0.5`               |
| 文字  | 11px semibold | `text-[11px] font-semibold` |
| 背景色 | 按语义色 10% 透明度  | `bg-{color}/10`             |
| 文字色 | 按语义色          | `text-{color}`              |
| 尺寸  | 紧凑，不占过多空间     | `inline-flex items-center`  |

### 4.18 下拉刷新

| 规则    | 说明               |
| ----- | ---------------- |
| 触发    | 内容区顶部下拉超过阈值      |
| 动画    | 旋转指示器 + 弹回       |
| 阈值    | 80px 下拉距离        |
| 反馈    | 下拉时显示刷新指示器，松手后刷新 |
| 刷新完成  | 指示器自动消失          |
| 实现优先级 | 后续可加             |

### 4.19 Picker 选择器（滚轮）

> iOS 原生滚轮选择器，用于日期、时间、自定义数据选择。替代移动端的 Select 下拉框。

| 规则    | 说明                          | Tailwind                                         |
| ----- | --------------------------- | ------------------------------------------------ |
| 弹出方式  | Sheet side=bottom           | Sheet 组件                                         |
| 高度    | 220px 滚动区                   | `h-[220px]`                                      |
| 选择行高度 | 40px                        | `h-10`                                           |
| 选中行   | 居中，foreground 文字            | `text-foreground`                                |
| 非选中行  | muted-foreground            | `text-muted-foreground`                          |
| 选中指示器 | 顶部和底部各一条分隔线，背景 secondary/20 | `h-10 bg-secondary/20 border-y border-border/30` |
| 滚轮动画  | 惯性滚动 + 吸附到最近行               | iOS 弹簧曲线                                         |
| 确认方式  | 底部"确认"按钮                    | iOS 导航栏模式                                        |
| 日期选择  | 年/月/日 三列滚轮                  | 三列并排                                             |
| 时间选择  | 时/分 两列滚轮                    | 两列并排                                             |
| 单列选择  | 一列滚轮                        | 一列居中                                             |

#### 日期选择器结构

```tsx
<Sheet>
  <SheetContent side="bottom" className="rounded-t-[18px] p-0" initialFocus={false}>
    {/* 导航栏 */}
    <div className="flex items-center justify-between px-5 h-11 border-b border-border/30">
      <button className="text-[17px] text-muted-foreground">取消</button>
      <span className="text-[17px] font-semibold">选择日期</span>
      <button className="text-[17px] font-semibold text-foreground">确认</button>
    </div>
    {/* 滚轮区 */}
    <div className="relative h-[220px]">
      {/* 选中指示器 */}
      <div className="absolute top-[90px] left-0 right-0 h-10 bg-secondary/20 border-y border-border/30 pointer-events-none" />
      {/* 滚轮列 */}
      <div className="flex h-full">
        <div className="flex-1 overflow-y-auto touch-scroll" style={{ scrollSnapType: 'y mandatory' }}>
          {years.map(y => (
            <div key={y} className="h-10 flex items-center justify-center text-[20px] snap-center" style={{ scrollSnapAlign: 'center' }}>
              {y}年
            </div>
          ))}
        </div>
        {/* 月列、日列同理 */}
      </div>
    </div>
    {/* 安全区 */}
    <div className="pb-[env(safe-area-inset-bottom)]" />
  </SheetContent>
</Sheet>
```

> **与 IOSSelectSheet 的区别**：Picker 用于连续数据（日期、时间、数字范围），IOSSelectSheet 用于离散选项（状态、负责人等）。

### 4.20 多选模式（Selection Mode）

> 列表进入多选模式后，每行左侧出现勾选圆圈，底部出现批量操作栏。

| 规则    | 说明                                           | Tailwind                            |
| ----- | -------------------------------------------- | ----------------------------------- |
| 进入方式  | 长按列表项 / 导航栏"选择"按钮                            | 长按 500ms                            |
| 退出方式  | 点击"完成" / 点击空白处                               | 底部栏完成按钮                             |
| 勾选圆圈  | 左侧 24px 圆圈，选中为 foreground + Check            | `size-6 rounded-full border-2`      |
| 选中态   | `border-foreground bg-foreground` + 白色 Check | `border-foreground bg-foreground`   |
| 未选中态  | `border-muted-foreground/40`                 | `border-muted-foreground/40`        |
| 全选    | 导航栏右侧"全选"按钮                                  | `text-[17px] text-foreground`       |
| 底部操作栏 | 固定底部，磨砂毛玻璃                                   | `bg-background/80 backdrop-blur-xl` |
| 操作按钮  | 删除、移动、标记等，44px 高                             | `h-11`                              |
| 选中计数  | 底部栏左侧显示"已选 X 项"                              | `text-sm text-muted-foreground`     |
| 动画    | 勾选圆圈缩放 + 淡入                                  | 200ms `ease-out`                    |
| 触摸热区  | 勾选圆圈区域 44px x 44px                           | `size-11` padding                   |

#### 布局结构

```
┌──────────────────────────┐
│ 取消    已选 3 项    全选  │  ← 导航栏（多选模式）
├──────────────────────────┤
│ ○ 列表项 1                │
│ ● 列表项 2（已选）         │
│ ○ 列表项 3                │
│ ● 列表项 4（已选）         │
├──────────────────────────┤
│ 已选 3 项    [删除] [移动] │  ← 底部操作栏
└──────────────────────────┘
```

### 4.21 Share Sheet（分享表）

> iOS 原生分享面板，从底部弹出，显示分享目标和操作列表。

| 规则    | 说明                       | Tailwind                            |
| ----- | ------------------------ | ----------------------------------- |
| 弹出方式  | Sheet side=bottom        | Sheet 组件                            |
| 顶部圆角  | 18px                     | `rounded-t-[18px]`                  |
| 分享目标区 | 水平滚动的图标列表                | `flex overflow-x-auto`              |
| 分享图标  | 60x60 圆角方形               | `size-[60px] rounded-[14px]`        |
| 图标名称  | 11px，图标下方，居中             | `text-[11px] text-center`           |
| 操作列表  | 分组列表形式，每行 44px           | `min-h-[44px]`                      |
| 操作图标  | 左侧 18px，muted-foreground | `size-[18px] text-muted-foreground` |
| 操作文字  | 15px                     | `text-[15px]`                       |
| 取消按钮  | 独立分组，底部                  | 44px 高，semibold                     |
| 分隔    | 分享目标区与操作列表之间有 8px 间距     | `gap-2`                             |

### 4.22 图片与媒体处理

#### 4.22.1 图片加载

| 规则         | 说明              | Tailwind                          |
| ---------- | --------------- | --------------------------------- |
| 占位         | 加载前显示灰底         | `bg-muted`                        |
| 加载完成       | 淡入显示            | `transition-opacity duration-300` |
| 加载失败       | 显示失败图标占位        | `bg-muted` + `ImageOff` 图标        |
| 宽高比        | 固定宽高比，防止布局抖动    | `aspect-[16/9]` 等                 |
| 圆角         | 与容器圆角一致         | `rounded-[18px]`（卡片内）             |
| 全屏预览       | 点击图片全屏查看，支持双指缩放 | Sheet / 全屏遮罩                      |
| object-fit | `cover` 保持宽高比裁切 | `object-cover`                    |

#### 4.22.2 图片预览器

| 规则   | 说明                   |
| ---- | -------------------- |
| 全屏   | 黑色背景，占满视口            |
| 双指缩放 | 支持 pinch zoom        |
| 左右滑动 | 多图时左右切换              |
| 关闭   | 下滑关闭（与 Sheet 下拉关闭一致） |
| 页码   | 底部 "1/5" 格式，白色文字     |

#### 4.22.3 视频播放

| 规则   | 说明              | Tailwind                           |
| ---- | --------------- | ---------------------------------- |
| 封面   | 显示首帧或自定义封面图     | `bg-muted`                         |
| 播放按钮 | 居中，64px 圆形半透明背景 | `size-16 rounded-full bg-black/40` |
| 播放图标 | 32px 白色         | `size-8 text-white`                |
| 全屏   | 支持全屏播放          | 系统全屏 API                           |
| 内联   | 不自动播放，点击播放      | `playsInline`                      |

### 4.23 文件上传与附件

| 规则     | 说明                       | Tailwind                                              |
| ------ | ------------------------ | ----------------------------------------------------- |
| 上传区域   | 虚线边框，圆角 18px             | `border-2 border-dashed border-border rounded-[18px]` |
| 上传图标   | 居中 32px，muted-foreground | `size-8 text-muted-foreground`                        |
| 提示文字   | 15px muted-foreground    | `text-[15px] text-muted-foreground`                   |
| 点击上传   | 点击区域触发文件选择               | `<input type="file" hidden>`                          |
| 多文件    | 支持多文件上传                  | `multiple`                                            |
| 文件类型   | 限制允许的文件类型                | `accept`                                              |
| 上传中    | 显示进度条 + 文件名              | 进度条组件                                                 |
| 上传完成   | 显示文件列表，可删除               | 列表行 + 删除按钮                                            |
| 上传失败   | 文件行红色标记 + 重试按钮           | `text-destructive`                                    |
| 文件大小限制 | 超过限制时提示                  | Alert 弹窗                                              |
| 缩略图    | 图片文件显示缩略图                | 40x40 圆角                                              |

### 4.24 通知红点与角标

| 类型     | 说明                  | Tailwind                                                          |
| ------ | ------------------- | ----------------------------------------------------------------- |
| Tab 角标 | Tab 栏图标右上角红点，表示有新内容 | `absolute -top-1 -right-1`                                        |
| 圆点红点   | 无数字，8px 圆形红色        | `size-2 rounded-full bg-red-500`                                  |
| 数字角标   | 有数字，最小 16px 圆角      | `min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px]` |
| 数字上限   | 超过 99 显示 "99+"      | `99+`                                                             |
| 列表项红点  | 行标题左侧小圆点            | `size-2 rounded-full bg-red-500`                                  |
| 未读消息   | 行右侧数字角标             | 同数字角标                                                             |
| 位置     | 相对于图标/标题的右上角        | `absolute`                                                        |

> **规则**：红点仅用于未读/未处理/新增内容的提示，不用于状态标记（状态用语义色圆点）。

***

## 5. 交互与体验

### 5.1 手势系统

| 手势   | 场景       | 说明                                              | 状态       |
| ---- | -------- | ----------------------------------------------- | -------- |
| 点击   | 导航/操作    | 标准点击                                            | 已实现      |
| 长按   | 上下文菜单    | 长按 500ms 弹出操作菜单                                 | 待开发      |
| 左滑   | 返回       | 内容区左滑返回上一页                                      | 待开发      |
| 下拉   | 刷新       | 内容区下拉刷新数据                                       | 待开发      |
| 下滑   | 关闭 Sheet | Sheet 底部弹出的标准关闭手势                               | 需引入 vaul |
| 拖拽   | Sheet 关闭 | Sheet 内向下拖拽关闭                                   | 需引入 vaul |
| 双指缩放 | 全局禁止     | viewport `maximumScale: 1, userScalable: false` | 已实现      |
| 边缘滑动 | 返回       | 屏幕左边缘右滑返回                                       | 待开发      |

### 5.2 触摸热区

| 类型      | 最小尺寸            | 说明                |
| ------- | --------------- | ----------------- |
| 普通按钮/链接 | 44px × 44px     | Apple HIG 最低标准，强制 |
| 主操作按钮   | 44px × 44px     | Apple HIG 44pt 标准，新建、保存等核心操作 |
| Tab 栏项目 | 58px 宽 × 56px 高 | 底部导航              |
| 搜索框     | 44px 高          | `h-11`            |
| 表单输入框   | 44px 高          | `h-11`            |
| 图标按钮    | 44px × 44px     | `size-11`         |
| 卡片可点击区域 | 整张卡片            | 不设独立"查看"按钮        |
| 行内文字按钮  | 44px × 44px     | 必须有足够 padding     |
| 底部工具栏按钮 | 44px 高          | `h-11`            |

> **规则**：移动端任何可点击元素，其触摸热区不得小于 44px × 44px。即使视觉元素较小，也必须通过 padding 扩展触摸区域。

### 5.3 点击反馈

#### 5.3.1 列表行/卡片

| 场景   | 反馈     | Tailwind             |
| ---- | ------ | -------------------- |
| 按下时  | 灰色高亮背景 | `active:bg-muted/50` |
| 松开后  | 背景消失   | 100ms `ease-out`     |
| 已选中态 | 持续浅色背景 | `bg-foreground/5`    |

#### 5.3.2 按钮

| 场景      | 反馈       | Tailwind                |
| ------- | -------- | ----------------------- |
| 按下时     | 透明度降低（iOS highlighted 态） | `active:opacity-60` |
| 按下时（次要） | 透明度降低    | `active:opacity-60`     |
| 按下时（药丸） | 缩小到 95%  | `active:scale-95`       |
| 禁用态     | 50% 透明度  | `disabled:opacity-50`   |

#### 5.3.3 点击反馈透明度统一标准

| 元素类型  | 透明度 | Tailwind                 |
| ----- | --- | ------------------------ |
| 列表行   | 50% | `active:bg-muted/50`     |
| 卡片    | 30% | `active:bg-secondary/30` |
| 选择项   | 40% | `active:bg-secondary/40` |
| 操作表选项 | 40% | `active:bg-secondary/40` |

> **规则**：同一类型的交互元素，点击反馈透明度必须全局统一。不允许同类元素出现 30% 和 50% 混用。

### 5.4 动画系统

#### 5.4.1 转场动画

| 场景              | 动画             | 时长         | 缓动                            |
| --------------- | -------------- | ---------- | ----------------------------- |
| Sheet 弹出        | 底部上滑           | 300ms      | `cubic-bezier(0.16,1,0.3,1)`  |
| Sheet 关闭        | 底部下滑           | 300ms      | `cubic-bezier(0.16,1,0.3,1)`  |
| Sheet 下拉关闭      | 跟手拖拽 → 松手弹回/滑走 | 跟手 + 200ms | iOS 弹簧                        |
| Alert 弹出        | 缩放 + 淡入        | 200ms      | `cubic-bezier(0.16,1,0.3,1)`  |
| Alert 关闭        | 缩放 + 淡出        | 200ms      | `cubic-bezier(0.0,0.0,0.2,1)` |
| Action Sheet 弹出 | 底部上滑           | 300ms      | `cubic-bezier(0.16,1,0.3,1)`  |
| 内容切换            | 交叉淡入淡出         | 200ms      | `ease-in-out`                 |
| 页面 push         | 右→左滑入          | 300ms      | `cubic-bezier(0.16,1,0.3,1)`  |
| 页面 pop          | 左→右滑出          | 300ms      | `cubic-bezier(0.16,1,0.3,1)`  |

#### 5.4.2 微交互动画

| 场景          | 动画          | 时长    | 缓动                                  |
| ----------- | ----------- | ----- | ----------------------------------- |
| 卡片 hover（桌面端） | 上移 2px + 阴影 | 200ms | `ease-out`                          |
| 卡片按下        | 背景色         | 即时    | -                                   |
| 按钮按下        | 透明度降低（iOS highlighted 态） | 即时    | -                                   |
| Tab 切换      | 色彩渐变        | 300ms | `cubic-bezier(0.16,1,0.3,1)` iOS 弹簧 |
| Tab 滑块      | 滑块位移        | 300ms | `cubic-bezier(0.34,1.56,0.64,1)` 弹簧 |
| 快记按钮按下      | 缩小到 95%     | 100ms | `ease-out`                          |
| 骨架屏 shimmer | 左→右扫过       | 1.5s  | `linear` infinite                   |
| 列表项点击高亮     | 背景色出现       | 100ms | `ease-out`                          |

#### 5.4.4 数据数字显示

> iOS 原生不使用 count-up 动画。数据指标（KPI、分数、统计）直接显示终值，加载时使用轻量淡入。

| 规则      | 说明                                     |
| ------- | -------------------------------------- |
| 显示方式    | 直接显示终值，不做 0→目标值滚动                       |
| 加载动画    | 数据加载完成时淡入（200ms `ease-out`）              |
| 小数处理    | 保留与目标值相同的小数位数                          |
| 千分位     | 使用千分位逗号显示                               |
| Tabular | 必须使用 `tabular-nums` 防止跳动               |
| 对齐      | 右对齐，数字宽度一致                              |

```tsx
// iOS 原生：直接显示终值 + 淡入
<span className="font-bold tabular-nums animate-[fade-in_200ms_ease-out]">
  {value.toLocaleString()}
</span>
```

#### 5.4.3 iOS 动画令牌

所有动画令牌在 `globals.css` :root 中定义：

```css
--ease-ios-spring: cubic-bezier(0.16, 1, 0.3, 1);
--ease-ios-out: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-ios-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-ios-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 5.5 触觉反馈

> iOS 原生 APP 中的触觉反馈（Haptic Feedback）。
> **限制说明**：iOS Safari **不支持** `navigator.vibrate()` API，该函数在 iOS 上会静默失败。仅在 Android 设备上有效。iOS 端触觉反馈需通过原生模块（Tauri 2 原生插件）实现，Web 端暂不触发。

| 场景     | iOS 触觉类型            | Android 模拟             | 说明      |
| ------ | ------------------- | --------------------- | ------- |
| 开关切换   | selection           | `vibrate(10)`         | 轻微震动    |
| Tab 切换 | selection           | `vibrate(10)`         | 轻微震动    |
| 按钮点击   | -                   | 不触发                   | 点击不触发触觉 |
| 长按菜单   | impactMedium        | `vibrate(20)`         | 中等震动    |
| 下拉刷新触发 | impactHeavy         | `vibrate(40)`         | 重震动     |
| 操作成功   | notificationSuccess | `vibrate([10,50,10])` | 成功模式    |
| 操作失败   | notificationError   | `vibrate([40,50,40])` | 错误模式    |
| 删除确认   | warning             | `vibrate([20,50,20])` | 警告模式    |

> 实现优先级：后续可加。Android 通过 `navigator.vibrate()` 触发；iOS 需 Tauri 2 原生插件，Web 端暂不支持。

### 5.6 暗黑模式

| 规则      | 说明                                                           |
| ------- | ------------------------------------------------------------ |
| 适配方式    | CSS 变量 + `prefers-color-scheme: dark`                        |
| 禁止硬编码色值 | 所有颜色必须使用 CSS 变量（`var(--foreground)` 等）                       |
| 语义色令牌   | 使用 `foreground`/`muted-foreground`/`background`/`card` 等语义令牌 |
| 状态色     | 语义色（amber/emerald/indigo）在暗黑模式自动适配                           |
| 图片      | 暗黑模式下降低图片亮度或提供暗色版本                                           |
| 阴影      | 暗黑模式下阴影更柔和（降低透明度）                                            |
| 磨砂毛玻璃   | 暗黑模式下背景更暗，毛玻璃效果更明显                                           |

### 5.7 无障碍

| 规则           | 说明                                     | 实现                                        |
| ------------ | -------------------------------------- | ----------------------------------------- |
| 语义化标签        | 使用 `<button>`/`<a>`/`<nav>`/`<main>` 等 | 语义 HTML                                   |
| aria-label   | 图标按钮必须有 `aria-label`                   | `aria-label="筛选"`                         |
| 色彩对比度        | 文字对比度 >= 4.5:1（WCAG AA）                | 颜色选择                                      |
| 焦点可见         | 键盘焦点可见                                 | `focus-visible:ring-3`                    |
| 减少动效         | 尊重 `prefers-reduced-motion`            | `@media (prefers-reduced-motion: reduce)` |
| VoiceOver    | 图片有 alt 文字，图标按钮有 aria-label            | -                                         |
| Dynamic Type | 文字使用相对单位或响应式                           | `text-sm` 等                               |
| 最小触摸目标       | 44px × 44px                            | 强制                                        |

#### Reduce Motion 支持

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5.8 加载模式

| 场景   | 模式               | 说明                                       |
| ---- | ---------------- | ---------------------------------------- |
| 列表加载 | 骨架屏              | shimmer 动画，150ms 延迟显示                    |
| 按钮提交 | 按钮内 loading      | 按钮文字变为"提交中..."，禁用按钮                      |
| 页面加载 | 骨架屏              | 与页面布局完全一致                                |
| 图片加载 | 占位灰底             | `bg-muted` 占位，加载后淡入                      |
| 无限滚动 | 底部 loading 指示器   | 旋转图标 + "加载中..."                          |
| 操作成功 | Toast 提示         | 2-3 秒自动消失                                |
| 操作失败 | Toast 提示 + 错误信息  | 红色 Toast，显示错误原因                          |
| 全屏加载 | 全屏居中 loading 指示器 | 旋转图标 + "加载中..."，半透明遮罩 `bg-background/80` |
| 页面切换 | 全屏骨架屏            | 与目标页面布局一致，150ms 延迟显示                     |

### 5.9 错误处理

| 场景     | 处理方式                         |
| ------ | ---------------------------- |
| 表单验证错误 | 输入框下方红色文字提示                  |
| 网络请求失败 | Toast 提示 + 重试按钮              |
| 数据为空   | 空状态（图标+文字+操作按钮）              |
| 权限不足   | Alert 弹窗提示                   |
| 危险操作确认 | Alert 弹窗确认（禁止用浏览器 confirm()） |
| 自动保存失败 | 静默重试，3 次失败后 Toast 提示         |

### 5.10 键盘交互

| 规则    | 说明                                      |
| ----- | --------------------------------------- |
| 输入框焦点 | Sheet 打开时禁止自动聚焦（`initialFocus={false}`） |
| 键盘弹出  | 输入框不被键盘遮挡（滚动到可见区域）                      |
| 键盘收起  | 点击非输入区域自动收起键盘                           |
| 回车键   | 单行输入框回车提交，多行输入框回车换行                     |
| 输入框样式 | 数字输入框隐藏 spinner 箭头（全局 CSS）              |

### 5.11 焦点管理

| 规则        | 说明                                                      |
| --------- | ------------------------------------------------------- |
| Sheet 打开  | `initialFocus={false}`，禁止自动聚焦                           |
| Sheet 关闭  | 焦点回到触发元素                                                |
| Dialog 打开 | `initialFocus={false}`                                  |
| 输入框       | 禁止 `autoFocus`（编辑 Sheet 除外，但需配合 `initialFocus={false}`） |
| 只读模式      | 渲染纯文本元素，不用 readOnly Input（避免光标闪烁）                       |
| Tab 键导航   | 焦点顺序遵循视觉顺序                                              |

### 5.12 选中态规则（关键约束）

| 元素           | 选中态颜色                                       | 禁止颜色 |
| ------------ | ------------------------------------------- | ---- |
| Tab 栏活跃项     | `foreground`（#111827）                       | 品牌色  |
| 分段控制器选中段     | `bg-background` + `text-foreground`         | 品牌色  |
| 列表选中项        | `text-foreground` + `bg-foreground/5`       | 品牌色  |
| 筛选选中项        | `bg-secondary/60` + Check `text-foreground` | 品牌色  |
| 选择 Sheet 选中项 | `text-foreground font-medium`               | 品牌色  |
| 维度 Tab 选中项   | `text-foreground` + `font-semibold`         | 品牌色  |
| 开关 ON 态      | iOS Green（#34C759）                          | -    |
| 进度已完成点       | `bg-foreground`                             | 品牌色  |

> **品牌色（#FFB020）仅用于**：紧急优先级标记、关键数据强调、品牌标识。所有交互组件的选中/活跃态统一使用 foreground。

### 5.13 自动保存

| 规则   | 说明                      |
| ---- | ----------------------- |
| 触发时机 | 每次输入变化时保存到 localStorage |
| 恢复草稿 | 重新打开时恢复未保存的草稿           |
| 清除草稿 | 成功提交后清除 localStorage 草稿 |
| 失败提示 | 静默重试，3 次失败后 Toast 提示    |
| 适用范围 | 所有全局页面（移动端、Web、桌面端）     |

### 5.14 表单校验时机

| 时机       | 规则        | 说明                  |
| -------- | --------- | ------------------- |
| onBlur   | 失焦时校验     | 默认校验时机，避免输入过程中频繁报错  |
| onChange | 仅校验格式（非空） | 实时清空错误提示（如从有错变为无错时） |
| onSubmit | 提交时全量校验   | 确保所有字段通过，阻止提交       |
| 实时校验     | 仅用于特殊字段   | 用户名唯一性、密码强度、链接格式    |
| 评分/选择    | 即时校验      | 选择后立即验证（单选、评分等）     |

| 校验项        | 时机                         | 错误展示                |
| ---------- | -------------------------- | ------------------- |
| 必填         | onBlur + onSubmit          | 输入框下方红色 13px 文字     |
| 格式（邮箱/URL） | onBlur                     | 同上                  |
| 长度限制       | onChange（字符计数器） + onSubmit | 超限时计数器变红 + 下方提示     |
| 数值范围       | onBlur                     | 下方提示 "请输入 X-Y 之间的值" |
| 唯一性        | onBlur（异步）                 | 下方提示 + loading 图标   |
| 关联校验       | onSubmit                   | 如日期范围、密码确认          |

> **规则**：移动端表单默认 `onBlur` 校验 + `onSubmit` 全量校验。禁止 `onChange` 全量校验（输入过程中频繁报错影响体验）。错误提示文字 13px destructive 色，位于输入框正下方，`mt-1`。

### 5.15 离线状态

| 规则       | 说明                                         | Tailwind / 实现                    |
| -------- | ------------------------------------------ | -------------------------------- |
| 检测方式     | `navigator.onLine` + `online`/`offline` 事件 | 事件监听                             |
| 离线指示器    | 顶部 sticky 条幅，amber 色                       | `bg-amber-500/10 text-amber-600` |
| 指示器文字    | 13px，"当前处于离线模式"                            | `text-[13px]`                    |
| 指示器位置    | sticky header 下方，内容区上方                     | `sticky top-[PageHeader高度]`      |
| 数据操作     | 离线时操作入队列，上线后自动同步                           | IndexedDB 队列                     |
| 只读降级     | 离线时部分写入操作禁用，按钮变灰                           | `disabled:opacity-50`            |
| Toast 提示 | 恢复在线时 Toast 提示 "已恢复连接"                     | sonner                           |
| 本地缓存     | 离线可查看已缓存数据                                 | Dexie.js / IndexedDB             |
| 冲突处理     | 上线同步时冲突提示                                  | Alert 弹窗选择覆盖/保留                  |

***

## 6. 组件转换规则（PC → 移动端）

| PC 端组件               | 移动端等价                              | 说明                      | 实现方式                  |
| -------------------- | ---------------------------------- | ----------------------- | --------------------- |
| Dialog（居中弹窗）         | Sheet side=bottom                  | 底部滑出，圆角顶部，可下拉关闭         | `useIsDesktop()` 判断   |
| Dialog（表单）           | Sheet side=bottom                  | 底部按钮固定，内容区滚动            | 同上                    |
| Sheet side=right（详情） | Sheet side=bottom                  | 移动端从底部滑出                | 同上                    |
| DropdownMenu         | Sheet side=bottom                  | 移动端用底部列表（Action Sheet）  | 同上                    |
| Popover              | Sheet side=bottom                  | 移动端用底部面板                | 同上                    |
| Command（搜索列表）        | Sheet side=bottom                  | 移动端用底部搜索                | 同上                    |
| confirm() 浏览器弹窗      | 自定义 Alert 弹窗                       | 禁止使用浏览器原生 confirm/alert | 自定义组件                 |
| Select 下拉选择          | Sheet side=bottom (IOSSelectSheet) | 移动端用底部选择列表              | 同上                    |
| Checkbox 多选          | Sheet side=bottom + Checkbox 列表    | 移动端用底部多选列表              | 同上                    |
| Tooltip              | 文字内联或 Sheet                        | 移动端不显示 hover Tooltip    | CSS hidden            |
| DatePicker 日期选择      | Picker（Sheet side=bottom）          | 移动端用滚轮选择器               | 同上                    |
| 文件上传                 | 虚线上传区域 + 文件列表                      | 移动端点击触发文件选择             | `<input type="file">` |
| 分享按钮                 | Share Sheet                        | 移动端用底部分享面板              | 同上                    |
| 列表多选                 | 多选模式（长按进入）                         | 勾选圆圈 + 底部操作栏            | 自定义组件                 |

### 技术实现

```tsx
const isDesktop = useIsDesktop()

if (!isDesktop) {
  // 移动端：Sheet side=bottom
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" initialFocus={false} ...>
        {/* iOS 风格导航栏 + 内容 */}
      </SheetContent>
    </Sheet>
  )
}

// 桌面端：Dialog
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent initialFocus={false} ...>
      ...
    </DialogContent>
  </Dialog>
)
```

***

## 7. 各模块适配清单

| 模块     | 路由               | 移动端方案                        | 状态      |
| ------ | ---------------- | ---------------------------- | ------- |
| 今日待办   | /todo            | 看板/日历/甘特三视图移动适配              | 待开发     |
| 消息通知   | /notification    | 列表 + Sheet 详情                | 待开发     |
| 闪念池    | /flash-thought   | 卡片列表 + 快记入口                  | 待开发     |
| 对标拆解   | /benchmark       | 全屏列表 + Sheet 详情 + iOS 维度 Tab | **审查中** |
| 选题库    | /topic-library   | 单列卡片 + Sheet 底部详情 + Sheet 表单 | 进行中     |
| 问答收集   | /qa-collect      | 列表 + Sheet 详情                | 待开发     |
| 灵感记录   | /inspiration     | 列表 + Sheet 详情                | 待开发     |
| 脚本框架库  | /script-template | 列表 + Sheet 详情                | 待开发     |
| 内容生产流程 | /produce-flow    | 阶段流 + Sheet 详情               | 待开发     |
| 制作发布   | /publish         | 列表 + Sheet 详情                | 待开发     |
| 数据追踪   | /dashboard       | KPI 卡片 + 图表适配                | 待开发     |
| 复盘记录   | /review          | 列表 + Sheet 详情                | 待开发     |
| 大脑知识库  | /knowledge-base  | 知识卡片 + 搜索                    | 待开发     |

***

## 8. 视图布局规范

> 本章节定义项目 13 个业务模块的页面布局形态、核心交互和模块间流转关系。
> **核心原则**：移动端不照搬 Web 分栏布局，各端使用原生范式。每个模块根据自身业务特色设计差异化布局，不做千篇一律的模板。

### 8.1 业务流程总览

```
┌───────────────────────────────────────────────────────────────────┐
│                          信息输入层                                │
│  闪念池（快记）  灵感（思考→结论）  问答（一问多答）  对标拆解（拆解）  │
└──────┬───────────┬───────────────┬──────────────┬─────────────────┘
       │ 转化       │ 转化           │              │ 沉淀
       ▼           ▼               │              ▼
┌──────────────────────────────────────────────────────┐
│                    素材收纳层                          │
│   选题库（灵感+对标结果收纳）  脚本框架库（模板存储）     │
└──────┬───────────┬───────────────────────────────────┘
       │ 引用选题   │ 引用框架
       ▼           ▼
┌──────────────────────────────────────────────┐
│            ★ 核心生产层（重中之重）★            │
│        内容生产流程（写文案的地方）               │
│        移动端：全屏写作 + Sheet 资料浮层          │
└──────────────────┬───────────────────────────┘
                   │ 完成生产
                   ▼
┌──────────────────────────────────────────────┐
│                  输出追踪层                     │
│  制作发布（元信息记录）→ 数据追踪（数据表现追踪）  │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│                  复盘归档层                     │
│  复盘记录（工作流+视频数据复盘）→ 大脑知识库（归档）│
└──────────────────────────────────────────────┘

  今日待办：横切模块，负责任务管理，贯穿全流程
  消息通知：全局模块，接收各模块的通知消息
  用户信息：全局入口，头像/设置/个人中心
```

| 层级   | 模块                   | 核心职责                  |
| ---- | -------------------- | --------------------- |
| 信息输入 | 闪念池 / 灵感 / 问答 / 对标拆解 | 捕捉想法、思考推演、问答收集、对标拆解分析 |
| 素材收纳 | 选题库 / 脚本框架库          | 灵感和对标结果转化为选题、存储脚本模板   |
| 核心生产 | 内容生产流程               | 引用选题+框架，写文案（本项目核心）    |
| 输出追踪 | 制作发布 / 数据追踪          | 记录发布元信息、追踪视频数据        |
| 复盘归档 | 复盘记录 / 大脑知识库         | 复盘全流程、归档全部数据          |
| 横切模块 | 今日待办 / 消息通知          | 任务管理贯穿全流程、通知消息接收      |
| 全局入口 | 用户信息                 | 头像、设置、个人中心            |

### 8.2 布局范式分类

| 范式          | 说明                 | 适用模块               | 移动端形态                    | 桌面端形态          |
| ----------- | ------------------ | ------------------ | ------------------------ | -------------- |
| 列表+Sheet 详情 | 标准列表，点击进入 Sheet 详情 | 闪念池、选题库、脚本框架库、制作发布 | 单列卡片 + Sheet side=bottom | 列表+内嵌详情面板      |
| 全屏编辑器+浮层    | 沉浸式写作，按需呼出资料       | 内容生产流程             | 全屏写作区 + Sheet 浮层         | 可分栏：资料面板+写作区   |
| 时间线         | 按时间顺序展示推演过程        | 灵感                 | 纵向时间轴 + 底部结论             | 同移动端           |
| 聊天气泡        | 对话式问答              | 问答                 | 气泡列表 + 底部输入栏             | 同移动端           |
| 多视图切换       | 看板/日历/甘特三种视图       | 今日待办               | Tabs 切换 + 各视图            | 同上，更宽布局        |
| 维度 Tabs+列表  | 多维度拆解              | 对标拆解               | 横向 Tabs + 列表行 + 进度       | 同上，更宽布局        |
| KPI+图表      | 数据看板               | 数据追踪               | KPI 卡片 + 图表纵向排列          | KPI 卡片行 + 多列图表 |
| 结构化文档       | 模板化记录              | 复盘记录               | 分区表单 + 数据引用              | 同上，更宽布局        |
| 卡片网格+搜索     | 知识库                | 大脑知识库              | 单列卡片 + 搜索                | 多列网格 + 搜索      |

### 8.3 桌面 vs 移动端布局策略

| 原则     | 说明                                                                  |
| ------ | ------------------------------------------------------------------- |
| 不照搬分栏  | 移动端**禁止**使用 Web 的左右分栏（Resizable）布局                                  |
| 沉浸优先   | 移动端核心操作（写作、编辑）使用全屏 + Sheet 浮层，不拆分屏幕空间                               |
| 原生范式   | 移动端用 iOS 原生交互（Sheet/Alert/Action Sheet），桌面端用 Web 范式（Dialog/Popover） |
| 响应式断点  | < 1024px 移动端，>= 1024px 桌面端                                          |
| 数据一致   | 两端数据同步，布局可不同但功能一致                                                   |
| 写作场景例外 | 内容生产流程：移动端全屏写作 + Sheet 资料，桌面端可分栏但移动端绝不分栏                            |

> **关键约束**：苹果官方推荐——移动端沉浸式写作体验，需要参考资料时通过 Sheet 抽屉浮层按需呼出。不要把 Web 分栏布局直接移植到手机端。

#### 8.3.1 全局元素：用户头像与消息通知

> 全局入口合并为单个头像按钮，通知通过角标体现，遵循 iOS HIG「避免在导航栏堆砌按钮」原则。

**方案 A：头像合并通知角标（PageHeader 右侧仅 1-2 个元素）**

iOS HIG 原文：*"Avoid crowding a navigation bar with additional buttons."* — 导航栏右侧按钮不超过 2 个。通知不作为独立按钮，通过头像角标体现未读数，点击头像展开包含通知列表的 Sheet。

```
PageHeader 布局（方案 A）：
┌──────────────────────────────────────┐
│  页面标题                    [新建] (头像)│  ← 最多 2 个元素
│  描述文字                             │
└──────────────────────────────────────┘
                                       ↑
                           头像右上角红点/数字角标 = 未读通知
```

**用户头像（合并通知入口）**

| 规则      | 说明                                                | Tailwind                                                                                   |
| ------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 位置      | PageHeader 右上角，操作按钮最右侧                            | `actions` prop 内末尾                                                                         |
| 尺寸      | 32px 圆形头像                                         | `size-8 rounded-full`                                                                      |
| 触摸热区    | 44px（通过 padding 扩展）                               | `p-1.5`                                                                                    |
| 默认头像    | 无头像时显示首字符或默认图标                                    | `bg-secondary text-muted-foreground`                                                       |
| 通知角标-红点 | 有未读且未读数未知时显示，无数字                                  | `size-2 rounded-full bg-red-500 absolute -top-0.5 -right-0.5`                            |
| 通知角标-数字 | 未读数 1-99 显示数字，>= 99 显示 "99+"                      | `min-w-[16px] h-4 rounded-full bg-red-500 text-[10px] text-white absolute -top-1 -right-1` |
| 角标隐藏    | 无未读时不显示角标                                         | 隐藏角标元素                                                                                     |
| 点击行为    | 移动端弹出 Sheet side=bottom，桌面端弹出 Popover             | Sheet / Popover                                                                            |
| 面板结构    | 顶部通知区 + 用户信息区 + 设置/退出区，iOS 分组列表样式                 | `rounded-[18px] bg-secondary/15`                                                           |
| 面板-通知区  | 排在 Sheet 最上方，显示最近 3 条未读通知摘要，点击直达关联记录，底部「查看全部通知」入口 | 分组列表行                                                                                      |
| 面板-用户信息 | 用户名 + 邮箱 + 统计数据（待办数 / 生产数 / 发布数）                  | 分组列表行                                                                                      |
| 面板-设置入口 | 点击进入 /settings 页面                                 | 路由跳转                                                                                       |
| 面板-退出确认 | Alert 弹窗确认                                        | 自定义 Alert                                                                                  |
| 无通知时    | 角标隐藏，Sheet 通知区显示「暂无新通知」                           | 空状态行                                                                                       |

> **设计依据**：
>
> - iOS HIG：「Avoid crowding a navigation bar with additional buttons」— 导航栏按钮 ≤ 2 个
> - iOS 系统级通知 + App 图标角标本身就是「合并」模式
> - 微信、飞书等主流 App 均采用头像角标方案
> - 头像 Sheet 通知区排最高优先级，确保通知不被埋没

### 8.4 各模块视图布局

#### 8.4.1 今日待办 (/todo)

| 规则       | 说明                                |
| -------- | --------------------------------- |
| 布局范式     | 多视图切换（看板 / 日历 / 甘特）               |
| 顶部       | PageHeader + Tabs 三视图切换           |
| 看板视图     | 列分组（待办 / 进行中 / 已完成），移动端长按卡片进入拖拽态 → 拖到目标列；或点击卡片 → Sheet 选择目标列 |
| 日历视图     | 月视图，日期格内显示任务点，点击展开当日任务            |
| 甘特视图     | 移动端简化为纵向时间线 + 任务条（起止时间 + 状态色），不支持横向时间轴；桌面端完整甘特图 |
| 默认视图     | 看板视图                              |
| 详情       | Sheet side=bottom（移动端）/ 内嵌面板（桌面端） |
| 自动归档     | 23:59 完成任务自动归档，不可恢复               |
| **页面特色** | 三视图满足不同管理场景：看板看流程、日历看日程、甘特看进度     |
| 关联模块     | 任务可关联选题、对标、生产流程等其他模块的记录           |

#### 8.4.2 闪念池 (/flash-thought)

| 规则       | 说明                                  |
| -------- | ----------------------------------- |
| 布局范式     | 列表 + Sheet 详情                       |
| 列表形态     | 单列卡片，时间倒序排列                         |
| 快记入口     | Tab 栏右侧圆形按钮（60px），点击弹出快记 Sheet      |
| 快记 Sheet | 极简：一个 Textarea + 标签选择，保存即关闭，不超过 2 步 |
| 卡片信息     | 内容预览（2 行截断）+ 标签 + 时间                |
| 详情 Sheet | 全文内容 + 标签 + 创建时间 + 转化按钮（→ 选题库）      |
| **页面特色** | 极速记录：从点击快记按钮到开始输入不超过 1 步操作          |
| 转化动作     | 「转为选题」按钮，点击后带入闪念内容跳转选题库新建表单         |

#### 8.4.3 对标拆解 (/benchmark)

| 规则       | 说明                                                            |
| -------- | ------------------------------------------------------------- |
| 布局范式     | 维度 Tabs + 列表行 + 进度指示器                                         |
| 顶部       | PageHeader（标题 + [新建] (头像)），搜索通过下拉露出搜索栏                    |
| 维度切换     | 横向滚动 Tabs：人群 / 需求 / 内容 / 自身，4 个维度                             |
| 基本信息区    | 默认紧凑显示（标题 / 状态 / 负责人 / 创建时间），可展开更多（链接 / 渠道 / 脚本预览）            |
| 维度内容     | 每个维度下用列表行展示拆解步骤，行内输入                                          |
| 维度输入差异   | 人群：多选标签；需求：多选价值项 + 评分；内容：结构化输入；自身：条件展开（选「做得到」才显示追问字段）         |
| 底部进度     | 步骤进度点（5px 圆形）+ 进度文字 "已完成 X/4 个维度"                             |
| 详情       | Sheet side=bottom（移动端）/ Resizable 分栏（桌面端 >= 1024px）           |
| **页面特色** | 4 维度拆解模型 + 100 分制评分 + 进度追踪 + 维度专属输入设计                         |
| 评分系统     | 定位匹配（40 分）+ 需求强度（35 分）+ 竞争热度（25 分）；>= 75 立即做，>= 50 排期，< 50 储备 |
| 响应式      | < 1024px 全屏列表 + Sheet side=bottom；>= 1024px Resizable 拖拽分栏    |

#### 8.4.4 问答 (/qa-collect)

| 规则        | 说明                                                |
| --------- | ------------------------------------------------- |
| 布局范式      | 聊天气泡式布局                                           |
| 列表形态      | 问题列表（每条一个问题），点击进入问答详情                             |
| 详情页结构     | 顶部提问气泡（foreground 背景）+ 下方多个回答气泡（secondary 背景，左对齐） |
| 底部输入栏     | 固定底部，磨砂毛玻璃，文本输入 + 提交按钮                            |
| 气泡样式      | 圆角 18px，最大宽度 75% 屏宽，内边距 12px                      |
| 提问气泡      | 右对齐，`bg-foreground text-background`              |
| 回答气泡      | 左对齐，`bg-secondary text-foreground`，带时间戳           |
| 桌面端       | 同移动端气泡布局，最大宽度 600px 居中                            |
| **页面特色**  | 聊天气泡式一问多答，符合人的阅读直觉，贴合 iOS 原生消息应用设计语言              |
| Sheet 内布局 | 移动端详情用 Sheet side=bottom，内部保持气泡布局                 |

#### 8.4.5 灵感 (/inspiration)

| 规则        | 说明                                                         |
| --------- | ---------------------------------------------------------- |
| 布局范式      | 时间线布局                                                      |
| 列表形态      | 灵感卡片列表（每条一个灵感），点击进入灵感详情                                    |
| 详情页结构     | 纵向时间轴 + 逐条思考推演记录 + 底部固定最终结论                                |
| 时间轴       | 左侧竖线 + 时间节点圆点，右侧为思考内容                                      |
| 时间节点      | 圆点 10px，已完成为 foreground，未完成为 muted-foreground/30           |
| 思考记录      | 每条记录：时间戳 + 文字内容，卡片式展示                                      |
| 最终结论      | 底部固定区域，与思考过程视觉分层：结论区有独立背景 `bg-secondary/20 rounded-[18px]` |
| 转化动作      | 结论区域有「转为选题」按钮，一键带入灵感内容跳转选题库                                |
| 桌面端       | 同移动端时间线，最大宽度 720px 居中                                      |
| **页面特色**  | 时间线做视觉分层：上方推演过程 + 下方沉淀结论，体现「思考→结论」的认知路径                    |
| Sheet 内布局 | 移动端详情用 Sheet side=bottom，内部保持时间线布局                         |

#### 8.4.6 选题库 (/topic-library)

| 规则       | 说明                                                           |
| -------- | ------------------------------------------------------------ |
| 布局范式     | 列表 + Sheet 详情                                                |
| 列表形态     | 单列卡片，按评分或时间排序                                                |
| 卡片信息     | 标题 + 分数徽章 + 优先级标签 + 来源标签（灵感/闪念/对标拆解/手动）                      |
| 分数徽章     | 100 分制，分数色阶：>= 75 品牌色、>= 50 foreground、< 50 muted-foreground |
| 详情 Sheet | 完整选题信息 + 评分表单（定位匹配 40 + 需求强度 35 + 竞争热度 25）                   |
| 评分表单     | 滑块或数字输入，实时计算总分，分数变化时徽章颜色联动                                   |
| 新建表单     | Sheet side=bottom，支持从闪念/灵感/对标拆解带入内容                        |
| **页面特色** | 100 分制评分系统 + 优先级三档（立即做/排期/储备）+ 来源追溯                          |
| 转化动作     | 「开始生产」按钮，带入选题跳转内容生产流程                                        |

#### 8.4.7 脚本框架库 (/script-template)

| 规则       | 说明                                 |
| -------- | ---------------------------------- |
| 布局范式     | 列表 + Sheet 详情                      |
| 列表形态     | 单列卡片，每个框架一个卡片                      |
| 卡片信息     | 框架名称 + 结构预览（前 3 个段落摘要）+ 使用次数       |
| 详情 Sheet | 完整框架结构，分区展开/折叠                     |
| 框架结构     | 分段式：开头 / 主体（多个子段）/ 结尾，每段有标题 + 内容模板 |
| 折叠交互     | 每段可独立展开/折叠，使用 Collapsible 组件       |
| **页面特色** | 可复用的脚本结构模板，分段折叠预览，一键引用到内容生产流程      |
| 转化动作     | 「引用到生产」按钮，带入框架结构跳转内容生产流程           |

#### 8.4.8 内容生产流程 (/produce-flow)

> **本项目核心模块，重中之重。** 详见 8.5 专项规范。

#### 8.4.9 制作发布 (/publish)

| 规则       | 说明                                             |
| -------- | ---------------------------------------------- |
| 布局范式     | 列表 + 表单 Sheet                                  |
| 列表形态     | 单列卡片，按发布时间倒序                                   |
| 卡片信息     | 视频标题 + 发布状态（已发布/待发布/草稿）+ 发布平台 + 发布时间           |
| 详情/表单    | Sheet side=bottom：标题 + 描述 + 话题标签 + 视频链接 + 平台选择 |
| 链接预览     | 粘贴视频链接后自动抓取缩略图和标题预览                            |
| 状态追踪     | 未发布 → 已发布，状态切换通过行内操作                           |
| **页面特色** | 发布元信息记录 + 视频链接预览 + 多平台支持                       |
| 数据来源     | 从内容生产流程完成的作品自动带入基础信息                           |

#### 8.4.10 数据追踪 (/dashboard)

| 规则       | 说明                                     |
| -------- | -------------------------------------- |
| 布局范式     | KPI 卡片 + 图表                            |
| KPI 卡片   | 左侧：图标（muted 色）+ 标题 + 趋势文字；右侧：大数字（视觉焦点） |
| 数字动画     | 直接显示终值，加载时淡入 200ms（iOS 原生，不做 count-up） |
| 图表       | 趋势曲线（播放量/点赞/评论/收藏），数据点默认隐藏，tap 或长按显示数据点 + 竖虚线游标 |
| 详情页      | 标题为视频标题（非通用"数据追踪"），KPI + 图表 + 明细表      |
| 图表排列     | 移动端纵向排列，桌面端 2 列网格                      |
| **页面特色** | 大数字视觉焦点 + 趋势图表 + 日期范围筛选 + 视频维度下钻       |
| 数据来源     | 从制作发布模块同步已发布视频的数据                      |

#### 8.4.11 复盘记录 (/review)

| 规则       | 说明                                |
| -------- | --------------------------------- |
| 布局范式     | 结构化文档                             |
| 列表形态     | 单列卡片，按复盘时间倒序                      |
| 复盘模板     | 分区结构：整体回顾 / 数据复盘 / 流程改进 / 行动计划    |
| 整体回顾     | 本周期工作总结，文字描述                      |
| 数据复盘     | 引用数据追踪模块的 KPI 数据，对比目标值 vs 实际值     |
| 流程改进     | 引用内容生产流程的效率数据，识别瓶颈                |
| 行动计划     | 下一步行动项，可转化为今日待办任务                 |
| 详情       | Sheet side=bottom（移动端）/ 内嵌面板（桌面端） |
| **页面特色** | 模板化复盘 + 跨模块数据引用 + 行动项可转化为待办任务     |
| 数据引用     | 自动拉取数据追踪和内容生产的数据，支持手动补充           |

#### 8.4.12 大脑知识库 (/knowledge-base)

| 规则       | 说明                                         |
| -------- | ------------------------------------------ |
| 布局范式     | 卡片网格 + 搜索                                  |
| 列表形态     | 移动端单列卡片，桌面端多列网格（2-3 列）                     |
| 搜索       | 全文搜索，sticky 顶部搜索栏，实时过滤（防抖 300ms）           |
| 分类标签     | 顶部水平滚动标签栏：全部 / 选题 / 脚本 / 生产 / 发布 / 数据 / 复盘 |
| 卡片信息     | 知识标题 + 来源模块标签 + 摘要（2 行截断）+ 时间              |
| 详情       | Sheet side=bottom（移动端）/ 内嵌面板（桌面端）          |
| 数据同步     | 所有模块的数据自动同步到知识库归档                          |
| **页面特色** | 全局知识中枢 + 全文搜索 + 分类标签 + 跨模块数据聚合             |
| 智能推荐     | 后续可加：根据当前工作推荐相关知识                          |

#### 8.4.13 消息通知 (/notification)

| 规则       | 说明                                                    |
| -------- | ----------------------------------------------------- |
| 入口路径     | 通过头像 Sheet →「查看全部通知」进入；头像角标显示未读数                        |
| 布局范式     | 列表 + Sheet 详情                                         |
| 列表形态     | 单列列表行，按时间倒序，未读在上                                      |
| 列表行      | 左侧图标（通知类型）+ 标题 + 摘要 + 时间，44px 高                       |
| 未读标记     | 行左侧 8px 蓝色圆点                                          |
| 已读态      | `opacity-60`                                          |
| 通知类型     | 任务提醒 / 数据更新 / 工作流通知 / 系统消息                            |
| 类型图标     | 任务（CheckSquare）/ 数据（BarChart）/ 流程（Workflow）/ 系统（Info） |
| 点击行为     | 标记为已读 + 跳转到关联模块对应记录                                   |
| 批量操作     | 顶部「全部已读」按钮                                            |
| 详情       | Sheet side=bottom（移动端）/ 内嵌面板（桌面端）                     |
| 空状态      | "暂无通知消息"                                              |
| **页面特色** | 跨模块通知聚合中心 + 未读优先排序 + 点击直达关联记录                         |
| 通知来源     | 各模块通过统一 `sendNotification` 函数发送                       |

```
┌──────────────────────────┐
│ ← 消息通知        [全部已读] │  ← PageHeader
├──────────────────────────┤
│ • [☑] 任务提醒              │  ← 未读（左侧蓝点）
│   选题「xxx」已添加到待办       │
│   10 分钟前                 │
├──────────────────────────┤
│ • [📊] 数据更新              │  ← 未读
│   视频「xxx」播放量突破 1000    │
│   1 小时前                  │
├──────────────────────────┤
│   [⚙] 工作流通知              │  ← 已读（opacity-60）
│   生产流程「xxx」已进入素材阶段  │
│   3 小时前                  │
├──────────────────────────┤
│   [ℹ] 系统消息              │  ← 已读
│   欢迎使用内容生产系统         │
│   昨天                      │
└──────────────────────────┘
```

### 8.5 核心模块：内容生产流程布局

> **本项目最核心的模块——写文案的地方。** 移动端采用苹果官方推荐的沉浸式写作范式：全屏写作区 + 按需 Sheet 浮层查看资料。

#### 8.5.1 页面结构

```
┌──────────────────────────┐
│ ← 返回    生产标题    ⋯ 更多 │  ← 顶部导航栏（磨砂毛玻璃）
├──────────────────────────┤
│ ● 选题  ● 框架  ○ 素材  ○ 文案 │  ← 阶段进度指示器
├──────────────────────────┤
│                          │
│                          │
│      全屏写作区域          │  ← Textarea，自适应高度
│      （沉浸式）            │
│                          │
│                          │
│                          │
├──────────────────────────┤
│ [资料] [大纲] [历史]       │  ← 底部工具栏（磨砂毛玻璃）
└──────────────────────────┘

→ 点击「资料」呼出 Sheet:
┌──────────────────────────┐
│     ━━━ (拖拽手柄)        │
│  当前选题: xxx             │
│  引用框架: xxx             │
│  素材列表: ...             │
│                          │
│  (可下拉关闭)              │
└──────────────────────────┘
```

#### 8.5.2 阶段推进

| 阶段 | 说明            | 前置条件     |
| -- | ------------- | -------- |
| 选题 | 选择/确认选题库中的选题  | 必须关联一个选题 |
| 框架 | 选择/确认脚本框架库的框架 | 必须关联一个框架 |
| 素材 | 整理素材、补充信息     | 选题和框架已确认 |
| 文案 | 全屏写作区写文案      | 素材阶段完成   |

> **规则**：阶段必须按顺序推进，不可跳过。即兴模式也必须完成选题和框架选择后才进入素材阶段。已完成的任务可查看任意阶段内容（只读模式）。活跃任务可回退上一阶段。

#### 8.5.3 写作区域规范

| 规则       | 说明                      | Tailwind / 实现                            |
| -------- | ----------------------- | ---------------------------------------- |
| 全屏       | 占满除导航栏和工具栏外的全部空间        | `flex-1 overflow-y-auto`                 |
| 内边距      | 水平 20px                 | `px-5`                                   |
| 字号       | 正文 17px regular         | `text-[17px] font-normal leading-[1.29]` |
| 标题字号     | 22px bold（段内标题）         | `text-[22px] font-bold`                  |
| Textarea | 自适应高度，无边框，透明背景          | `bg-transparent border-0 resize-none`    |
| 行高       | 1.29（iOS Body 标准）       | `leading-[1.29]`                         |
| 字数统计     | 右下角，实时更新                | `text-xs text-muted-foreground`          |
| 自动保存     | 每次输入变化时保存到 localStorage | 见 5.13 自动保存                              |
| 草稿恢复     | 重新打开时恢复未保存草稿            | localStorage                             |
| 键盘适配     | 键盘弹出时写作区不被遮挡            | `viewport height` 动态调整                   |

#### 8.5.4 资料浮层（Sheet 抽屉）

| 规则           | 说明                               |
| ------------ | -------------------------------- |
| 弹出方式         | Sheet side=bottom                |
| 触发           | 底部工具栏「资料」按钮                      |
| 内容           | 当前选题摘要 + 引用框架结构 + 素材列表           |
| 选题摘要         | 标题 + 评分 + 来源                     |
| 框架结构         | 分段折叠展示（Collapsible）              |
| 素材列表         | 可添加/删除素材项                        |
| 最大高度         | `max-h-[70vh]`（不遮挡全部写作区，保持上下文可见） |
| 下拉关闭         | 支持拖拽关闭                           |
| initialFocus | false                            |

#### 8.5.5 底部工具栏

| 规则   | 说明                 | Tailwind                            |
| ---- | ------------------ | ----------------------------------- |
| 定位   | 固定底部，flex-shrink-0 | `flex-shrink-0`                     |
| 背景   | 磨砂毛玻璃              | `bg-background/80 backdrop-blur-xl` |
| 顶部分隔 | 50% 透明度细线          | `border-t border-border/50`         |
| 按钮   | 药丸形文字按钮，44px 高     | `h-11 rounded-full`                 |
| 按钮内容 | 资料 / 大纲 / 历史       | <br />                              |
| 安全区  | 底部 Home 指示条        | `pb-[env(safe-area-inset-bottom)]`  |

#### 8.5.6 桌面端布局

| 规则    | 说明                             |
| ----- | ------------------------------ |
| 布局    | 可选分栏：左侧资料面板 + 右侧写作区（Resizable） |
| 资料面板  | 固定显示选题/框架/素材，可折叠               |
| 写作区   | 占据右侧主要空间                       |
| 阶段指示器 | 顶部水平进度条                        |
| 工具栏   | 顶部导航栏右侧，非底部                    |

> **移动端绝不使用分栏**。移动端写作区全屏，资料通过 Sheet 按需呼出。

### 8.6 模块间流转规范

#### 8.6.1 导航流转图

```
闪念池 ──「转为选题」──→ 选题库
灵感   ──「转为选题」──→ 选题库
对标拆解 ──「转为选题」──→ 选题库
                        ↓ 「开始生产」
选题库 ──「引用选题」──→ 内容生产流程 ←──「引用框架」── 脚本框架库
                              ↓ 「完成生产」
                         制作发布
                              ↓ 「发布完成」
                         数据追踪
                              ↓ 「复盘」
                         复盘记录 ──「行动项转待办」──→ 今日待办
                              ↓ 「归档」
                         大脑知识库（全模块数据同步）

今日待办：横切模块，任意模块均可创建关联任务
```

#### 8.6.2 转化动作规范

| 来源模块   | 转化动作   | 目标模块   | 说明               |
| ------ | ------ | ------ | ---------------- |
| 闪念池    | 转为选题   | 选题库    | 带入闪念内容，预填新建表单    |
| 灵感     | 转为选题   | 选题库    | 带入灵感结论，预填新建表单    |
| 对标拆解   | 转为选题   | 选题库    | 带入对标拆解结果，预填新建表单  |
| 选题库    | 开始生产   | 内容生产流程 | 带入选题信息，自动关联到生产任务 |
| 脚本框架库  | 引用到生产  | 内容生产流程 | 带入框架结构，填充到框架阶段   |
| 内容生产流程 | 发布     | 制作发布   | 带入作品基础信息，预填发布表单  |
| 制作发布   | 查看数据   | 数据追踪   | 跳转到对应视频的数据详情     |
| 数据追踪   | 复盘     | 复盘记录   | 带入视频数据，预填复盘模板    |
| 复盘记录   | 行动项转待办 | 今日待办   | 将行动计划转化为待办任务     |
| 全模块    | 归档     | 大脑知识库  | 数据自动同步，无需手动操作    |

#### 8.6.3 转化交互规范

| 规则     | 说明                      | Tailwind / 实现                  |
| ------ | ----------------------- | ------------------------------ |
| 转化按钮位置 | 详情页底部操作区 或 卡片右滑操作       | 底部工具栏 / Swipe Action           |
| 按钮样式   | 主操作按钮，药丸形               | `h-11 rounded-full bg-primary` |
| 带入数据   | 自动预填目标表单的相关字段           | 数据透传                           |
| 跳转方式   | 跳转后自动打开目标模块的新建/编辑 Sheet | 路由 + 状态                        |
| 确认提示   | 重要转化（如发布）需 Alert 确认     | Alert 弹窗                       |
| 返回     | 转化后可返回来源模块              | 路由返回                           |
| 关联记录   | 转化后在目标模块记录来源信息          | 来源字段                           |

#### 8.6.4 数据同步规范

| 规则    | 说明                            |
| ----- | ----------------------------- |
| 同步方向  | 各模块 → 大脑知识库（单向归档）             |
| 同步时机  | 数据创建/更新时自动同步                  |
| 同步内容  | 标题 + 摘要 + 来源模块 + 创建时间 + 关联 ID |
| 知识库展示 | 按来源模块分类标签，支持全文搜索              |
| 手动归档  | 复盘记录可手动归档到知识库                 |
| 数据一致性 | 知识库数据为快照，源模块修改后知识库可选更新        |

***

## 附录：技术栈约束

- 框架：React 19 + Next.js 14 + TypeScript
- 样式：Tailwind CSS + shadcn/ui（Base-UI 底层 Rhea 预设）
- 组件库：shadcn/ui，不自定义全局组件，用现有组件适配
- 存储：Dexie.js / IndexedDB
- 桌面：Tauri 2（后续）
- 部署：Vercel（后续）
- Sheet 下拉关闭：vaul 或自定义手势库（待引入）
- Toast：sonner
- 图标：lucide-react

***

## 附录：验收检查清单

每个移动端组件/页面开发完成后，必须逐项检查以下清单：

### A. 布局检查

- [ ] 使用 `useIsDesktop()` Hook 判断移动端（禁止自行实现）
- [ ] PageHeader 顶栏 sticky + 磨砂毛玻璃
- [ ] 内容区底部留白 `pb-[calc(3.5rem+env(safe-area-inset-bottom))]`
- [ ] 顶部安全区占位条 `h-[env(safe-area-inset-top)]`
- [ ] viewport 禁止缩放 `maximumScale: 1, userScalable: false`
- [x] PageHeader 标题统一使用 Title 1（28px bold），不使用 Large Title 滚动折叠
- [ ] Settings 页面使用分组列表 + 行内控件模式

### B. 组件检查

- [ ] 移动端弹层使用 Sheet side=bottom（非 Dialog）
- [ ] SheetContent 设置 `initialFocus={false}`
- [ ] Sheet 顶部圆角 18px
- [ ] Sheet 底部安全区占位
- [ ] 所有 Sheet 内 Input/Textarea 禁止 autoFocus
- [ ] 只读模式渲染纯文本元素
- [ ] 禁止使用浏览器 confirm()/alert()，用自定义 Alert
- [ ] DropdownMenu 移动端转换为 Sheet side=bottom
- [ ] Switch ON 态使用 iOS Green
- [ ] 日期/时间选择使用 Picker（滚轮），不用原生 Select
- [ ] 列表行支持 Swipe Actions（左滑/右滑操作）
- [ ] 多选模式：长按进入，勾选圆圈 + 底部操作栏
- [ ] 分享操作使用 Share Sheet
- [ ] 图片加载有占位灰底 + 淡入动画
- [ ] 通知红点/角标位置和尺寸正确

### C. 样式检查

- [ ] 卡片圆角 18px
- [ ] 卡片内边距 18px
- [ ] 分区标题 13px 大写 `text-[13px] uppercase tracking-[0.06em]`
- [ ] 按钮圆角 `rounded-full`（药丸形）
- [ ] 选中态使用 foreground，不使用品牌色
- [ ] 状态圆点使用语义色（amber/emerald/indigo）
- [ ] 点击反馈透明度统一（同类元素）
- [ ] 磨砂毛玻璃（所有 sticky/fixed 顶栏底栏）
- [ ] 数据展示使用 `tabular-nums`（防止数字跳动）
- [ ] 文本选择色 `::selection` 使用 `bg-foreground/15`
- [ ] 禁止常规元素使用渐变（仅空状态和品牌标识区域）
- [ ] 图标使用 lucide-react，尺寸和线宽符合规范

### D. 触摸检查

- [ ] 所有可点击元素 ≥ 44px × 44px
- [ ] 图标按钮 `size-11 lg:size-8`
- [ ] 输入框/搜索框 `h-11 lg:h-8`
- [ ] 按钮按下 `active:opacity-60`（iOS highlighted 态）
- [ ] 列表项点击 `active:bg-muted/50`
- [ ] 表单输入框设置正确 `inputMode`
- [ ] 有长度限制的输入框显示字符计数器
- [ ] 表单校验时机为 onBlur + onSubmit（禁止 onChange 全量校验）

### E. 动画检查

- [ ] Sheet 弹出/关闭 300ms `cubic-bezier(0.16,1,0.3,1)`
- [ ] 内容切换交叉淡入淡出 200ms
- [ ] Tab 滑块 300ms `cubic-bezier(0.34,1.56,0.64,1)`
- [ ] 骨架屏 shimmer 动画 1.5s linear infinite
- [ ] 卡片 hover（桌面端）`-translate-y-0.5 + shadow-md` 200ms
- [ ] KPI/数据指标直接显示终值 + 淡入 200ms（不做 count-up）
- [ ] 搜索防抖 300ms + AbortController 取消请求

### F. 无障碍检查

- [ ] 图标按钮有 `aria-label`
- [ ] 文字对比度 >= 4.5:1
- [ ] 焦点可见 `focus-visible:ring`
- [ ] 支持 `prefers-reduced-motion`
- [ ] 语义化 HTML 标签

### G. iOS 原生模式检查

- [x] PageHeader 标题使用 Title 1（28px bold），不使用 Large Title
- [ ] Sticky Section Headers 吸顶 + 磨砂毛玻璃
- [ ] Swipe Actions 手势不与垂直滚动冲突
- [ ] Picker 滚轮惯性滚动 + 吸附
- [ ] 多选模式进入/退出流程完整
- [ ] Share Sheet 分享目标区 + 操作列表分离
- [ ] 图片全屏预览支持双指缩放和下滑关闭
- [ ] 离线状态指示器显示/隐藏正确
- [ ] 引导页仅在首次启动显示（localStorage 标记）

