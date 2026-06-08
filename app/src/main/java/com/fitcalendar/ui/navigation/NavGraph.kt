package com.fitcalendar.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
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
        composable(
            route = "today?dateStr={dateStr}",
            arguments = listOf(navArgument("dateStr") { type = NavType.StringType; defaultValue = "" })
        ) { backStackEntry ->
            val dateStr = backStackEntry.arguments?.getString("dateStr") ?: ""
            TodayScreen(initialDate = dateStr)
        }
        composable("week") {
            WeekScreen(onDayClick = { dateStr ->
                navController.navigate("today?dateStr=$dateStr") {
                    popUpTo("today") { inclusive = true }
                }
            })
        }
        composable("plan") {
            PlanScreen(onGenerateComplete = {
                navController.navigate("today") {
                    popUpTo("today") { inclusive = true }
                }
            })
        }
    }
}
