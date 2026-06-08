import { useState, useEffect, useCallback } from 'preact/hooks';
import { planDao, planDayDao, exerciseDao, trainingRecordDao } from '../db/database';
import type { Exercise, TrainingRecord } from '../db/database';
import { ExerciseCard } from '../components/ExerciseCard';
import { ExerciseDetailSheet } from '../components/ExerciseDetailSheet';

export interface ExerciseWithRecord {
  exercise: Exercise;
  lastRecord: TrainingRecord | null;
  completed: boolean;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getDayOfWeekIndex(date: Date): number {
  // JS: 0=Sun, 1=Mon ... 6=Sat
  // Our plan: 0=Mon, 1=Tue ... 6=Sun
  return (date.getDay() + 6) % 7;
}

export function TodayPage({ initialDate }: { initialDate?: string }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate) {
      const d = new Date(initialDate + 'T00:00:00');
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });
  const [dateLabel, setDateLabel] = useState('');
  const [planDayLabel, setPlanDayLabel] = useState('');
  const [exercises, setExercises] = useState<ExerciseWithRecord[]>([]);
  const [isRestDay, setIsRestDay] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithRecord | null>(null);

  const loadDay = useCallback(async (date: Date) => {
    setSelectedDate(date);
    const dateStr = formatDate(date);
    const dayOfWeek = getDayOfWeekIndex(date);
    const dowLabel = WEEKDAY_NAMES[dayOfWeek];

    const activePlan = await planDao.getActive();
    if (!activePlan) {
      setHasActivePlan(false);
      setDateLabel(`${dateStr} ${dowLabel}`);
      return;
    }

    const days = await planDayDao.getByPlanId(activePlan.id!);
    const planDay = days.find(d => d.dayIndex === dayOfWeek);
    setDateLabel(`${dateStr} ${dowLabel}`);

    if (!planDay) {
      setHasActivePlan(true);
      setPlanDayLabel('');
      setExercises([]);
      setIsRestDay(true);
      return;
    }

    const exs = await exerciseDao.getByPlanDayId(planDay.id!);
    const isRest = planDay.label.includes('休息') || exs.length === 0;

    if (isRest) {
      setHasActivePlan(true);
      setPlanDayLabel(planDay.label);
      setExercises([]);
      setIsRestDay(true);
      return;
    }

    const withRecords: ExerciseWithRecord[] = await Promise.all(
      exs.map(async (ex) => {
        const record = await trainingRecordDao.getLatest(ex.name, dateStr);
        return { exercise: ex, lastRecord: record || null, completed: (record?.repsDone ?? 0) > 0 };
      })
    );

    setHasActivePlan(true);
    setPlanDayLabel(planDay.label);
    setExercises(withRecords);
    setIsRestDay(false);
  }, []);

  useEffect(() => {
    loadDay(selectedDate);
  }, []);

  const previousDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    loadDay(d);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    loadDay(d);
  };

  const saveWeight = async (exerciseName: string, weight: number) => {
    const dateStr = formatDate(selectedDate);
    const existing = await trainingRecordDao.getLatest(exerciseName, dateStr);
    await trainingRecordDao.saveRecord(
      exerciseName, dateStr, weight,
      existing?.repsDone ?? 0,
      existing?.notes ?? ''
    );
    loadDay(selectedDate);
  };

  const toggleCompleted = async (exerciseName: string, checked: boolean) => {
    const dateStr = formatDate(selectedDate);
    const existing = await trainingRecordDao.getLatest(exerciseName, dateStr);
    const currentWeight = existing?.weight ??
      exercises.find(e => e.exercise.name === exerciseName)?.lastRecord?.weight ?? 0;
    await trainingRecordDao.saveRecord(
      exerciseName, dateStr, currentWeight,
      checked ? 12 : 0,
      existing?.notes ?? ''
    );
    loadDay(selectedDate);
  };

  return (
    <div class="page-content">
      {/* Date Header */}
      <div class="flex items-center justify-between px-4 py-2">
        <button class="btn btn-secondary" onClick={previousDay} aria-label="前一天">
          ←
        </button>
        <div class="flex flex-col items-center">
          <span class="text-lg font-bold">{dateLabel}</span>
          {planDayLabel && <span class="text-sm text-secondary">{planDayLabel}</span>}
        </div>
        <button class="btn btn-secondary" onClick={nextDay} aria-label="后一天">
          →
        </button>
      </div>

      {/* Content */}
      {!hasActivePlan ? (
        <div class="empty-state">
          <div class="text-xl font-bold">还没有训练计划</div>
          <div class="text-secondary">请到「计划」页面生成</div>
        </div>
      ) : isRestDay ? (
        <div class="empty-state">
          <div class="text-xl font-bold">今日休息 💤</div>
        </div>
      ) : (
        <div class="px-4">
          {exercises.map((item) => (
            <ExerciseCard
              key={item.exercise.id}
              item={item}
              onClick={() => setSelectedExercise(item)}
              onWeightClick={() => setSelectedExercise(item)}
              onCheckToggle={(checked) => toggleCompleted(item.exercise.name, checked)}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      {selectedExercise && (
        <ExerciseDetailSheet
          exercise={selectedExercise}
          onDismiss={() => setSelectedExercise(null)}
          onWeightSave={(w) => {
            saveWeight(selectedExercise.exercise.name, w);
            setSelectedExercise(null);
          }}
        />
      )}
    </div>
  );
}
