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
