import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CustomMetabolicGoals {
  useCustomValues: boolean;
  calorias: number;
  gastoEnergeticoTotal: number;
  taxaMetabolicaBasal: number;
  metaAguaMl: number;
  proteinaG: number;
  carboidratoG: number;
  gorduraG: number;
  fibrasG: number;
  deficitSuperavitKcal: number;
}

export interface WorkoutExercise {
  id: string;
  nome: string;
  grupoMuscular: string;
  series: number;
  repeticoes: string;
  cargaKg?: number;
  descansoSegundos: number;
  rpe?: number;
  observacoes?: string;
  dicaBiomecanica?: string;
}

export interface WorkoutDay {
  id: string;
  identificador: string;
  nome: string;
  foco: string;
  observacoes?: string;
  exercicios: WorkoutExercise[];
}

export interface DietFoodItem {
  id: string;
  nome: string;
  quantidadeG: number;
  calorias: number;
  proteinaG: number;
  carboidratoG: number;
  gorduraG: number;
  fibrasG?: number;
}

export interface DietMeal {
  id: string;
  nome: string;
  horario?: string;
  alimentos: DietFoodItem[];
}

export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export function sortMealsByTime(meals: DietMeal[]): DietMeal[] {
  return [...meals]
    .map((meal, originalIndex) => ({ meal, originalIndex }))
    .sort((a, b) => {
      const timeA = parseTimeToMinutes(a.meal.horario);
      const timeB = parseTimeToMinutes(b.meal.horario);

      if (timeA === null && timeB === null) {
        return a.originalIndex - b.originalIndex;
      }
      if (timeA === null) return 1;
      if (timeB === null) return -1;

      const diff = timeA - timeB;
      if (diff !== 0) return diff;
      return a.originalIndex - b.originalIndex;
    })
    .map((item) => item.meal);
}

export interface UserPlannerData {
  modoPerfil: 'comum' | 'educador_fisico' | 'nutricionista';
  metasCustomizadas: CustomMetabolicGoals;
  treinos: WorkoutDay[];
  dieta: DietMeal[];
  ultimaModificacao?: string;
}

export interface AiExerciseItem {
  name: string;
  muscle: string;
  secondary?: string;
  whyBest: string;
  suggestedSets: number;
  suggestedReps: string;
  suggestedRest: string;
  rpe?: number;
  tip?: string;
}

export interface AiExerciseResponse {
  source: string;
  query: string;
  summary: string;
  targetMuscle: string;
  exercises: AiExerciseItem[];
}

export function generateExerciseId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ex-${crypto.randomUUID()}`;
  }
  return `ex-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

@Injectable({ providedIn: 'root' })
export class PlannerService {
  private http = inject(HttpClient);

  planner = signal<UserPlannerData | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  aiLoading = signal<boolean>(false);
  aiSuggestions = signal<AiExerciseResponse | null>(null);
  saveSuccessMessage = signal<string | null>(null);

  activeSection = signal<'metas' | 'treinos' | 'dieta' | 'resumo'>('treinos');
  activeWorkoutId = signal<string>('w-treino-a');
  activeRoleMode = signal<'comum' | 'educador_fisico' | 'nutricionista'>('educador_fisico');

  // Computed Totals for Diet
  dietTotals = computed(() => {
    const current = this.planner();
    if (!current || !current.dieta) {
      return { calorias: 0, proteina: 0, carbo: 0, gordura: 0, fibras: 0, itensCount: 0 };
    }
    let cal = 0;
    let prot = 0;
    let carb = 0;
    let fat = 0;
    let fib = 0;
    let count = 0;

    for (const meal of current.dieta) {
      for (const food of meal.alimentos) {
        cal += Number(food.calorias) || 0;
        prot += Number(food.proteinaG) || 0;
        carb += Number(food.carboidratoG) || 0;
        fat += Number(food.gorduraG) || 0;
        fib += Number(food.fibrasG) || 0;
        count++;
      }
    }

    return {
      calorias: Math.round(cal),
      proteina: Math.round(prot * 10) / 10,
      carbo: Math.round(carb * 10) / 10,
      gordura: Math.round(fat * 10) / 10,
      fibras: Math.round(fib * 10) / 10,
      itensCount: count,
    };
  });

