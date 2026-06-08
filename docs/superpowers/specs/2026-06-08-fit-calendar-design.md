# FitCalendar — 健身日历 Android App 设计规格

> **日期：** 2026-06-08  
> **技术栈：** Kotlin + Jetpack Compose + Room + Hilt  
> **API：** DeepSeek Chat Completions API  
> **平台：** Android 原生（minSdk 26, targetSdk 34）

---

## 一、概述

FitCalendar 是一款健身日程管理应用。用户通过输入自然语言提示词调用 DeepSeek API 自动生成结构化的多分化健身计划，以卡片和课程表两种视图呈现，并可追踪每次训练的实际重量。

### 核心三功能

1. **输入/生成**：保存 DeepSeek API Token，输入提示词或自由描述生成健身日程
2. **表格显示**：日视图（卡片）和周视图（课程表）
3. **重量追踪**：在日视图编辑最后一次训练重量，按动作+日期保存历史

---

## 二、技术架构

| 层 | 选型 | 职责 |
|---|---|---|
| UI | Jetpack Compose | 声明式 UI，卡片/表格渲染 |
| 状态管理 | MVVM + ViewModel | 管理 UI 状态，暴露 Flow |
| 数据层 | Repository | 统一本地存储和远程 API |
| 本地存储 | Room（计划+记录）+ DataStore（Token） | 结构化持久化 |
| 网络 | OkHttp + Kotlinx Serialization | DeepSeek API 调用 |
| DI | Hilt | 依赖注入 |
| 导航 | Navigation Compose + BottomNavigation | 三 Tab 导航 |

### 项目结构

```
app/src/main/java/com/fitcalendar/
├── di/                    # Hilt Module
├── data/
│   ├── local/             # Room DAO, DataStore
│   ├── remote/            # DeepSeekApiService
│   ├── model/             # Entity, DTO, 映射
│   └── repository/        # PlanRepository, TrainingRepository
├── domain/                # UseCase（可选，简单场景跳过）
├── ui/
│   ├── navigation/        # NavHost, BottomNavBar
│   ├── today/             # Tab 1 - 日视图
│   ├── week/              # Tab 2 - 周视图
│   └── plan/              # Tab 3 - 计划/生成
└── util/                  # 工具类
```

---

## 三、数据模型

### Room Entity

```kotlin
@Entity
data class Plan(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val isActive: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(foreignKeys = [ForeignKey(Plan::class, parentColumns = ["id"], childColumns = ["planId"], onDelete = CASCADE)])
data class PlanDay(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val planId: Long,
    val dayIndex: Int,      // 0-based，一周内第几天
    val label: String       // "Day 1 - 胸+三头"
)

@Entity(foreignKeys = [ForeignKey(PlanDay::class, parentColumns = ["id"], childColumns = ["planDayId"], onDelete = CASCADE)])
data class Exercise(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val planDayId: Long,
    val name: String,
    val sets: Int,
    val reps: String,           // "8-12" 或 "12,10,8" 递减
    val restSeconds: Int,
    val muscleGroup: String,
    val instructions: String,   // 动作要点
    val sortOrder: Int
)

@Entity
data class TrainingRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val exerciseName: String,
    val date: String,           // "2026-06-08"
    val weight: Double,         // kg
    val repsDone: Int,
    val notes: String = ""
)
```

### DataStore

- `api_token: String` — DeepSeek API Token，加密存储

### DeepSeek API 合约

- **请求：** `POST https://api.deepseek.com/chat/completions`
- **System Prompt：** 固定指令要求输出指定 JSON Schema
- **Response JSON Schema：**
```json
{
  "planName": "五分化增肌",
  "days": [
    {
      "label": "Day 1 - 胸+三头",
      "exercises": [
        {
          "name": "杠铃卧推",
          "sets": 4,
          "reps": "8-12",
          "restSeconds": 90,
          "muscleGroup": "胸",
          "instructions": "仰卧于平板凳..."
        }
      ]
    }
  ]
}
```

---

## 四、页面设计

### Tab 1 — 今日（日视图）

