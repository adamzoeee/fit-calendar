import { useState, useEffect, useCallback } from 'preact/hooks';
import { planDao, planDayDao, exerciseDao } from '../db/database';
import type { Plan } from '../db/database';
import { tokenStore } from '../store/tokenStore';
import { generateSchedule } from '../api/deepseek';
import type { ScheduleResponse } from '../api/deepseek';

export function PlanPage({ onGenerateComplete }: { onGenerateComplete?: () => void }) {
  const [token, setToken] = useState('');
  const [prompt, setPrompt] = useState('');
  const [freeDesc, setFreeDesc] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<ScheduleResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const loadPlans = useCallback(async () => {
    const all = await planDao.getAll();
    const active = await planDao.getActive();
    setPlans(all);
    setActivePlanId(active?.id ?? null);
  }, []);

  useEffect(() => {
    setToken(tokenStore.get());
    loadPlans();
  }, []);

  const handleGenerate = async () => {
    const userPrompt = prompt.trim() || freeDesc.trim();
    if (!token.trim() || !userPrompt) {
      setError('请填写 Token 和训练描述');
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      const schedule = await generateSchedule(token.trim(), userPrompt);
      setGeneratedSchedule(schedule);
      setShowPreview(true);
    } catch (e: any) {
      setError(`生成失败: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!generatedSchedule) return;
    try {
      const planName = generatedSchedule.planName || 'AI 生成计划';
      const planId = await planDao.insert({ name: planName, isActive: 0, createdAt: Date.now() });

      for (let i = 0; i < generatedSchedule.days.length; i++) {
        const dayDto = generatedSchedule.days[i];
        const planDayId = await planDayDao.insert({
          planId: Number(planId),
          dayIndex: i,
          label: dayDto.label,
        });

        const exercises = dayDto.exercises.map((ex, j) => ({
          planDayId: Number(planDayId),
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          muscleGroup: ex.muscleGroup,
          instructions: ex.instructions,
          sortOrder: j,
        }));

        if (exercises.length > 0) {
          await exerciseDao.insertAll(exercises);
        }
      }

      await planDao.activateAndDeactivateOthers(Number(planId));
      setShowPreview(false);
      setGeneratedSchedule(null);
      setPrompt('');
      setFreeDesc('');
      await loadPlans();
      onGenerateComplete?.();
    } catch (e: any) {
      setError(`保存失败: ${e.message}`);
      setShowPreview(false);
    }
  };

  const handleSwitchPlan = async (id: number) => {
    await planDao.activateAndDeactivateOthers(id);
    setDropdownOpen(false);
    await loadPlans();
  };

  const activePlanName = plans.find(p => p.id === activePlanId)?.name || '无计划';

  return (
    <div class="page-content p-4">
      {/* Current Plan */}
      <div class="text-lg font-bold mb-4">当前计划</div>
      <div class="dropdown" style="position: relative">
        <div
          class="input flex items-center justify-between"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style="cursor: pointer"
        >
          <span>{activePlanName}</span>
          <span style="color: var(--text-secondary)">▼</span>
        </div>
        {dropdownOpen && (
          <div class="dropdown-menu">
            {plans.map((plan) => (
              <div
                key={plan.id}
                class="dropdown-item"
                onClick={() => handleSwitchPlan(plan.id!)}
              >
                {plan.name}{plan.id === activePlanId ? ' ✓' : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      <div class="divider" />

      {/* API Token */}
      <div class="text-lg font-bold mb-4">📡 API Token</div>
      <div class="flex gap-2">
        <input
          class="input flex-1"
          type="password"
          value={token}
          onInput={(e) => setToken((e.target as HTMLInputElement).value)}
          placeholder="DeepSeek Token"
        />
        <button
          class="btn btn-primary"
          onClick={() => {
            tokenStore.save(token);
            setError('Token 已保存');
            setTimeout(() => setError(''), 2000);
          }}
        >
          保存
        </button>
      </div>

      <div class="divider" />

      {/* Generate */}
      <div class="text-lg font-bold mb-4">✍️ 生成新计划</div>
      <textarea
        class="input"
        value={prompt}
        onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
        placeholder="提示词（如：我想练五分化...）"
        rows={3}
      />
      <div class="text-sm text-secondary mt-2 mb-2">或</div>
      <textarea
        class="input"
        value={freeDesc}
        onInput={(e) => setFreeDesc((e.target as HTMLTextAreaElement).value)}
        placeholder="自由描述（如：周一练胸...）"
        rows={3}
      />
      <button
        class="btn btn-primary w-full mt-4"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <span class="spinner" /> DeepSeek 正在生成...
          </>
        ) : (
          '⚡ 生成日程'
        )}
      </button>

      {error && (
        <div class="mt-4 p-3" style="background: rgba(233,69,96,0.15); border-radius: 8px; color: var(--accent); font-size: 14px;">
          {error}
        </div>
      )}

      <div class="divider" />

      {/* Saved Plans */}
      <div class="text-lg font-bold mb-4">已保存计划</div>
      {plans.length === 0 ? (
        <div class="text-secondary text-sm">暂无计划，请先生成一个</div>
      ) : (
        plans.map((plan) => (
          <div key={plan.id} class="py-2 text-sm">
            · {plan.name} {plan.id === activePlanId ? '(当前)' : ''}
          </div>
        ))
      )}

      {/* Preview Dialog */}
      {showPreview && generatedSchedule && (
        <div class="modal-overlay" onClick={() => setShowPreview(false)}>
          <div class="dialog" onClick={(e) => e.stopPropagation()}>
            <div class="text-lg font-bold mb-4">预览: {generatedSchedule.planName}</div>
            <div class="flex flex-col gap-2 mb-4">
              {generatedSchedule.days.map((day, i) => (
                <div key={i} class="text-sm">
                  {day.label} — {day.exercises.length} 个动作
                </div>
              ))}
            </div>
            <div class="text-sm text-secondary mb-4">确认保存并设为当前计划？</div>
            <div class="flex gap-2 justify-end">
              <button class="btn btn-secondary" onClick={() => setShowPreview(false)}>取消</button>
              <button class="btn btn-primary" onClick={handleConfirm}>确认保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
