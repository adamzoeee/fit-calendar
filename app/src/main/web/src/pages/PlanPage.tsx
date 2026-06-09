import { useState, useEffect, useCallback } from 'preact/hooks';
import { planDao, planDayDao, exerciseDao, getPlanSummaries, getPlanAsScheduleResponse, deletePlanCascade } from '../db/database';
import type { Plan, Exercise } from '../db/database';
import { tokenStore } from '../store/tokenStore';
import { generateSchedule } from '../api/deepseek';
import type { ScheduleResponse } from '../api/deepseek';

interface PlanSummary extends Plan {
  dayLabels: string[];
  dayCount: number;
}

export function PlanPage({ onGenerateComplete }: { onGenerateComplete?: () => void }) {
  // Token
  const [token, setToken] = useState('');

  // New plan generation
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<ScheduleResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');

  // Plan list
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);

  // Modify sheet
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyPlan, setModifyPlan] = useState<PlanSummary | null>(null);
  const [modifyStructure, setModifyStructure] = useState<{ planName: string; days: { label: string; exercises: Exercise[] }[] } | null>(null);
  const [modifyDesc, setModifyDesc] = useState('');
  const [modifyLoading, setModifyLoading] = useState(false);
  const [modifyResult, setModifyResult] = useState<ScheduleResponse | null>(null);
  const [modifyError, setModifyError] = useState('');

  const loadPlans = useCallback(async () => {
    const summaries = await getPlanSummaries();
    const active = await planDao.getActive();
    setPlans(summaries);
    setActivePlanId(active?.id ?? null);
  }, []);

  useEffect(() => {
    setToken(tokenStore.get());
    loadPlans();
  }, []);

  // ── New plan generation ──

  const handleGenerate = async () => {
    const userPrompt = description.trim();
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
      setDescription('');
      await loadPlans();
      onGenerateComplete?.();
    } catch (e: any) {
      setError(`保存失败: ${e.message}`);
      setShowPreview(false);
    }
  };

  // ── Plan list actions ──

  const handleSwitchPlan = async (id: number) => {
    await planDao.activateAndDeactivateOthers(id);
    await loadPlans();
  };

  const handleDeletePlan = async (id: number, e: Event) => {
    e.stopPropagation();
    if (!window.confirm('确定删除该计划吗？此操作不可撤销。')) return;
    await deletePlanCascade(id);
    await loadPlans();
  };

  // ── Modify sheet ──

  const handleModifyOpen = async (plan: PlanSummary, e: Event) => {
    e.stopPropagation();
    setModifyPlan(plan);
    setModifyDesc('');
    setModifyResult(null);
    setModifyError('');
    setModifyOpen(true);
    const structure = await getPlanAsScheduleResponse(plan.id!);
    setModifyStructure(structure);
  };

  const handleModifyGenerate = async () => {
    if (!token.trim() || !modifyDesc.trim() || !modifyStructure) {
      setModifyError('请填写修改描述');
      return;
    }
    setModifyLoading(true);
    setModifyError('');
    try {
      const result = await generateSchedule(
        token.trim(),
        modifyDesc.trim(),
        { planName: modifyStructure.planName, days: modifyStructure.days.map(d => ({
          label: d.label,
          exercises: d.exercises.map(ex => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            muscleGroup: ex.muscleGroup,
            instructions: ex.instructions,
          })),
        })) }
      );
      setModifyResult(result);
    } catch (e: any) {
      setModifyError(`生成失败: ${e.message}`);
    } finally {
      setModifyLoading(false);
    }
  };

  const handleModifyConfirm = async () => {
    if (!modifyResult) return;
    try {
      const planName = (modifyResult.planName || modifyPlan?.name || '修改版计划') + '（修改版）';
      const planId = await planDao.insert({ name: planName, isActive: 0, createdAt: Date.now() });

      for (let i = 0; i < modifyResult.days.length; i++) {
        const dayDto = modifyResult.days[i];
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
      setModifyOpen(false);
      setModifyPlan(null);
      setModifyStructure(null);
      setModifyResult(null);
      await loadPlans();
      onGenerateComplete?.();
    } catch (e: any) {
      setModifyError(`保存失败: ${e.message}`);
    }
  };

  const handleModifyClose = () => {
    setModifyOpen(false);
    setModifyPlan(null);
    setModifyStructure(null);
    setModifyResult(null);
    setModifyDesc('');
    setModifyError('');
  };

  // ── Render ──

  return (
    <div class="page-content p-4">
      {/* ── 1. API Token ── */}
      <div class="flex items-center justify-between mb-3">
        <span class="text-lg font-bold">🔑 DeepSeek API Token</span>
        <span class="text-sm text-secondary">仅保存在本地</span>
      </div>
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

      {/* ── 2. 生成新计划 ── */}
      <div class="text-lg font-bold mb-4">✍️ 生成新计划</div>
      <textarea
        class="input"
        value={description}
        onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
        placeholder="描述你想要的训练计划（如：五分化，周一到周五练胸/背/肩/腿/手臂，每天5个动作...）"
        rows={4}
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

      {/* ── 3. 当前已有计划 ── */}
      <div class="text-lg font-bold mb-4">当前已有计划</div>
      {plans.length === 0 ? (
        <div class="text-secondary text-sm">暂无计划，请先生成一个</div>
      ) : (
        plans.map((plan) => (
          <div
            key={plan.id}
            class="plan-card"
            onClick={() => handleSwitchPlan(plan.id!)}
          >
            <div class="plan-card-header">
              <span class="plan-card-name">{plan.name}</span>
              {plan.id === activePlanId && (
                <span class="plan-card-badge">当前</span>
              )}
            </div>
            <div class="plan-card-summary">
              {plan.dayLabels.join(' / ')} · {plan.dayCount} 天
            </div>
            <div class="plan-card-actions">
              <button
                class="btn-sm btn-outline"
                onClick={(e) => handleModifyOpen(plan, e)}
              >
                修改
              </button>
              <button
                class="btn-sm btn-danger"
                onClick={(e) => handleDeletePlan(plan.id!, e)}
              >
                删除
              </button>
            </div>
          </div>
        ))
      )}

      {/* ── New plan preview dialog ── */}
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

      {/* ── Modify bottom sheet ── */}
      {modifyOpen && modifyPlan && (
        <div class="modal-overlay" onClick={handleModifyClose}>
          <div class="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div class="text-lg font-bold mb-4">✏️ 修改：{modifyPlan.name}</div>

            {/* Current plan structure */}
            {modifyStructure && !modifyResult && (
              <div class="mb-4">
                <div class="text-sm text-secondary mb-2">当前计划结构：</div>
                {modifyStructure.days.map((day, i) => (
                  <div key={i} class="text-sm py-1" style="color: var(--text-primary);">
                    {day.label} — {day.exercises.length} 个动作
                  </div>
                ))}
              </div>
            )}

            {/* Modify description input (before result) */}
            {!modifyResult && (
              <>
                <textarea
                  class="input mb-3"
                  value={modifyDesc}
                  onInput={(e) => setModifyDesc((e.target as HTMLTextAreaElement).value)}
                  placeholder="描述你想要怎么修改（如：把周三改成练腿，增加周六有氧日...）"
                  rows={3}
                />
                <button
                  class="btn btn-primary w-full"
                  onClick={handleModifyGenerate}
                  disabled={modifyLoading}
                >
                  {modifyLoading ? (
                    <>
                      <span class="spinner" /> 正在生成...
                    </>
                  ) : (
                    '⚡ 生成修改方案'
                  )}
                </button>
              </>
            )}

            {modifyError && (
              <div class="mt-3 p-3" style="background: rgba(233,69,96,0.15); border-radius: 8px; color: var(--accent); font-size: 14px;">
                {modifyError}
              </div>
            )}

            {/* Modify result preview */}
            {modifyResult && (
              <>
                <div class="text-sm font-bold mb-3" style="color: var(--success);">预览修改结果：</div>
                {modifyResult.days.map((day, i) => (
                  <div key={i} class="text-sm py-1">
                    {day.label} — {day.exercises.length} 个动作
                  </div>
                ))}
                <div class="text-sm text-secondary mt-4 mb-4">确认保存为新计划？原计划将保留。</div>
                <div class="flex gap-2 justify-end">
                  <button class="btn btn-secondary" onClick={handleModifyClose}>取消</button>
                  <button class="btn btn-primary" onClick={handleModifyConfirm}>确认保存为新计划</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
