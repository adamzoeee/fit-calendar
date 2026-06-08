# FitCalendar 实现计划

> **面向 AI 代理的工作者：** 必需技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个 Kotlin + Jetpack Compose 健身日历 Android App，含三 Tab（日视图/周视图/计划生成），通过 DeepSeek API 生成结构化健身日程并支持重量追踪。

**架构：** MVVM + Repository 模式，Room 持久化 Plan/PlanDay/Exercise/TrainingRecord，DataStore 存 Token，OkHttp + Kotlinx Serialization 调 DeepSeek API，Hilt DI，Navigation Compose 三 Tab 导航。

**技术栈：** Kotlin, Jetpack Compose, Room, Hilt, DataStore, OkHttp, Kotlinx Serialization, Navigation Compose

**源规格：** `docs/superpowers/specs/2026-06-08-fit-calendar-design.md`

---

## 文件结构

```
app/
├── build.gradle.kts                          # App 模块构建（依赖声明）
├── src/main/
│   ├── AndroidManifest.xml                   # 权限（INTERNET）、Application 声明
│   └── java/com/fitcalendar/
│       ├── FitCalendarApplication.kt         # @HiltAndroidApp 入口
│       ├── MainActivity.kt                   # setContent { FitCalendarApp() }
│       ├── di/
│       │   └── AppModule.kt                  # Hilt @Module：提供 Room DB、DAO、DataStore、OkHttpClient
│       ├── data/
│       │   ├── local/
│       │   │   ├── entity/
│       │   │   │   ├── Plan.kt               # Room Entity: Plan
│       │   │   │   ├── PlanDay.kt            # Room Entity: PlanDay
│       │   │   │   ├── Exercise.kt           # Room Entity: Exercise
│       │   │   │   └── TrainingRecord.kt     # Room Entity: TrainingRecord
│       │   │   ├── dao/
│       │   │   │   ├── PlanDao.kt            # @Dao: Plan CRUD + isActive 切换
│       │   │   │   ├── PlanDayDao.kt         # @Dao: PlanDay by planId
│       │   │   │   ├── ExerciseDao.kt        # @Dao: Exercise by planDayId
│       │   │   │   └── TrainingRecordDao.kt  # @Dao: 按 exerciseName+date 查询/插入
│       │   │   ├── AppDatabase.kt            # @Database: 声明所有 Entity
│       │   │   └── TokenDataStore.kt         # DataStore<Preferences> 读写 api_token
│       │   ├── remote/
│       │   │   ├── DeepSeekModels.kt         # DTO: GenRequest / GenResponse / DayDto / ExerciseDto
│       │   │   └── DeepSeekApiService.kt     # OkHttp 封装：callDeepSeek(token, prompt)
│       │   └── repository/
│       │       ├── PlanRepository.kt         # 计划 CRUD + 切换激活 + 解析 AI 响应写入
│       │       └── TrainingRepository.kt     # 训练记录 CRUD + 获取最近记录
│       ├── ui/
│       │   ├── navigation/
│       │   │   ├── BottomNavBar.kt           # @Composable 底部三 Tab
│       │   │   ├── NavGraph.kt               # @Composable NavHost(3 route)
│       │   │   └── FitCalendarApp.kt         # @Composable Scaffold(bottomBar + NavGraph)
│       │   ├── today/
│       │   │   ├── TodayScreen.kt            # @Composable 日视图页面
│       │   │   ├── TodayViewModel.kt         # @HiltViewModel：日期状态 + 当天动作 + 训练记录
│       │   │   ├── ExerciseCard.kt           # @Composable 动作卡片
│       │   │   └── ExerciseDetailSheet.kt    # @Composable ModalBottomSheet：要点 + 重量编辑
│       │   ├── week/
│       │   │   ├── WeekScreen.kt             # @Composable 周课程表页面
│       │   │   └── WeekViewModel.kt          # @HiltViewModel：周偏移 + 7天 PlanDay
│       │   └── plan/
│       │       ├── PlanScreen.kt             # @Composable 计划/生成页面
│       │       ├── PlanViewModel.kt          # @HiltViewModel：生成状态 + Token 管理 + 计划列表
│       │       └── GeneratePreviewDialog.kt  # @Composable 生成预览确认弹窗
│       └── theme/
│           ├── Color.kt                      # MD3 颜色定义
│           ├── Type.kt                       # 字体排版
│           └── Theme.kt                      # FitCalendarTheme
├── build.gradle.kts                          # 根模块构建
├── settings.gradle.kts                       # 模块声明 + 仓库配置
└── gradle.properties                         # AndroidX / Compose 标记
```

---

### 任务 1：项目骨架搭建

**文件：**
- 创建：`build.gradle.kts`、`settings.gradle.kts`、`gradle.properties`、`app/build.gradle.kts`、`app/src/main/AndroidManifest.xml`

- [ ] **步骤 1：创建根 build.gradle.kts**

`build.gradle.kts`：
```kotlin
plugins {
    id("com.android.application") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.21" apply false
    id("com.google.dagger.hilt.android") version "2.50" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "1.9.21" apply false
}
```

- [ ] **步骤 2：创建 settings.gradle.kts**

`settings.gradle.kts`：
```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolution {
    @Suppress("UnstableApiUsage")
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "FitCalendar"
include(":app")
```

- [ ] **步骤 3：创建 gradle.properties**

`gradle.properties`：
```properties
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
org.gradle.jvmargs=-Xmx2g
```

- [ ] **步骤 4：创建 app/build.gradle.kts**

`app/build.gradle.kts`：
```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.dagger.hilt.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    kotlin("kapt")
}

android {
    namespace = "com.fitcalendar"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.fitcalendar"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }
    buildFeatures { compose = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.7" }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    // Compose BOM
    val composeBom = platform("androidx.compose:compose-bom:2024.01.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.6")

    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Hilt
    implementation("com.google.dagger:hilt-android:2.50")
    kapt("com.google.dagger:hilt-android-compiler:2.50")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")

    // Room
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // OkHttp + Serialization
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}

kapt {
    correctErrorTypes = true
}
```

- [ ] **步骤 5：创建 AndroidManifest.xml**

`app/src/main/AndroidManifest.xml`：
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:name=".FitCalendarApplication"
        android:allowBackup="true"
        android:label="FitCalendar"
        android:supportsRtl="true"
        android:theme="@style/Theme.FitCalendar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.FitCalendar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

- [ ] **步骤 6：验证项目结构**

运行：`tree E:/.PJs/fit-calendar`
预期：根目录下的 `build.gradle.kts`、`settings.gradle.kts`、`gradle.properties` 和 `app/` 子目录全部存在

- [ ] **步骤 7：Commit**

