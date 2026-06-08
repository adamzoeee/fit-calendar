package com.fitcalendar.ui.plan

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanScreen(
    viewModel: PlanViewModel = hiltViewModel(),
    onGenerateComplete: () -> Unit = {}
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.error) {
        state.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("当前计划", style = MaterialTheme.typography.titleMedium)
            var expanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                val activePlanName = state.plans.find { it.id == state.activePlanId }?.name ?: "无计划"
                OutlinedTextField(
                    value = activePlanName, onValueChange = {}, readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    state.plans.forEach { plan ->
                        DropdownMenuItem(
                            text = { Text(plan.name + if (plan.isActive) " ✓" else "") },
                            onClick = { viewModel.switchPlan(plan.id); expanded = false }
                        )
                    }
                }
            }

            Divider()

            Text("📡 API Token", style = MaterialTheme.typography.titleMedium)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = state.token, onValueChange = viewModel::onTokenChange,
                    label = { Text("DeepSeek Token") }, modifier = Modifier.weight(1f), singleLine = true
                )
                Button(onClick = viewModel::saveToken, modifier = Modifier.align(Alignment.CenterVertically)) { Text("保存") }
            }

            Divider()

            Text("✍️ 生成新计划", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = state.prompt, onValueChange = viewModel::onPromptChange,
                label = { Text("提示词（如：我想练五分化...）") }, modifier = Modifier.fillMaxWidth(), minLines = 3
            )
            Text("或", style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = state.freeDesc, onValueChange = viewModel::onFreeDescChange,
                label = { Text("自由描述（如：周一练胸...）") }, modifier = Modifier.fillMaxWidth(), minLines = 3
            )
            Button(
                onClick = viewModel::generate, modifier = Modifier.fillMaxWidth(), enabled = !state.isGenerating
            ) {
                if (state.isGenerating) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("DeepSeek 正在生成...")
                } else { Text("⚡ 生成日程") }
            }

            Divider()

            Text("已保存计划", style = MaterialTheme.typography.titleMedium)
            if (state.plans.isEmpty()) Text("暂无计划，请先生成一个", style = MaterialTheme.typography.bodySmall)
            else state.plans.forEach { plan ->
                Text("· ${plan.name} ${if (plan.isActive) "(当前)" else ""}", Modifier.padding(vertical = 4.dp))
            }
        }
    }

    if (state.showPreview && state.generatedSchedule != null) {
        GeneratePreviewDialog(
            schedule = state.generatedSchedule!!,
            onConfirm = { viewModel.confirmGenerated(); onGenerateComplete() },
            onDismiss = viewModel::dismissPreview
        )
    }
}
