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