```bash
git -C E:/.PJs/fit-calendar add -A
git -C E:/.PJs/fit-calendar commit -m "chore: scaffold Android project with Gradle, Compose, Hilt, Room"
```

---

### 任务 2：Room Entity

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/data/local/entity/Plan.kt`
- 创建：`app/src/main/java/com/fitcalendar/data/local/entity/PlanDay.kt`
- 创建：`app/src/main/java/com/fitcalendar/data/local/entity/Exercise.kt`
- 创建：`app/src/main/java/com/fitcalendar/data/local/entity/TrainingRecord.kt`

- [ ] **步骤 1：创建 Plan.kt**

```kotlin
package com.fitcalendar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "plans")
data class Plan(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val isActive: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)
```

- [ ] **步骤 2：创建 PlanDay.kt**

```kotlin
package com.fitcalendar.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "plan_days",
    foreignKeys = [ForeignKey(
        entity = Plan::class,
        parentColumns = ["id"],
        childColumns = ["planId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("planId")]
)
data class PlanDay(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val planId: Long,
    val dayIndex: Int,
    val label: String
)
```

- [ ] **步骤 3：创建 Exercise.kt**

```kotlin
package com.fitcalendar.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "exercises",
    foreignKeys = [ForeignKey(
        entity = PlanDay::class,
        parentColumns = ["id"],
        childColumns = ["planDayId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("planDayId")]
)
data class Exercise(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val planDayId: Long,
    val name: String,
    val sets: Int,
    val reps: String,
    val restSeconds: Int,
    val muscleGroup: String,
    val instructions: String,
    val sortOrder: Int
)
```

- [ ] **步骤 4：创建 TrainingRecord.kt**

```kotlin
package com.fitcalendar.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "training_records")
data class TrainingRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val exerciseName: String,
    val date: String,
    val weight: Double,
    val repsDone: Int,
    val notes: String = ""
)
```

- [ ] **步骤 5：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/data/local/entity/
git -C E:/.PJs/fit-calendar commit -m "feat: add Room entities Plan, PlanDay, Exercise, TrainingRecord"
```

---

### 任务 3：Room DAO

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/data/local/dao/PlanDao.kt`
- 创建：`app/src/main/java/com/fitcalendar/data/local/dao/PlanDayDao.kt`
- 创建：`app/src/main/java/com/fitcalendar/data/local/dao/ExerciseDao.kt`
- 创建：`app/src/main/java/com/fitcalendar/data/local/dao/TrainingRecordDao.kt`

- [ ] **步骤 1：创建 PlanDao.kt**

```kotlin
package com.fitcalendar.data.local.dao

import androidx.room.*
import com.fitcalendar.data.local.entity.Plan
import kotlinx.coroutines.flow.Flow

@Dao
interface PlanDao {
    @Query("SELECT * FROM plans ORDER BY createdAt DESC")
    fun getAll(): Flow<List<Plan>>

    @Query("SELECT * FROM plans WHERE isActive = 1 LIMIT 1")
    fun getActive(): Flow<Plan?>

    @Query("SELECT * FROM plans WHERE id = :id")
    suspend fun getById(id: Long): Plan?

    @Insert
    suspend fun insert(plan: Plan): Long

    @Update
    suspend fun update(plan: Plan)

    @Delete
    suspend fun delete(plan: Plan)

    @Query("UPDATE plans SET isActive = 0")
    suspend fun deactivateAll()

    @Query("UPDATE plans SET isActive = 1 WHERE id = :id")
    suspend fun activate(id: Long)

    @Transaction
    suspend fun activateAndDeactivateOthers(id: Long) {
        deactivateAll()
        activate(id)
    }
}
```

- [ ] **步骤 2：创建 PlanDayDao.kt**

```kotlin
package com.fitcalendar.data.local.dao

import androidx.room.*
import com.fitcalendar.data.local.entity.PlanDay
import kotlinx.coroutines.flow.Flow

@Dao
interface PlanDayDao {
    @Query("SELECT * FROM plan_days WHERE planId = :planId ORDER BY dayIndex ASC")
    suspend fun getByPlanId(planId: Long): List<PlanDay>

    @Insert
    suspend fun insert(planDay: PlanDay): Long

    @Insert
    suspend fun insertAll(planDays: List<PlanDay>)

    @Query("DELETE FROM plan_days WHERE planId = :planId")
    suspend fun deleteByPlanId(planId: Long)
}
```

- [ ] **步骤 3：创建 ExerciseDao.kt**

```kotlin
package com.fitcalendar.data.local.dao

import androidx.room.*
import com.fitcalendar.data.local.entity.Exercise
import kotlinx.coroutines.flow.Flow

@Dao
interface ExerciseDao {
    @Query("SELECT * FROM exercises WHERE planDayId = :planDayId ORDER BY sortOrder ASC")
    suspend fun getByPlanDayId(planDayId: Long): List<Exercise>

    @Insert
    suspend fun insertAll(exercises: List<Exercise>)

    @Query("DELETE FROM exercises WHERE planDayId IN (SELECT id FROM plan_days WHERE planId = :planId)")
    suspend fun deleteByPlanId(planId: Long)
}
```

- [ ] **步骤 4：创建 TrainingRecordDao.kt**

```kotlin
package com.fitcalendar.data.local.dao

import androidx.room.*
import com.fitcalendar.data.local.entity.TrainingRecord
import kotlinx.coroutines.flow.Flow

@Dao
interface TrainingRecordDao {
    @Query("SELECT * FROM training_records WHERE exerciseName = :name AND date = :date ORDER BY id DESC LIMIT 1")
    suspend fun getLatest(name: String, date: String): TrainingRecord?

    @Query("SELECT * FROM training_records WHERE exerciseName = :name ORDER BY date DESC")
    fun getHistory(name: String): Flow<List<TrainingRecord>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(record: TrainingRecord)

    @Update
    suspend fun update(record: TrainingRecord)
}
```

- [ ] **步骤 5：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/data/local/dao/
git -C E:/.PJs/fit-calendar commit -m "feat: add Room DAOs for Plan, PlanDay, Exercise, TrainingRecord"
```

---

### 任务 4：AppDatabase + TokenDataStore

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/data/local/AppDatabase.kt`
- 创建：`app/src/main/java/com/fitcalendar/data/local/TokenDataStore.kt`

- [ ] **步骤 1：创建 AppDatabase.kt**

```kotlin
package com.fitcalendar.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.fitcalendar.data.local.dao.*
import com.fitcalendar.data.local.entity.*

@Database(
    entities = [Plan::class, PlanDay::class, Exercise::class, TrainingRecord::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun planDao(): PlanDao
    abstract fun planDayDao(): PlanDayDao
    abstract fun exerciseDao(): ExerciseDao
    abstract fun trainingRecordDao(): TrainingRecordDao
}
```

- [ ] **步骤 2：创建 TokenDataStore.kt**

```kotlin
package com.fitcalendar.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class TokenDataStore(private val context: Context) {
    companion object {
        private val KEY_TOKEN = stringPreferencesKey("api_token")
    }

    val token: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[KEY_TOKEN] ?: ""
    }

    suspend fun saveToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[KEY_TOKEN] = token
        }
    }
}
```

- [ ] **步骤 3：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/data/local/AppDatabase.kt app/src/main/java/com/fitcalendar/data/local/TokenDataStore.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add AppDatabase and TokenDataStore"
```

