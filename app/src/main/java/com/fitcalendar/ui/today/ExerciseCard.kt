package com.fitcalendar.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.fitcalendar.ui.theme.CardBackground
import com.fitcalendar.ui.theme.OrangePrimary
import com.fitcalendar.ui.theme.TextGray
import com.fitcalendar.ui.theme.TextWhite

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseCard(
    item: ExerciseWithRecord,
    onClick: () -> Unit,
    onWeightClick: () -> Unit,
    onCheckToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        onClick = onClick
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(item.exercise.name, style = MaterialTheme.typography.titleLarge, color = TextWhite)
                Checkbox(checked = item.completed, onCheckedChange = onCheckToggle, colors = CheckboxDefaults.colors(checkedColor = OrangePrimary))
            }
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("${item.exercise.sets}组 × ${item.exercise.reps}次", color = TextWhite)
                Text("休息 ${item.exercise.restSeconds}s", color = TextGray)
                Spacer(Modifier.weight(1f))
                Text(item.exercise.muscleGroup, color = OrangePrimary, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onWeightClick) {
                    val weightText = item.lastRecord?.weight?.let { "${it}kg" } ?: "暂无记录"
                    Text("上次: $weightText", color = TextGray)
                }
            }
        }
    }
}
