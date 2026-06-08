package com.fitcalendar.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class TokenDataStore(private val context: Context) {
    companion object {
        private val KEY_TOKEN = stringPreferencesKey("api_token")
    }

    val token: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[KEY_TOKEN] ?: ""
    }

    suspend fun saveToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[KEY_TOKEN] = token
        }
    }
}