---

### 任务 5：DeepSeek API 模型 + 服务

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/data/remote/DeepSeekModels.kt`
- 创建：`app/src/main/java/com/fitcalendar/data/remote/DeepSeekApiService.kt`

- [ ] **步骤 1：创建 DeepSeekModels.kt**

```kotlin
package com.fitcalendar.data.remote

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class GenRequest(
    val model: String = "deepseek-chat",
    val messages: List<Message>,
    val temperature: Double = 0.7,
    @SerialName("max_tokens") val maxTokens: Int = 4096,
    val stream: Boolean = false
)

@Serializable
data class Message(
    val role: String,
    val content: String
)

@Serializable
data class GenResponse(
    val choices: List<Choice> = emptyList()
)

@Serializable
data class Choice(
    val message: MessageContent? = null
)

@Serializable
data class MessageContent(
    val content: String = ""
)

// --- 日程 JSON Schema ---

@Serializable
data class ScheduleResponse(
    val planName: String = "",
    val days: List<DayDto> = emptyList()
)

@Serializable
data class DayDto(
    val label: String = "",
    val exercises: List<ExerciseDto> = emptyList()
)

@Serializable
data class ExerciseDto(
    val name: String = "",
    val sets: Int = 0,
    val reps: String = "",
    val restSeconds: Int = 0,
    val muscleGroup: String = "",
    val instructions: String = ""
)
```

- [ ] **步骤 2：创建 DeepSeekApiService.kt**

```kotlin
package com.fitcalendar.data.remote

import kotlinx.serialization.json.Json
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class DeepSeekApiService {
    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val systemPrompt = """
你是一个专业的健身教练。请根据用户的描述，生成一个结构化的健身日程。

你必须严格按照以下 JSON 格式输出，不要包含任何额外的文字或 markdown：

{
  "planName": "计划名称",
  "days": [
    {
      "label": "Day 1 - 训练部位",
      "exercises": [
        {
          "name": "动作名称",
          "sets": 4,
          "reps": "8-12",
          "restSeconds": 90,
          "muscleGroup": "肌肉群",
          "instructions": "详细动作要点，包括起始姿势、运动轨迹、呼吸方式、注意事项"
        }
      ]
    }
  ]
}

规则：
1. days 数组长度等于分化天数（如五分化=5天，三分化=3天配休息日可以输出7天含休息标记）
2. 每个训练日 4-7 个动作
3. reps 用字符串表示，支持范围如 "8-12" 或递减如 "12,10,8"
4. instructions 至少 30 字，涵盖姿势、呼吸、安全要点
5. 如果有休息日，label 标注"休息日"，exercises 为空数组 []
    """.trimIndent()

    suspend fun generateSchedule(token: String, userPrompt: String): Result<ScheduleResponse> {
        val request = GenRequest(
            messages = listOf(
                Message("system", systemPrompt),
                Message("user", userPrompt)
            )
        )

        val requestBody = json.encodeToString(GenRequest.serializer(), request)
            .toRequestBody("application/json".toMediaType())

        val httpRequest = Request.Builder()
            .url("https://api.deepseek.com/chat/completions")
            .header("Authorization", "Bearer $token")
            .header("Content-Type", "application/json")
            .post(requestBody)
            .build()

        return try {
            val response = client.newCall(httpRequest).execute()
            val body = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                return Result.failure(IOException("API error ${response.code}: $body"))
            }

            val genResp = json.decodeFromString(GenResponse.serializer(), body)
            val content = genResp.choices.firstOrNull()?.message?.content
                ?: return Result.failure(IOException("Empty response"))

            // 提取 JSON 块（消除可能的 markdown 代码块包裹）
            val jsonBlock = extractJson(content)
            val schedule = json.decodeFromString(ScheduleResponse.serializer(), jsonBlock)
            Result.success(schedule)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun extractJson(text: String): String {
        val start = text.indexOf('{')
        val end = text.lastIndexOf('}')
        return if (start != -1 && end > start) text.substring(start, end + 1) else text
    }
}
```

- [ ] **步骤 3：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/data/remote/
git -C E:/.PJs/fit-calendar commit -m "feat: add DeepSeek API models and service"
```

---

### 任务 6：PlanRepository

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/data/repository/PlanRepository.kt`

- [ ] **步骤 1：创建 PlanRepository.kt**

```kotlin
package com.fitcalendar.data.repository

import com.fitcalendar.data.local.dao.*
import com.fitcalendar.data.local.entity.*
import com.fitcalendar.data.remote.DeepSeekApiService
import com.fitcalendar.data.remote.ScheduleResponse
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlanRepository @Inject constructor(
    private val planDao: PlanDao,
    private val planDayDao: PlanDayDao,
    private val exerciseDao: ExerciseDao,
    private val apiService: DeepSeekApiService
) {
    val allPlans: Flow<List<Plan>> = planDao.getAll()
    val activePlan: Flow<Plan?> = planDao.getActive()

    suspend fun activatePlan(id: Long) = planDao.activateAndDeactivateOthers(id)

    suspend fun deletePlan(plan: Plan) = planDao.delete(plan)

    suspend fun generatePlan(token: String, prompt: String): Result<ScheduleResponse> {
        return apiService.generateSchedule(token, prompt)
    }

    suspend fun saveGeneratedPlan(schedule: ScheduleResponse) {
        // 创建新 Plan
        val planId = planDao.insert(Plan(name = schedule.planName, isActive = false))

        schedule.days.forEachIndexed { index, dayDto ->
            val planDayId = planDayDao.insert(
                PlanDay(planId = planId, dayIndex = index, label = dayDto.label)
            )
            val exercises = dayDto.exercises.mapIndexed { i, ex ->
                Exercise(
                    planDayId = planDayId,
                    name = ex.name,
                    sets = ex.sets,
                    reps = ex.reps,
                    restSeconds = ex.restSeconds,
                    muscleGroup = ex.muscleGroup,
                    instructions = ex.instructions,
                    sortOrder = i
                )
            }
            exerciseDao.insertAll(exercises)
        }

        // 激活新计划
        planDao.activateAndDeactivateOthers(planId)
    }

    suspend fun getDaysForPlan(planId: Long): List<PlanDay> {
        return planDayDao.getByPlanId(planId)
    }

    suspend fun getExercisesForDay(planDayId: Long): List<Exercise> {
        return exerciseDao.getByPlanDayId(planDayId)
    }
}
```

- [ ] **步骤 2：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/data/repository/PlanRepository.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add PlanRepository with generate and save logic"
```

---

### 任务 7：TrainingRepository

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/data/repository/TrainingRepository.kt`

- [ ] **步骤 1：创建 TrainingRepository.kt**

```kotlin
package com.fitcalendar.data.repository

import com.fitcalendar.data.local.dao.TrainingRecordDao
import com.fitcalendar.data.local.entity.TrainingRecord
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TrainingRepository @Inject constructor(
    private val dao: TrainingRecordDao
) {
    suspend fun getLatest(exerciseName: String, date: String): TrainingRecord? {
        return dao.getLatest(exerciseName, date)
    }

    fun getHistory(exerciseName: String): Flow<List<TrainingRecord>> {
        return dao.getHistory(exerciseName)
    }

    suspend fun saveRecord(exerciseName: String, date: String, weight: Double, repsDone: Int, notes: String = "") {
        val existing = dao.getLatest(exerciseName, date)
        if (existing != null) {
            dao.update(existing.copy(weight = weight, repsDone = repsDone, notes = notes))
        } else {
            dao.insert(TrainingRecord(
                exerciseName = exerciseName,
                date = date,
                weight = weight,
                repsDone = repsDone,
                notes = notes
            ))
        }
    }
}
```

- [ ] **步骤 2：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/data/repository/TrainingRepository.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add TrainingRepository"
```

---

### 任务 8：Hilt DI 模块

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/di/AppModule.kt`
- 创建：`app/src/main/java/com/fitcalendar/FitCalendarApplication.kt`

- [ ] **步骤 1：创建 AppModule.kt**

```kotlin
package com.fitcalendar.di

import android.content.Context
import androidx.room.Room
import com.fitcalendar.data.local.AppDatabase
import com.fitcalendar.data.local.TokenDataStore
import com.fitcalendar.data.local.dao.*
import com.fitcalendar.data.remote.DeepSeekApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(context, AppDatabase::class.java, "fitcalendar.db")
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun providePlanDao(db: AppDatabase): PlanDao = db.planDao()

    @Provides
    fun providePlanDayDao(db: AppDatabase): PlanDayDao = db.planDayDao()

    @Provides
    fun provideExerciseDao(db: AppDatabase): ExerciseDao = db.exerciseDao()

    @Provides
    fun provideTrainingRecordDao(db: AppDatabase): TrainingRecordDao = db.trainingRecordDao()

    @Provides
    @Singleton
    fun provideTokenDataStore(@ApplicationContext context: Context): TokenDataStore {
        return TokenDataStore(context)
    }

    @Provides
    @Singleton
    fun provideDeepSeekApiService(): DeepSeekApiService {
        return DeepSeekApiService()
    }
}
```

- [ ] **步骤 2：创建 FitCalendarApplication.kt**

```kotlin
package com.fitcalendar

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class FitCalendarApplication : Application()
```

- [ ] **步骤 3：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/di/ app/src/main/java/com/fitcalendar/FitCalendarApplication.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add Hilt DI module and Application class"
```

