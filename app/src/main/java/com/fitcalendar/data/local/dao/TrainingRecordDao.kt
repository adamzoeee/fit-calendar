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
