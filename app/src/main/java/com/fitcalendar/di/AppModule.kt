package com.fitcalendar.di

import android.content.Context
import androidx.room.Room
import com.fitcalendar.data.local.AppDatabase
import com.fitcalendar.data.local.TokenDataStore
import com.fitcalendar.data.local.dao.*
import com.fitcalendar.data.remote.DeepSeekApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(context, AppDatabase::class.java, "fitcalendar.db")
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun providePlanDao(db: AppDatabase): PlanDao = db.planDao()

    @Provides
    fun providePlanDayDao(db: AppDatabase): PlanDayDao = db.planDayDao()

    @Provides
    fun provideExerciseDao(db: AppDatabase): ExerciseDao = db.exerciseDao()

    @Provides
    fun provideTrainingRecordDao(db: AppDatabase): TrainingRecordDao = db.trainingRecordDao()

    @Provides
    @Singleton
    fun provideTokenDataStore(@ApplicationContext context: Context): TokenDataStore {
        return TokenDataStore(context)
    }

    @Provides
    @Singleton
    fun provideDeepSeekApiService(): DeepSeekApiService {
        return DeepSeekApiService()
    }
}
