package com.fitcalendar.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector

data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

val navItems = listOf(
    BottomNavItem("today", "今日", Icons.Default.Today),
    BottomNavItem("week", "周视图", Icons.Default.CalendarMonth),
    BottomNavItem("plan", "计划", Icons.Default.FitnessCenter),
)

@Composable
fun BottomNavBar(currentRoute: String?, onItemClick: (String) -> Unit) {
    NavigationBar {
        navItems.forEach { item ->
            NavigationBarItem(
                icon = { Icon(item.icon, contentDescription = item.label) },
                label = { Text(item.label) },
                selected = currentRoute == item.route,
                onClick = { onItemClick(item.route) }
            )
        }
    }
}