---

### 任务 9：主题 (Theme)

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/ui/theme/Color.kt`
- 创建：`app/src/main/java/com/fitcalendar/ui/theme/Type.kt`
- 创建：`app/src/main/java/com/fitcalendar/ui/theme/Theme.kt`

- [ ] **步骤 1：创建 Color.kt**

```kotlin
package com.fitcalendar.ui.theme

import androidx.compose.ui.graphics.Color

val OrangePrimary = Color(0xFFFF6B35)
val OrangeSecondary = Color(0xFFFF8A65)
val OrangeTertiary = Color(0xFFFFAB91)
val DarkBackground = Color(0xFF1A1A2E)
val DarkSurface = Color(0xFF16213E)
val CardBackground = Color(0xFF0F3460)
val TextWhite = Color(0xFFEEEEEE)
val TextGray = Color(0xFFAAAAAA)
val SuccessGreen = Color(0xFF4CAF50)
val RestGray = Color(0xFF3A3A5C)
```

- [ ] **步骤 2：创建 Type.kt**

```kotlin
package com.fitcalendar.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val AppTypography = Typography(
    headlineLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 28.sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 22.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 18.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 16.sp),
    bodyLarge = TextStyle(fontSize = 16.sp),
    bodyMedium = TextStyle(fontSize = 14.sp),
    bodySmall = TextStyle(fontSize = 12.sp, color = TextGray),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
)
```

- [ ] **步骤 3：创建 Theme.kt**

```kotlin
package com.fitcalendar.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = OrangePrimary,
    secondary = OrangeSecondary,
    tertiary = OrangeTertiary,
    background = DarkBackground,
    surface = DarkSurface,
    onPrimary = DarkBackground,
    onBackground = TextWhite,
    onSurface = TextWhite,
)

@Composable
fun FitCalendarTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = AppTypography,
        content = content
    )
}
```

- [ ] **步骤 4：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/ui/theme/
git -C E:/.PJs/fit-calendar commit -m "feat: add dark orange theme"
```

---

### 任务 10：导航骨架

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/ui/navigation/BottomNavBar.kt`
- 创建：`app/src/main/java/com/fitcalendar/ui/navigation/NavGraph.kt`
- 创建：`app/src/main/java/com/fitcalendar/ui/navigation/FitCalendarApp.kt`

- [ ] **步骤 1：创建 BottomNavBar.kt**

```kotlin
package com.fitcalendar.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector

data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

val navItems = listOf(
    BottomNavItem("today", "今日", Icons.Default.Today),
    BottomNavItem("week", "周视图", Icons.Default.CalendarMonth),
    BottomNavItem("plan", "计划", Icons.Default.FitnessCenter),
)

@Composable
fun BottomNavBar(currentRoute: String?, onItemClick: (String) -> Unit) {
    NavigationBar {
        navItems.forEach { item ->
            NavigationBarItem(
                icon = { Icon(item.icon, contentDescription = item.label) },
                label = { Text(item.label) },
                selected = currentRoute == item.route,
                onClick = { onItemClick(item.route) }
            )
        }
    }
}
```

- [ ] **步骤 2：创建 NavGraph.kt**（占位页面，后续替换）

```kotlin
package com.fitcalendar.ui.navigation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable

