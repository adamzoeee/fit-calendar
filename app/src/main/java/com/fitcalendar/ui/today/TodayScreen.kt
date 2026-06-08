package com.fitcalendar.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.fitcalendar.ui.theme.TextGray
import java.time.LocalDate

@Composable
fun TodayScreen(
    viewModel: TodayViewModel = hiltViewModel(),
    initialDate: String = ""
) {
    LaunchedEffect(initialDate) {
        if (initialDate.isNotBlank()) {
            try {
                val date = LocalDate.parse(initialDate)
                viewModel.goToDate(date)
            } catch (_: Exception) {}
        }
    }

    val state by viewModel.uiState.collectAsState()
    var selectedExercise by remember { mutableStateOf<ExerciseWithRecord?>(null) }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = viewModel::previousDay) { Icon(Icons.Default.ChevronLeft, "前一天") }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.dateLabel, style = MaterialTheme.typography.titleLarge)
                if (state.planDayLabel.isNotBlank()) Text(state.planDayLabel, style = MaterialTheme.typography.bodySmall, color = TextGray)
            }
            IconButton(onClick = viewModel::nextDay) { Icon(Icons.Default.ChevronRight, "后一天") }
        }

        if (!state.hasActivePlan) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("还没有训练计划", style = MaterialTheme.typography.headlineSmall)
                    Text("请到「计划」页面生成", style = MaterialTheme.typography.bodyMedium, color = TextGray)
                }
            }
        } else if (state.isRestDay) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("今日休息 💤", style = MaterialTheme.typography.headlineMedium) }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                itemsIndexed(state.exercises) { _, item ->
                    ExerciseCard(
                        item = item,
                        onClick = { selectedExercise = item },
                        onWeightClick = { selectedExercise = item },
                        onCheckToggle = { checked -> viewModel.toggleExerciseCompleted(item.exercise.name, checked) }
                    )
                }
            }
        }
    }

    selectedExercise?.let { exercise ->
        ExerciseDetailSheet(
            exercise = exercise,
            onDismiss = { selectedExercise = null },
            onWeightSave = { weight -> viewModel.saveWeight(exercise.exercise.name, weight) }
        )
    }
}
