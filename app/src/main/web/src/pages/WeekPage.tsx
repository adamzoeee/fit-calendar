import { useState, useEffect, useCallback } from 'preact/hooks';
import { planDao, planDayDao, exerciseDao } from '../db/database';
import type { PlanDay, Exercise } from '../db/database';

interface DayWithExercises {
  date: string; // YYYY-MM-DD
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
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
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
      const dayIndex = i; // 0=Mon ... 6=Sun matching our plan
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

  const maxCols = Math.max(1, ...days.map(d => d.exercises.length));

  return (
    <div class="page-content">
      {/* Week Header */}
      <div class="flex items-center justify-between px-4 py-2">
        <button class="btn btn-secondary" onClick={previousWeek}>←</button>
        <span class="text-lg font-bold">{weekLabel}</span>
        <button class="btn btn-secondary" onClick={nextWeek}>→</button>
      </div>

      {!hasActivePlan ? (
        <div class="empty-state">
          <div class="text-xl font-bold">还没有训练计划</div>
        </div>
      ) : (
        <div class="px-2">
          {/* Table Header */}
          <div class="flex w-full py-2" style="border-bottom: 1px solid var(--divider)">
            <div class="flex-1 px-1">
              <span class="text-sm font-bold" style="color: var(--text-primary)">日期</span>
            </div>
            {Array.from({ length: maxCols }, (_, i) => (
              <div class="px-1" style="flex: 1.5">
                <span class="text-sm font-bold" style="color: var(--accent-orange)">动作{i + 1}</span>
              </div>
            ))}
          </div>

          {/* Table Body */}
          {days.map((day) => {
            const date = new Date(day.date + 'T00:00:00');
            const isRest = day.planDay?.label.includes('休息') || day.exercises.length === 0;
            return (
              <div
                key={day.date}
                class="flex w-full py-2"
                style="border-bottom: 1px solid var(--divider); cursor: pointer"
                onClick={() => onDayClick?.(day.date)}
              >
                <div class="flex-1 px-1 flex flex-col">
                  <span class="font-bold">{day.dayOfWeekLabel}</span>
                  <span class="text-sm text-secondary">{date.getMonth() + 1}/{date.getDate()}</span>
                  {day.planDay && (
                    <span class="text-sm" style="color: var(--accent-orange)">
                      {day.planDay.label.split('-').pop()?.trim() || day.planDay.label}
                    </span>
                  )}
                </div>
                {isRest ? (
                  <div style={`flex: ${1.5 * maxCols}`} class="px-1">
                    <span class="text-sm text-success">休息日 🟢</span>
                  </div>
                ) : (
                  Array.from({ length: maxCols }, (_, col) => {
                    const ex = day.exercises[col];
                    return (
                      <div key={col} class="px-1" style="flex: 1.5">
                        {ex && (
                          <span class="text-sm" style="color: var(--text-primary)">
                            {ex.name}<br />{ex.sets}×{ex.reps}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