@Composable
fun NavGraph(navController: NavHostController) {
    NavHost(navController = navController, startDestination = "today") {
        composable("today") {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("今日视图 - 待实现")
            }
        }
        composable("week") {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("周视图 - 待实现")
            }
        }
        composable("plan") {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("计划 - 待实现")
            }
        }
    }
}
```

- [ ] **步骤 3：创建 FitCalendarApp.kt**

```kotlin
package com.fitcalendar.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController

@Composable
fun FitCalendarApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            BottomNavBar(
                currentRoute = currentRoute,
                onItemClick = { route ->
                    navController.navigate(route) {
                        popUpTo(navController.graph.startDestinationId) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            )
        }
    ) { innerPadding ->
        NavGraph(
            navController = navController,
            modifier = Modifier.padding(innerPadding)
        )
    }
}
```

需要在 NavGraph 里加 modifier 参数，修改步骤 2 的 NavGraph：

- [ ] **步骤 4：修改 NavGraph.kt 添加 modifier 参数**

把 NavGraph 签名改为：
```kotlin
@Composable
fun NavGraph(navController: NavHostController, modifier: Modifier = Modifier) {
    NavHost(
        navController = navController,
        startDestination = "today",
        modifier = modifier
    ) {
```

- [ ] **步骤 5：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/ui/navigation/
git -C E:/.PJs/fit-calendar commit -m "feat: add bottom navigation skeleton with placeholder pages"
```

---

### 任务 11：MainActivity

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/MainActivity.kt`

- [ ] **步骤 1：创建 MainActivity.kt**

```kotlin
package com.fitcalendar

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.fitcalendar.ui.navigation.FitCalendarApp
import com.fitcalendar.ui.theme.FitCalendarTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FitCalendarTheme {
                FitCalendarApp()
            }
        }
    }
}
```

- [ ] **步骤 2：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/MainActivity.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add MainActivity with Compose entry point"
```

---

### 任务 12：PlanViewModel

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/ui/plan/PlanViewModel.kt`

- [ ] **步骤 1：创建 PlanViewModel.kt**

```kotlin
package com.fitcalendar.ui.plan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitcalendar.data.local.TokenDataStore
import com.fitcalendar.data.local.entity.Plan
import com.fitcalendar.data.remote.ScheduleResponse
import com.fitcalendar.data.repository.PlanRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlanUiState(
    val token: String = "",
    val prompt: String = "",
    val freeDesc: String = "",
    val plans: List<Plan> = emptyList(),
    val activePlanId: Long? = null,
    val isGenerating: Boolean = false,
    val generatedSchedule: ScheduleResponse? = null,
    val showPreview: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class PlanViewModel @Inject constructor(
    private val repository: PlanRepository,
    private val tokenDataStore: TokenDataStore
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlanUiState())
    val uiState: StateFlow<PlanUiState> = _uiState.asStateFlow()

    init {
        // 加载 Token
        viewModelScope.launch {
            tokenDataStore.token.collect { token ->
                _uiState.update { it.copy(token = token) }
            }
        }
        // 加载计划列表
        viewModelScope.launch {
            repository.allPlans.collect { plans ->
                _uiState.update { it.copy(plans = plans) }
            }
        }
        viewModelScope.launch {
            repository.activePlan.collect { plan ->
                _uiState.update { it.copy(activePlanId = plan?.id) }
            }
        }
    }

    fun onTokenChange(value: String) {
        _uiState.update { it.copy(token = value) }
    }

    fun saveToken() {
        viewModelScope.launch {
            tokenDataStore.saveToken(_uiState.value.token)
        }
    }

    fun onPromptChange(value: String) {
        _uiState.update { it.copy(prompt = value) }
    }

    fun onFreeDescChange(value: String) {
        _uiState.update { it.copy(freeDesc = value) }
    }

    fun generate() {
        val token = _uiState.value.token
        val prompt = _uiState.value.prompt.ifBlank { _uiState.value.freeDesc }
        if (token.isBlank() || prompt.isBlank()) {
            _uiState.update { it.copy(error = "请填写 Token 和训练描述") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isGenerating = true, error = null) }
            val result = repository.generatePlan(token, prompt)
            result.fold(
                onSuccess = { schedule ->
                    _uiState.update { it.copy(
                        isGenerating = false,
                        generatedSchedule = schedule,
                        showPreview = true
                    )}
                },
                onFailure = { e ->
                    _uiState.update { it.copy(
                        isGenerating = false,
                        error = "生成失败: ${e.message}"
                    )}
                }
            )
        }
    }

    fun confirmGenerated() {
        val schedule = _uiState.value.generatedSchedule ?: return
        viewModelScope.launch {
            repository.saveGeneratedPlan(schedule)
            _uiState.update { it.copy(showPreview = false, generatedSchedule = null, prompt = "", freeDesc = "") }
        }
    }

    fun dismissPreview() {
        _uiState.update { it.copy(showPreview = false, generatedSchedule = null) }
    }

    fun switchPlan(planId: Long) {
        viewModelScope.launch { repository.activatePlan(planId) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
```

- [ ] **步骤 2：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/ui/plan/PlanViewModel.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add PlanViewModel with generate and plan management logic"
```

---

### 任务 13：PlanScreen（计划/生成页面）

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/ui/plan/PlanScreen.kt`
- 创建：`app/src/main/java/com/fitcalendar/ui/plan/GeneratePreviewDialog.kt`
- 修改：`app/src/main/java/com/fitcalendar/ui/navigation/NavGraph.kt`（替换 plan 占位）

- [ ] **步骤 1：创建 PlanScreen.kt**

```kotlin
package com.fitcalendar.ui.plan

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanScreen(
    viewModel: PlanViewModel = hiltViewModel(),
    onGenerateComplete: () -> Unit = {}
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.error) {
        state.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 计划切换
            Text("当前计划", style = MaterialTheme.typography.titleMedium)
            var expanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                val activePlanName = state.plans.find { it.id == state.activePlanId }?.name ?: "无计划"
                OutlinedTextField(
                    value = activePlanName,
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    state.plans.forEach { plan ->
                        DropdownMenuItem(
                            text = { Text(plan.name + if (plan.isActive) " ✓" else "") },
                            onClick = {
                                viewModel.switchPlan(plan.id)
                                expanded = false
                            }
                        )
                    }
                }
            }

            Divider()

            // API Token
            Text("📡 API Token", style = MaterialTheme.typography.titleMedium)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = state.token,
                    onValueChange = viewModel::onTokenChange,
                    label = { Text("DeepSeek Token") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                Button(onClick = viewModel::saveToken, modifier = Modifier.align(Alignment.CenterVertically)) {
                    Text("保存")
                }
            }

            Divider()

            // 生成
            Text("✍️ 生成新计划", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = state.prompt,
                onValueChange = viewModel::onPromptChange,
                label = { Text("提示词（如：我想练五分化，每周五天...）") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3
            )
            Text("或", style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = state.freeDesc,
                onValueChange = viewModel::onFreeDescChange,
                label = { Text("自由描述（如：周一练胸：卧推4组...）") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3
            )

            Button(
                onClick = viewModel::generate,
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.isGenerating
            ) {
                if (state.isGenerating) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("DeepSeek 正在生成...")
                } else {
                    Text("⚡ 生成日程")
                }
            }

            Divider()

            // 已保存计划列表
            Text("已保存计划", style = MaterialTheme.typography.titleMedium)
            if (state.plans.isEmpty()) {
                Text("暂无计划，请先生成一个", style = MaterialTheme.typography.bodySmall)
            } else {
                state.plans.forEach { plan ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("· ${plan.name} ${if (plan.isActive) "(当前)" else ""}")
                    }
                }
            }
        }
    }

    // 预览弹窗
    if (state.showPreview && state.generatedSchedule != null) {
        GeneratePreviewDialog(
            schedule = state.generatedSchedule!!,
            onConfirm = {
                viewModel.confirmGenerated()
                onGenerateComplete()
            },
            onDismiss = viewModel::dismissPreview
        )
    }
}
```

- [ ] **步骤 2：创建 GeneratePreviewDialog.kt**

```kotlin
package com.fitcalendar.ui.plan

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fitcalendar.data.remote.ScheduleResponse

