import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Navbar } from '../../navbar/navbar';
import { AuthService } from '../../services/auth.service';
import { PlannerService, WorkoutExercise, WorkoutDay, DietFoodItem, DietMeal, AiExerciseItem, sortMealsByTime, parseTimeToMinutes } from '../../services/planner.service';
import { exportWorkoutPdf, exportDietPdf } from './planner-export.util';
import {
  formatWhatsAppTreino,
  formatWhatsAppDieta,
  formatWhatsAppResumo,
  copyToClipboardWithFallback,
} from './whatsapp-export.util';
import { TacoFoodItem, searchTacoFoods, calculateNutrientsForWeight } from '../../services/taco-database';

export interface ExercisePresetCategory {
  group: string;
  exercises: string[];
}

export interface UndoActionState {
  type: 'exercise' | 'workout' | 'food' | 'meal' | 'food_add';
  message: string;
  workoutId?: string;
  exercise?: WorkoutExercise;
  exerciseIndex?: number;
  workout?: WorkoutDay;
  workoutIndex?: number;
  mealId?: string;
  food?: DietFoodItem;
  foodIndex?: number;
  meal?: DietMeal;
  mealIndex?: number;
}

export interface CardTooltipInfo {
  id: string;
  title: string;
  text: string;
}

export const CARD_TOOLTIPS: Record<string, CardTooltipInfo> = {
  metaCalorias: {
    id: 'tooltip-metaCalorias',
    title: 'Meta Calórica Diária',
    text: 'Quantidade de calorias que você deve consumir por dia para atingir seu objetivo (manter, perder ou ganhar peso).',
  },
  gastoTotal: {
    id: 'tooltip-gastoTotal',
    title: 'Gasto Total (GET)',
    text: 'Total de calorias que seu corpo gasta por dia, somando metabolismo basal, atividade física e digestão dos alimentos.',
  },
  taxaBasal: {
    id: 'tooltip-taxaBasal',
    title: 'Taxa Basal (TMB)',
    text: 'Calorias que seu corpo gasta em repouso total, só para manter funções vitais. Calculada pela fórmula de Mifflin-St Jeor.',
  },
  metaAgua: {
    id: 'tooltip-metaAgua',
    title: 'Meta de Água',
    text: 'Quantidade de água recomendada por dia, calculada a partir do seu peso (35 mL por kg).',
  },
  macroProteinas: {
    id: 'tooltip-macroProteinas',
    title: 'Proteínas (P)',
    text: 'Gramas diárias de proteína. Cada grama fornece 4 kcal. Importante para recuperação e ganho de massa muscular.',
  },
  macroCarboidratos: {
    id: 'tooltip-macroCarboidratos',
    title: 'Carboidratos (C)',
    text: 'Gramas diárias de carboidrato. Cada grama fornece 4 kcal. Principal fonte de energia para treino e rotina.',
  },
  macroGorduras: {
    id: 'tooltip-macroGorduras',
    title: 'Gorduras (G)',
    text: 'Gramas diárias de gordura. Cada grama fornece 9 kcal. Essenciais para hormônios e absorção de vitaminas.',
  },
  macroFibras: {
    id: 'tooltip-macroFibras',
    title: 'Fibras (F)',
    text: 'Gramas diárias de fibra, importantes para digestão e saciedade. Não entram na soma de calorias.',
  },
};

