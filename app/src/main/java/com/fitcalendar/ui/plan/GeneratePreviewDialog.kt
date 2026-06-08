package com.fitcalendar.ui.plan

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fitcalendar.data.remote.ScheduleResponse

@Composable
fun GeneratePreviewDialog(
    schedule: ScheduleResponse,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("预览: ${schedule.planName}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                schedule.days.forEach { day ->
                    Text("${day.label} — ${day.exercises.size} 个动作", style = MaterialTheme.typography.bodyMedium)
                }
                Spacer(Modifier.height(8.dp))
                Text("确认保存并设为当前计划？", style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = { Button(onClick = onConfirm) { Text("确认保存") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } }
    )
}