@Composable
fun GeneratePreviewDialog(
    schedule: ScheduleResponse,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("预览: ${schedule.planName}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                schedule.days.forEach { day ->
                    Text(
                        "${day.label} — ${day.exercises.size} 个动作",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Spacer(Modifier.height(8.dp))
                Text("确认保存并设为当前计划？", style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = {
            Button(onClick = onConfirm) { Text("确认保存") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}
```

- [ ] **步骤 3：修改 NavGraph.kt 中 plan 路由**

将 NavGraph 中：
```kotlin
composable("plan") {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("计划 - 待实现")
    }
}
```
替换为：
```kotlin
composable("plan") {
    PlanScreen()
}
```

添加导入 `import com.fitcalendar.ui.plan.PlanScreen`，删除不再需要的 `Alignment` 导入。

- [ ] **步骤 4：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/ui/plan/ app/src/main/java/com/fitcalendar/ui/navigation/NavGraph.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add PlanScreen with token, generation, and plan switching"
```

---

### 任务 14：TodayViewModel

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/ui/today/TodayViewModel.kt`

- [ ] **步骤 1：创建 TodayViewModel.kt**

```kotlin
package com.fitcalendar.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitcalendar.data.local.entity.Exercise
import com.fitcalendar.data.local.entity.PlanDay
import com.fitcalendar.data.local.entity.TrainingRecord
import com.fitcalendar.data.repository.PlanRepository
import com.fitcalendar.data.repository.TrainingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.*
import javax.inject.Inject

data class ExerciseWithRecord(
    val exercise: Exercise,
    val lastRecord: TrainingRecord? = null,
    val completed: Boolean = false
)

data class TodayUiState(
    val selectedDate: LocalDate = LocalDate.now(),
    val dateLabel: String = "",
    val planDayLabel: String = "",
    val exercises: List<ExerciseWithRecord> = emptyList(),
    val isRestDay: Boolean = false,
    val hasActivePlan: Boolean = false
)

@HiltViewModel
class TodayViewModel @Inject constructor(
    private val planRepository: PlanRepository,
    private val trainingRepository: TrainingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TodayUiState())
    val uiState: StateFlow<TodayUiState> = _uiState.asStateFlow()

    init {
        loadDay(LocalDate.now())
    }

    fun goToDate(date: LocalDate) {
        loadDay(date)
    }

    fun nextDay() {
        loadDay(_uiState.value.selectedDate.plusDays(1))
    }

    fun previousDay() {
        loadDay(_uiState.value.selectedDate.minusDays(1))
    }

    private fun loadDay(date: LocalDate) {
        viewModelScope.launch {
            val activePlan = planRepository.activePlan.first() ?: run {
                _uiState.update { it.copy(hasActivePlan = false, selectedDate = date) }
                return@launch
            }

            val days = planRepository.getDaysForPlan(activePlan.id)
            val dayOfWeek = date.dayOfWeek
            val dayIndex = dayOfWeek.value - 1 // Monday=0 ... Sunday=6

            val planDay = days.find { it.dayIndex == dayIndex }
            val dateLabel = "${date} ${dayOfWeek.getDisplayName(TextStyle.FULL, Locale.CHINESE)}"

            if (planDay == null) {
                _uiState.update { it.copy(
                    hasActivePlan = true, selectedDate = date,
                    dateLabel = dateLabel, planDayLabel = "", exercises = emptyList(), isRestDay = true
                )}
                return@launch
            }

            val exercises = planRepository.getExercisesForDay(planDay.id)
            val dateStr = date.toString()
            val exerciseWithRecords = exercises.map { ex ->
                val record = trainingRepository.getLatest(ex.name, dateStr)
                ExerciseWithRecord(exercise = ex, lastRecord = record)
            }

            _uiState.update { it.copy(
                hasActivePlan = true, selectedDate = date, dateLabel = dateLabel,
                planDayLabel = planDay.label, exercises = exerciseWithRecords, isRestDay = false
            )}
        }
    }

    fun saveWeight(exerciseName: String, weight: Double) {
        viewModelScope.launch {
            val date = _uiState.value.selectedDate.toString()
            trainingRepository.saveRecord(exerciseName, date, weight, repsDone = 0)
            loadDay(_uiState.value.selectedDate) // 刷新以显示新重量
        }
    }

    fun toggleExerciseCompleted(exerciseName: String, completed: Boolean) {
        viewModelScope.launch {
            val date = _uiState.value.selectedDate.toString()
            val currentWeight = _uiState.value.exercises
                .find { it.exercise.name == exerciseName }?.lastRecord?.weight ?: 0.0
            trainingRepository.saveRecord(exerciseName, date, currentWeight, repsDone = if (completed) 12 else 0)
            loadDay(_uiState.value.selectedDate)
        }
    }
}
```

- [ ] **步骤 2：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/ui/today/TodayViewModel.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add TodayViewModel with date navigation and record management"
```

---

### 任务 15：TodayScreen + ExerciseCard + ExerciseDetailSheet

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/ui/today/ExerciseCard.kt`
- 创建：`app/src/main/java/com/fitcalendar/ui/today/ExerciseDetailSheet.kt`
- 创建：`app/src/main/java/com/fitcalendar/ui/today/TodayScreen.kt`
- 修改：`app/src/main/java/com/fitcalendar/ui/navigation/NavGraph.kt`（替换 today 占位）

- [ ] **步骤 1：创建 ExerciseCard.kt**

```kotlin
package com.fitcalendar.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.fitcalendar.ui.theme.CardBackground
import com.fitcalendar.ui.theme.OrangePrimary
import com.fitcalendar.ui.theme.TextGray
import com.fitcalendar.ui.theme.TextWhite

@Composable
fun ExerciseCard(
    item: ExerciseWithRecord,
    onClick: () -> Unit,
    onWeightClick: () -> Unit,
    onCheckToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        onClick = onClick
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(item.exercise.name, style = MaterialTheme.typography.titleLarge, color = TextWhite)
                Checkbox(
                    checked = item.completed,
                    onCheckedChange = onCheckToggle,
                    colors = CheckboxDefaults.colors(checkedColor = OrangePrimary)
                )
            }

            Spacer(Modifier.height(4.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("${item.exercise.sets}组 × ${item.exercise.reps}次", color = TextWhite)
                Text("休息 ${item.exercise.restSeconds}s", color = TextGray)
                Spacer(Modifier.weight(1f))
                Text(item.exercise.muscleGroup, color = OrangePrimary, fontWeight = FontWeight.Medium)
            }

            Spacer(Modifier.height(8.dp))

            // 上次重量
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onWeightClick) {
                    val weightText = item.lastRecord?.weight?.let { "${it}kg" } ?: "暂无记录"
                    Text("上次: $weightText", color = TextGray)
                }
            }
        }
    }
}
```

- [ ] **步骤 2：创建 ExerciseDetailSheet.kt**

```kotlin
package com.fitcalendar.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.fitcalendar.ui.theme.OrangePrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseDetailSheet(
    exercise: ExerciseWithRecord,
    onDismiss: () -> Unit,
    onWeightSave: (Double) -> Unit
) {
    var weightInput by remember { mutableStateOf(exercise.lastRecord?.weight?.toString() ?: "") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(exercise.exercise.name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("${exercise.exercise.sets}组 × ${exercise.exercise.reps}次 | 休息 ${exercise.exercise.restSeconds}s | ${exercise.exercise.muscleGroup}", color = OrangePrimary)

            Text("动作要点", style = MaterialTheme.typography.titleMedium)
            Text(exercise.exercise.instructions, style = MaterialTheme.typography.bodyMedium)

            Divider()

            Text("本次训练", style = MaterialTheme.typography.titleMedium)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = weightInput,
                    onValueChange = { weightInput = it },
                    label = { Text("重量 (kg)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                Button(onClick = {
                    weightInput.toDoubleOrNull()?.let { onWeightSave(it) }
                }) {
                    Text("保存")
                }
            }
        }
    }
}
```

- [ ] **步骤 3：创建 TodayScreen.kt**

```kotlin
package com.fitcalendar.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.fitcalendar.ui.theme.TextGray