@Component({
  selector: 'app-planner-page',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule, Navbar],
  templateUrl: './planner-page.html',
  styleUrls: ['./planner-page.scss'],
  host: {
    '(window:scroll)': 'onWindowScroll()',
    '(window:resize)': 'onWindowResize()',
    '(document:keydown.escape)': 'onEscapeKey()',
    '(document:click)': 'onDocumentClick($event)',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class PlannerPage implements OnInit {
  auth = inject(AuthService);
  plannerService = inject(PlannerService);
  private fb = inject(FormBuilder);

  // Science Muscle Search (Lateral Sidebar)
  scienceMuscleQuery = signal<string>('');
  showSciencePanel = signal<boolean>(true);
  hideInsertedScienceExercises = signal<boolean>(true);

  // Cell & Row Expansion / Focus state
  focusedCellKey = signal<string | null>(null);
  expandedRowId = signal<string | null>(null);

  // Row Drag and Drop
  draggedRowIndex = signal<number | null>(null);

  // Science description expansion ("ver mais")
  expandedScienceNotes = signal<Record<string, boolean>>({});

  // Confirmation modal for Workout Deletion
  workoutToDelete = signal<string | null>(null);

  // Single Action Menu (⋯) for Workout Exercises (removido, preservado para compatibilidade)
  openExerciseMenuId = signal<string | null>(null);

  // Seleção de linha com 1 clique na Planilha de Treinos
  selectedExerciseId = signal<string | null>(null);

  // Metas & Valores Customizados Tooltips
  activeTooltip = signal<CardTooltipInfo | null>(null);
  activeTooltipKey = signal<string | null>(null);
  tooltipPosition = signal<{ top: number; left: number; placement: 'bottom' | 'top'; arrowLeft: number }>({
    top: 0,
    left: 0,
    placement: 'bottom',
    arrowLeft: 130,
  });
  private activeTooltipEl: HTMLElement | null = null;
  private tooltipHoverTimer: any = null;
  private tooltipHideTimer: any = null;

  // Metas & Valores Customizados UI Feedback & Shake
  isShakingToggle = signal<boolean>(false);
  blockedToast = signal<string | null>(null);
  private blockedToastTimeout: any = null;

  // Undo Toast State for destructive actions
  undoState = signal<UndoActionState | null>(null);
  private undoTimeoutId: any = null;

  readonly muscleQuickFilters = [
    { label: 'Dorsal', query: 'dorsal' },
    { label: 'Peitoral', query: 'peitoral' },
    { label: 'Ombros', query: 'deltoide lateral' },
    { label: 'Quadríceps', query: 'quadriceps' },
    { label: 'Glúteos', query: 'gluteo' },
    { label: 'Posterior', query: 'isquiotibiais' },
    { label: 'Bíceps', query: 'biceps' },
    { label: 'Tríceps', query: 'triceps' },
    { label: 'Panturrilha', query: 'panturrilha' },
  ];

  // TACO Database Search & Auto-calculation
  tacoSearchResults = signal<TacoFoodItem[]>([]);
  selectedTacoItem = signal<TacoFoodItem | null>(null);
  showTacoDropdown = signal<boolean>(false);

  // Diet Refactor Signals & States
  isDietScrolled = signal<boolean>(false);
  flashedFoodId = signal<string | null>(null);
  activeQuickAddMealId = signal<string | null>(null);
  quickAddQuery = signal<string>('');
  quickAddResults = signal<TacoFoodItem[]>([]);
  quickAddSelectedFood = signal<TacoFoodItem | null>(null);
  quickAddGrams = signal<number>(100);
  openMealMenuId = signal<string | null>(null);
  showCustomFoodModal = signal<boolean>(false);
  customFoodMode = signal<'taco' | 'manual'>('taco');
  collapsedMealIds = signal<Set<string>>(new Set<string>());

  allMealsCollapsed = computed(() => {
    const pl = this.plannerService.planner();
    if (!pl || !pl.dieta || pl.dieta.length === 0) return false;
    return this.collapsedMealIds().size === pl.dieta.length;
  });

  // Reordenação e destaque de refeições
  flashedMealId = signal<string | null>(null);
  private flashMealTimeout: any = null;
  private lastCommittedTimeRecord: { mealId: string; time: string; at: number } | null = null;

  draggedMealIndex = signal<number | null>(null);
  dragOverMealIndex = signal<number | null>(null);
  hasAskedMealOrderChoice = signal<boolean>(false);
  mealOrderMode = signal<'horario' | 'manual'>('horario');
  showMealOrderChoiceModal = signal<boolean>(false);
  pendingManualDietOrder: DietMeal[] | null = null;
  pendingMovedMealId: string | null = null;

  readonly dietQuickFavorites = [
    { nome: 'Arroz branco', quantidadeG: 150, query: 'arroz tipo 1 cozido' },
    { nome: 'Peito de frango', quantidadeG: 120, query: 'frango peito filé' },
    { nome: 'Ovo cozido', quantidadeG: 50, query: 'ovo galinha cozido' },
    { nome: 'Banana prata', quantidadeG: 100, query: 'banana prata' },
    { nome: 'Aveia em flocos', quantidadeG: 40, query: 'aveia flocos' },
    { nome: 'Azeite de oliva', quantidadeG: 10, query: 'azeite oliva' },
    { nome: 'Batata doce', quantidadeG: 150, query: 'batata doce cozida' },
    { nome: 'Patinho moído', quantidadeG: 120, query: 'patinho bovino' },
  ];

  quickAddNutrients = computed(() => {
    const item = this.quickAddSelectedFood();
    const grams = this.quickAddGrams() || 100;
    if (!item) {
      return { calorias: 0, proteinaG: 0, carboidratoG: 0, gorduraG: 0, fibrasG: 0 };
    }
    return calculateNutrientsForWeight(item, grams);
  });

  // Predefined Exercise Variations Library
  exercisePresetCategories: ExercisePresetCategory[] = [
    {
      group: 'Dorsal / Costas',
      exercises: [
        'Puxada Alta Pronada',
        'Puxada Alta Supinada (Pegada Inversa)',
        'Puxada com Triângulo (Pegada Neutra)',
        'Remada Curvada com Barra (Pronada)',
        'Remada Curvada com Barra (Supinada - Yates)',
        'Remada Baixa no Triângulo (Polia Sentada)',
        'Remada Cavalinho (T-Bar Row)',
        'Remada Unilateral com Halter (Serrote)',
        'Remada Articulada Aberta (Máquina)',
        'Pulldown na Polia (Braços Estendidos)',
        'Barra Fixa com Pegada Pronada',
        'Barra Fixa Supinada (Chin-Up)',
        'Meio Levantamento Terra (Rack Pull)',
      ],
    },
    {
      group: 'Peitoral',
      exercises: [
        'Supino Reto com Barra',
        'Supino Reto com Halteres',
        'Supino Inclinado com Halteres (30°)',
        'Supino Inclinado com Barra (45°)',
        'Supino Declinado com Halteres / Barra',
        'Crossover na Polia Média',
        'Crossover na Polia Alta',
        'Crossover na Polia Baixa',
        'Peck Deck / Voador Máquina',
        'Crucifixo Reto com Halteres',
        'Crucifixo Inclinado com Halteres',
        'Flexão de Braços (Push-Up)',
        'Mergulho em Paralelas (Foco Peitoral)',
      ],
    },
    {
      group: 'Deltoides / Ombros',
      exercises: [
        'Desenvolvimento com Halteres Sentado',
        'Desenvolvimento Militar com Barra (OHP)',
        'Desenvolvimento Máquina Articulada',
        'Elevação Lateral com Halteres',
        'Elevação Lateral na Polia (Cabo)',
        'Elevação Lateral no Banco Inclinado',
        'Crucifixo Invertido com Halteres',
        'Crucifixo Invertido na Polia / Peck Deck Invertido',
        'Face Pull na Polia com Corda',
        'Elevação Frontal com Halteres / Barra',
        'Remada Alta na Polia com Pegada Aberta',
      ],
    },
    {
      group: 'Bíceps & Antebraço',
      exercises: [
        'Rosca Direta com Barra W',
        'Rosca Direta com Barra Reta',
        'Rosca Inclinada com Halteres (Banco 45°)',
        'Rosca Scott no Banco (Barra W / Máquina)',
        'Rosca Martelo com Halteres',
        'Rosca Martelo na Polia com Corda',
        'Rosca Concentrada com Halter',
        'Rosca Spider no Banco Inclinado',
        'Rosca Inversa com Barra',
        'Flexão de Punho com Barra',
      ],
    },
    {
      group: 'Tríceps',
      exercises: [
        'Tríceps Pulley com Corda',
        'Tríceps Pulley com Barra Reta / Barra V',
        'Tríceps Francês na Polia (Cabo)',
        'Tríceps Francês com Halter',
        'Tríceps Testa com Barra W',
        'Tríceps Coice na Polia (Kickback)',
        'Mergulho entre Bancos / Paralelas',
        'Supino Fechado com Barra',
      ],
    },
    {
      group: 'Quadríceps & Pernas',
      exercises: [
        'Agachamento Livre com Barra (Costas)',
        'Agachamento Frontal com Barra',
        'Agachamento Búlgaro com Halteres',
        'Leg Press 45°',
        'Hack Squat (Máquina Hack)',
        'Cadeira Extensora',
        'Passada / Afundo com Halteres',
        'Sissy Squat',
      ],
    },
    {
      group: 'Posteriores de Coxa & Glúteos',
      exercises: [
        'Stiff com Barra',
        'Stiff com Halteres',
        'Levantamento Terra Romeno (RDL)',
        'Mesa Flexora Deitada',
        'Cadeira Flexora Sentada',
        'Elevação Pélvica com Barra (Hip Thrust)',
        'Elevação Pélvica na Máquina',
        'Cadeira Abdutora',
        'Cadeira Adutora',
        'Glúteo Coice na Polia (Cabo)',
      ],
    },
    {
      group: 'Panturrilhas',
      exercises: [
        'Panturrilha no Leg Press 45°',
        'Panturrilha em Pé na Máquina / Barra',
        'Panturrilha Sentado (Solear)',
      ],
    },
    {
      group: 'Abdômen & Core',
      exercises: [
        'Abdominal Crunch na Polia com Corda',
        'Abdominal Infra na Barra Fixa (Hanging Leg Raise)',
        'Prancha Isométrica',
        'Roda Abdominal (Ab Wheel)',
        'Pallof Press na Polia',
        'Hiperextensão Lombar no Banco 45°',
      ],
    },
  ];

  // Common Reps Presets (standardized without spaces around hyphen)
  commonRepsPresets: string[] = [
    '8-12',
    '6-8',
    '10-12',
    '10-15',
    '4-6',
    '12-15',
    '15-20',
    '3x10 + drop-set',
    'Rest-Pause',
    'Pirâmide (12-10-8-6)',
  ];

  muscleGroups: string[] = [
    'Dorsal / Costas',
    'Peitoral',
    'Deltoides / Ombros',
    'Bíceps',
    'Tríceps',
    'Quadríceps',
    'Posteriores de Coxa',
    'Glúteos',
    'Panturrilha',
    'Abdômen / Core',
    'Antebraço',
    'Geral / Corpo Todo',
  ];

  // Quick food presets
  commonFoods: Array<Omit<DietFoodItem, 'id'>> = [
    { nome: 'Peito de Frango Grelhado', quantidadeG: 150, calorias: 240, proteinaG: 46, carboidratoG: 0, gorduraG: 5 },
    { nome: 'Arroz Branco Cozido', quantidadeG: 150, calorias: 195, proteinaG: 3.8, carboidratoG: 42, gorduraG: 0.4 },
    { nome: 'Ovo Inteiro Cozido / Mexido', quantidadeG: 100, calorias: 143, proteinaG: 13, carboidratoG: 0.7, gorduraG: 9.5 },
    { nome: 'Batata Doce Cozida', quantidadeG: 150, calorias: 130, proteinaG: 2.3, carboidratoG: 30, gorduraG: 0.2 },
    { nome: 'Whey Protein Isolado (1 scoop)', quantidadeG: 30, calorias: 120, proteinaG: 24, carboidratoG: 2, gorduraG: 1.5 },
    { nome: 'Aveia em Flocos', quantidadeG: 40, calorias: 156, proteinaG: 6, carboidratoG: 26, gorduraG: 3.2 },
    { nome: 'Banana Prata', quantidadeG: 100, calorias: 98, proteinaG: 1.3, carboidratoG: 26, gorduraG: 0.3 },
    { nome: 'Patinho Bovino Grelhado', quantidadeG: 150, calorias: 250, proteinaG: 42, carboidratoG: 0, gorduraG: 8 },
    { nome: 'Azeite de Oliva Extravirgem (1 colher)', quantidadeG: 13, calorias: 108, proteinaG: 0, carboidratoG: 0, gorduraG: 12 },
  ];

  // Forms
  customGoalsForm = this.fb.group({
    useCustomValues: [false],
    calorias: [2949, [Validators.required, Validators.min(500), Validators.max(8000)]],
    gastoEnergeticoTotal: [2649, [Validators.required, Validators.min(500), Validators.max(8000)]],
    taxaMetabolicaBasal: [1709, [Validators.required, Validators.min(500), Validators.max(5000)]],
    metaAguaMl: [2625, [Validators.required, Validators.min(500), Validators.max(10000)]],
    proteinaG: [150, [Validators.required, Validators.min(10), Validators.max(600)]],
    carboidratoG: [452, [Validators.required, Validators.min(10), Validators.max(900)]],
    gorduraG: [60, [Validators.required, Validators.min(10), Validators.max(300)]],
    fibrasG: [32, [Validators.required, Validators.min(5), Validators.max(100)]],
    deficitSuperavitKcal: [300],
  });

  newFoodForm = this.fb.group({
    selectedMealId: ['', Validators.required],
    nome: ['', Validators.required],
    quantidadeG: [100, [Validators.required, Validators.min(1)]],
    calorias: [0, [Validators.required, Validators.min(0)]],
    proteinaG: [0, [Validators.required, Validators.min(0)]],
    carboidratoG: [0, [Validators.required, Validators.min(0)]],
    gorduraG: [0, [Validators.required, Validators.min(0)]],
  });

  copyFeedback = signal<string | null>(null);
  exportError = signal<{ message: string; type: 'treino' | 'alimentacao' } | null>(null);
  isDownloadingWorkoutPdf = signal<boolean>(false);
  isDownloadingDietPdf = signal<boolean>(false);
  exportMode = signal<'simples' | 'completa'>('simples');
  activeDropdown = signal<string | null>(null);
  copiedItemKey = signal<string | null>(null);
  dropdownFlipUp = signal<boolean>(false);
  printDocumentTarget = signal<'all' | 'treino' | 'alimentacao'>('all');

  hasWorkoutPlan = computed(() => {
    const pl = this.plannerService.planner();
    return !!(pl && pl.treinos && pl.treinos.length > 0 && pl.treinos.some((t) => t.exercicios && t.exercicios.length > 0));
  });

  hasDietPlan = computed(() => {
    const pl = this.plannerService.planner();
    return !!(pl && pl.dieta && pl.dieta.length > 0 && pl.dieta.some((d) => d.alimentos && d.alimentos.length > 0));
  });

  totalExercisesCount = computed(() => {
    const pl = this.plannerService.planner();
    if (!pl || !pl.treinos) return 0;
    return pl.treinos.reduce((sum, t) => sum + (t.exercicios ? t.exercicios.length : 0), 0);
  });

  isDownloadingPdf = computed(() => this.isDownloadingWorkoutPdf() || this.isDownloadingDietPdf());

  ngOnInit() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem('macrio_meal_order_mode');
      if (savedMode === 'manual' || savedMode === 'horario') {
        this.mealOrderMode.set(savedMode);
      }
      const hasAsked = localStorage.getItem('macrio_has_asked_order_mode');
      if (hasAsked === 'true') {
        this.hasAskedMealOrderChoice.set(true);
      }
    }

    this.plannerService.loadPlanner().subscribe((res) => {
      if (res && res.planner) {
        this.standardizeAllWorkoutReps();
        this.populateGoalsForm(res.planner.metasCustomizadas);
        if (this.mealOrderMode() === 'horario' && res.planner.dieta && res.planner.dieta.length > 0) {
          const sorted = sortMealsByTime(res.planner.dieta);
          this.plannerService.planner.update((prev) => (prev ? { ...prev, dieta: sorted } : prev));
        }
        if (res.planner.dieta && res.planner.dieta.length > 0) {
          this.newFoodForm.patchValue({ selectedMealId: res.planner.dieta[0].id });
        }
      }
    });
    if (!this.plannerService.aiSuggestions()) {
      this.plannerService.askAiWorkoutAssistant('melhores exercicios para dorsal', 'dorsal').subscribe();
    }
  }

  formatReps(val: string | undefined | null): string {
    if (!val) return '8-12';
    return String(val)
      .replace(/(\d+)\s*[-–—]\s*(\d+)/g, '$1-$2')
      .trim();
  }

  formatRest(val: string | number | undefined | null): string {
    if (val === undefined || val === null || val === '') return '90s';
    const str = String(val).trim();
    return str.endsWith('s') ? str : `${str}s`;
  }

  private standardizeAllWorkoutReps() {
    this.plannerService.planner.update((prev) => {
      if (!prev || !prev.treinos) return prev;
      return {
        ...prev,
        treinos: prev.treinos.map((w) => ({
          ...w,
          exercicios: w.exercicios.map((ex) => ({
            ...ex,
            repeticoes: this.formatReps(ex.repeticoes),
          })),
        })),
      };
    });
  }

  savedGoalsSnapshot = signal<any>(null);
  goalsFormVersion = signal<number>(0);
  private prevCalculatedGoals: any = null;

  readonly goalKeys = [
    'calorias',
    'gastoEnergeticoTotal',
    'taxaMetabolicaBasal',
    'metaAguaMl',
    'proteinaG',
    'carboidratoG',
    'gorduraG',
    'fibrasG',
  ] as const;

  constructor() {
    // Sincroniza imediatamente o formulário com as fórmulas de Mifflin-St Jeor do perfil
    const initialCalc = this.calculatedGoals();
    this.customGoalsForm.patchValue({
      useCustomValues: false,
      calorias: initialCalc.calorias,
      gastoEnergeticoTotal: initialCalc.gastoEnergeticoTotal,
      taxaMetabolicaBasal: initialCalc.taxaMetabolicaBasal,
      metaAguaMl: initialCalc.metaAguaMl,
      proteinaG: initialCalc.proteinaG,
      carboidratoG: initialCalc.carboidratoG,
      gorduraG: initialCalc.gorduraG,
      fibrasG: initialCalc.fibrasG,
      deficitSuperavitKcal: initialCalc.deficitSuperavitKcal,
    });
    this.savedGoalsSnapshot.set({ ...this.customGoalsForm.value });
    this.prevCalculatedGoals = { ...initialCalc };

    // Regra de dados: se um campo está AUTO, ele continua sendo recalculado quando as entradas mudam (peso, altura, objetivo etc.)
    effect(() => {
      const calc = this.calculatedGoals();
      const prev = this.prevCalculatedGoals;
      this.prevCalculatedGoals = { ...calc };

      if (!prev) return;

      const current = this.customGoalsForm?.value;
      if (!current) return;

      const patch: any = {};
      let hasPatch = false;

      for (const k of this.goalKeys) {
        // Se o campo estava em AUTO (igual ao valor calculado anterior), atualiza para a nova fórmula
        if (Number(current[k]) === prev[k]) {
          patch[k] = calc[k];
          hasPatch = true;
        }
      }

      if (hasPatch) {
        this.customGoalsForm.patchValue(patch, { emitEvent: false });
        this.onGoalFieldChange();
      }
    });
  }

  calculatedGoals = computed(() => {
    const user = this.auth.currentUser();
    const peso = user?.perfil?.pesoKg || 75;
    const altura = user?.perfil?.alturaCm || 175;
    const idade = user?.perfil?.idade || 28;
    const sexo = user?.perfil?.sexo || 'masculino';
    const objetivo = user?.perfil?.objetivo || 'hipertrofia';
    const nivelAtividade = user?.perfil?.nivelAtividade || 'moderado';

    // Fórmula Mifflin-St Jeor para cálculo padrão (preservada exatamente)
    const base = (10 * peso) + (6.25 * altura) - (5 * idade);
    const tmb = sexo === 'feminino' ? Math.round(base - 161) : Math.round(base + 5);

    // Multiplicadores de atividade física padrão
    const multiplicadoresAtividade: Record<string, number> = {
      sedentario: 1.2,
      leve: 1.375,
      moderado: 1.55,
      intenso: 1.725,
      muito_intenso: 1.9,
    };
    const fator = multiplicadoresAtividade[nivelAtividade] || 1.55;
    const get = Math.round(tmb * fator);

    // Ajuste calórico conforme objetivo
    const delta = (objetivo === 'perder_peso') ? -400 : (objetivo === 'hipertrofia' || objetivo === 'ganhar_massa' ? 300 : 0);
    const calorias = get + delta;
    const metaAgua = Math.round(peso * 35);
    const prot = Math.round(peso * 2.0); // 2g/kg
    const fat = Math.round(peso * 0.8);  // 0.8g/kg
    const calsRestantes = calorias - (prot * 4 + fat * 9);
    const carb = Math.max(50, Math.round(calsRestantes / 4));
    const fibras = 32;

    return {
      calorias,
      gastoEnergeticoTotal: get,
      taxaMetabolicaBasal: tmb,
      metaAguaMl: metaAgua,
      proteinaG: prot,
      carboidratoG: carb,
      gorduraG: fat,
      fibrasG: fibras,
      deficitSuperavitKcal: delta,
    };
  });

  isFieldCustomized(key: 'calorias' | 'gastoEnergeticoTotal' | 'taxaMetabolicaBasal' | 'metaAguaMl' | 'proteinaG' | 'carboidratoG' | 'gorduraG' | 'fibrasG'): boolean {
    this.goalsFormVersion();
    const currentVal = Number(this.customGoalsForm.get(key)?.value);
    const calcVal = this.calculatedGoals()[key];
    if (isNaN(currentVal) || calcVal === undefined) return false;
    // Tolerância de arredondamento de 1 unidade para evitar falsos positivos
    return Math.abs(currentVal - calcVal) > 1;
  }

  restoreField(key: 'calorias' | 'gastoEnergeticoTotal' | 'taxaMetabolicaBasal' | 'metaAguaMl' | 'proteinaG' | 'carboidratoG' | 'gorduraG' | 'fibrasG') {
    const calcVal = this.calculatedGoals()[key];
    this.customGoalsForm.patchValue({ [key]: calcVal });
    this.onGoalFieldChange(key);
  }

  restoreAllCalculatedValues() {
    const calc = this.calculatedGoals();
    this.customGoalsForm.patchValue({
      calorias: calc.calorias,
      gastoEnergeticoTotal: calc.gastoEnergeticoTotal,
      taxaMetabolicaBasal: calc.taxaMetabolicaBasal,
      metaAguaMl: calc.metaAguaMl,
      proteinaG: calc.proteinaG,
      carboidratoG: calc.carboidratoG,
      gorduraG: calc.gorduraG,
      fibrasG: calc.fibrasG,
      deficitSuperavitKcal: calc.calorias - calc.gastoEnergeticoTotal,
      useCustomValues: false,
    });
    this.onGoalFieldChange();
  }

  hasAnyCustomizedField = computed(() => {
    this.goalsFormVersion();
    const current = this.customGoalsForm?.value;
    if (!current) return false;
    const calc = this.calculatedGoals();
    return this.goalKeys.some((k) => Math.abs(Number(current[k]) - calc[k]) > 1);
  });

  hasUnsavedChanges = computed(() => {
    this.goalsFormVersion();
    const saved = this.savedGoalsSnapshot();
    if (!saved) return false;
    const current = this.customGoalsForm?.value;
    if (!current) return false;

    for (const k of this.goalKeys) {
      if (Math.abs(Number(current[k]) - Number(saved[k])) > 0.01) {
        return true;
      }
    }
    return false;
  });

  autoAdjustCarbsToMatchCal() {
    const formVal = this.customGoalsForm.value;
    const meta = Number(formVal.calorias) || 0;
    const p = Number(formVal.proteinaG) || 0;
    const f = Number(formVal.gorduraG) || 0;
    const remainingKcal = meta - (p * 4 + f * 9);
    const newCarb = Math.max(0, Math.round(remainingKcal / 4));
    this.customGoalsForm.patchValue({ carboidratoG: newCarb });
    this.onGoalFieldChange('carboidratoG');
  }

  onGoalFieldChange(fieldKey?: string) {
    const formVal = this.customGoalsForm.value;
    const cal = Number(formVal.calorias) || 0;
    const get = Number(formVal.gastoEnergeticoTotal) || 0;
    const delta = cal - get;
    this.customGoalsForm.patchValue({ deficitSuperavitKcal: delta }, { emitEvent: false });
    this.goalsFormVersion.update((v) => v + 1);
  }

  unsavedChangesCount = computed(() => {
    this.goalsFormVersion();
    const saved = this.savedGoalsSnapshot();
    if (!saved) return 0;
    const current = this.customGoalsForm?.value;
    if (!current) return 0;

    let diffs = 0;
    for (const k of this.goalKeys) {
      if (Math.abs(Number(current[k]) - Number(saved[k])) > 0.01) {
        diffs++;
      }
    }
    return diffs;
  });

  currentWaterGoalMl = computed(() => {
    this.goalsFormVersion();
    const formVal = Number(this.customGoalsForm?.get('metaAguaMl')?.value);
    if (formVal && formVal > 0) return formVal;
    const pl = this.plannerService.planner();
    if (pl?.metasCustomizadas?.metaAguaMl) return pl.metasCustomizadas.metaAguaMl;
    return 3000;
  });

  populateGoalsForm(goals: any) {
    const calc = this.calculatedGoals();
    this.prevCalculatedGoals = { ...calc };

    // Se o usuário ainda não customizou ou se o backend tem useCustomValues === false,
    // preenche os campos com os valores calculados da fórmula
    if (!goals || goals.useCustomValues === false) {
      this.customGoalsForm.patchValue({
        useCustomValues: false,
        calorias: calc.calorias,
        gastoEnergeticoTotal: calc.gastoEnergeticoTotal,
        taxaMetabolicaBasal: calc.taxaMetabolicaBasal,
        metaAguaMl: calc.metaAguaMl,
        proteinaG: calc.proteinaG,
        carboidratoG: calc.carboidratoG,
        gorduraG: calc.gorduraG,
        fibrasG: calc.fibrasG,
        deficitSuperavitKcal: calc.deficitSuperavitKcal,
      });
      this.savedGoalsSnapshot.set({ ...this.customGoalsForm.value });
      this.goalsFormVersion.update((v) => v + 1);
      return;
    }

    // Se há metas customizadas salvas:
    // Para cada campo, se o valor salvo for igual ao calculado (com tolerância de ±1),
    // normaliza para o valor calculado para evitar flags falsas de "personalizado"
    const resolveVal = (savedVal: any, calcVal: number) => {
      if (savedVal === undefined || savedVal === null) return calcVal;
      const num = Number(savedVal);
      return Math.abs(num - calcVal) <= 1 ? calcVal : num;
    };

    this.customGoalsForm.patchValue({
      useCustomValues: true,
      calorias: resolveVal(goals.calorias, calc.calorias),
      gastoEnergeticoTotal: resolveVal(goals.gastoEnergeticoTotal, calc.gastoEnergeticoTotal),
      taxaMetabolicaBasal: resolveVal(goals.taxaMetabolicaBasal, calc.taxaMetabolicaBasal),
      metaAguaMl: resolveVal(goals.metaAguaMl, calc.metaAguaMl),
      proteinaG: resolveVal(goals.proteinaG, calc.proteinaG),
      carboidratoG: resolveVal(goals.carboidratoG, calc.carboidratoG),
      gorduraG: resolveVal(goals.gorduraG, calc.gorduraG),
      fibrasG: resolveVal(goals.fibrasG, calc.fibrasG),
      deficitSuperavitKcal: goals.deficitSuperavitKcal ?? (calc.calorias - calc.gastoEnergeticoTotal),
    });
    this.savedGoalsSnapshot.set({ ...this.customGoalsForm.value });
    this.goalsFormVersion.update((v) => v + 1);
  }

  applyCustomGoals() {
    if (this.customGoalsForm.valid) {
      const formVal = this.customGoalsForm.value;
      const goalsPayload = {
        useCustomValues: true,
        calorias: Number(formVal.calorias) || 2000,
        gastoEnergeticoTotal: Number(formVal.gastoEnergeticoTotal) || 2400,
        taxaMetabolicaBasal: Number(formVal.taxaMetabolicaBasal) || 1700,
        metaAguaMl: Number(formVal.metaAguaMl) || 3000,
        proteinaG: Number(formVal.proteinaG) || 150,
        carboidratoG: Number(formVal.carboidratoG) || 200,
        gorduraG: Number(formVal.gorduraG) || 60,
        fibrasG: Number(formVal.fibrasG) || 30,
        deficitSuperavitKcal: (Number(formVal.calorias) || 2000) - (Number(formVal.gastoEnergeticoTotal) || 2400),
      };
      this.plannerService.updateCustomGoals(goalsPayload);
      this.plannerService.savePlanner().subscribe(() => {
        this.savedGoalsSnapshot.set({ ...this.customGoalsForm.value });
        this.goalsFormVersion.update((v) => v + 1);
      });
      this.savedGoalsSnapshot.set({ ...this.customGoalsForm.value });
      this.goalsFormVersion.update((v) => v + 1);
    }
  }

  calculateWaterFromWeight() {
    const user = this.auth.currentUser();
    const peso = user?.perfil?.pesoKg || 75;
    const calc = Math.round(peso * 35);
    this.customGoalsForm.patchValue({ metaAguaMl: calc });
    this.onGoalFieldChange('metaAguaMl');
  }

  isCustomValuesEnabled(): boolean {
    return true;
  }

  toggleCustomValues() {
    // Deprecated: fields are always editable
  }

  onToggleSwitchKeydown(event: KeyboardEvent) {
    // Deprecated
  }

  onBlockedFieldClick() {
    // Deprecated
  }

  restoreCalculatedValues() {
    this.restoreAllCalculatedValues();
  }

  getMacroPercentages(): { protPct: number; carbPct: number; fatPct: number } {
    const meta = Number(this.customGoalsForm.value.calorias) || 2350;
    const p = (Number(this.customGoalsForm.value.proteinaG) || 0) * 4;
    const c = (Number(this.customGoalsForm.value.carboidratoG) || 0) * 4;
    const f = (Number(this.customGoalsForm.value.gorduraG) || 0) * 9;
    const totalMacrosKcal = p + c + f;
    const base = Math.max(meta, totalMacrosKcal, 1);
    return {
      protPct: Math.min(100, Math.round((p / base) * 1000) / 10),
      carbPct: Math.min(100, Math.round((c / base) * 1000) / 10),
      fatPct: Math.min(100, Math.round((f / base) * 1000) / 10),
    };
  }

  calculateTdeeDifference(): number {
    const cal = Number(this.customGoalsForm.value.calorias) || 0;
    const get = Number(this.customGoalsForm.value.gastoEnergeticoTotal) || 0;
    return cal - get;
  }

  calculateMacrosKcal(): number {
    const p = Number(this.customGoalsForm.value.proteinaG) || 0;
    const c = Number(this.customGoalsForm.value.carboidratoG) || 0;
    const f = Number(this.customGoalsForm.value.gorduraG) || 0;
    return (p * 4) + (c * 4) + (f * 9);
  }

  getMacroDifference(): { diff: number; isMatch: boolean; isSurplus: boolean; message: string } {
    const meta = Number(this.customGoalsForm.value.calorias) || 0;
    const macros = this.calculateMacrosKcal();
    const rawDiff = macros - meta;
    if (rawDiff === 0) {
      return { diff: 0, isMatch: true, isSurplus: false, message: 'Bate com a meta calórica' };
    }
    const isSurplus = rawDiff > 0;
    const absDiff = Math.abs(rawDiff);
    return {
      diff: absDiff,
      isMatch: false,
      isSurplus,
      message: `${absDiff} kcal ${isSurplus ? 'acima' : 'abaixo'} da meta`,
    };
  }

  // ==========================================
  // METAS & VALORES CUSTOMIZADOS TOOLTIPS
  // ==========================================

  showCardTooltip(key: string, triggerEl: HTMLElement, immediate = false) {
    const tooltip = CARD_TOOLTIPS[key];
    if (!tooltip) return;

    if (this.tooltipHideTimer) {
      clearTimeout(this.tooltipHideTimer);
      this.tooltipHideTimer = null;
    }

    const open = () => {
      this.activeTooltipEl = triggerEl;
      this.activeTooltip.set(tooltip);
      this.activeTooltipKey.set(key);
      this.calculateTooltipPosition(triggerEl);
    };

    if (immediate) {
      if (this.tooltipHoverTimer) {
        clearTimeout(this.tooltipHoverTimer);
        this.tooltipHoverTimer = null;
      }
      open();
    } else {
      if (this.tooltipHoverTimer) {
        clearTimeout(this.tooltipHoverTimer);
      }
      this.tooltipHoverTimer = setTimeout(open, 150);
    }
  }

  hideCardTooltip(delay = 0) {
    if (this.tooltipHoverTimer) {
      clearTimeout(this.tooltipHoverTimer);
      this.tooltipHoverTimer = null;
    }
    if (delay === 0) {
      if (this.tooltipHideTimer) {
        clearTimeout(this.tooltipHideTimer);
        this.tooltipHideTimer = null;
      }
      this.activeTooltip.set(null);
      this.activeTooltipKey.set(null);
      this.activeTooltipEl = null;
    } else {
      if (this.tooltipHideTimer) {
        clearTimeout(this.tooltipHideTimer);
      }
      this.tooltipHideTimer = setTimeout(() => {
        this.activeTooltip.set(null);
        this.activeTooltipKey.set(null);
        this.activeTooltipEl = null;
      }, delay);
    }
  }

  calculateTooltipPosition(triggerEl: HTMLElement) {
    if (typeof window === 'undefined') return;
    const rect = triggerEl.getBoundingClientRect();
    const tooltipWidth = 260;
    const btnCenterX = rect.left + rect.width / 2;
    const margin = 12;

    let left = btnCenterX - tooltipWidth / 2;
    if (left < margin) {
      left = margin;
    }
    if (left + tooltipWidth > window.innerWidth - margin) {
      left = window.innerWidth - tooltipWidth - margin;
    }

    const arrowLeft = Math.max(16, Math.min(tooltipWidth - 16, btnCenterX - left));

    const gap = 8;
    const estimatedHeight = 130;
    let top = rect.bottom + gap;
    let placement: 'bottom' | 'top' = 'bottom';

    // Flip to top if insufficient space below and space exists above
    if (top + estimatedHeight > window.innerHeight - margin && rect.top > estimatedHeight + gap) {
      placement = 'top';
      top = rect.top - gap;
    }

    this.tooltipPosition.set({
      top,
      left,
      placement,
      arrowLeft,
    });
  }

  onTooltipTriggerEnter(key: string, event: MouseEvent) {
    const triggerEl = event.currentTarget as HTMLElement;
    this.showCardTooltip(key, triggerEl, false);
  }

  onTooltipTriggerLeave() {
    this.hideCardTooltip(120);
  }

  onTooltipTriggerFocus(key: string, event: FocusEvent) {
    const triggerEl = event.currentTarget as HTMLElement;
    this.showCardTooltip(key, triggerEl, true);
  }

  onTooltipTriggerBlur() {
    this.hideCardTooltip(0);
  }

  onTooltipTriggerClick(key: string, event: MouseEvent) {
    event.stopPropagation();
    if (this.activeTooltipKey() === key) {
      this.hideCardTooltip(0);
    } else {
      const triggerEl = event.currentTarget as HTMLElement;
      this.showCardTooltip(key, triggerEl, true);
    }
  }

  onTooltipMouseEnter() {
    if (this.tooltipHideTimer) {
      clearTimeout(this.tooltipHideTimer);
      this.tooltipHideTimer = null;
    }
  }

  onTooltipMouseLeave() {
    this.hideCardTooltip(120);
  }

  onDocumentPointerDown(event: PointerEvent) {
    const target = event.target as HTMLElement | null;
    if (this.activeDropdown()) {
      if (!target || !target.closest('.header-more-wrapper')) {
        this.closeDropdowns();
      }
    }
  }

  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;

    if (this.activeDropdown()) {
      if (!target || !target.closest('.header-more-wrapper')) {
        this.closeDropdowns();
      }
    }

    if (this.selectedExerciseId()) {
      if (!target || (!target.closest('[data-exercise-row]') && !target.closest('.touch-row-actions-bar'))) {
        this.selectedExerciseId.set(null);
      }
    }

    if (this.openExerciseMenuId()) {
      if (!target || !target.closest('.exercise-menu-container')) {
        this.openExerciseMenuId.set(null);
      }
    }
    if (this.openMealMenuId()) {
      if (!target || !target.closest('.meal-card-menu-box')) {
        this.openMealMenuId.set(null);
      }
    }
    if (this.activeObsExerciseId()) {
      if (!target || (!target.closest('.obs-popover') && !target.closest('.obs-cell'))) {
        this.saveObsEditing();
      }
    }
    if (!this.activeTooltip()) return;
    if (!target) return;
    if (target.closest('.btn-info-discrete') || target.closest('.card-info-tooltip')) {
      return;
    }
    this.hideCardTooltip(0);
  }

  onWindowResize() {
    if (this.activeTooltip() && this.activeTooltipEl) {
      this.calculateTooltipPosition(this.activeTooltipEl);
    }
  }

  // ==========================================
  // SPREADSHEET ROW OPERATIONS (TREINO)
  // ==========================================

  onCellFocus(rowId: string, field: string) {
    this.focusedCellKey.set(`${rowId}:${field}`);
    this.expandedRowId.set(rowId);
  }

  onCellBlur(rowId: string, field: string) {
    if (this.focusedCellKey() === `${rowId}:${field}`) {
      this.focusedCellKey.set(null);
    }
  }

  isCellFocused(rowId: string, field: string): boolean {
    return this.focusedCellKey() === `${rowId}:${field}`;
  }

  toggleRowExpand(rowId: string) {
    this.expandedRowId.set(this.expandedRowId() === rowId ? null : rowId);
  }

  onAddBlankRow() {
    this.plannerService.addBlankExercise();
    this.standardizeAllWorkoutReps();
  }

  private lastDeleteTime = 0;

  private isInsideTextInput(): boolean {
    if (typeof document === 'undefined') return false;
    const activeEl = document.activeElement as HTMLElement | null;
    if (!activeEl) return false;
    const tag = activeEl.tagName.toUpperCase();
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      activeEl.isContentEditable ||
      !!activeEl.closest('input, textarea, select, [contenteditable="true"]')
    );
  }

  private isFieldTarget(target: HTMLElement | null): boolean {
    if (!target) return false;
    return !!(
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      target.closest('.ghost-table-input') ||
      target.closest('.obs-cell') ||
      target.closest('.obs-popover') ||
      target.closest('.muscle-stacked-box') ||
      target.closest('.ghost-cell-box')
    );
  }

  onRowPointerDown(exerciseId: string, _event?: PointerEvent) {
    this.selectedExerciseId.set(exerciseId);
  }

  onRowClick(exerciseId: string, _event?: MouseEvent) {
    this.selectedExerciseId.set(exerciseId);
  }

  onRowFocusIn(exerciseId: string) {
    this.selectedExerciseId.set(exerciseId);
  }

  moveRowSelection(currentExerciseId: string, delta: number) {
    const activeW = this.getActiveWorkout();
    if (!activeW || !activeW.exercicios.length) return;
    const currentIndex = activeW.exercicios.findIndex((e) => e.id === currentExerciseId);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + delta;
    if (nextIndex >= 0 && nextIndex < activeW.exercicios.length) {
      const nextEx = activeW.exercicios[nextIndex];
      this.selectedExerciseId.set(nextEx.id);
      setTimeout(() => {
        const rowEl = document.getElementById(`exercise-row-${nextEx.id}`);
        if (rowEl) {
          rowEl.focus();
        }
      });
    }
  }

  deleteSelectedExercise() {
    const exerciseId = this.selectedExerciseId();
    if (!exerciseId) return;

    const activeW = this.getActiveWorkout();
    if (!activeW) return;

    // Exclusão atômica no serviço funcional (findIndex + splice, sem filter)
    const removal = this.plannerService.removeExercise(activeW.id, exerciseId);
    if (!removal) return;

    const { deletedExercise, deletedIndex, nextSelectedId } = removal;

    // Atualiza a seleção para o próximo item determinado na mesma operação
    this.selectedExerciseId.set(nextSelectedId);
    if (nextSelectedId) {
      setTimeout(() => {
        const rowEl = document.getElementById(`exercise-row-${nextSelectedId}`);
        if (rowEl) {
          rowEl.focus();
        }
      });
    }

    // Toast "Exercício removido · Desfazer" por 6s
    this.triggerUndoToast({
      type: 'exercise',
      message: 'Exercício removido',
      workoutId: activeW.id,
      exercise: deletedExercise,
      exerciseIndex: deletedIndex,
    });
  }

  duplicateSelectedExercise() {
    const exerciseId = this.selectedExerciseId();
    if (!exerciseId) return;

    const activeW = this.getActiveWorkout();
    if (!activeW) return;

    const clonedId = this.plannerService.duplicateExercise(activeW.id, exerciseId);
    if (clonedId) {
      this.selectedExerciseId.set(clonedId);
      setTimeout(() => {
        const rowEl = document.getElementById(`exercise-row-${clonedId}`);
        if (rowEl) {
          rowEl.focus();
        }
      });
    }
  }

  onDocumentKeydown(event: KeyboardEvent) {
    const isTextInput = this.isInsideTextInput();

    // Ctrl+Z / Cmd+Z restaura exclusão de exercício
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      const activeState = this.undoState();
      if (activeState && activeState.type === 'exercise' && !isTextInput) {
        event.preventDefault();
        this.onUndoDelete();
        return;
      }
    }

    // Se o foco estiver em campo de texto, não interceptar atalhos de tabela
    if (isTextInput) {
      return;
    }

    const selectedId = this.selectedExerciseId();
    if (!selectedId) {
      return;
    }

    // Navegação com setas ↑ / ↓
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveRowSelection(selectedId, 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveRowSelection(selectedId, -1);
      return;
    }

    // Ctrl+D / Cmd+D duplica o exercício selecionado (fora de inputs)
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      if (event.repeat) return; // Ignora auto-repeat
      this.duplicateSelectedExercise();
      return;
    }

    // Delete / Backspace exclui o exercício selecionado (fora de inputs)
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();

      // 1. Ignorar se event.repeat === true (segurar tecla não exclui em cadeia)
      if (event.repeat) {
        return;
      }

      // 2. Proteção contra duplo disparo: trava de 150ms
      const now = Date.now();
      if (now - this.lastDeleteTime < 150) {
        return;
      }
      this.lastDeleteTime = now;

      this.deleteSelectedExercise();
      return;
    }

    if (event.key === 'Escape') {
      this.selectedExerciseId.set(null);
    }
  }

  onDuplicateRow(workoutId: string, exerciseId: string) {
    const clonedId = this.plannerService.duplicateExercise(workoutId, exerciseId);
    if (clonedId) {
      this.selectedExerciseId.set(clonedId);
    }
  }

  toggleExerciseMenu(exerciseId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.openExerciseMenuId() === exerciseId) {
      this.openExerciseMenuId.set(null);
    } else {
      this.openExerciseMenuId.set(exerciseId);
    }
  }

  closeExerciseMenu() {
    this.openExerciseMenuId.set(null);
  }

  onDeleteRow(workoutId: string, exerciseId: string) {
    this.selectedExerciseId.set(exerciseId);
    this.deleteSelectedExercise();
  }

  onDeleteWorkout(workoutId: string) {
    const pl = this.plannerService.planner();
    if (!pl || !pl.treinos) return;
    const idx = pl.treinos.findIndex((w) => w.id === workoutId);
    if (idx === -1) return;
    const deletedW: WorkoutDay = {
      ...pl.treinos[idx],
      exercicios: pl.treinos[idx].exercicios.map((e) => ({ ...e })),
    };
    this.plannerService.removeWorkoutDay(workoutId);
    this.triggerUndoToast({
      type: 'workout',
      message: `Treino "${deletedW.identificador} — ${deletedW.nome}" excluído.`,
      workout: deletedW,
      workoutIndex: idx,
    });
  }

  requestDeleteWorkout(workoutId: string) {
    this.workoutToDelete.set(workoutId);
  }

  cancelDeleteWorkout() {
    this.workoutToDelete.set(null);
  }

  confirmDeleteWorkout() {
    const id = this.workoutToDelete();
    this.workoutToDelete.set(null);
    if (id) {
      this.onDeleteWorkout(id);
    }
  }

  onDragStart(index: number, event: DragEvent) {
    this.draggedRowIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDropRow(workoutId: string, targetIndex: number, event: DragEvent) {
    event.preventDefault();
    const fromIndex = this.draggedRowIndex();
    this.draggedRowIndex.set(null);
    if (fromIndex === null || fromIndex === targetIndex) return;

    this.plannerService.planner.update((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        treinos: prev.treinos.map((w) => {
          if (w.id === workoutId) {
            const list = [...w.exercicios];
            const [moved] = list.splice(fromIndex, 1);
            list.splice(targetIndex, 0, moved);
            return { ...w, exercicios: list };
          }
          return w;
        }),
      };
    });
  }

  getActiveWorkoutMaxMuscleSets(): number {
    const breakdown = this.getActiveWorkoutMuscleBreakdown();
    if (breakdown.length === 0) return 1;
    return Math.max(...breakdown.map((b) => b.sets), 1);
  }

  getMuscleMainGroup(val: string | undefined | null): string {
    if (!val) return 'Geral';
    const trimmed = val.trim();
    const parts = trimmed.split(/[\/\-:]/);
    return parts[0].trim() || 'Geral';
  }

  getMuscleSubDetail(val: string | undefined | null): string | null {
    if (!val) return null;
    const trimmed = val.trim();
    const parts = trimmed.split(/[\/\-:]/);
    if (parts.length > 1 && parts[1].trim()) {
      const main = parts[0].trim();
      const sub = parts.slice(1).join(' · ').trim();
      const normMain = this.normalizeExerciseText(main);
      const normSub = this.normalizeExerciseText(sub);
      const normFull = this.normalizeExerciseText(trimmed);

      // Ocultar o subgrupo quando ele for igual ou já estiver contido no principal
      // (ex.: "Dorsal / Latíssimo" + "Latíssimo" → mostrar só o principal).
      // Mostrar o subgrupo somente quando acrescentar informação.
      if (!normSub || normSub === normMain || normFull === normSub || normMain.includes(normSub) || normSub.includes(normMain) || normFull.includes(normSub)) {
        return null;
      }
      return sub;
    }
    return null;
  }

  private triggerUndoToast(state: UndoActionState) {
    if (this.undoTimeoutId) {
      clearTimeout(this.undoTimeoutId);
    }
    this.undoState.set(state);
    this.undoTimeoutId = setTimeout(() => {
      this.undoState.set(null);
    }, 6000);
  }

  onUndoDelete() {
    const state = this.undoState();
    if (!state) return;

    if (this.undoTimeoutId) {
      clearTimeout(this.undoTimeoutId);
      this.undoTimeoutId = null;
    }

    if (state.type === 'exercise' && state.workoutId && state.exercise) {
      const exToRestore = state.exercise;
      const targetIdx = state.exerciseIndex ?? 0;
      this.plannerService.planner.update((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          treinos: prev.treinos.map((w) => {
            if (w.id === state.workoutId) {
              const list = [...w.exercicios];
              const insertAt = Math.min(Math.max(0, targetIdx), list.length);
              list.splice(insertAt, 0, exToRestore);
              return { ...w, exercicios: list };
            }
            return w;
          }),
        };
      });
      this.selectedExerciseId.set(exToRestore.id);
      setTimeout(() => {
        const rowEl = document.getElementById(`exercise-row-${exToRestore.id}`);
        if (rowEl) {
          rowEl.focus();
        }
      });
      this.plannerService.saveSuccessMessage.set(`✓ Exercício "${exToRestore.nome || 'Linha'}" restaurado!`);
      setTimeout(() => this.plannerService.saveSuccessMessage.set(null), 3000);
    } else if (state.type === 'workout' && state.workout) {
      const workoutToRestore = state.workout;
      const targetIdx = state.workoutIndex ?? 0;
      this.plannerService.planner.update((prev) => {
        if (!prev) return prev;
        const list = [...prev.treinos];
        const insertAt = Math.min(Math.max(0, targetIdx), list.length);
        list.splice(insertAt, 0, workoutToRestore);
        return { ...prev, treinos: list };
      });
      this.plannerService.activeWorkoutId.set(workoutToRestore.id);
      this.plannerService.saveSuccessMessage.set(`✓ Treino "${workoutToRestore.identificador}" restaurado!`);
      setTimeout(() => this.plannerService.saveSuccessMessage.set(null), 3000);
    } else if (state.type === 'food_add' && state.mealId && state.food) {
      this.plannerService.removeFood(state.mealId, state.food.id);
      this.plannerService.saveSuccessMessage.set(`✓ Inclusão de "${state.food.nome}" desfeita!`);
      setTimeout(() => this.plannerService.saveSuccessMessage.set(null), 3000);
    } else if (state.type === 'food' && state.mealId && state.food) {
      this.plannerService.insertFoodAtIndex(state.mealId, state.food, state.foodIndex);
      this.plannerService.saveSuccessMessage.set(`✓ Alimento "${state.food.nome}" restaurado!`);
      setTimeout(() => this.plannerService.saveSuccessMessage.set(null), 3000);
    } else if (state.type === 'meal' && state.meal) {
      this.plannerService.insertMealAtIndex(state.meal, state.mealIndex);
      this.plannerService.saveSuccessMessage.set(`✓ Refeição "${state.meal.nome}" restaurada!`);
      setTimeout(() => this.plannerService.saveSuccessMessage.set(null), 3000);
    }

    this.undoState.set(null);
  }

  dismissUndoToast() {
    if (this.undoTimeoutId) {
      clearTimeout(this.undoTimeoutId);
      this.undoTimeoutId = null;
    }
    this.undoState.set(null);
  }

  onMoveRow(workoutId: string, exerciseId: string, direction: 'up' | 'down') {
    this.plannerService.reorderExercise(workoutId, exerciseId, direction);
  }

  updateExerciseField(workoutId: string, exerciseId: string, field: keyof WorkoutExercise, value: any) {
    let cleanVal = value;
    if (field === 'series' || field === 'cargaKg' || field === 'descansoSegundos' || field === 'rpe') {
      cleanVal = value === '' ? 0 : Number(value);
    } else if (field === 'repeticoes') {
      cleanVal = this.formatReps(value);
    }
    this.plannerService.updateExercise(workoutId, exerciseId, { [field]: cleanVal });
  }

  activeObsExerciseId = signal<string | null>(null);
  obsDraftText = signal<string>('');
  private activeObsWorkoutId: string | null = null;

  startObsEditing(workoutId: string, exerciseId: string, currentText: string | undefined | null, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.activeObsWorkoutId = workoutId;
    const initialText = currentText || '';
    this.obsDraftText.set(initialText);
    this.activeObsExerciseId.set(exerciseId);

    // Auto-focus na textarea ao abrir, com cursor no final do texto
    setTimeout(() => {
      const textarea = document.querySelector('.obs-popover-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
      }
    }, 20);
  }

  saveObsEditing() {
    const exerciseId = this.activeObsExerciseId();
    if (!exerciseId) return;
    const workoutId = this.activeObsWorkoutId || this.getActiveWorkout()?.id;
    const text = this.obsDraftText().trim();
    if (workoutId) {
      this.updateExerciseField(workoutId, exerciseId, 'observacoes', text);
    }
    this.closeObsEditing(true, exerciseId);
  }

  cancelObsEditing() {
    const exerciseId = this.activeObsExerciseId();
    this.closeObsEditing(true, exerciseId);
  }

  closeObsEditing(returnFocus = true, exerciseIdToFocus?: string | null) {
    const id = exerciseIdToFocus || this.activeObsExerciseId();
    this.activeObsExerciseId.set(null);
    this.obsDraftText.set('');
    this.activeObsWorkoutId = null;

    if (returnFocus && id) {
      setTimeout(() => {
        const cell = document.querySelector(`.obs-cell[data-id="${id}"]`) as HTMLElement;
        cell?.focus();
      }, 20);
    }
  }

  onObsTextareaInput(val: string) {
    this.obsDraftText.set(val);
  }

  onObsKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.saveObsEditing();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.saveObsEditing();
    }
  }

  editingCell = signal<{ id: string; field: 'nome' | 'grupoMuscular' | 'observacoes' } | null>(null);
  private cellBlurTimeoutId: any = null;

  isEditing(exerciseId: string, field: 'nome' | 'grupoMuscular' | 'observacoes'): boolean {
    const curr = this.editingCell();
    return curr !== null && curr.id === exerciseId && curr.field === field;
  }

  startEditing(exerciseId: string, field: 'nome' | 'grupoMuscular' | 'observacoes', event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.cellBlurTimeoutId) {
      clearTimeout(this.cellBlurTimeoutId);
      this.cellBlurTimeoutId = null;
    }
    this.editingCell.set({ id: exerciseId, field });
    setTimeout(() => {
      const target = document.querySelector(`.is-editing[data-field="${field}"][data-id="${exerciseId}"]`) as HTMLElement;
      if (target) {
        target.focus();
        if (target instanceof HTMLTextAreaElement) {
          this.autoGrowTextarea(target);
        }
      }
    }, 10);
  }

  stopEditing() {
    this.editingCell.set(null);
  }

  onEditingCellBlur() {
    if (this.cellBlurTimeoutId) {
      clearTimeout(this.cellBlurTimeoutId);
    }
    this.cellBlurTimeoutId = setTimeout(() => {
      this.editingCell.set(null);
    }, 150);
  }

  autoGrowTextarea(target: EventTarget | null) {
    if (!(target instanceof HTMLTextAreaElement)) return;
    target.style.height = 'auto';
    const scrollH = target.scrollHeight;
    const clampedH = Math.min(Math.max(scrollH, 38), 120);
    target.style.height = `${clampedH}px`;
    target.style.overflowY = scrollH > 120 ? 'auto' : 'hidden';
  }

  resetTextareaHeight(target: EventTarget | null) {
    if (!(target instanceof HTMLTextAreaElement)) return;
    target.style.height = '';
    target.style.overflowY = '';
  }

  updateWorkoutTitle(workoutId: string, nome: string) {
    this.plannerService.updateWorkout(workoutId, { nome });
  }

  updateWorkoutFocus(workoutId: string, foco: string) {
    this.plannerService.updateWorkout(workoutId, { foco });
  }

  updateWorkoutObservation(workoutId: string, observacoes: string) {
    this.plannerService.updateWorkout(workoutId, { observacoes });
  }

  getActiveWorkoutTotalSeries(): number {
    const activeW = this.getActiveWorkout();
    if (!activeW || !activeW.exercicios) return 0;
    return activeW.exercicios.reduce((acc, ex) => acc + (Number(ex.series) || 0), 0);
  }

  getActiveWorkoutEstimatedMinutes(): number {
    const activeW = this.getActiveWorkout();
    if (!activeW || !activeW.exercicios) return 0;
    let totalSec = 0;
    for (const ex of activeW.exercicios) {
      const sets = Number(ex.series) || 0;
      const rest = Number(ex.descansoSegundos) || 60;
      totalSec += sets * (40 + rest);
    }
    return Math.max(1, Math.round(totalSec / 60));
  }

  getActiveWorkoutMuscleBreakdown(): Array<{ muscle: string; sets: number }> {
    const activeW = this.getActiveWorkout();
    if (!activeW || !activeW.exercicios) return [];
    const map: Record<string, number> = {};
    for (const ex of activeW.exercicios) {
      const m = (ex.grupoMuscular || 'Geral').trim();
      map[m] = (map[m] || 0) + (Number(ex.series) || 0);
    }
    return Object.entries(map).map(([muscle, sets]) => ({ muscle, sets }));
  }

  // ==========================================
  // SCIENCE-BASED MUSCLE SEARCH (LATERAL MENU)
  // ==========================================

  private normalizeExerciseText(val: string): string {
    return (val || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private stripExerciseParens(val: string): string {
    return this.normalizeExerciseText((val || '').replace(/\([^)]*\)/g, ''));
  }

  findMatchingSheetExercise(exerciseName: string): WorkoutExercise | null {
    const activeW = this.getActiveWorkout();
    if (!activeW || !activeW.exercicios || !exerciseName) return null;

    const targetFull = this.normalizeExerciseText(exerciseName);
    const targetBase = this.stripExerciseParens(exerciseName);

    for (const row of activeW.exercicios) {
      if (!row.nome) continue;
      const rowFull = this.normalizeExerciseText(row.nome);
      const rowBase = this.stripExerciseParens(row.nome);
      if (!rowFull) continue;

      if (rowFull === targetFull) return row;
      if (targetBase.length >= 6 && rowBase.length >= 6) {
        if (rowBase === targetBase) return row;
        if (rowBase.length >= 12 && targetBase.length >= 12 && (rowBase.includes(targetBase) || targetBase.includes(rowBase))) {
          return row;
        }
      }
    }
    return null;
  }

  isExerciseInserted(exerciseName: string): boolean {
    return this.findMatchingSheetExercise(exerciseName) !== null;
  }

  getInsertedCount(exercises: AiExerciseItem[] | undefined): number {
    if (!exercises || exercises.length === 0) return 0;
    return exercises.filter((ex) => this.isExerciseInserted(ex.name)).length;
  }

  getSortedScienceExercises(exercises: AiExerciseItem[] | undefined): AiExerciseItem[] {
    if (!exercises || exercises.length === 0) return [];
    const notInserted = exercises.filter((ex) => !this.isExerciseInserted(ex.name));
    const inserted = exercises.filter((ex) => this.isExerciseInserted(ex.name));
    if (this.hideInsertedScienceExercises()) {
      return notInserted;
    }
    return [...notInserted, ...inserted];
  }

  isMuscleFilterActive(filterQuery: string): boolean {
    return this.normalizeExerciseText(this.scienceMuscleQuery()) === this.normalizeExerciseText(filterQuery);
  }

  searchScienceMuscle(overrideMuscle?: string) {
    const target = overrideMuscle || this.scienceMuscleQuery().trim();
    if (!target) return;
    this.scienceMuscleQuery.set(target);
    this.showSciencePanel.set(true);
    this.plannerService.askAiWorkoutAssistant(`melhores exercicios para ${target}`, target).subscribe();
  }

  insertScienceExerciseToSheet(ex: AiExerciseItem) {
    if (this.isExerciseInserted(ex.name)) return;
    const targetW = this.getActiveWorkout();
    const restSec = parseInt(ex.suggestedRest, 10) || 90;
    this.plannerService.addExerciseToActiveWorkout({
      nome: ex.name,
      grupoMuscular: ex.muscle || targetW?.foco || 'Geral',
      series: ex.suggestedSets || 4,
      repeticoes: this.formatReps(ex.suggestedReps || '8-12'),
      cargaKg: 20,
      descansoSegundos: restSec,
      rpe: ex.rpe || 8.5,
      observacoes: ex.whyBest + (ex.tip ? ` (Dica: ${ex.tip})` : ''),
      dicaBiomecanica: ex.whyBest,
    });
    this.plannerService.saveSuccessMessage.set(`✓ Exercício adicionado: "${ex.name}"`);
    setTimeout(() => this.plannerService.saveSuccessMessage.set(null), 3000);
  }

  toggleScienceExerciseInSheet(ex: AiExerciseItem) {
    const existing = this.findMatchingSheetExercise(ex.name);
    const activeW = this.getActiveWorkout();
    if (existing && activeW) {
      this.onDeleteRow(activeW.id, existing.id);
    } else {
      this.insertScienceExerciseToSheet(ex);
    }
  }

  toggleScienceNote(name: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.expandedScienceNotes.update((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  }

  isScienceNoteExpanded(name: string): boolean {
    return !!this.expandedScienceNotes()[name];
  }

  private scienceDebounceTimer: any = null;
  onScienceSearchInput(val: string) {
    this.scienceMuscleQuery.set(val);
    if (this.scienceDebounceTimer) {
      clearTimeout(this.scienceDebounceTimer);
    }
    const clean = val.trim();
    if (clean.length >= 2) {
      this.scienceDebounceTimer = setTimeout(() => {
        this.searchScienceMuscle(clean);
      }, 350);
    }
  }

  getScienceProgressPercent(exercises: AiExerciseItem[] | undefined): number {
    if (!exercises || exercises.length === 0) return 0;
    const count = this.getInsertedCount(exercises);
    return Math.round((count / exercises.length) * 100);
  }

  // ==========================================
  // DIET OPERATIONS & TACO CALCULATION
  // ==========================================

  onFoodNameInput(name: string) {
    const query = (name || '').trim();
    if (query.length >= 1) {
      const results = searchTacoFoods(query, 10);
      this.tacoSearchResults.set(results);
      this.showTacoDropdown.set(results.length > 0);
    } else {
      this.tacoSearchResults.set([]);
      this.showTacoDropdown.set(false);
    }

    const currentTaco = this.selectedTacoItem();
    if (currentTaco && currentTaco.nome !== name) {
      this.selectedTacoItem.set(null);
    }
  }

  selectTacoFood(item: TacoFoodItem) {
    this.selectedTacoItem.set(item);
    this.showTacoDropdown.set(false);

    const currentGrams = Number(this.newFoodForm.value.quantidadeG) || 100;
    const nutrients = calculateNutrientsForWeight(item, currentGrams);

    this.newFoodForm.patchValue({
      nome: item.nome,
      quantidadeG: currentGrams,
      calorias: nutrients.calorias,
      proteinaG: nutrients.proteinaG,
      carboidratoG: nutrients.carboidratoG,
      gorduraG: nutrients.gorduraG,
    });
  }

  onFoodGramsChange(gramsInput: any) {
    const grams = Number(gramsInput) || 0;
    const item = this.selectedTacoItem();
    if (item && grams >= 0) {
      const nutrients = calculateNutrientsForWeight(item, grams);
      this.newFoodForm.patchValue({
        quantidadeG: grams,
        calorias: nutrients.calorias,
        proteinaG: nutrients.proteinaG,
        carboidratoG: nutrients.carboidratoG,
        gorduraG: nutrients.gorduraG,
      });
    }
  }

  closeTacoDropdown() {
    setTimeout(() => {
      this.showTacoDropdown.set(false);
    }, 250);
  }

  selectQuickTacoPreset(foodQuery: string) {
    const results = searchTacoFoods(foodQuery, 1);
    if (results.length > 0) {
      this.selectTacoFood(results[0]);
    }
  }

  // Number formatting in pt-BR
  formatKcal(val: number | null | undefined): string {
    const num = Math.round(Number(val) || 0);
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(num);
  }

  formatGrams(val: number | null | undefined, decimals = 1): string {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  }

  formatInt(val: number | null | undefined): string {
    const num = Math.round(Number(val) || 0);
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(num);
  }

  getGoalMetric(key: 'calorias' | 'proteinaG' | 'carboidratoG' | 'gorduraG' | 'fibrasG'): number {
    const formVal = this.customGoalsForm?.value;
    if (formVal && formVal[key] !== undefined && formVal[key] !== null) {
      return Number(formVal[key]);
    }
    const pl = this.plannerService.planner();
    const metas = pl?.metasCustomizadas;
    if (!metas) {
      if (key === 'calorias') return 2350;
      if (key === 'proteinaG') return 165;
      if (key === 'carboidratoG') return 260;
      if (key === 'gorduraG') return 68;
      if (key === 'fibrasG') return 35;
      return 100;
    }
    return Number(metas[key]) || 1;
  }

  getGoalDifference(current: number, target: number, unit: 'kcal' | 'g'): { isOver: boolean; text: string; pct: number } {
    const cur = Number(current) || 0;
    const tgt = Number(target) || 1;
    const pct = Math.min(100, Math.round((cur / tgt) * 100));
    if (cur > tgt) {
      const diff = Math.round((cur - tgt) * 10) / 10;
      const formattedDiff = unit === 'kcal' ? this.formatKcal(diff) : this.formatGrams(diff);
      return {
        isOver: true,
        text: `+${formattedDiff} ${unit}`,
        pct: 100,
      };
    } else {
      const diff = Math.round((tgt - cur) * 10) / 10;
      const formattedDiff = unit === 'kcal' ? this.formatKcal(diff) : this.formatGrams(diff);
      return {
        isOver: false,
        text: `faltam ${formattedDiff} ${unit}`,
        pct,
      };
    }
  }

  isMealCollapsed(mealId: string): boolean {
    return this.collapsedMealIds().has(mealId);
  }

  toggleMealCollapse(mealId: string) {
    this.collapsedMealIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(mealId)) {
        next.delete(mealId);
      } else {
        next.add(mealId);
      }
      return next;
    });
  }

  toggleCollapseAllMeals() {
    const pl = this.plannerService.planner();
    if (!pl || !pl.dieta) return;
    const current = this.collapsedMealIds();
    if (current.size === pl.dieta.length) {
      this.collapsedMealIds.set(new Set());
    } else {
      this.collapsedMealIds.set(new Set(pl.dieta.map((m) => m.id)));
    }
  }

  moveMeal(mealId: string, direction: 'up' | 'down', event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.plannerService.reorderMeal(mealId, direction);
  }

  onCommitMealTime(mealId: string, newTime: string, event?: Event) {
    const now = Date.now();
    const trimmed = (newTime || '').trim();

    if (
      this.lastCommittedTimeRecord &&
      this.lastCommittedTimeRecord.mealId === mealId &&
      this.lastCommittedTimeRecord.time === trimmed &&
      now - this.lastCommittedTimeRecord.at < 350
    ) {
      return;
    }
    this.lastCommittedTimeRecord = { mealId, time: trimmed, at: now };

    const pl = this.plannerService.planner();
    if (!pl || !pl.dieta) return;

    const currentMeal = pl.dieta.find((m) => m.id === mealId);
    if (!currentMeal) return;

    const oldTime = currentMeal.horario;
    currentMeal.horario = trimmed;

    if (this.mealOrderMode() === 'horario') {
      const sorted = sortMealsByTime(pl.dieta);
      const orderChanged = sorted.some((m, idx) => m.id !== pl.dieta[idx]?.id);

      this.plannerService.planner.update((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          dieta: sorted,
        };
      });

      if (orderChanged || oldTime !== trimmed) {
        this.triggerMealHighlightAndScroll(mealId);
      }
    } else {
      this.plannerService.planner.update((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          dieta: prev.dieta.map((m) => (m.id === mealId ? { ...m, horario: trimmed } : m)),
        };
      });
    }
  }

  getDuplicateTimeMealName(meal: DietMeal): string | null {
    if (!meal || !meal.horario) return null;
    const meals = this.plannerService.planner()?.dieta;
    if (!meals) return null;
    const trimmed = meal.horario.trim();
    if (!trimmed) return null;
    const dup = meals.find((m) => m.id !== meal.id && m.horario && m.horario.trim() === trimmed);
    return dup ? dup.nome : null;
  }

  triggerMealHighlightAndScroll(mealId: string) {
    this.flashedMealId.set(mealId);
    if (this.flashMealTimeout) {
      clearTimeout(this.flashMealTimeout);
    }
    this.flashMealTimeout = setTimeout(() => {
      if (this.flashedMealId() === mealId) {
        this.flashedMealId.set(null);
      }
    }, 1200);

    setTimeout(() => {
      if (typeof document !== 'undefined') {
        const el = document.getElementById(`meal-card-${mealId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 50);
  }

  onMealDragStart(index: number, event: DragEvent) {
    this.draggedMealIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onMealDragOver(index: number, event: DragEvent) {
    event.preventDefault();
    if (this.draggedMealIndex() !== null && this.draggedMealIndex() !== index) {
      this.dragOverMealIndex.set(index);
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onMealDragLeave(index: number, event: DragEvent) {
    if (this.dragOverMealIndex() === index) {
      this.dragOverMealIndex.set(null);
    }
  }

  onMealDragEnd(event: DragEvent) {
    this.draggedMealIndex.set(null);
    this.dragOverMealIndex.set(null);
  }

  onMealDrop(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    const fromIndex = this.draggedMealIndex();
    this.draggedMealIndex.set(null);
    this.dragOverMealIndex.set(null);

    if (fromIndex === null || fromIndex === targetIndex) return;

    const pl = this.plannerService.planner();
    if (!pl || !pl.dieta) return;

    const list = [...pl.dieta];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(targetIndex, 0, moved);

    if (!this.hasAskedMealOrderChoice()) {
      this.pendingManualDietOrder = list;
      this.pendingMovedMealId = moved.id;
      this.showMealOrderChoiceModal.set(true);
    } else {
      if (this.mealOrderMode() === 'manual') {
        this.plannerService.planner.update((prev) => {
          if (!prev) return prev;
          return { ...prev, dieta: list };
        });
        this.triggerMealHighlightAndScroll(moved.id);
      } else {
        const sorted = sortMealsByTime(list);
        this.plannerService.planner.update((prev) => {
          if (!prev) return prev;
          return { ...prev, dieta: sorted };
        });
        this.triggerMealHighlightAndScroll(moved.id);
      }
    }
  }

  chooseMealOrderMode(mode: 'manual' | 'horario') {
    this.hasAskedMealOrderChoice.set(true);
    this.mealOrderMode.set(mode);
    this.showMealOrderChoiceModal.set(false);

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('macrio_meal_order_mode', mode);
        localStorage.setItem('macrio_has_asked_order_mode', 'true');
      } catch (e) {}
    }

    const pl = this.plannerService.planner();
    if (!pl || !pl.dieta) return;

    if (mode === 'manual' && this.pendingManualDietOrder) {
      this.plannerService.planner.update((prev) => {
        if (!prev) return prev;
        return { ...prev, dieta: this.pendingManualDietOrder! };
      });
      if (this.pendingMovedMealId) {
        this.triggerMealHighlightAndScroll(this.pendingMovedMealId);
      }
    } else {
      const sorted = sortMealsByTime(pl.dieta);
      this.plannerService.planner.update((prev) => {
        if (!prev) return prev;
        return { ...prev, dieta: sorted };
      });
      if (this.pendingMovedMealId) {
        this.triggerMealHighlightAndScroll(this.pendingMovedMealId);
      }
    }
    this.pendingManualDietOrder = null;
    this.pendingMovedMealId = null;
  }

  getProgressPct(current: number, target: number): number {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  getMealTotalGrams(meal: DietMeal | { alimentos: DietFoodItem[] }): number {
    if (!meal || !meal.alimentos) return 0;
    return meal.alimentos.reduce((sum, f) => sum + (Number(f.quantidadeG) || 0), 0);
  }

  // Quick Add Popover for Meal
  openQuickAddForMeal(mealId: string) {
    this.activeQuickAddMealId.set(mealId);
    this.quickAddQuery.set('');
    this.quickAddResults.set([]);
    this.quickAddSelectedFood.set(null);
    this.quickAddGrams.set(100);
  }

  closeQuickAdd() {
    this.activeQuickAddMealId.set(null);
    this.quickAddQuery.set('');
    this.quickAddResults.set([]);
    this.quickAddSelectedFood.set(null);
  }

  onQuickAddSearch(query: string) {
    this.quickAddQuery.set(query);
    const q = (query || '').trim();
    if (q.length >= 1) {
      const res = searchTacoFoods(q, 8);
      this.quickAddResults.set(res);
      if (res.length > 0) {
        this.quickAddSelectedFood.set(res[0]);
      }
    } else {
      this.quickAddResults.set([]);
      this.quickAddSelectedFood.set(null);
    }
  }

  selectQuickAddFood(item: TacoFoodItem) {
    this.quickAddSelectedFood.set(item);
    this.quickAddQuery.set(item.nome);
  }

  selectQuickAddFavorite(fav: { nome: string; quantidadeG: number; query: string }) {
    const res = searchTacoFoods(fav.query, 1);
    const item = res[0] || {
      id: `fav-${Date.now()}`,
      nome: fav.nome,
      categoria: 'Favoritos',
      calorias100g: 130,
      proteina100g: 10,
      carboidrato100g: 20,
      gordura100g: 2,
    };
    this.quickAddSelectedFood.set(item);
    this.quickAddGrams.set(fav.quantidadeG);
    this.quickAddQuery.set(item.nome);
  }

  onQuickAddGramsChange(val: any) {
    const g = Math.max(1, Number(val) || 0);
    this.quickAddGrams.set(g);
  }

  confirmQuickAddFood() {
    const mealId = this.activeQuickAddMealId();
    if (!mealId) return;

    let selected = this.quickAddSelectedFood();
    if (!selected) {
      const res = this.quickAddResults();
      if (res.length > 0) {
        selected = res[0];
      }
    }

    if (!selected) return;

    const grams = this.quickAddGrams() || 100;
    const nut = calculateNutrientsForWeight(selected, grams);

    const newFoodId = `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newFood: DietFoodItem = {
      id: newFoodId,
      nome: selected.nome,
      quantidadeG: grams,
      calorias: nut.calorias,
      proteinaG: nut.proteinaG,
      carboidratoG: nut.carboidratoG,
      gorduraG: nut.gorduraG,
      fibrasG: nut.fibrasG,
    };

    this.plannerService.addFoodToMeal(mealId, newFood);

    // Flash for 1.2s
    this.flashedFoodId.set(newFoodId);
    setTimeout(() => {
      if (this.flashedFoodId() === newFoodId) {
        this.flashedFoodId.set(null);
      }
    }, 1200);

    // Close quick add
    this.closeQuickAdd();

    // Trigger toast "Alimento adicionado · Desfazer"
    this.triggerUndoToast({
      type: 'food_add',
      message: `Alimento adicionado: ${newFood.nome}`,
      mealId,
      food: newFood,
    });
  }

  // Modal: Criar alimento personalizado
  openCustomFoodModal(preferredMealId?: string) {
    const pl = this.plannerService.planner();
    const mealId = preferredMealId || (pl?.dieta && pl.dieta.length > 0 ? pl.dieta[0].id : '');
    this.newFoodForm.patchValue({
      selectedMealId: mealId,
      nome: '',
      quantidadeG: 100,
      calorias: 0,
      proteinaG: 0,
      carboidratoG: 0,
      gorduraG: 0,
    });
    this.customFoodMode.set('taco');
    this.selectedTacoItem.set(null);
    this.showTacoDropdown.set(false);
    this.showCustomFoodModal.set(true);
  }

  closeCustomFoodModal() {
    this.showCustomFoodModal.set(false);
    this.showTacoDropdown.set(false);
  }

  setCustomFoodMode(mode: 'taco' | 'manual') {
    this.customFoodMode.set(mode);
    if (mode === 'taco') {
      const taco = this.selectedTacoItem();
      if (taco) {
        const grams = Number(this.newFoodForm.value.quantidadeG) || 100;
        const nut = calculateNutrientsForWeight(taco, grams);
        this.newFoodForm.patchValue({
          calorias: nut.calorias,
          proteinaG: nut.proteinaG,
          carboidratoG: nut.carboidratoG,
          gorduraG: nut.gorduraG,
        });
      }
    }
  }

  onAddCustomFood() {
    if (this.newFoodForm.invalid) return;
    const val = this.newFoodForm.value;
    if (!val.selectedMealId) return;
    const foodName = (val.nome || '').trim();
    if (!foodName) return;

    const newFoodId = `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const taco = this.selectedTacoItem();
    const grams = Number(val.quantidadeG) || 100;
    const calculatedFib = taco ? calculateNutrientsForWeight(taco, grams).fibrasG : 0;

    const newFood: DietFoodItem = {
      id: newFoodId,
      nome: foodName,
      quantidadeG: grams,
      calorias: Number(val.calorias) || 0,
      proteinaG: Number(val.proteinaG) || 0,
      carboidratoG: Number(val.carboidratoG) || 0,
      gorduraG: Number(val.gorduraG) || 0,
      fibrasG: calculatedFib,
    };

    this.plannerService.addFoodToMeal(val.selectedMealId, newFood);

    this.closeCustomFoodModal();

    // Flash for 1.2s
    this.flashedFoodId.set(newFoodId);
    setTimeout(() => {
      if (this.flashedFoodId() === newFoodId) {
        this.flashedFoodId.set(null);
      }
    }, 1200);

    // Trigger toast "Alimento adicionado · Desfazer"
    this.triggerUndoToast({
      type: 'food_add',
      message: `Alimento adicionado: ${newFood.nome}`,
      mealId: val.selectedMealId,
      food: newFood,
    });
  }

  addPresetFood(mealId: string, preset: Omit<DietFoodItem, 'id'>) {
    const newFoodId = `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const foodItem: DietFoodItem = {
      ...preset,
      id: newFoodId,
    };
    this.plannerService.addFoodToMeal(mealId, foodItem);

    this.flashedFoodId.set(newFoodId);
    setTimeout(() => {
      if (this.flashedFoodId() === newFoodId) {
        this.flashedFoodId.set(null);
      }
    }, 1200);

    this.triggerUndoToast({
      type: 'food_add',
      message: `Alimento adicionado: ${preset.nome}`,
      mealId,
      food: foodItem,
    });
  }

  onRemoveFoodWithFeedback(mealId: string, food: DietFoodItem) {
    this.removeFoodWithUndo(mealId, food);
  }

  removeFoodWithUndo(mealId: string, food: DietFoodItem, index?: number) {
    this.plannerService.removeFood(mealId, food.id);
    this.triggerUndoToast({
      type: 'food',
      message: `Alimento "${food.nome}" removido`,
      mealId,
      food,
      foodIndex: index,
    });
  }

  toggleMealMenu(mealId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.openMealMenuId() === mealId) {
      this.openMealMenuId.set(null);
    } else {
      this.openMealMenuId.set(mealId);
    }
  }

  duplicateMeal(mealId: string) {
    this.plannerService.duplicateMeal(mealId);
    this.openMealMenuId.set(null);
    this.plannerService.saveSuccessMessage.set('✓ Refeição duplicada com sucesso!');
    setTimeout(() => this.plannerService.saveSuccessMessage.set(null), 3000);
  }

  deleteMealWithUndo(mealId: string) {
    const pl = this.plannerService.planner();
    if (!pl || !pl.dieta) return;
    const idx = pl.dieta.findIndex((m) => m.id === mealId);
    const meal = pl.dieta[idx];
    if (!meal) return;
    this.plannerService.removeMeal(mealId);
    this.openMealMenuId.set(null);
    this.triggerUndoToast({
      type: 'meal',
      message: `Refeição "${meal.nome}" excluída`,
      meal,
      mealIndex: idx,
    });
  }

  onUpdateFoodGrams(mealId: string, foodId: string, val: any) {
    const grams = Math.max(1, Number(val) || 0);
    this.plannerService.updateFoodQuantity(mealId, foodId, grams);
  }

  onWindowScroll() {
    if (typeof window !== 'undefined') {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      this.isDietScrolled.set(scrollY > 280);
      if (this.activeTooltip() && this.activeTooltipEl) {
        this.calculateTooltipPosition(this.activeTooltipEl);
      }
    }
  }

  onEscapeKey() {
    this.selectedExerciseId.set(null);
    this.closeDropdowns();
    this.closeQuickAdd();
    this.closeCustomFoodModal();
    this.openMealMenuId.set(null);
    this.openExerciseMenuId.set(null);
    this.hideCardTooltip(0);
  }

  getActiveWorkout() {
    const pl = this.plannerService.planner();
    if (!pl || !pl.treinos) return null;
    return pl.treinos.find((w) => w.id === this.plannerService.activeWorkoutId()) || pl.treinos[0] || null;
  }

  get currentDateFormatted(): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }

  get currentDateShortFormatted(): string {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  get alunoNome(): string | null {
    const u = this.auth.currentUser();
    if (u && (u.tipo === 'comum' || u.tipo === 'aluno' || u.tipo === 'praticante' || !u.tipo)) {
      return u.nome;
    }
    return null;
  }

  get profissionalNome(): string | null {
    const u = this.auth.currentUser();
    if (u && (u.tipo === 'nutricionista' || u.tipo === 'treinador' || u.tipo === 'educador_fisico')) {
      return u.nome;
    }
    return null;
  }

  get workoutLettersSummary(): string {
    const pl = this.plannerService.planner();
    if (!pl || !pl.treinos || pl.treinos.length === 0) return '';
    const letters = pl.treinos.map((w, i) => {
      if (w.identificador && w.identificador.length <= 2) return w.identificador.toUpperCase();
      const match = w.nome.match(/Treino\s+([A-Za-z0-9]+)/i);
      if (match) return match[1].toUpperCase();
      return String.fromCharCode(65 + i);
    });
    if (letters.length === 1) return letters[0];
    if (letters.length === 2) return `${letters[0]} e ${letters[1]}`;
    return `${letters.slice(0, -1).join(', ')} e ${letters[letters.length - 1]}`;
  }

  formatWaterLiters(ml: number | undefined | null): string {
    if (!ml || ml <= 0) return '—';
    const liters = ml / 1000;
    const formatted = liters % 1 === 0 ? String(liters) : liters.toFixed(1).replace('.', ',');
    return `${formatted} ${liters === 1 ? 'litro' : 'litros'}`;
  }

  formatWaterNumber(ml: number | undefined | null): string {
    if (!ml || ml <= 0) return '0';
    const liters = ml / 1000;
    return liters % 1 === 0 ? String(liters) : liters.toFixed(1).replace('.', ',');
  }

  formatRepsSimple(val: string | undefined | null): string {
    if (!val) return '8 a 12';
    return String(val).replace(/(\d+)\s*[-–—]\s*(\d+)/g, '$1 a $2').trim();
  }

  formatRestSimple(val: number | string | undefined | null): string {
    if (val === undefined || val === null || val === '') return '90 s';
    const num = parseInt(String(val).replace(/\D/g, ''), 10);
    return isNaN(num) ? '90 s' : `${num} s`;
  }

  getWorkoutHeader(w: WorkoutDay, index: number): { badge: string; subtitle: string } {
    let letter = w.identificador;
    if (!letter || letter.length > 2) {
      const match = w.nome.match(/Treino\s+([A-Za-z0-9]+)/i);
      letter = match ? match[1].toUpperCase() : String.fromCharCode(65 + index);
    } else {
      letter = letter.toUpperCase();
    }
    const badge = `TREINO ${letter}`;

    let subtitle = w.nome.replace(/^treino\s+[a-z0-9]+\s*[:\-–]?\s*/i, '').trim();
    if (!subtitle) {
      subtitle = w.nome;
    }
    return { badge, subtitle };
  }

  formatRestSeconds(val: string | number | undefined | null): string {
    if (val === undefined || val === null || val === '') return '90 s';
    const num = parseInt(String(val).replace(/\D/g, ''), 10);
    return isNaN(num) ? '90 s' : `${num} s`;
  }

  getMealTotals(meal: DietMeal | { alimentos: DietFoodItem[] }) {
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

  toggleDropdown(type: string) {
    if (this.activeDropdown() === type) {
      this.activeDropdown.set(null);
    } else {
      this.activeDropdown.set(type);
      if (type === 'header-unified-more' && typeof window !== 'undefined') {
        const btn = document.querySelector('.btn-header-more');
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          this.dropdownFlipUp.set(spaceBelow < 420 && rect.top > 420);
        }
        setTimeout(() => {
          const first = document.querySelector<HTMLButtonElement>(
            '.header-more-wrapper .dropdown-menu button[role="menuitem"]:not(:disabled)'
          );
          first?.focus();
        }, 50);
      }
    }
  }

  closeDropdowns() {
    this.activeDropdown.set(null);
  }

  handleMenuKeydown(event: KeyboardEvent) {
    const menu = event.currentTarget as HTMLElement;
    if (!menu) return;
    const items = Array.from(
      menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[nextIndex]?.focus();
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prevIndex]?.focus();
        break;
      }
      case 'Home': {
        event.preventDefault();
        items[0]?.focus();
        break;
      }
      case 'End': {
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      }
      case 'Escape': {
        event.preventDefault();
        this.closeDropdowns();
        const btn = document.querySelector<HTMLButtonElement>('.btn-header-more');
        btn?.focus();
        break;
      }
      case 'Tab': {
        setTimeout(() => {
          if (!menu.contains(document.activeElement)) {
            this.closeDropdowns();
          }
        }, 0);
        break;
      }
    }
  }

  async copyWhatsApp(target: 'treino' | 'alimentacao' | 'resumo') {
    const pl = this.plannerService.planner();
    if (!pl) return;

    const mode = this.exportMode();
    const water = this.currentWaterGoalMl();
    let text = '';

    if (target === 'treino') {
      if (!this.hasWorkoutPlan()) return;
      text = formatWhatsAppTreino(pl, mode);
    } else if (target === 'alimentacao') {
      if (!this.hasDietPlan()) return;
      text = formatWhatsAppDieta(pl, mode, water);
    } else {
      if (!this.hasWorkoutPlan() && !this.hasDietPlan()) return;
      text = formatWhatsAppResumo(pl, mode, water);
    }

    if (!text) return;

    this.copiedItemKey.set(`copy-${target}`);

    const success = await copyToClipboardWithFallback(text);
    if (success) {
      if (text.length > 3500) {
        this.copyFeedback.set('Copiado! Texto longo, considere enviar em partes');
      } else {
        this.copyFeedback.set('Copiado! Cole no WhatsApp');
      }
    } else {
      this.copyFeedback.set('Não foi possível copiar. Tente de novo.');
    }

    setTimeout(() => {
      this.copiedItemKey.set(null);
      this.closeDropdowns();
    }, 1500);

    setTimeout(() => {
      this.copyFeedback.set(null);
    }, 3000);
  }

  openWhatsApp(target: 'treino' | 'alimentacao' | 'resumo' = 'resumo') {
    const pl = this.plannerService.planner();
    if (!pl) return;

    const mode = this.exportMode();
    const water = this.currentWaterGoalMl();
    let text = '';

    if (target === 'treino') {
      if (!this.hasWorkoutPlan()) return;
      text = formatWhatsAppTreino(pl, mode);
    } else if (target === 'alimentacao') {
      if (!this.hasDietPlan()) return;
      text = formatWhatsAppDieta(pl, mode, water);
    } else {
      if (!this.hasWorkoutPlan() && !this.hasDietPlan()) return;
      text = formatWhatsAppResumo(pl, mode, water);
    }

    if (!text) return;

    this.closeDropdowns();
    if (typeof window !== 'undefined') {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  retryExport(type: 'treino' | 'alimentacao') {
    this.exportError.set(null);
    if (type === 'treino') {
      this.downloadWorkoutPdf();
    } else {
      this.downloadDietPdf();
    }
  }

  onDropdownKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdowns();
    }
  }

  getSanitizedAlunoSlug(): string {
    if (!this.alunoNome) return '';
    return this.alunoNome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  getWorkoutPdfFileName(): string {
    const dateStr = new Date().toISOString().slice(0, 10);
    const slug = this.getSanitizedAlunoSlug();
    return slug ? `treino_${slug}_${dateStr}.pdf` : `treino_${dateStr}.pdf`;
  }

  getDietPdfFileName(): string {
    const dateStr = new Date().toISOString().slice(0, 10);
    const slug = this.getSanitizedAlunoSlug();
    return slug ? `alimentacao_${slug}_${dateStr}.pdf` : `alimentacao_${dateStr}.pdf`;
  }

  printPlan(target: 'treino' | 'alimentacao' | 'all' = 'all') {
    this.closeDropdowns();
    this.printDocumentTarget.set(target);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          this.printDocumentTarget.set('all');
        }, 1500);
      }, 100);
    }
  }

  async downloadWorkoutPdf(targetMode?: 'simples' | 'completa') {
    if (typeof window === 'undefined') return;
    const p = this.plannerService.planner();
    if (!p) return;

    if (!this.hasWorkoutPlan()) {
      this.copyFeedback.set('Adicione exercícios para exportar o treino');
      setTimeout(() => this.copyFeedback.set(null), 3500);
      return;
    }

    const mode = targetMode || this.exportMode();
    this.isDownloadingWorkoutPdf.set(true);
    this.exportError.set(null);

    try {
      await exportWorkoutPdf({
        planner: p,
        alunoNome: this.alunoNome,
        profissionalNome: this.profissionalNome,
        currentDateShort: this.currentDateShortFormatted,
        mode,
        workoutLettersSummary: this.workoutLettersSummary,
        totalExercisesCount: this.totalExercisesCount(),
        fileName: this.getWorkoutPdfFileName(),
        formatKcal: this.formatKcal.bind(this),
        formatInt: this.formatInt.bind(this),
        formatGrams: this.formatGrams.bind(this),
        formatWaterLiters: this.formatWaterLiters.bind(this),
        formatRepsSimple: this.formatRepsSimple.bind(this),
        formatRestSimple: this.formatRestSimple.bind(this),
        formatReps: this.formatReps.bind(this),
        formatRestSeconds: this.formatRestSeconds.bind(this),
        getWorkoutHeader: this.getWorkoutHeader.bind(this),
        getMealTotals: this.getMealTotals.bind(this),
      });

      this.copyFeedback.set(`✓ Plano de Treino salvo com sucesso (${this.getWorkoutPdfFileName()})!`);
      setTimeout(() => this.copyFeedback.set(null), 4000);
    } catch (err) {
      console.error('Erro ao gerar PDF de Treino:', err);
      this.exportError.set({
        message: 'Falha ao gerar o PDF de Treino.',
        type: 'treino',
      });
      setTimeout(() => this.copyFeedback.set(null), 100);
    } finally {
      this.isDownloadingWorkoutPdf.set(false);
    }
  }

  async downloadDietPdf(targetMode?: 'simples' | 'completa') {
    if (typeof window === 'undefined') return;
    const p = this.plannerService.planner();
    if (!p) return;

    if (!this.hasDietPlan()) {
      this.copyFeedback.set('Adicione refeições para exportar a alimentação');
      setTimeout(() => this.copyFeedback.set(null), 3500);
      return;
    }

    const mode = targetMode || this.exportMode();
    this.isDownloadingDietPdf.set(true);
    this.exportError.set(null);

    try {
      await exportDietPdf({
        planner: p,
        alunoNome: this.alunoNome,
        profissionalNome: this.profissionalNome,
        currentDateShort: this.currentDateShortFormatted,
        mode,
        workoutLettersSummary: this.workoutLettersSummary,
        totalExercisesCount: this.totalExercisesCount(),
        fileName: this.getDietPdfFileName(),
        formatKcal: this.formatKcal.bind(this),
        formatInt: this.formatInt.bind(this),
        formatGrams: this.formatGrams.bind(this),
        formatWaterLiters: this.formatWaterLiters.bind(this),
        formatRepsSimple: this.formatRepsSimple.bind(this),
        formatRestSimple: this.formatRestSimple.bind(this),
        formatReps: this.formatReps.bind(this),
        formatRestSeconds: this.formatRestSeconds.bind(this),
        getWorkoutHeader: this.getWorkoutHeader.bind(this),
        getMealTotals: this.getMealTotals.bind(this),
      });

      this.copyFeedback.set(`✓ Plano de Alimentação salvo com sucesso (${this.getDietPdfFileName()})!`);
      setTimeout(() => this.copyFeedback.set(null), 4000);
    } catch (err) {
      console.error('Erro ao gerar PDF de Alimentação:', err);
      this.exportError.set({
        message: 'Falha ao gerar o PDF de Alimentação.',
        type: 'alimentacao',
      });
      setTimeout(() => this.copyFeedback.set(null), 100);
    } finally {
      this.isDownloadingDietPdf.set(false);
    }
  }

  async downloadPdf(targetMode?: 'simples' | 'completa') {
    if (this.hasWorkoutPlan()) {
      await this.downloadWorkoutPdf(targetMode);
    }
    if (this.hasDietPlan()) {
      await this.downloadDietPdf(targetMode);
    }
  }

  generateWorkoutPlainText(): string {
    const p = this.plannerService.planner();
    if (!p) return '';

    let text = `========================================\n`;
    text += `MACRIO - PLANO DE TREINO\n`;
    if (this.alunoNome) text += `Aluno: ${this.alunoNome}\n`;
    text += `Data: ${this.currentDateShortFormatted}\n`;
    if (this.profissionalNome) text += `Profissional: ${this.profissionalNome}\n`;
    text += `========================================\n\n`;

    const totalEx = this.totalExercisesCount();
    text += `RESUMO: ${p.treinos.length} ${p.treinos.length === 1 ? 'treino' : 'treinos'} · ${totalEx} exercícios\n\n`;

    if (this.exportMode() === 'simples') {
      text += `LEGENDA:\n`;
      text += `• Série = um bloco de repetições.\n`;
      text += `• Repetição = cada vez que você faz o movimento.\n`;
      text += `• Descanso = pausa entre uma série e outra.\n\n`;
    }

    for (const [idx, w] of p.treinos.entries()) {
      const h = this.getWorkoutHeader(w, idx);
      text += `----------------------------------------\n`;
      text += `${h.badge}: ${h.subtitle} (${w.exercicios.length} exercícios)\n`;
      if (this.exportMode() === 'completa') {
        if (w.foco) text += `Foco: ${w.foco}\n`;
        if (w.observacoes) text += `Observações: ${w.observacoes}\n`;
      }
      text += `----------------------------------------\n`;

      w.exercicios.forEach((e, eIdx) => {
        text += `#${eIdx + 1} ${e.nome} — ${e.series} séries | ${this.formatRepsSimple(e.repeticoes)} repetições | Descanso: ${this.formatRestSimple(e.descansoSegundos)}`;
        if (this.exportMode() === 'completa' && e.grupoMuscular) {
          text += ` [${e.grupoMuscular}]`;
        }
        if (e.observacoes || e.dicaBiomecanica) {
          text += `\n   Dica: ${e.observacoes || e.dicaBiomecanica}`;
        }
        text += `\n`;
      });
      text += `\n`;
    }

    return text.trim();
  }

  generateDietPlainText(): string {
    const p = this.plannerService.planner();
    if (!p) return '';

    let text = `========================================\n`;
    text += `MACRIO - PLANO DE ALIMENTAÇÃO\n`;
    if (this.alunoNome) text += `Aluno: ${this.alunoNome}\n`;
    text += `Data: ${this.currentDateShortFormatted}\n`;
    if (this.profissionalNome) text += `Profissional: ${this.profissionalNome}\n`;
    text += `========================================\n\n`;

    text += `RESUMO:\n`;
    text += `${p.dieta.length} ${p.dieta.length === 1 ? 'refeição' : 'refeições'} por dia · ${this.formatWaterLiters(p.metasCustomizadas.metaAguaMl)} de água por dia\n\n`;

    text += `METAS DO DIA:\n`;
    text += `• Calorias: ${this.formatKcal(p.metasCustomizadas.calorias)} kcal\n`;
    text += `• Proteínas: ${this.formatInt(p.metasCustomizadas.proteinaG)} g\n`;
    text += `• Carboidratos: ${this.formatInt(p.metasCustomizadas.carboidratoG)} g\n`;
    text += `• Gorduras: ${this.formatInt(p.metasCustomizadas.gorduraG)} g\n`;
    text += `• Água: ${this.formatWaterLiters(p.metasCustomizadas.metaAguaMl)}\n`;

    if (this.exportMode() === 'completa') {
      text += `\nDETALHES METABÓLICOS:\n`;
      text += `• GET (Gasto Energético Total): ${this.formatKcal(p.metasCustomizadas.gastoEnergeticoTotal)} kcal\n`;
      text += `• TMB (Taxa Metabólica Basal): ${this.formatKcal(p.metasCustomizadas.taxaMetabolicaBasal)} kcal\n`;
      if (p.metasCustomizadas.fibrasG) {
        text += `• Fibras: ${this.formatInt(p.metasCustomizadas.fibrasG)} g\n`;
      }
    }
    text += `\n`;

    text += `REFEIÇÕES:\n`;
    for (const m of p.dieta) {
      if (!m.alimentos || m.alimentos.length === 0) continue;
      const mealTotals = this.getMealTotals(m);
      text += `----------------------------------------\n`;
      text += `${m.nome.toUpperCase()}${m.horario ? ' · ' + m.horario : ''} (${this.formatKcal(mealTotals.calorias)} kcal)\n`;
      if (this.exportMode() === 'completa') {
        text += `P: ${this.formatGrams(mealTotals.proteinaG)}g | C: ${this.formatGrams(mealTotals.carboidratoG)}g | G: ${this.formatGrams(mealTotals.gorduraG)}g\n`;
      }
      text += `----------------------------------------\n`;

      m.alimentos.forEach((f) => {
        text += `• ${f.nome} ................. ${this.formatInt(f.quantidadeG)} g`;
        if (this.exportMode() === 'completa') {
          text += ` (${this.formatKcal(f.calorias)} kcal)`;
        }
        text += `\n`;
      });
      text += `\n`;
    }

    const dietTotals = this.plannerService.dietTotals();
    text += `========================================\n`;
    text += `TOTAL DO DIA: ${this.formatKcal(dietTotals.calorias)} kcal\n`;
    if (this.exportMode() === 'completa') {
      text += `Proteínas: ${this.formatGrams(dietTotals.proteina)} g | Carboidratos: ${this.formatGrams(dietTotals.carbo)} g | Gorduras: ${this.formatGrams(dietTotals.gordura)} g\n`;
    }
    text += `========================================\n`;

    return text.trim();
  }

  copyPlanToClipboard(target: 'treino' | 'alimentacao') {
    this.closeDropdowns();
    const text = target === 'treino' ? this.generateWorkoutPlainText() : this.generateDietPlainText();
    if (!text) {
      const msg = target === 'treino' ? 'Adicione exercícios para exportar o treino' : 'Adicione refeições para exportar a alimentação';
      this.copyFeedback.set(msg);
      setTimeout(() => this.copyFeedback.set(null), 3500);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        const title = target === 'treino' ? 'Plano de Treino' : 'Plano de Alimentação';
        this.copyFeedback.set(`✓ Texto do ${title} copiado com sucesso!`);
        setTimeout(() => this.copyFeedback.set(null), 4000);
      });
    }
  }

  async sharePlan(target: 'treino' | 'alimentacao' = 'treino') {
    this.closeDropdowns();
    const text = target === 'treino' ? this.generateWorkoutPlainText() : this.generateDietPlainText();
    if (!text) {
      const msg = target === 'treino' ? 'Adicione exercícios para exportar o treino' : 'Adicione refeições para exportar a alimentação';
      this.copyFeedback.set(msg);
      setTimeout(() => this.copyFeedback.set(null), 3500);
      return;
    }

    const title = target === 'treino' ? 'Macrio - Plano de Treino' : 'Macrio - Plano de Alimentação';

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: title,
          text: text,
        });
        this.copyFeedback.set(`✓ ${title} compartilhado com sucesso!`);
        setTimeout(() => this.copyFeedback.set(null), 4000);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    this.copyPlanToClipboard(target);
  }

  copyFullPlanToClipboard() {
    this.copyPlanToClipboard('treino');
  }
}
