import { useState } from 'preact/hooks';
import type { ExerciseWithRecord } from '../pages/TodayPage';

interface ExerciseDetailSheetProps {
  exercise: ExerciseWithRecord;
  onDismiss: () => void;
  onWeightSave: (weight: number) => void;
}

export function ExerciseDetailSheet({ exercise, onDismiss, onWeightSave }: ExerciseDetailSheetProps) {
  const [weightInput, setWeightInput] = useState(
    exercise.lastRecord?.weight?.toString() ?? ''
  );

  return (
    <div class="modal-overlay" onClick={onDismiss}>
      <div class="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <h2 class="text-xl font-bold">{exercise.exercise.name}</h2>
        <p class="text-accent mt-2">
          {exercise.exercise.sets}组 × {exercise.exercise.reps}次 | 休息 {exercise.exercise.restSeconds}s | {exercise.exercise.muscleGroup}
        </p>

        <h3 class="text-lg font-bold mt-4">动作要点</h3>
        <p class="text-sm mt-2" style="line-height: 1.6">
          {exercise.exercise.instructions}
        </p>

        <div class="divider" />

        <h3 class="text-lg font-bold">本次训练</h3>
        <div class="flex gap-3 items-center mt-2">
          <input
            class="input flex-1"
            type="number"
            inputMode="decimal"
            value={weightInput}
            onInput={(e) => setWeightInput((e.target as HTMLInputElement).value)}
            placeholder="重量 (kg)"
          />
          <button
            class="btn btn-primary"
            onClick={() => {
              const w = parseFloat(weightInput);
              if (!isNaN(w) && w > 0) onWeightSave(w);
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
