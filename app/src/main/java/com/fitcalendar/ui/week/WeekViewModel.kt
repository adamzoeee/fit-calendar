package com.fitcalendar.ui.week

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitcalendar.data.local.entity.Exercise
import com.fitcalendar.data.local.entity.PlanDay
import com.fitcalendar.data.repository.PlanRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.*
import javax.inject.Inject

data class DayWithExercises(
    val date: LocalDate,
    val dayOfWeekLabel: String,
    val planDay: PlanDay?,
    val exercises: List<Exercise> = emptyList()
)

data class WeekUiState(
    val weekLabel: String = "",
    val weekStart: LocalDate = LocalDate.now(),
    val days: List<DayWithExercises> = emptyList(),
    val hasActivePlan: Boolean = false
)

@HiltViewModel
class WeekViewModel @Inject constructor(
    private val planRepository: PlanRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WeekUiState())
    val uiState: StateFlow<WeekUiState> = _uiState.asStateFlow()

    init { loadWeek(LocalDate.now()) }

    fun previousWeek() { loadWeek(_uiState.value.weekStart.minusWeeks(1)) }
    fun nextWeek() { loadWeek(_uiState.value.weekStart.plusWeeks(1)) }

    private fun loadWeek(anyDayInWeek: LocalDate) {
        viewModelScope.launch {
            val activePlan = planRepository.activePlan.first() ?: run {
                _uiState.update { it.copy(hasActivePlan = false) }
                return@launch
            }
            val monday = anyDayInWeek.with(DayOfWeek.MONDAY)
            val sunday = monday.plusDays(6)
            val weekNum = monday.get(WeekFields.of(Locale.getDefault()).weekOfYear())
            val weekLabel = "第${weekNum}周  ${monday} - ${sunday}"

            val days = planRepository.getDaysForPlan(activePlan.id)
            val weekDays = (0..6).map { offset ->
                val date = monday.plusDays(offset.toLong())
                val dayOfWeek = date.dayOfWeek.value - 1
                val planDay = days.find { it.dayIndex == dayOfWeek }
                val exercises = if (planDay != null) planRepository.getExercisesForDay(planDay.id) else emptyList()
                DayWithExercises(
                    date = date,
                    dayOfWeekLabel = date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.CHINESE),
                    planDay = planDay,
                    exercises = exercises
                )
            }
            _uiState.update { it.copy(hasActivePlan = true, weekStart = monday, weekLabel = weekLabel, days = weekDays) }
        }
    }
}
