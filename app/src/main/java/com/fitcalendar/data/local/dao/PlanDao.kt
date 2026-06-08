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
