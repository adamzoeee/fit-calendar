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
