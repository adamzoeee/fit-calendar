# Plan Modify Feature — Design Spec

## Date
2026-06-08

## Status
Approved — ready for implementation plan

---

## Goal
Allow users to modify an existing fitness plan via AI, on top of the existing "generate new plan" flow.

## Page Layout (PlanPage) — New Order

```
1. 🔑 DeepSeek API Token          ← stays, moved to top
2. ✍️ 生成新计划                   ← upper section (unchanged functionality)
3. 当前已有计划                     ← lower section (was "已保存计划", now richer)
```

### Section 3: 当前已有计划 (Existing Plans)

Each plan card shows:
- Plan name + "(当前)" badge if active
- Quick summary: number of days, brief day labels (e.g. "胸/背/肩/腿/手臂")
- Two buttons: **[修改]** and **[删除]**

Clicking **[修改]** opens the bottom sheet.

### Bottom Sheet: Modify Plan

Triggers when user clicks **[修改]** on a plan.

**Content (before AI generation):**
- Sheet title: "✏️ 修改：<plan name>"
- Current plan structure summary (day labels + exercise counts)
- Textarea for modification description
- "⚡ 生成修改方案" button

**Content (after AI generation):**
- Same sheet, now showing preview of modified plan
- Day-by-day summary, highlighting changes
- Two buttons: **[取消]** / **[确认保存为新计划]**

**Save behavior:**
- Saves as NEW plan (name + "（修改版）")
- Old plan remains untouched
- New plan auto-activated

## Data Flow

```
User selects plan → clicks [修改]
       ↓
Bottom sheet opens
       ↓
Load full plan data (PlanDay[] + Exercise[]) from IndexedDB
       ↓
User enters modification description → clicks 生成
       ↓
generateSchedule(token, prompt, existingPlan) → DeepSeek API
       ↓
Show preview in sheet
       ↓
User confirms → save as new plan → close sheet → refresh list
```

## API Change

`generateSchedule()` gets a new optional 3rd parameter:
```ts
existingPlan?: { planName: string; days: { label: string; exercises: {...}[] }[] }
```

System prompt adjusted: when `existingPlan` is provided, tell AI this is a MODIFICATION, not a fresh generation.

## UI Components

| Component | Type | Notes |
|-----------|------|-------|
| Bottom sheet | CSS overlay + slide-up | Pure CSS, like existing dialog but from bottom |
| Plan card | New sub-component | Shows name, summary, [修改] [删除] buttons |
| Preview in sheet | Inline | Reuses dialog preview styling |

## Database

No schema changes. Existing DAOs are sufficient.

## Out of Scope
- Multi-turn chat with AI
- Manual editing of individual exercises
- Changes to Today/Week pages
