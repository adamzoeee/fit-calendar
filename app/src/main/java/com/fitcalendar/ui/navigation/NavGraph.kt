package com.fitcalendar.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.fitcalendar.ui.plan.PlanScreen
import com.fitcalendar.ui.today.TodayScreen
import com.fitcalendar.ui.week.WeekScreen

@Composable
fun NavGraph(navController: NavHostController, modifier: Modifier = Modifier) {
    NavHost(
        navController = navController,
        startDestination = "today",
        modifier = modifier
    ) {
        composable("today") {
            TodayScreen()
        }
        composable("week") {
            WeekScreen(onDayClick = { dateStr ->
                navController.navigate("today") {
                    popUpTo("today") { inclusive = true }
                }
            })
        }
        composable("plan") {
            PlanScreen()
        }
    }
}