  // Volume of series per muscle group
  muscleVolumeSummary = computed(() => {
    const current = this.planner();
    const map: Record<string, number> = {};
    if (!current || !current.treinos) return [];

    for (const w of current.treinos) {
      for (const ex of w.exercicios) {
        const muscle = (ex.grupoMuscular || 'Geral').trim();
        map[muscle] = (map[muscle] || 0) + (Number(ex.series) || 0);
      }
    }

    return Object.entries(map).map(([muscle, series]) => ({ muscle, series }));
  });

  ensureUniqueExerciseIds(treinos: WorkoutDay[]): WorkoutDay[] {
    const seenIds = new Set<string>();
    return treinos.map((w) => ({
      ...w,
      exercicios: w.exercicios.map((ex) => {
        let id = ex.id ? String(ex.id).trim() : '';
        if (!id || seenIds.has(id)) {
          id = generateExerciseId();
        }
        seenIds.add(id);
        return {
          ...ex,
          id,
        };
      }),
    }));
  }

  loadPlanner() {
    this.loading.set(true);
    return this.http.get<{ planner: UserPlannerData; user: any }>(`${environment.apiUrl}/me/planner`).pipe(
      tap((res) => {
        if (res && res.planner) {
          if (res.planner.treinos && res.planner.treinos.length > 0) {
            res.planner.treinos = this.ensureUniqueExerciseIds(res.planner.treinos);
          }
          if (res.planner.dieta && res.planner.dieta.length > 0) {
            res.planner.dieta = sortMealsByTime(res.planner.dieta);
          }
          this.planner.set(res.planner);
          if (res.planner.modoPerfil) {
            this.activeRoleMode.set(res.planner.modoPerfil);
          }
          if (res.planner.treinos && res.planner.treinos.length > 0) {
            this.activeWorkoutId.set(res.planner.treinos[0].id);
          }
        }
        this.loading.set(false);
      }),
      catchError((err) => {
        console.warn('Erro ao carregar planner:', err);
        this.loading.set(false);
        return of(null);
      })
    );
  }

  savePlanner() {
    const current = this.planner();
    if (!current) return of(null);

    this.saving.set(true);
    this.saveSuccessMessage.set(null);

    const payload: UserPlannerData = {
      ...current,
      modoPerfil: this.activeRoleMode(),
      ultimaModificacao: new Date().toISOString(),
    };

    return this.http.put<{ message: string; planner: UserPlannerData }>(`${environment.apiUrl}/me/planner`, payload).pipe(
      tap((res) => {
        this.saving.set(false);
        if (res && res.planner) {
          this.planner.set(res.planner);
        }
        this.saveSuccessMessage.set('✓ Metas, treinos e dieta salvos com sucesso!');
        setTimeout(() => this.saveSuccessMessage.set(null), 4000);
      }),
      catchError((err) => {
        console.warn('Erro ao salvar planner:', err);
        this.saving.set(false);
        return of(null);
      })
    );
  }

  askAiWorkoutAssistant(query: string, targetMuscle?: string) {
    this.aiLoading.set(true);
    return this.http.post<AiExerciseResponse>(`${environment.apiUrl}/ai/workout-assistant`, {
      query,
      targetMuscle,
      userRole: this.activeRoleMode(),
    }).pipe(
      tap((res) => {
        this.aiLoading.set(false);
        this.aiSuggestions.set(res);
      }),
      catchError((err) => {
        console.warn('Erro na consulta de IA de treino:', err);
        this.aiLoading.set(false);
        return of(null);
      })
    );
  }

