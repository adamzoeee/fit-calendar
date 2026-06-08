import Dexie, { type EntityTable } from 'dexie';

// --- Entities (mirroring Room entities) ---

export interface Plan {
  id?: number;
  name: string;
  isActive: number; // 0 or 1
  createdAt: number;
}

export interface PlanDay {
  id?: number;
  planId: number;
  dayIndex: number;
  label: string;
}

export interface Exercise {
  id?: number;
  planDayId: number;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  muscleGroup: string;
  instructions: string;
  sortOrder: number;
}

export interface TrainingRecord {
  id?: number;
  exerciseName: string;
  date: string; // YYYY-MM-DD
  weight: number;
  repsDone: number;
  notes: string;
}

// --- Database ---

class FitCalendarDB extends Dexie {
  plans!: EntityTable<Plan, 'id'>;
  planDays!: EntityTable<PlanDay, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  trainingRecords!: EntityTable<TrainingRecord, 'id'>;

  constructor() {
    super('fitcalendar');

    this.version(1).stores({
      plans: '++id, isActive, createdAt',
      planDays: '++id, planId, [planId+dayIndex]',
      exercises: '++id, planDayId, [planDayId+sortOrder]',
      trainingRecords: '++id, exerciseName, date, [exerciseName+date]',
    });
  }
}

export const db = new FitCalendarDB();

// --- Plan DAO ---

export const planDao = {
  getAll: () => db.plans.orderBy('createdAt').reverse().toArray(),
  getActive: () => db.plans.where('isActive').equals(1).first(),
  getById: (id: number) => db.plans.get(id),
  insert: (plan: Plan) => db.plans.add(plan),
  update: (plan: Plan) => db.plans.update(plan.id!, plan),
  delete: (id: number) => db.plans.delete(id),
  async activateAndDeactivateOthers(id: number) {
    await db.transaction('rw', db.plans, async () => {
      const all = await db.plans.toArray();
      for (const p of all) {
        await db.plans.update(p.id!, { isActive: (p.id === id ? 1 : 0) as number });
      }
    });
  },
};

// --- PlanDay DAO ---

export const planDayDao = {
  getByPlanId: (planId: number) =>
    db.planDays.where('planId').equals(planId).sortBy('dayIndex'),
  insert: (planDay: PlanDay) => db.planDays.add(planDay),
  async insertAll(planDays: PlanDay[]) {
    const ids: number[] = [];
    for (const pd of planDays) {
      ids.push((await db.planDays.add(pd)) as number);
    }
    return ids;
  },
  deleteByPlanId: (planId: number) =>
    db.planDays.where('planId').equals(planId).delete(),
};

// --- Exercise DAO ---

export const exerciseDao = {
  getByPlanDayId: (planDayId: number) =>
    db.exercises.where('planDayId').equals(planDayId).sortBy('sortOrder'),
  async insertAll(exercises: Exercise[]) {
    for (const ex of exercises) {
      await db.exercises.add(ex);
    }
  },
  deleteByPlanId: async (planId: number) => {
    const days = await db.planDays.where('planId').equals(planId).toArray();
    const dayIds = days.map(d => d.id!);
    await db.exercises.where('planDayId').anyOf(dayIds).delete();
  },
};

// --- TrainingRecord DAO ---

export const trainingRecordDao = {
  getLatest: (exerciseName: string, date: string) =>
    db.trainingRecords
      .where('[exerciseName+date]')
      .equals([exerciseName, date])
      .reverse()
      .first(),
  getHistory: (exerciseName: string) =>
    db.trainingRecords
      .where('exerciseName')
      .equals(exerciseName)
      .reverse()
      .sortBy('date'),
  insert: (record: TrainingRecord) => db.trainingRecords.add(record),
  update: (record: TrainingRecord) =>
    db.trainingRecords.update(record.id!, record),
  async saveRecord(
    exerciseName: string,
    date: string,
    weight: number,
    repsDone: number,
    notes: string = ''
  ) {
    const existing = await trainingRecordDao.getLatest(exerciseName, date);
    if (existing) {
      await trainingRecordDao.update({
        ...existing,
        weight,
        repsDone,
        notes,
      });
    } else {
      await trainingRecordDao.insert({
        exerciseName,
        date,
        weight,
        repsDone,
        notes,
      });
    }
  },
};
