package com.fitcalendar.data.local.dao

import androidx.room.*
import com.fitcalendar.data.local.entity.Exercise

@Dao
interface ExerciseDao {
    @Query("SELECT * FROM exercises WHERE planDayId = :planDayId ORDER BY sortOrder ASC")
    suspend fun getByPlanDayId(planDayId: Long): List<Exercise>

    @Insert
    suspend fun insertAll(exercises: List<Exercise>)

    @Query("DELETE FROM exercises WHERE planDayId IN (SELECT id FROM plan_days WHERE planId = :planId)")
    suspend fun deleteByPlanId(planId: Long)
}
