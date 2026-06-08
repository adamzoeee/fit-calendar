# FitCalendar — AI 驱动的健身训练日历

用一句话描述你的训练目标，DeepSeek AI 自动生成结构化训练计划。每日打卡、记录重量，周视图一览训练节奏。

**Android 壳 + TypeScript 内核** — 在 Android Studio 里点 ▶ Run 就跑，但 UI 和逻辑全部用 TypeScript 写在 WebView 里，告别原生 bug。

---

## 截图（概念）

```
┌─ 今日 ──────────────────────────┐  ┌─ 周视图 ────────────────────────┐  ┌─ 计划 ──────────────────────────┐
│  ← 2026-06-10 周三 →            │  │  ← 第24周  2026-06-08 - 06-14 → │  │  当前计划                        │
│  Day 2 - 背部                   │  │                                  │  │  [ AI 生成计划 ▾ ]               │
│                                  │  │  ┌ 周一 ────────────────── › ┐  │  │  ─────────────────────────────── │
│  ┌ 杠铃划船 ──────── ☑ ──────┐  │  │  │ 8  胸 卧推 飞鸟 夹胸     › │  │  │  🔑 DeepSeek API Token  仅本地..│
│  │ 4组 × 10次  休息 90s       │  │  │  └──────────────────────────┘  │  │  │  [••••••••••••••] [保存]       │
│  │ 背阔肌             上次:60kg│  │  │  ┌ 周二 ────────────────── › ┐  │  │  ─────────────────────────────── │
│  └────────────────────────────┘  │  │  │ 9  背 划船 引体 硬拉      › │  │  │  ✍️ 生成新计划                    │
│  ┌ 引体向上 ──────── ☐ ──────┐  │  │  └──────────────────────────┘  │  │  │  [ 五分化，每天5个动作... ]       │
│  │ 4组 × 8-12次  休息 90s     │  │  │  ┌ 周三 ────────────────── › ┐  │  │  │                                  │
│  │ 背阔肌             上次:自重 │  │  │  │ 10 肩 推举 侧平举 飞鸟   › │  │  │  [ ⚡ 生成日程 ]                  │
│  └────────────────────────────┘  │  │  └──────────────────────────┘  │  │  ─────────────────────────────── │
│  ┌ 坐姿划船 ──────── ☐ ──────┐  │  │  ┌ 周四 ────────────────── › ┐  │  │  已保存计划                      │
│  │ 3组 × 12次  休息 60s       │  │  │  │ 11 腿 深蹲 腿举 腿弯举    › │  │  │  · AI 生成计划 (当前)            │
│  │ 中背              上次:45kg │  │  │  └──────────────────────────┘  │  │  │                                  │
│  └────────────────────────────┘  │  │  ┌ 周五 ────────────────── › ┐  │  │  │                                  │
│                                  │  │  │ 12 臂 弯举 臂屈伸 锤式    › │  │  │                                  │
│ [今日] [周视图] [计划]            │  │  └──────────────────────────┘  │  │  [今日] [周视图] [计划]            │
└──────────────────────────────────┘  │  ┌ 周六 ────────────────── › ┐  │  └──────────────────────────────────┘
                                       │  │ 13 🟢 休息              › │  │
                                       │  └──────────────────────────┘  │
                                       └──────────────────────────────────┘
```

---

## 架构

```
app/src/main/java/com/fitcalendar/   ← 仅 2 个 Kotlin 文件
├── FitCalendarApplication.kt       ← 空壳 Application
└── MainActivity.kt                 ← WebView 宿主 (WebViewAssetLoader)

app/src/main/web/                   ← 🔥 前端源码（只改这里）
├── src/
│   ├── pages/     TodayPage / WeekPage / PlanPage
│   ├── components/ ExerciseCard / ExerciseDetailSheet / BottomNav
│   ├── db/        Dexie.js 数据库 + DAO
│   ├── api/       DeepSeek API 调用
│   └── store/     Token 本地存储
├── package.json
├── tsconfig.json
└── vite.config.ts                  ← build 输出到 ../assets/

app/src/main/assets/                ← Vite 构建产物，自动打入 APK
```

| 层 | 技术 |
|----|------|
| **Android 壳** | Kotlin + WebView + WebViewAssetLoader |
| **UI 框架** | Preact (3KB React 兼容) |
| **构建工具** | Vite |
| **本地存储** | Dexie.js (IndexedDB) |
| **API 调用** | fetch() → DeepSeek Chat API |
| **样式** | 纯 CSS 自定义属性，深色主题 |

---

## 快速开始

### 前置条件

- **Android Studio** Hedgehog (2023.1) 或更新
- **Android SDK** 34
- **Node.js** 18+ (仅前端开发时需要；APK 已预打包构建产物)

### 构建 & 运行

```bash
# 1. 构建前端（如已修改 TypeScript 代码）
cd app/src/main/web
npm install
npm run build          # 产物输出到 ../assets/

# 2. Android Studio 打开项目根目录，点 ▶ Run
#    或命令行：
./gradlew assembleDebug
```

Gradle 会在每次 `assembleDebug` 前自动跑 `npm run build`（如果 Node.js 可用）。

### 前端开发（热更新）

```bash
cd app/src/main/web
npm run dev            # 启动 Vite dev server，浏览器调试 UI
```

开发完成后 `npm run build` 再跑 APK。

---

## 功能

### 今日训练
- 日期前后切换，自动匹配当前训练计划
- 每个动作卡片显示：组数×次数、休息时间、目标肌肉群
- 点击卡片弹出底部动作详情（含 AI 生成的要点说明）
- 保存/更新训练重量
- 勾选完成状态
- 休息日自动显示提示

### 周视图
- 周一到周日卡片式展示，左右箭头切换周
- 彩色肌肉群标签（胸红、背橙、肩绿、腿蓝、臂紫、腹青、有氧橙红、全身黄）
- 休息日绿色标识
- 点击某天跳转到今日训练页面

### 计划管理
- DeepSeek API Token 配置（仅存本地，不上传）
- 用自然语言描述想要的训练计划 → AI 生成结构化日程
- 生成后预览确认，可取消或保存
- 多计划切换（下拉选择，自动激活）
- 所有数据存 IndexedDB，离线可用

---

## 项目结构

```
fit-calendar/
├── app/
│   ├── build.gradle.kts          # Android 构建配置（依赖精简到 3 个）
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/fitcalendar/  # Kotlin 壳（2 文件）
│       ├── web/                   # TypeScript 前端源码
│       └── assets/                # Vite 构建产物（git 跟踪，免 Node.js 也能构建 APK）
├── build.gradle.kts               # 根构建配置
├── settings.gradle.kts
├── gradle/
└── docs/                          # 设计文档 & 计划
```

---

## 常见问题

**Q: 为什么不用 Compose / Room / Hilt？**
A: 被原生 bug 弄破防了。WebView 方案让 UI 和逻辑可以纯 TypeScript 开发，浏览器调试完原样跑在 APK 里，零原生摩擦。

**Q: 数据存在哪？**
A: IndexedDB（Dexie.js 封装），和 SQLite 同级持久化。卸载 App 会清除。

**Q: DeepSeek Token 安全吗？**
A: 仅存于设备本地 localStroage，直连 DeepSeek API，不经过任何中间服务器。

**Q: APK 多大？**
A: ~3 MB（含 Preact + Dexie + CSS）。

**Q: 怎么自己改前端？**
A: 改 `app/src/main/web/src/` 下的文件，`npm run build` 重新构建，再跑 APK。
