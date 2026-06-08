package com.fitcalendar.ui.week

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.fitcalendar.ui.theme.*

@Composable
fun WeekScreen(
    viewModel: WeekViewModel = hiltViewModel(),
    onDayClick: (String) -> Unit = {}
) {
    val state by viewModel.uiState.collectAsState()

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = viewModel::previousWeek) { Icon(Icons.Default.ChevronLeft, "前一周") }
            Text(state.weekLabel, style = MaterialTheme.typography.titleLarge)
            IconButton(onClick = viewModel::nextWeek) { Icon(Icons.Default.ChevronRight, "后一周") }
        }

        if (!state.hasActivePlan) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("还没有训练计划", style = MaterialTheme.typography.headlineSmall) }
        } else {
            val maxCols = state.days.maxOfOrNull { it.exercises.size } ?: 0
            LazyColumn(Modifier.fillMaxSize().padding(horizontal = 8.dp)) {
                item {
                    Row(Modifier.fillMaxWidth()) {
                        Box(Modifier.weight(1f).padding(4.dp)) { Text("日期", fontWeight = FontWeight.Bold, color = TextWhite) }
                        repeat(maxCols.coerceAtLeast(1)) { i ->
                            Box(Modifier.weight(1.5f).padding(4.dp)) { Text("动作${i + 1}", fontWeight = FontWeight.Bold, color = OrangePrimary) }
                        }
                    }
                    Divider()
                }
                items(state.days.size) { index ->
                    val day = state.days[index]
                    Row(Modifier.fillMaxWidth().clickable { onDayClick(day.date.toString()) }.padding(vertical = 8.dp)) {
                        Column(Modifier.weight(1f).padding(4.dp)) {
                            Text(day.dayOfWeekLabel, fontWeight = FontWeight.Bold, color = TextWhite)
                            Text("${day.date.monthValue}/${day.date.dayOfMonth}", style = MaterialTheme.typography.bodySmall, color = TextGray)
                            if (day.planDay != null) Text(day.planDay.label.split("-").lastOrNull()?.trim() ?: "", style = MaterialTheme.typography.bodySmall, color = OrangePrimary)
                        }
                        if (day.exercises.isEmpty() && (day.planDay == null || day.planDay.label.contains("休息"))) {
                            Box(Modifier.weight(1.5f * maxCols.coerceAtLeast(1)).padding(4.dp)) { Text("休息日 🟢", color = SuccessGreen) }
                        } else {
                            repeat(maxCols.coerceAtLeast(1)) { col ->
                                Box(Modifier.weight(1.5f).padding(4.dp)) {
                                    val ex = day.exercises.getOrNull(col)
                                    if (ex != null) Text("${ex.name}\n${ex.sets}×${ex.reps}", style = MaterialTheme.typography.bodySmall, color = TextWhite)
                                }
                            }
                        }
                    }
                    Divider()
                }
            }
        }
    }
}