  updateCustomGoals(updates: Partial<CustomMetabolicGoals>) {
    const current = this.planner();
    if (!current) return;

    this.planner.update((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        metasCustomizadas: {
          ...prev.metasCustomizadas,
          ...updates,
        },
      };
    });
  }

  addWorkoutDay(nome = 'Novo Treino', foco = 'Grupo Muscular') {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const count = prev.treinos.length;
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const letter = letters[count % letters.length] || `T${count + 1}`;
      const newId = `w-treino-${Date.now()}`;
      const newWorkout: WorkoutDay = {
        id: newId,
        identificador: `Treino ${letter}`,
        nome: `${nome} (${letter})`,
        foco,
        exercicios: [],
      };
      this.activeWorkoutId.set(newId);
      return {
        ...prev,
        treinos: [...prev.treinos, newWorkout],
      };
    });
  }

  removeWorkoutDay(workoutId: string) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const remaining = prev.treinos.filter((w) => w.id !== workoutId);
      if (this.activeWorkoutId() === workoutId && remaining.length > 0) {
        this.activeWorkoutId.set(remaining[0].id);
      }
      return {
        ...prev,
        treinos: remaining,
      };
    });
  }

  addExerciseToActiveWorkout(exerciseData: Partial<WorkoutExercise>) {
    const currentId = this.activeWorkoutId();
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedTreinos = prev.treinos.map((w) => {
        if (w.id === currentId) {
          const newExercise: WorkoutExercise = {
            id: generateExerciseId(),
            nome: exerciseData.nome || 'Novo Exercício',
            grupoMuscular: exerciseData.grupoMuscular || w.foco || 'Geral',
            series: exerciseData.series || 4,
            repeticoes: exerciseData.repeticoes || '8 - 12',
            cargaKg: exerciseData.cargaKg || 20,
            descansoSegundos: exerciseData.descansoSegundos || 90,
            rpe: exerciseData.rpe || 8.5,
            observacoes: exerciseData.observacoes || '',
            dicaBiomecanica: exerciseData.dicaBiomecanica || '',
          };
          return {
            ...w,
            exercicios: [...w.exercicios, newExercise],
          };
        }
        return w;
      });
      return {
        ...prev,
        treinos: updatedTreinos,
      };
    });
  }

  removeExercise(workoutId: string, exerciseId: string): { deletedExercise: WorkoutExercise; deletedIndex: number; nextSelectedId: string | null } | null {
    let result: { deletedExercise: WorkoutExercise; deletedIndex: number; nextSelectedId: string | null } | null = null;
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedTreinos = prev.treinos.map((w) => {
        if (w.id === workoutId) {
          const idx = w.exercicios.findIndex((e) => e.id === exerciseId);
          if (idx === -1) return w;

          const deletedExercise = { ...w.exercicios[idx] };
          const list = [...w.exercicios];
          list.splice(idx, 1);

          let nextSelectedId: string | null = null;
          if (list.length > 0) {
            if (idx < list.length) {
              nextSelectedId = list[idx].id;
            } else {
              nextSelectedId = list[list.length - 1].id;
            }
          }

          result = {
            deletedExercise,
            deletedIndex: idx,
            nextSelectedId,
          };

          return {
            ...w,
            exercicios: list,
          };
        }
        return w;
      });
      return {
        ...prev,
        treinos: updatedTreinos,
      };
    });
    return result;
  }

  updateExercise(workoutId: string, exerciseId: string, updates: Partial<WorkoutExercise>) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedTreinos = prev.treinos.map((w) => {
        if (w.id === workoutId) {
          return {
            ...w,
            exercicios: w.exercicios.map((e) => (e.id === exerciseId ? { ...e, ...updates } : e)),
          };
        }
        return w;
      });
      return {
        ...prev,
        treinos: updatedTreinos,
      };
    });
  }

  addBlankExercise(workoutId?: string) {
    const targetId = workoutId || this.activeWorkoutId();
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedTreinos = prev.treinos.map((w) => {
        if (w.id === targetId) {
          const newBlank: WorkoutExercise = {
            id: generateExerciseId(),
            nome: '',
            grupoMuscular: w.foco || 'Geral',
            series: 3,
            repeticoes: '8 - 12',
            cargaKg: 0,
            descansoSegundos: 60,
            rpe: 8,
            observacoes: '',
          };
          return {
            ...w,
            exercicios: [...w.exercicios, newBlank],
          };
        }
        return w;
      });
      return { ...prev, treinos: updatedTreinos };
    });
  }

  duplicateExercise(workoutId: string, exerciseId: string): string | null {
    let newId: string | null = null;
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedTreinos = prev.treinos.map((w) => {
        if (w.id === workoutId) {
          const index = w.exercicios.findIndex((e) => e.id === exerciseId);
          if (index === -1) return w;
          const original = w.exercicios[index];
          newId = generateExerciseId();
          const cloned: WorkoutExercise = {
            ...original,
            id: newId,
            nome: original.nome ? `${original.nome} (Cópia)` : '',
          };
          const list = [...w.exercicios];
          list.splice(index + 1, 0, cloned);
          return { ...w, exercicios: list };
        }
        return w;
      });
      return { ...prev, treinos: updatedTreinos };
    });
    return newId;
  }

  reorderExercise(workoutId: string, exerciseId: string, direction: 'up' | 'down') {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedTreinos = prev.treinos.map((w) => {
        if (w.id === workoutId) {
          const index = w.exercicios.findIndex((e) => e.id === exerciseId);
          if (index === -1) return w;
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= w.exercicios.length) return w;
          const list = [...w.exercicios];
          const [removed] = list.splice(index, 1);
          list.splice(targetIndex, 0, removed);
          return { ...w, exercicios: list };
        }
        return w;
      });
      return { ...prev, treinos: updatedTreinos };
    });
  }

  updateWorkout(workoutId: string, updates: Partial<WorkoutDay>) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        treinos: prev.treinos.map((w) => (w.id === workoutId ? { ...w, ...updates } : w)),
      };
    });
  }

  // Diet management
  addMeal(nome = 'Nova Refeição', horario = '12:00') {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const newMeal: DietMeal = {
        id: `m-${Date.now()}`,
        nome,
        horario,
        alimentos: [],
      };
      return {
        ...prev,
        dieta: sortMealsByTime([...prev.dieta, newMeal]),
      };
    });
  }

  removeMeal(mealId: string) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dieta: prev.dieta.filter((m) => m.id !== mealId),
      };
    });
  }

  updateMeal(mealId: string, updates: Partial<DietMeal>) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dieta: prev.dieta.map((m) => (m.id === mealId ? { ...m, ...updates } : m)),
      };
    });
  }

  getMealTotals(meal: DietMeal) {
    let cal = 0;
    let prot = 0;
    let carb = 0;
    let fat = 0;
    if (meal && meal.alimentos) {
      for (const f of meal.alimentos) {
        cal += Number(f.calorias) || 0;
        prot += Number(f.proteinaG) || 0;
        carb += Number(f.carboidratoG) || 0;
        fat += Number(f.gorduraG) || 0;
      }
    }
    return {
      calorias: Math.round(cal),
      proteinaG: Math.round(prot * 10) / 10,
      carboidratoG: Math.round(carb * 10) / 10,
      gorduraG: Math.round(fat * 10) / 10,
    };
  }

  removeFoodFromMeal(mealId: string, foodId: string) {
    this.removeFood(mealId, foodId);
  }

  addFoodToMeal(mealId: string, food: Partial<DietFoodItem>) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedDieta = prev.dieta.map((m) => {
        if (m.id === mealId) {
          const newItem: DietFoodItem = {
            id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            nome: food.nome || 'Alimento',
            quantidadeG: food.quantidadeG || 100,
            calorias: food.calorias || 150,
            proteinaG: food.proteinaG || 10,
            carboidratoG: food.carboidratoG || 15,
            gorduraG: food.gorduraG || 3,
          };
          return {
            ...m,
            alimentos: [...m.alimentos, newItem],
          };
        }
        return m;
      });
      return {
        ...prev,
        dieta: updatedDieta,
      };
    });
  }

  removeFood(mealId: string, foodId: string) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedDieta = prev.dieta.map((m) => {
        if (m.id === mealId) {
          return {
            ...m,
            alimentos: m.alimentos.filter((f) => f.id !== foodId),
          };
        }
        return m;
      });
      return {
        ...prev,
        dieta: updatedDieta,
      };
    });
  }

  updateFoodQuantity(mealId: string, foodId: string, newGrams: number) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedDieta = prev.dieta.map((m) => {
        if (m.id === mealId) {
          return {
            ...m,
            alimentos: m.alimentos.map((f) => {
              if (f.id === foodId) {
                const oldQtd = Number(f.quantidadeG) || 100;
                const ratio = oldQtd > 0 ? (newGrams / oldQtd) : (newGrams / 100);
                return {
                  ...f,
                  quantidadeG: newGrams,
                  calorias: Math.max(0, Math.round(Number(f.calorias) * ratio)),
                  proteinaG: Math.max(0, Math.round(Number(f.proteinaG) * ratio * 10) / 10),
                  carboidratoG: Math.max(0, Math.round(Number(f.carboidratoG) * ratio * 10) / 10),
                  gorduraG: Math.max(0, Math.round(Number(f.gorduraG) * ratio * 10) / 10),
                  fibrasG: (f as any).fibrasG !== undefined ? Math.max(0, Math.round(Number((f as any).fibrasG) * ratio * 10) / 10) : undefined,
                };
              }
              return f;
            }),
          };
        }
        return m;
      });
      return { ...prev, dieta: updatedDieta };
    });
  }

  duplicateMeal(mealId: string) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const meal = prev.dieta.find((m) => m.id === mealId);
      if (!meal) return prev;
      const newMealId = `m-meal-${Date.now()}`;
      const duplicatedMeal: DietMeal = {
        ...meal,
        id: newMealId,
        nome: `${meal.nome} (Cópia)`,
        alimentos: meal.alimentos.map((f) => ({
          ...f,
          id: `f-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        })),
      };
      return {
        ...prev,
        dieta: [...prev.dieta, duplicatedMeal],
      };
    });
  }

  reorderMeal(mealId: string, direction: 'up' | 'down') {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const index = prev.dieta.findIndex((m) => m.id === mealId);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.dieta.length) return prev;
      const newDieta = [...prev.dieta];
      const [removed] = newDieta.splice(index, 1);
      newDieta.splice(targetIndex, 0, removed);
      return { ...prev, dieta: newDieta };
    });
  }

  insertMealAtIndex(meal: DietMeal, index?: number) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const newDieta = [...prev.dieta];
      if (index !== undefined && index >= 0 && index <= newDieta.length) {
        newDieta.splice(index, 0, meal);
      } else {
        newDieta.push(meal);
      }
      return { ...prev, dieta: newDieta };
    });
  }

  insertFoodAtIndex(mealId: string, food: DietFoodItem, index?: number) {
    this.planner.update((prev) => {
      if (!prev) return prev;
      const updatedDieta = prev.dieta.map((m) => {
        if (m.id === mealId) {
          const newAlimentos = [...m.alimentos];
          if (index !== undefined && index >= 0 && index <= newAlimentos.length) {
            newAlimentos.splice(index, 0, food);
          } else {
            newAlimentos.push(food);
          }
          return { ...m, alimentos: newAlimentos };
        }
        return m;
      });
      return { ...prev, dieta: updatedDieta };
    });
  }
}
