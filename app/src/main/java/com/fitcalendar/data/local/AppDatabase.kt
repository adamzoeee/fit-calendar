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
