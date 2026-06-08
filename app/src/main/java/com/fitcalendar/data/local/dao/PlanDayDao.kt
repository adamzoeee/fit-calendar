package com.fitcalendar.data.local.dao

import androidx.room.*
import com.fitcalendar.data.local.entity.PlanDay

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
