package com.fitcalendar.data.repository

import com.fitcalendar.data.local.dao.TrainingRecordDao
import com.fitcalendar.data.local.entity.TrainingRecord
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TrainingRepository @Inject constructor(
    private val dao: TrainingRecordDao
) {
    suspend fun getLatest(exerciseName: String, date: String): TrainingRecord? {
        return dao.getLatest(exerciseName, date)
    }

    fun getHistory(exerciseName: String): Flow<List<TrainingRecord>> {
        return dao.getHistory(exerciseName)
    }

    /**
     * 保存或更新训练记录。策略：先查当天该动作是否已有记录，
     * 有则 update 复用 id，无则 insert 新行。
     * 单用户 App 下竞态条件风险极低，无需额外锁。
     */
    suspend fun saveRecord(exerciseName: String, date: String, weight: Double, repsDone: Int, notes: String = "") {
        val existing = dao.getLatest(exerciseName, date)
        if (existing != null) {
            dao.update(existing.copy(weight = weight, repsDone = repsDone, notes = notes))
        } else {
            dao.insert(TrainingRecord(
                exerciseName = exerciseName,
                date = date,
                weight = weight,
                repsDone = repsDone,
                notes = notes
            ))
        }
    }
}
