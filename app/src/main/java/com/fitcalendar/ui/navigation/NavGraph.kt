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

@Composable
fun NavGraph(navController: NavHostController, modifier: Modifier = Modifier) {
    NavHost(
        navController = navController,
        startDestination = "today",
        modifier = modifier
    ) {
        composable("today") {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("今日视图 - 待实现")
            }
        }
        composable("week") {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("周视图 - 待实现")
            }
        }
        composable("plan") {
            PlanScreen()
        }
    }
}
