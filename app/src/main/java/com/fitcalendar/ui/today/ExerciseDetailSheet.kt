package com.fitcalendar.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.fitcalendar.ui.theme.OrangePrimary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseDetailSheet(
    exercise: ExerciseWithRecord,
    onDismiss: () -> Unit,
    onWeightSave: (Double) -> Unit
) {
    var weightInput by remember { mutableStateOf(exercise.lastRecord?.weight?.toString() ?: "") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(24.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(exercise.exercise.name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("${exercise.exercise.sets}组 × ${exercise.exercise.reps}次 | 休息 ${exercise.exercise.restSeconds}s | ${exercise.exercise.muscleGroup}", color = OrangePrimary)
            Text("动作要点", style = MaterialTheme.typography.titleMedium)
            Text(exercise.exercise.instructions, style = MaterialTheme.typography.bodyMedium)
            Divider()
            Text("本次训练", style = MaterialTheme.typography.titleMedium)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = weightInput, onValueChange = { weightInput = it },
                    label = { Text("重量 (kg)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f), singleLine = true
                )
                Button(onClick = { weightInput.toDoubleOrNull()?.let { onWeightSave(it) } }) { Text("保存") }
            }
        }
    }
}
