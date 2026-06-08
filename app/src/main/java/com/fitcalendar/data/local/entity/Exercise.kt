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