**布局：**
```
┌──────────────────────────────────┐
│  < 2026-06-08 周一  Day 1-胸+三头  >  ← 左右箭头切换日
├──────────────────────────────────┤
│  ┌──────────────────────────────┐│
│  │ 🏋️ 杠铃卧推         胸      ││
│  │ 4组 × 8-12次  休息 90s      ││
│  │                    上次: 60kg││ ← 点击编辑
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ 🏋️ 上斜哑铃卧推      胸      ││
│  │ ...                          ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ 🏋️ 绳索下压        三头     ││
│  │ ...                          ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

- 当天无训练 → 显示「今日休息 💤」
- 点击卡片 → BottomSheet 展开动作要点 + 训练记录编辑
- 点击上次重量 → 弹出编辑弹窗（输入 kg），保存后自动创建/更新 TrainingRecord
- 每个动作卡片右上角有勾选框，勾选表示完成该动作，同时以当天日期和当前重量值自动存储一条 TrainingRecord

### Tab 2 — 周视图（课程表）

**布局：**
```
┌──────────────────────────────────┐
│  < 第23周  6/8 - 6/14  >         ← 左右箭头切换周
├──────┬─────────┬────────┬────────┤
│ 日期  │  动作1   │ 动作2   │ 动作3  │
├──────┼─────────┼────────┼────────┤
│ Mon  │ 杠铃卧推 │上斜哑铃 │绳索夹胸 │
│ Day1 │ 4×8-12  │ 4×10   │ 3×12   │
├──────┼─────────┼────────┼────────┤
│ Tue  │ 引体向上 │杠铃划船 │ 面拉   │
│ Day2 │ 4×8     │ 4×10   │ 3×15   │
├──────┼─────────┼────────┼────────┤
│ Wed  │      休息日 🟢            │
└──────┴──────────────────────────┘
```

- 点击某天 → 跳转到对应日期日视图
- 顶部显示当前计划名

### Tab 3 — 计划（生成&设置）

**布局（列表页）：**
```
┌──────────────────────────────────┐
│  当前计划: [五分化增肌    ▼]       ← 下拉切换已保存计划
├──────────────────────────────────┤
│  📡 API Token                    │
│  ┌──────────────────────────────┐│
│  │ ●●●●●●●●●●●●         [保存]  ││
│  └──────────────────────────────┘│
├──────────────────────────────────┤
│  ✍️ 生成新计划                    │
│  ┌──────────────────────────────┐│
│  │ 我想练五分化，每周五天...      ││  ← 提示词输入（多行）
│  │                              ││
│  └──────────────────────────────┘│
│  或                              │
│  ┌──────────────────────────────┐│
│  │ 周一练胸：卧推4组...           ││  ← 自由描述输入
│  │                              ││
│  └──────────────────────────────┘│
│          [⚡ 生成日程]             │
├──────────────────────────────────┤
│  已保存计划列表:                  │
│  · 五分化增肌 (当前)              │
│  · 三分化减脂                    │
│  · Push/Pull/Legs               │
└──────────────────────────────────┘
```
- 生成成功后弹出**预览对话框**，列出所有训练日标签和每天的动作数量，用户确认后写入 Room 并自动设为当前计划

### 状态处理

| 状态 | UI 表现 |
|---|---|
| 加载中 | 生成按钮变 Spinner，显示"DeepSeek 正在生成..." |
| API 错误 | Snackbar 显示错误信息（Token 无效、网络错误等） |
| JSON 解析失败 | 弹窗提示「AI 返回格式异常，请重试」并显示原始文本供手动调整 |
| 空状态 | 首次使用无计划 → 引导用户去 Tab 3 生成 |
| Token 未配置 | Tab 3 上 Token 输入框高亮，提示填写 |

---

## 五、交互流程

### 流程 A：首次使用
```
首次打开 App
  → Tab 3（计划页）
  → 输入 API Token → 保存
  → 输入提示词 → 点击生成
  → Loading → 预览弹窗（显示 PlanDay 列表）
  → 用户确认 → 保存到 Room → 自动切换到 Tab 1
```

### 流程 B：日常使用
```
打开 App → Tab 1 今日视图
  → 浏览今天动作卡片
  → 点击卡片查看要点
  → 练完编辑重量
  → 左滑到次日（或点日期箭头）
```

### 流程 C：切换/新建计划
```
Tab 3 → 下拉选择已有计划 → 设为当前 → Tab 1/2 刷新
       → 或输入新提示词 → 生成 → 保存
```

---

## 六、边界条件与错误处理

1. **DeepSeek 返回非 JSON 或格式不符** → 重试一次，再次失败则提示用户修改提示词或手动粘贴
2. **网络超时（>30s）** → 提示超时，允许重试
3. **API Token 余额不足** → 解析 DeepSeek 错误码，提示用户充值
4. **本地数据损坏** → Room 数据库迁移异常时回退方案：重建数据库，引导重新生成
5. **极端天数（如一天 20 个动作）** → 日视图卡片支持滚动，不截断
6. **没有训练记录时的重量显示** → 显示「暂无记录」而非空白
7. **同一天有多个 PlanDay？** → 不允许，切换计划后当天只有一个对应的 PlanDay

---

## 七、非功能需求

- 离线可用：已生成的计划本地存储，无网络也能查看
- Token 安全：DataStore 加密存储
- 响应速度：页面切换 < 200ms，卡片展开动画流畅
- 最低 Android 版本：8.0 (API 26)

---

## 八、不做什么（YAGNI）

- ❌ 不内置动作库（完全依赖 DeepSeek 生成）
- ❌ 不做联网同步/云存储（纯本地）
- ❌ 不做社交/分享功能
- ❌ 不做训练提醒/通知
- ❌ 不做体重/体脂/身体数据追踪
- ❌ 不做视频教程
- ❌ 不做导出/导入功能（第一版）
