package com.fitcalendar.ui.plan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitcalendar.data.local.TokenDataStore
import com.fitcalendar.data.local.entity.Plan
import com.fitcalendar.data.remote.ScheduleResponse
import com.fitcalendar.data.repository.PlanRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlanUiState(
    val token: String = "",
    val prompt: String = "",
    val freeDesc: String = "",
    val plans: List<Plan> = emptyList(),
    val activePlanId: Long? = null,
    val isGenerating: Boolean = false,
    val generatedSchedule: ScheduleResponse? = null,
    val showPreview: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class PlanViewModel @Inject constructor(
    private val repository: PlanRepository,
    private val tokenDataStore: TokenDataStore
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlanUiState())
    val uiState: StateFlow<PlanUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            tokenDataStore.token.collect { token ->
                _uiState.update { it.copy(token = token) }
            }
        }
        viewModelScope.launch {
            repository.allPlans.collect { plans ->
                _uiState.update { it.copy(plans = plans) }
            }
        }
        viewModelScope.launch {
            repository.activePlan.collect { plan ->
                _uiState.update { it.copy(activePlanId = plan?.id) }
            }
        }
    }

    fun onTokenChange(value: String) { _uiState.update { it.copy(token = value) } }
    fun saveToken() { viewModelScope.launch { tokenDataStore.saveToken(_uiState.value.token) } }
    fun onPromptChange(value: String) { _uiState.update { it.copy(prompt = value) } }
    fun onFreeDescChange(value: String) { _uiState.update { it.copy(freeDesc = value) } }

    fun generate() {
        val token = _uiState.value.token
        val prompt = _uiState.value.prompt.ifBlank { _uiState.value.freeDesc }
        if (token.isBlank() || prompt.isBlank()) {
            _uiState.update { it.copy(error = "请填写 Token 和训练描述") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isGenerating = true, error = null) }
            val result = repository.generatePlan(token, prompt)
            result.fold(
                onSuccess = { schedule ->
                    _uiState.update { it.copy(isGenerating = false, generatedSchedule = schedule, showPreview = true) }
                },
                onFailure = { e ->
                    _uiState.update { it.copy(isGenerating = false, error = "生成失败: ${e.message}") }
                }
            )
        }
    }

    fun confirmGenerated() {
        val schedule = _uiState.value.generatedSchedule ?: return
        viewModelScope.launch {
            repository.saveGeneratedPlan(schedule)
            _uiState.update { it.copy(showPreview = false, generatedSchedule = null, prompt = "", freeDesc = "") }
        }
    }

    fun dismissPreview() { _uiState.update { it.copy(showPreview = false, generatedSchedule = null) } }
    fun switchPlan(planId: Long) { viewModelScope.launch { repository.activatePlan(planId) } }
    fun clearError() { _uiState.update { it.copy(error = null) } }
}