@Composable
fun TodayScreen(viewModel: TodayViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()
    var selectedExercise by remember { mutableStateOf<ExerciseWithRecord?>(null) }

    Column(Modifier.fillMaxSize()) {
        // 日期导航栏
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = viewModel::previousDay) {
                Icon(Icons.Default.ChevronLeft, "前一天")
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.dateLabel, style = MaterialTheme.typography.titleLarge)
                if (state.planDayLabel.isNotBlank()) {
                    Text(state.planDayLabel, style = MaterialTheme.typography.bodySmall, color = TextGray)
                }
            }
            IconButton(onClick = viewModel::nextDay) {
                Icon(Icons.Default.ChevronRight, "后一天")
            }
        }

        if (!state.hasActivePlan) {
            // 空状态
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("还没有训练计划", style = MaterialTheme.typography.headlineSmall)
                    Text("请到「计划」页面生成", style = MaterialTheme.typography.bodyMedium, color = TextGray)
                }
            }
        } else if (state.isRestDay) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("今日休息 💤", style = MaterialTheme.typography.headlineMedium)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                itemsIndexed(state.exercises) { _, item ->
                    ExerciseCard(
                        item = item,
                        onClick = { selectedExercise = item },
                        onWeightClick = { selectedExercise = item },
                        onCheckToggle = { checked ->
                            viewModel.toggleExerciseCompleted(item.exercise.name, checked)
                        }
                    )
                }
            }
        }
    }

    // BottomSheet
    selectedExercise?.let { exercise ->
        ExerciseDetailSheet(
            exercise = exercise,
            onDismiss = { selectedExercise = null },
            onWeightSave = { weight ->
                viewModel.saveWeight(exercise.exercise.name, weight)
            }
        )
    }
}
```

- [ ] **步骤 4：修改 NavGraph.kt 中 today 路由**

替换 `composable("today")` 块为：
```kotlin
composable("today") {
    TodayScreen()
}
```
添加导入 `import com.fitcalendar.ui.today.TodayScreen`。

- [ ] **步骤 5：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/ui/today/ app/src/main/java/com/fitcalendar/ui/navigation/NavGraph.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add TodayScreen with exercise cards, detail sheet, and weight tracking"
```

---

### 任务 16：WeekViewModel + WeekScreen

**文件：**
- 创建：`app/src/main/java/com/fitcalendar/ui/week/WeekViewModel.kt`
- 创建：`app/src/main/java/com/fitcalendar/ui/week/WeekScreen.kt`
- 修改：`app/src/main/java/com/fitcalendar/ui/navigation/NavGraph.kt`（替换 week 占位）

- [ ] **步骤 1：创建 WeekViewModel.kt**

```kotlin
package com.fitcalendar.ui.week

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitcalendar.data.local.entity.Exercise
import com.fitcalendar.data.local.entity.PlanDay
import com.fitcalendar.data.repository.PlanRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.*
import javax.inject.Inject

data class DayWithExercises(
    val date: LocalDate,
    val dayOfWeekLabel: String,
    val planDay: PlanDay?,
    val exercises: List<Exercise> = emptyList()
)

data class WeekUiState(
    val weekLabel: String = "",
    val weekStart: LocalDate = LocalDate.now(),
    val days: List<DayWithExercises> = emptyList(),
    val hasActivePlan: Boolean = false
)

@HiltViewModel
class WeekViewModel @Inject constructor(
    private val planRepository: PlanRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WeekUiState())
    val uiState: StateFlow<WeekUiState> = _uiState.asStateFlow()

    init {
        loadWeek(LocalDate.now())
    }

    fun previousWeek() {
        loadWeek(_uiState.value.weekStart.minusWeeks(1))
    }

    fun nextWeek() {
        loadWeek(_uiState.value.weekStart.plusWeeks(1))
    }

    private fun loadWeek(anyDayInWeek: LocalDate) {
        viewModelScope.launch {
            val activePlan = planRepository.activePlan.first() ?: run {
                _uiState.update { it.copy(hasActivePlan = false) }
                return@launch
            }

            val monday = anyDayInWeek.with(DayOfWeek.MONDAY)
            val sunday = monday.plusDays(6)
            val weekNum = monday.get(WeekFields.of(Locale.getDefault()).weekOfYear())
            val weekLabel = "第${weekNum}周  ${monday} - ${sunday}"

            val days = planRepository.getDaysForPlan(activePlan.id)
            val weekDays = (0..6).map { offset ->
                val date = monday.plusDays(offset.toLong())
                val dayOfWeek = date.dayOfWeek.value - 1 // Mon=0
                val planDay = days.find { it.dayIndex == dayOfWeek }
                val exercises = if (planDay != null) planRepository.getExercisesForDay(planDay.id) else emptyList()
                DayWithExercises(
                    date = date,
                    dayOfWeekLabel = date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.CHINESE),
                    planDay = planDay,
                    exercises = exercises
                )
            }

            _uiState.update { it.copy(
                hasActivePlan = true, weekStart = monday,
                weekLabel = weekLabel, days = weekDays
            )}
        }
    }
}
```

