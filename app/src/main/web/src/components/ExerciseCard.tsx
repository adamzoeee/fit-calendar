import type { ExerciseWithRecord } from '../pages/TodayPage';

interface ExerciseCardProps {
  item: ExerciseWithRecord;
  onClick: () => void;
  onWeightClick: () => void;
  onCheckToggle: (checked: boolean) => void;
}

export function ExerciseCard({ item, onClick, onWeightClick, onCheckToggle }: ExerciseCardProps) {
  return (
    <div class="card" onClick={onClick} style="cursor: pointer">
      <div class="flex items-center justify-between">
        <span class="text-lg font-bold">{item.exercise.name}</span>
        <input
          type="checkbox"
          class="checkbox"
          checked={item.completed}
          onChange={(e) => onCheckToggle((e.target as HTMLInputElement).checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div class="flex gap-4 mt-2 text-sm">
        <span>{item.exercise.sets}组 × {item.exercise.reps}次</span>
        <span class="text-secondary">休息 {item.exercise.restSeconds}s</span>
        <div class="flex-1" />
        <span class="text-accent font-bold">{item.exercise.muscleGroup}</span>
      </div>
      <div class="flex justify-end mt-2">
        <button
          class="btn btn-secondary text-sm"
          onClick={(e) => { e.stopPropagation(); onWeightClick(); }}
        >
          上次: {item.lastRecord ? `${item.lastRecord.weight}kg` : '暂无记录'}
        </button>
      </div>
    </div>
  );
}
