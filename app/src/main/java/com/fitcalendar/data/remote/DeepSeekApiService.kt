package com.fitcalendar.data.remote

import kotlinx.serialization.json.Json
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

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

    suspend fun generateSchedule(token: String, userPrompt: String): Result<ScheduleResponse> = withContext(Dispatchers.IO) {
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

        try {
            val response = client.newCall(httpRequest).execute()
            val body = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                return@withContext Result.failure(IOException("API error ${response.code}: $body"))
            }

            val genResp = json.decodeFromString(GenResponse.serializer(), body)
            val content = genResp.choices.firstOrNull()?.message?.content
                ?: return@withContext Result.failure(IOException("Empty response"))

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