- [ ] **步骤 2：创建 WeekScreen.kt**

```kotlin
package com.fitcalendar.ui.week

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.fitcalendar.ui.theme.*

@Composable
fun WeekScreen(
    viewModel: WeekViewModel = hiltViewModel(),
    onDayClick: (String) -> Unit = {} // date string
) {
    val state by viewModel.uiState.collectAsState()

    Column(Modifier.fillMaxSize()) {
        // 周导航
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = viewModel::previousWeek) {
                Icon(Icons.Default.ChevronLeft, "前一周")
            }
            Text(state.weekLabel, style = MaterialTheme.typography.titleLarge)
            IconButton(onClick = viewModel::nextWeek) {
                Icon(Icons.Default.ChevronRight, "后一周")
            }
        }

        if (!state.hasActivePlan) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("还没有训练计划", style = MaterialTheme.typography.headlineSmall)
            }
        } else {
            // 课程表
            val maxCols = state.days.maxOfOrNull { it.exercises.size } ?: 0

            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = 8.dp)
            ) {
                // 表头
                item {
                    Row(Modifier.fillMaxWidth()) {
                        Box(Modifier.weight(1f).padding(4.dp)) {
                            Text("日期", fontWeight = FontWeight.Bold, color = TextWhite)
                        }
                        repeat(maxCols.coerceAtLeast(1)) { i ->
                            Box(Modifier.weight(1.5f).padding(4.dp)) {
                                Text("动作${i + 1}", fontWeight = FontWeight.Bold, color = OrangePrimary)
                            }
                        }
                    }
                    Divider()
                }

                // 每天一行
                items(state.days.size) { index ->
                    val day = state.days[index]
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { onDayClick(day.date.toString()) }
                            .padding(vertical = 8.dp)
                    ) {
                        // 日期列
                        Column(Modifier.weight(1f).padding(4.dp)) {
                            Text(day.dayOfWeekLabel, fontWeight = FontWeight.Bold, color = TextWhite)
                            Text("${day.date.monthValue}/${day.date.dayOfMonth}", style = MaterialTheme.typography.bodySmall, color = TextGray)
                            if (day.planDay != null) {
                                Text(day.planDay.label.split("-").lastOrNull()?.trim() ?: "", style = MaterialTheme.typography.bodySmall, color = OrangePrimary)
                            }
                        }
                        // 动作列
                        if (day.exercises.isEmpty() && (day.planDay == null || day.planDay.label.contains("休息"))) {
                            Box(Modifier.weight(1.5f * maxCols.coerceAtLeast(1)).padding(4.dp)) {
                                Text("休息日 🟢", color = com.fitcalendar.ui.theme.SuccessGreen)
                            }
                        } else {
                            repeat(maxCols.coerceAtLeast(1)) { col ->
                                Box(Modifier.weight(1.5f).padding(4.dp)) {
                                    val ex = day.exercises.getOrNull(col)
                                    if (ex != null) {
                                        Text("${ex.name}\n${ex.sets}×${ex.reps}", style = MaterialTheme.typography.bodySmall, color = TextWhite)
                                    }
                                }
                            }
                        }
                    }
                    Divider()
                }
            }
        }
    }
}
```

- [ ] **步骤 3：修改 NavGraph.kt 中 week 路由**

替换 `composable("week")` 为：
```kotlin
composable("week") {
    WeekScreen(onDayClick = { dateStr ->
        navController.navigate("today") {
            popUpTo("today") { inclusive = true }
        }
    })
}
```
添加导入 `import com.fitcalendar.ui.week.WeekScreen`。

- [ ] **步骤 4：Commit**

```bash
git -C E:/.PJs/fit-calendar add app/src/main/java/com/fitcalendar/ui/week/ app/src/main/java/com/fitcalendar/ui/navigation/NavGraph.kt
git -C E:/.PJs/fit-calendar commit -m "feat: add WeekScreen with timetable view"
```

---

### 任务 17：最终集成检查 & 推送

**文件：** 无需新建，验证所有文件就位

- [ ] **步骤 1：验证完整文件树**

运行：
```bash
find E:/.PJs/fit-calendar/app -name "*.kt" | sort
```
预期：列出全部 17 个 Kotlin 文件

- [ ] **步骤 2：最终 Commit**

```bash
git -C E:/.PJs/fit-calendar add -A
git -C E:/.PJs/fit-calendar status
git -C E:/.PJs/fit-calendar commit -m "chore: final project integration"
```

- [ ] **步骤 3：推送到 GitHub**

```bash
git -C E:/.PJs/fit-calendar push -u origin master
```
预期：所有 commit 成功推送到 `github.com/adamzoeee/fit-calendar`

---

## 已覆盖的规格要求

| 规格章节 | 实现任务 |
|---|---|
| 房间 Entity 4 个 | 任务 2 |
| DataStore Token | 任务 4 |
| DeepSeek API 合约 | 任务 5 |
| PlanRepository | 任务 6 |
| TrainingRepository | 任务 7 |
| Tab 1 今日视图（卡片+BottomSheet+重量编辑） | 任务 14, 15 |
| Tab 2 周视图（课程表+周导航） | 任务 16 |
| Tab 3 计划（Token+提示词+生成+预览+切换） | 任务 12, 13 |
| 底部三 Tab 导航 | 任务 10 |
| 状态处理（加载/错误/空/Token未配置） | 任务 12, 13, 14 |
| 多计划切换 | 任务 6, 12, 13 |
| 训练记录按动作+日期保存 | 任务 7, 14, 15 |
| 勾选完成 | 任务 14, 15 |
| 生成预览确认 | 任务 13 |
| Dark 主题 | 任务 9 |
