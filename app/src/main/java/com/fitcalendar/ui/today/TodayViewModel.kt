package com.fitcalendar.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitcalendar.data.local.entity.Exercise
import com.fitcalendar.data.local.entity.TrainingRecord
import com.fitcalendar.data.repository.PlanRepository
import com.fitcalendar.data.repository.TrainingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.*
import javax.inject.Inject

data class ExerciseWithRecord(
    val exercise: Exercise,
    val lastRecord: TrainingRecord? = null,
    val completed: Boolean = false
)

data class TodayUiState(
    val selectedDate: LocalDate = LocalDate.now(),
    val dateLabel: String = "",
    val planDayLabel: String = "",
    val exercises: List<ExerciseWithRecord> = emptyList(),
    val isRestDay: Boolean = false,
    val hasActivePlan: Boolean = false
)

@HiltViewModel
class TodayViewModel @Inject constructor(
    private val planRepository: PlanRepository,
    private val trainingRepository: TrainingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TodayUiState())
    val uiState: StateFlow<TodayUiState> = _uiState.asStateFlow()

    init { loadDay(LocalDate.now()) }

    fun goToDate(date: LocalDate) { loadDay(date) }
    fun nextDay() { loadDay(_uiState.value.selectedDate.plusDays(1)) }
    fun previousDay() { loadDay(_uiState.value.selectedDate.minusDays(1)) }

    private fun loadDay(date: LocalDate) {
        viewModelScope.launch {
            val activePlan = planRepository.activePlan.first() ?: run {
                _uiState.update { it.copy(hasActivePlan = false, selectedDate = date) }
                return@launch
            }
            val days = planRepository.getDaysForPlan(activePlan.id)
            val dayIndex = date.dayOfWeek.value - 1
            val planDay = days.find { it.dayIndex == dayIndex }
            val dateLabel = "${date} ${date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.CHINESE)}"

            if (planDay == null) {
                _uiState.update { it.copy(hasActivePlan = true, selectedDate = date, dateLabel = dateLabel, planDayLabel = "", exercises = emptyList(), isRestDay = true) }
                return@launch
            }

            val exercises = planRepository.getExercisesForDay(planDay.id)
            val isRest = planDay.label.contains("休息") || exercises.isEmpty()

            if (isRest) {
                _uiState.update { it.copy(hasActivePlan = true, selectedDate = date, dateLabel = dateLabel, planDayLabel = planDay.label, exercises = emptyList(), isRestDay = true) }
                return@launch
            }

            val dateStr = date.toString()
            val exerciseWithRecords = exercises.map { ex ->
                val record = trainingRepository.getLatest(ex.name, dateStr)
                ExerciseWithRecord(exercise = ex, lastRecord = record)
            }

            _uiState.update { it.copy(hasActivePlan = true, selectedDate = date, dateLabel = dateLabel, planDayLabel = planDay.label, exercises = exerciseWithRecords, isRestDay = false) }
        }
    }

    fun saveWeight(exerciseName: String, weight: Double) {
        viewModelScope.launch {
            val date = _uiState.value.selectedDate.toString()
            // 先查已有记录保留 repsDone 和 notes
            val existing = trainingRepository.getLatest(exerciseName, date)
            val repsDone = existing?.repsDone ?: 0
            val notes = existing?.notes ?: ""
            trainingRepository.saveRecord(exerciseName, date, weight, repsDone = repsDone, notes = notes)
            loadDay(_uiState.value.selectedDate)
        }
    }

    fun toggleExerciseCompleted(exerciseName: String, completed: Boolean) {
        viewModelScope.launch {
            val date = _uiState.value.selectedDate.toString()
            // 先查已有记录保留 weight 和 notes
            val existing = trainingRepository.getLatest(exerciseName, date)
            val currentWeight = existing?.weight
                ?: _uiState.value.exercises.find { it.exercise.name == exerciseName }?.lastRecord?.weight
                ?: 0.0
            val notes = existing?.notes ?: ""
            trainingRepository.saveRecord(exerciseName, date, currentWeight, repsDone = if (completed) 12 else 0, notes = notes)
            loadDay(_uiState.value.selectedDate)
        }
    }
}
