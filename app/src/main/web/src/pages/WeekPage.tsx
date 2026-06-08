import { useState, useEffect, useCallback } from 'preact/hooks';
import { planDao, planDayDao, exerciseDao } from '../db/database';
import type { PlanDay, Exercise } from '../db/database';

interface DayWithExercises {
  date: string;
  dayOfWeekLabel: string;
  planDay: PlanDay | null;
  exercises: Exercise[];
}

const WEEKDAY_SHORT = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// Map Chinese muscle group names to CSS class suffixes
function muscleCssClass(muscleGroup: string): string {
  const m = muscleGroup.toLowerCase();
  if (/胸/.test(m)) return 'muscle-chest';
  if (/背/.test(m) || /lat/.test(m) || /背阔/.test(m)) return 'muscle-back';
  if (/肩/.test(m) || /三角/.test(m)) return 'muscle-shoulders';
  if (/腿|股|臀|小腿|腘绳/.test(m)) return 'muscle-legs';
  if (/臂|肱|二头|三头|前臂/.test(m)) return 'muscle-arms';
  if (/腹|核心|腰|core|ab/.test(m)) return 'muscle-core';
  if (/有氧|心肺|cardio|跑步|跳绳/.test(m)) return 'muscle-cardio';
  if (/全身|复合/.test(m)) return 'muscle-fullbody';
  return 'muscle-other';
}

export function WeekPage({ onDayClick }: { onDayClick?: (dateStr: string) => void }) {
  const [weekLabel, setWeekLabel] = useState('');
  const [days, setDays] = useState<DayWithExercises[]>([]);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const loadWeek = useCallback(async (anyDayInWeek: Date) => {
    const monday = getMonday(anyDayInWeek);
    setWeekStart(monday);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const weekNum = getWeekNumber(monday);
    setWeekLabel(`第${weekNum}周  ${formatISODate(monday)} - ${formatISODate(sunday)}`);

    const activePlan = await planDao.getActive();
    if (!activePlan) {
      setHasActivePlan(false);
      setDays([]);
      return;
    }

    const planDays = await planDayDao.getByPlanId(activePlan.id!);

    const weekDays: DayWithExercises[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      const dateStr = formatISODate(date);
      const dayIndex = i;
      const planDay = planDays.find(d => d.dayIndex === dayIndex) || null;
      const exs = planDay ? await exerciseDao.getByPlanDayId(planDay.id!) : [];

      weekDays.push({
        date: dateStr,
        dayOfWeekLabel: WEEKDAY_SHORT[i],
        planDay,
        exercises: exs,
      });
    }

    setHasActivePlan(true);
    setDays(weekDays);
  }, []);

  useEffect(() => {
    loadWeek(weekStart);
  }, []);

  const previousWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    loadWeek(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    loadWeek(d);
  };

  return (
    <div class="page-content">
      {/* Sticky Header */}
      <div class="week-header-bar">
        <button class="btn btn-secondary" onClick={previousWeek} aria-label="前一周">←</button>
        <span class="week-label">{weekLabel}</span>
        <button class="btn btn-secondary" onClick={nextWeek} aria-label="后一周">→</button>
      </div>

      {!hasActivePlan ? (
        <div class="empty-state">
          <div class="text-xl font-bold">还没有训练计划</div>
          <div class="text-secondary">请到「计划」页面生成</div>
        </div>
      ) : (
        <div class="week-list">
          {days.map((day) => {
            const date = new Date(day.date + 'T00:00:00');
            const isRest = (day.planDay?.label.includes('休息') || day.exercises.length === 0) && day.planDay != null;
            const planLabel = day.planDay
              ? day.planDay.label.split('-').pop()?.trim() || day.planDay.label
              : '';

            return (
              <div
                key={day.date}
                class="week-day-card"
                onClick={() => onDayClick?.(day.date)}
              >
                {/* Left: weekday + date */}
                <div class="week-day-left">
                  <span class="week-day-label">{day.dayOfWeekLabel}</span>
                  <span class="week-day-date">{date.getMonth() + 1}/{date.getDate()}</span>
                  {planLabel && <span class="week-day-plan">{planLabel}</span>}
                </div>

                {/* Body: exercise chips or rest badge */}
                <div class="week-day-body">
                  {isRest ? (
                    <span class="week-rest-badge">🟢 休息</span>
                  ) : day.exercises.length === 0 && !day.planDay ? (
                    <span class="text-sm text-secondary">—</span>
                  ) : (
                    day.exercises.map((ex) => (
                      <span key={ex.id ?? ex.name} class={`week-chip ${muscleCssClass(ex.muscleGroup)}`}>
                        {ex.name}<br/>{ex.sets}×{ex.reps}
                      </span>
                    ))
                  )}
                </div>

                {/* Right arrow */}
                <span class="week-day-arrow">›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
