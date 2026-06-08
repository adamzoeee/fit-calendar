import { useState, useCallback } from 'preact/hooks';
import { BottomNav } from './components/BottomNav';
import { TodayPage } from './pages/TodayPage';
import { WeekPage } from './pages/WeekPage';
import { PlanPage } from './pages/PlanPage';

export function App() {
  const [route, setRoute] = useState('today');
  const [todayDate, setTodayDate] = useState<string | undefined>();

  const handleDayClick = useCallback((dateStr: string) => {
    setTodayDate(dateStr);
    setRoute('today');
  }, []);

  const handleGenerateComplete = useCallback(() => {
    setTodayDate(undefined);
    setRoute('today');
  }, []);

  return (
    <>
      {route === 'today' && <TodayPage key={todayDate || 'today'} initialDate={todayDate} />}
      {route === 'week' && <WeekPage onDayClick={handleDayClick} />}
      {route === 'plan' && <PlanPage onGenerateComplete={handleGenerateComplete} />}
      <BottomNav currentRoute={route} onNavigate={setRoute} />
    </>
  );
}
