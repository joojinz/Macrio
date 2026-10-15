import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());

const angularApp = new AngularNodeAppEngine();

// Initialize Google Gemini AI client only when a valid API key is present
const rawGeminiKey = (process.env['GEMINI_API_KEY'] || '').trim();
const isValidGeminiKey =
  rawGeminiKey.length > 25 &&
  rawGeminiKey.startsWith('AIza') &&
  rawGeminiKey !== 'GEMINI_API_KEY' &&
  !rawGeminiKey.includes('YOUR_');

let ai: GoogleGenAI | null = null;
let geminiAvailable = isValidGeminiKey;
if (isValidGeminiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: rawGeminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch {
    ai = null;
    geminiAvailable = false;
  }
}

// Initialize Firebase Firestore if configured
let firestoreDb: ReturnType<typeof getFirestore> | null = null;
try {
  const configPath = join(process.cwd(), 'firebase-applet-config.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const fbApp = getApps().length === 0 ? initializeApp(config) : getApps()[0];
    firestoreDb = getFirestore(fbApp, config.firestoreDatabaseId);
    console.log('[Macrio] Firestore inicializado com sucesso.');
  }
} catch (error) {
  console.warn('[Macrio] Firebase Firestore offline ou em modo in-memory:', error);
}

// In-memory data store for plans and users
const plans = [
  {
    id: 'gratuito',
    name: 'Gratuito',
    price: 'R$ 0',
    description: 'Perfeito para quem quer começar a cuidar da alimentação sem compromisso.',
    features: [
      'Controle básico de calorias',
      'Registro de treinos simples',
      'Acompanhamento de água',
      'Gráficos essenciais de progresso',
    ],
    highlightFeatures: [
      'Análise de macros completa',
      'Insights de IA',
      'Múltiplos perfis',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
    highlight: false,
  },
  {
    id: 'mensal',
    name: 'Premium Mensal',
    price: 'R$ 29,90',
    description: 'Para quem quer resultados reais com ferramentas completas e sem limitações.',
    features: [
      'Tudo do plano Gratuito',
      'Análise de macros completa',
      'Treinos ilimitados e personalizados',
      'Insights de IA sobre seus padrões',
      'Experiência sem anúncios',
      'Múltiplos perfis (família)',
      'Gráficos avançados e comparativos',
    ],
    highlightFeatures: [
      'Relatórios anuais detalhados',
      'Acesso antecipado a novidades',
    ],
    highlight: true,
  },
  {
    id: 'anual',
    name: 'Premium Anual',
    price: 'R$ 20,90',
    description: 'A melhor escolha para quem está comprometido com a transformação a longo prazo.',
    features: [
      'Tudo do Premium Mensal',
      'Economia de 50% no valor mensal',
      'Relatórios anuais detalhados',
      'Suporte prioritário 24/7',
      'Acesso antecipado a novidades',
      'Exportação de dados em PDF',
    ],
    highlightFeatures: [],
    highlight: false,
  },
];

export interface NutritionProfile {
  metaAguaMl: number;
  metaCalorias: number | null;
  pesoKg: number | null;
  alturaCm: number | null;
  idade: number | null;
  sexo: 'masculino' | 'feminino' | null;
  nivelAtividade: 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'muito_intenso' | null;
  objetivo: 'perder_peso' | 'manter' | 'ganhar_massa' | null;
  tmb: number | null;
  gastoEnergeticoTotal: number | null;
  caloriasRecomendadas: number | null;
  metaAguaRecomendadaMl: number | null;
}

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

export interface UserPlannerData {
  modoPerfil: 'comum' | 'educador_fisico' | 'nutricionista';
  metasCustomizadas: CustomMetabolicGoals;
  treinos: WorkoutDay[];
  dieta: DietMeal[];
  ultimaModificacao?: string;
}

export interface UserAccount {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  tipo: string;
  plano: string;
  aceitaTermos: boolean;
  aceitaPrivacidade: boolean;
  perfil: NutritionProfile;
  planner?: UserPlannerData;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Patient {
  id: string;
  nutritionistId: string;
  nome: string;
  idade: number;
  pesoKg: number;
  alturaCm: number;
  sexo: 'masculino' | 'feminino';
  objetivo: 'perder_peso' | 'manter' | 'ganhar_massa';
  tmb: number;
  caloriasRecomendadas: number;
  criadoEm: string;
}

const usersByEmail = new Map<string, UserAccount>();
const usersById = new Map<string, UserAccount>();
const tokens = new Map<string, string>(); // token -> userId
const patientsMap = new Map<string, Patient[]>(); // nutritionistId -> Patient[]
const plannerMap = new Map<string, UserPlannerData>(); // userId -> UserPlannerData

export function createDefaultPlanner(user?: Partial<UserAccount>): UserPlannerData {
  const peso = user?.perfil?.pesoKg || 75;
  const altura = user?.perfil?.alturaCm || 175;
  const idade = user?.perfil?.idade || 28;
  const sexo = user?.perfil?.sexo || 'masculino';
  const nivelAtividade = user?.perfil?.nivelAtividade || 'moderado';
  const objetivo = user?.perfil?.objetivo || 'hipertrofia';

  const base = (10 * peso) + (6.25 * altura) - (5 * idade);
  const tmb = user?.perfil?.tmb || (sexo === 'feminino' ? Math.round(base - 161) : Math.round(base + 5));
  const multiplicadores: Record<string, number> = {
    sedentario: 1.2,
    leve: 1.375,
    moderado: 1.55,
    intenso: 1.725,
    muito_intenso: 1.9,
  };
  const fator = multiplicadores[nivelAtividade] || 1.55;
  const get = user?.perfil?.gastoEnergeticoTotal || Math.round(tmb * fator);
  const delta = (objetivo === 'perder_peso') ? -400 : (objetivo === 'hipertrofia' || objetivo === 'ganhar_massa' ? 300 : 0);
  const cal = user?.perfil?.caloriasRecomendadas || (get + delta);
  const agua = user?.perfil?.metaAguaMl || Math.round(peso * 35);

  const prot = Math.round(peso * 2.0);
  const fat = Math.round(peso * 0.8);
  const calsRestantes = cal - (prot * 4 + fat * 9);
  const carb = Math.max(50, Math.round(calsRestantes / 4));
  const fibras = 32;

  return {
    modoPerfil: (user?.tipo === 'nutricionista' ? 'nutricionista' : 'educador_fisico') as any,
    metasCustomizadas: {
      useCustomValues: false,
      calorias: cal,
      gastoEnergeticoTotal: get,
      taxaMetabolicaBasal: tmb,
      metaAguaMl: agua,
      proteinaG: prot,
      carboidratoG: carb,
      gorduraG: fat,
      fibrasG: fibras,
      deficitSuperavitKcal: delta,
    },
    treinos: [
      {
        id: 'w-treino-a',
        identificador: 'Treino A',
        nome: 'Dorsal e Bíceps (Costas em V & Puxadas)',
        foco: 'Dorsal / Latíssimo do Dorso',
        exercicios: [
          {
            id: 'ex-1',
            nome: 'Puxada Alta com Pegada Pronada (Pulldown)',
            grupoMuscular: 'Dorsal / Latíssimo',
            series: 4,
            repeticoes: '8 - 12',
            cargaKg: 50,
            descansoSegundos: 90,
            rpe: 8,
            observacoes: 'Puxar com o peito apontado para cima, foco na depressão escapular.',
            dicaBiomecanica: 'Trabalha a expansão lateral da asa e ativa o latíssimo com mínima sobrecarga lombar.',
          },
          {
            id: 'ex-2',
            nome: 'Remada Curvada com Barra',
            grupoMuscular: 'Dorsal / Espessura das Costas',
            series: 4,
            repeticoes: '8 - 10',
            cargaKg: 65,
            descansoSegundos: 120,
            rpe: 8.5,
            observacoes: 'Tronco a 45 graus, cotovelos rentes ao tronco.',
            dicaBiomecanica: 'Padrão ouro para densidade e espessura do grande dorsal, rombóides e trapézio médio.',
          },
          {
            id: 'ex-3',
            nome: 'Remada Baixa no Triângulo (Polia Sentada)',
            grupoMuscular: 'Dorsal / Rombóides',
            series: 3,
            repeticoes: '10 - 12',
            cargaKg: 55,
            descansoSegundos: 90,
            rpe: 8,
            observacoes: 'Alongamento máximo na fase excêntrica sem curvar a lombar.',
            dicaBiomecanica: 'Tensão constante em todo o arco de movimento pela polia.',
          },
          {
            id: 'ex-4',
            nome: 'Pulldown na Polia com Barra Reta (Braços Estendidos)',
            grupoMuscular: 'Dorsal / Latíssimo Isolado',
            series: 3,
            repeticoes: '12 - 15',
            cargaKg: 25,
            descansoSegundos: 60,
            rpe: 9,
            observacoes: 'Cotovelos levemente flexionados e travados, apertar a dorsal embaixo.',
            dicaBiomecanica: 'Isola o grande dorsal sem qualquer auxílio dos flexores do cotovelo (bíceps).',
          },
          {
            id: 'ex-5',
            nome: 'Rosca Direta com Barra W',
            grupoMuscular: 'Bíceps Braquial',
            series: 3,
            repeticoes: '10 - 12',
            cargaKg: 26,
            descansoSegundos: 60,
            rpe: 8.5,
            observacoes: 'Manter os cotovelos fixos ao lado do corpo, sem balançar a coluna.',
            dicaBiomecanica: 'A pegada semi-pronada da barra W alivia a pressão nos tendões dos punhos.',
          },
        ],
      },
      {
        id: 'w-treino-b',
        identificador: 'Treino B',
        nome: 'Peitoral, Ombros e Tríceps (Empurrar / Push)',
        foco: 'Peitoral & Deltoides',
        exercicios: [
          {
            id: 'ex-b1',
            nome: 'Supino Inclinado com Halteres (30°)',
            grupoMuscular: 'Peitoral Superior',
            series: 4,
            repeticoes: '8 - 10',
            cargaKg: 28,
            descansoSegundos: 90,
            rpe: 8.5,
            observacoes: 'Banco a 30 graus para focar na porção clavicular do peitoral.',
            dicaBiomecanica: 'A liberdade dos halteres permite maior convergência no topo da fase concêntrica.',
          },
          {
            id: 'ex-b2',
            nome: 'Supino Reto com Barra',
            grupoMuscular: 'Peitoral Maior',
            series: 4,
            repeticoes: '6 - 8',
            cargaKg: 75,
            descansoSegundos: 120,
            rpe: 8.5,
            observacoes: 'Escápulas retraídas e deprimidas banco firme.',
            dicaBiomecanica: 'Maior recrutamento de unidades motoras e carga absoluta no peitoral.',
          },
          {
            id: 'ex-b3',
            nome: 'Elevação Lateral na Polia Média',
            grupoMuscular: 'Deltoide Lateral',
            series: 4,
            repeticoes: '12 - 15',
            cargaKg: 12,
            descansoSegundos: 60,
            rpe: 9,
            observacoes: 'Puxar pelo cotovelo até a altura do ombro.',
            dicaBiomecanica: 'Garante tensão mecânica contínua mesmo no início do movimento.',
          },
          {
            id: 'ex-b4',
            nome: 'Tríceps Corda na Polia',
            grupoMuscular: 'Tríceps Braquial',
            series: 3,
            repeticoes: '12 - 15',
            cargaKg: 25,
            descansoSegundos: 60,
            rpe: 9,
            observacoes: 'Abrir a corda no final estendendo completamente.',
            dicaBiomecanica: 'Forte ativação da cabeça lateral do tríceps.',
          },
        ],
      },
      {
        id: 'w-treino-c',
        identificador: 'Treino C',
        nome: 'Inferiores Completo (Legs & Glúteos)',
        foco: 'Quadríceps & Isquiotibiais',
        exercicios: [
          {
            id: 'ex-c1',
            nome: 'Agachamento Livre com Barra',
            grupoMuscular: 'Quadríceps & Glúteos',
            series: 4,
            repeticoes: '8 - 10',
            cargaKg: 85,
            descansoSegundos: 120,
            rpe: 8.5,
            observacoes: 'Profundidade abaixo de 90°, pés firmes no chão.',
            dicaBiomecanica: 'Exercício rei para potência de cadeia anterior e glúteo máximo.',
          },
          {
            id: 'ex-c2',
            nome: 'Leg Press 45°',
            grupoMuscular: 'Quadríceps & Glúteos',
            series: 4,
            repeticoes: '10 - 12',
            cargaKg: 200,
            descansoSegundos: 90,
            rpe: 9,
            observacoes: 'Pés na largura dos ombros, não hiperestender os joelhos.',
            dicaBiomecanica: 'Permite sobrecarga alta com estabilização do tronco no encosto.',
          },
          {
            id: 'ex-c3',
            nome: 'Mesa Flexora',
            grupoMuscular: 'Isquiotibiais / Posterior',
            series: 4,
            repeticoes: '10 - 12',
            cargaKg: 45,
            descansoSegundos: 60,
            rpe: 9,
            observacoes: 'Quadril pressionado contra o banco.',
            dicaBiomecanica: 'Trabalho direto na flexão do joelho para os isquiotibiais.',
          },
          {
            id: 'ex-c4',
            nome: 'Panturrilha no Smith / Elevação em Pé',
            grupoMuscular: 'Gastrocnêmio / Panturrilha',
            series: 4,
            repeticoes: '15 - 20',
            cargaKg: 60,
            descansoSegundos: 60,
            rpe: 9,
            observacoes: 'Pausa de 2 segundos no pico e alongamento total.',
            dicaBiomecanica: 'Joelho estendido recruta prioritariamente o gastrocnêmio.',
          },
        ],
      },
    ],
    dieta: [
      {
        id: 'm-cafe',
        nome: 'Café da Manhã Energético',
        horario: '07:30',
        alimentos: [
          { id: 'f-1', nome: 'Ovos inteiros mexidos', quantidadeG: 150, calorias: 215, proteinaG: 19, carboidratoG: 1.5, gorduraG: 15 },
          { id: 'f-2', nome: 'Pão 100% integral', quantidadeG: 50, calorias: 120, proteinaG: 5, carboidratoG: 22, gorduraG: 1.5 },
          { id: 'f-3', nome: 'Queijo cottage ou minas frescal', quantidadeG: 40, calorias: 45, proteinaG: 6, carboidratoG: 1.2, gorduraG: 1.8 },
          { id: 'f-4', nome: 'Café preto com canela (sem açúcar)', quantidadeG: 200, calorias: 5, proteinaG: 0.3, carboidratoG: 0.8, gorduraG: 0.1 },
        ],
      },
      {
        id: 'm-almoco',
        nome: 'Almoço Balanceado',
        horario: '12:30',
        alimentos: [
          { id: 'f-5', nome: 'Peito de frango grelhado em tiras', quantidadeG: 180, calorias: 290, proteinaG: 56, carboidratoG: 0, gorduraG: 6 },
          { id: 'f-6', nome: 'Arroz branco ou parboilizado cozido', quantidadeG: 160, calorias: 208, proteinaG: 4, carboidratoG: 45, gorduraG: 0.4 },
          { id: 'f-7', nome: 'Feijão carioca cozido temperado', quantidadeG: 100, calorias: 76, proteinaG: 5, carboidratoG: 13, gorduraG: 0.5 },
          { id: 'f-8', nome: 'Salada de folhas verdes, tomate e azeite extravirgem', quantidadeG: 120, calorias: 95, proteinaG: 2, carboidratoG: 4, gorduraG: 8 },
        ],
      },
      {
        id: 'm-lanche',
        nome: 'Lanche Pré / Pós-Treino',
        horario: '16:30',
        alimentos: [
          { id: 'f-9', nome: 'Whey Protein Isolado / Concentrado', quantidadeG: 30, calorias: 120, proteinaG: 24, carboidratoG: 2.5, gorduraG: 1.5 },
          { id: 'f-10', nome: 'Aveia em flocos finos', quantidadeG: 40, calorias: 156, proteinaG: 6, carboidratoG: 26, gorduraG: 3.2 },
          { id: 'f-11', nome: 'Banana prata fatiada', quantidadeG: 90, calorias: 88, proteinaG: 1.2, carboidratoG: 23, gorduraG: 0.3 },
        ],
      },
      {
        id: 'm-jantar',
        nome: 'Jantar Nutritivo',
        horario: '20:30',
        alimentos: [
          { id: 'f-12', nome: 'Patinho moído bovino grelhado', quantidadeG: 160, calorias: 270, proteinaG: 44, carboidratoG: 0, gorduraG: 9.5 },
          { id: 'f-13', nome: 'Batata doce cozida em cubos', quantidadeG: 160, calorias: 138, proteinaG: 2.5, carboidratoG: 32, gorduraG: 0.3 },
          { id: 'f-14', nome: 'Legumes no vapor (brócolis, cenoura, abobrinha)', quantidadeG: 150, calorias: 55, proteinaG: 3.5, carboidratoG: 9, gorduraG: 0.6 },
        ],
      },
    ],
    ultimaModificacao: new Date().toISOString(),
  };
}

// Calcula Taxa Metabólica Basal (Mifflin-St Jeor), TDEE e Calorias Recomendadas
export function calculateNutritionMetrics(perfil: NutritionProfile): void {
  const { pesoKg, alturaCm, idade, sexo, nivelAtividade, objetivo } = perfil;

  // Recomendação diária de água clínica: 35ml por kg de peso
  if (pesoKg && pesoKg > 0) {
    perfil.metaAguaRecomendadaMl = Math.round(pesoKg * 35);
  }

  // Equação de Mifflin-St Jeor para Taxa Metabólica Basal (TMB)
  if (pesoKg && alturaCm && idade && sexo) {
    const base = (10 * pesoKg) + (6.25 * alturaCm) - (5 * idade);
    const tmb = sexo === 'masculino' ? Math.round(base + 5) : Math.round(base - 161);
    perfil.tmb = tmb;

    // Fatores de atividade física padrão
    const multiplicadoresAtividade: Record<string, number> = {
      sedentario: 1.2,
      leve: 1.375,
      moderado: 1.55,
      intenso: 1.725,
      muito_intenso: 1.9,
    };

    const fator = nivelAtividade ? (multiplicadoresAtividade[nivelAtividade] || 1.2) : 1.2;
    const gastoEnergeticoTotal = Math.round(tmb * fator);
    perfil.gastoEnergeticoTotal = gastoEnergeticoTotal;

    // Ajuste calórico de acordo com o objetivo nutricional
    const ajustesObjetivo: Record<string, number> = {
      perder_peso: -400,
      manter: 0,
      ganhar_massa: 350,
    };

    const ajuste = objetivo ? (ajustesObjetivo[objetivo] ?? 0) : 0;
    const caloriasRecomendadas = Math.round(gastoEnergeticoTotal + ajuste);
    perfil.caloriasRecomendadas = caloriasRecomendadas;

    // Se o usuário ainda não definiu meta manual, adota a calculada
    if (!perfil.metaCalorias) {
      perfil.metaCalorias = caloriasRecomendadas;
    }
  }
}

// Seed a default demo professional user
const seedUser: UserAccount = {
  id: 'a0000000-0000-0000-0000-000000000001',
  nome: 'Dr. João Silva',
  email: 'joao@macrio.test',
  senhaHash: 'senhaForte1',
  tipo: 'nutricionista',
  plano: 'mensal',
  aceitaTermos: true,
  aceitaPrivacidade: true,
  perfil: {
    metaAguaMl: 2500,
    metaCalorias: 2400,
    pesoKg: 78.5,
    alturaCm: 178,
    idade: 28,
    sexo: 'masculino',
    nivelAtividade: 'moderado',
    objetivo: 'manter',
    tmb: null,
    gastoEnergeticoTotal: null,
    caloriasRecomendadas: null,
    metaAguaRecomendadaMl: null,
  },
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
};
calculateNutritionMetrics(seedUser.perfil);
usersByEmail.set(seedUser.email.toLowerCase(), seedUser);
usersById.set(seedUser.id, seedUser);

// Seed sample patients for Dr. João Silva
patientsMap.set(seedUser.id, [
  {
    id: 'pat-1',
    nutritionistId: seedUser.id,
    nome: 'Mariana Oliveira',
    idade: 26,
    pesoKg: 62,
    alturaCm: 165,
    sexo: 'feminino',
    objetivo: 'perder_peso',
    tmb: 1375,
    caloriasRecomendadas: 1731,
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'pat-2',
    nutritionistId: seedUser.id,
    nome: 'Lucas Andrade',
    idade: 31,
    pesoKg: 84,
    alturaCm: 182,
    sexo: 'masculino',
    objetivo: 'ganhar_massa',
    tmb: 1833,
    caloriasRecomendadas: 3191,
    criadoEm: new Date().toISOString(),
  },
]);

// Dedicated professional account: nutricionista@macrio.test
const seedNutri: UserAccount = {
  id: 'b0000000-0000-0000-0000-000000000002',
  nome: 'Dra. Camila Nutri',
  email: 'nutricionista@macrio.test',
  senhaHash: 'senhaForte1',
  tipo: 'nutricionista',
  plano: 'mensal',
  aceitaTermos: true,
  aceitaPrivacidade: true,
  perfil: {
    metaAguaMl: 2200,
    metaCalorias: 2000,
    pesoKg: 60,
    alturaCm: 168,
    idade: 29,
    sexo: 'feminino',
    nivelAtividade: 'moderado',
    objetivo: 'manter',
    tmb: null,
    gastoEnergeticoTotal: null,
    caloriasRecomendadas: null,
    metaAguaRecomendadaMl: null,
  },
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
};
calculateNutritionMetrics(seedNutri.perfil);
usersByEmail.set(seedNutri.email.toLowerCase(), seedNutri);
usersById.set(seedNutri.id, seedNutri);

patientsMap.set(seedNutri.id, [
  {
    id: 'pat-c1',
    nutritionistId: seedNutri.id,
    nome: 'Felipe Martins',
    idade: 34,
    pesoKg: 92,
    alturaCm: 185,
    sexo: 'masculino',
    objetivo: 'perder_peso',
    tmb: 1911,
    caloriasRecomendadas: 2562,
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'pat-c2',
    nutritionistId: seedNutri.id,
    nome: 'Beatriz Costa',
    idade: 24,
    pesoKg: 55,
    alturaCm: 162,
    sexo: 'feminino',
    objetivo: 'ganhar_massa',
    tmb: 1282,
    caloriasRecomendadas: 2337,
    criadoEm: new Date().toISOString(),
  },
]);

// Test account: maria@macrio.test (Nutricionista)
const seedMaria: UserAccount = {
  id: 'c0000000-0000-0000-0000-000000000003',
  nome: 'Dra. Maria Santos',
  email: 'maria@macrio.test',
  senhaHash: 'senhaSegura123',
  tipo: 'nutricionista',
  plano: 'mensal',
  aceitaTermos: true,
  aceitaPrivacidade: true,
  perfil: {
    metaAguaMl: 2100,
    metaCalorias: 1950,
    pesoKg: 58,
    alturaCm: 164,
    idade: 30,
    sexo: 'feminino',
    nivelAtividade: 'moderado',
    objetivo: 'manter',
    tmb: null,
    gastoEnergeticoTotal: null,
    caloriasRecomendadas: null,
    metaAguaRecomendadaMl: null,
  },
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
};
calculateNutritionMetrics(seedMaria.perfil);
usersByEmail.set(seedMaria.email.toLowerCase(), seedMaria);
usersById.set(seedMaria.id, seedMaria);

// Test account: teste@macrio.test (Nutricionista)
const seedTeste: UserAccount = {
  id: 'd0000000-0000-0000-0000-000000000004',
  nome: 'Nutricionista de Teste',
  email: 'teste@macrio.test',
  senhaHash: 'senhaForte1',
  tipo: 'nutricionista',
  plano: 'mensal',
  aceitaTermos: true,
  aceitaPrivacidade: true,
  perfil: {
    metaAguaMl: 2500,
    metaCalorias: 2200,
    pesoKg: 75,
    alturaCm: 175,
    idade: 32,
    sexo: 'masculino',
    nivelAtividade: 'moderado',
    objetivo: 'manter',
    tmb: null,
    gastoEnergeticoTotal: null,
    caloriasRecomendadas: null,
    metaAguaRecomendadaMl: null,
  },
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
};
calculateNutritionMetrics(seedTeste.perfil);
usersByEmail.set(seedTeste.email.toLowerCase(), seedTeste);
usersById.set(seedTeste.id, seedTeste);

// Master Infinite Test Account: teste@gmail.com
const seedTesteGmail: UserAccount = {
  id: 'master-nutri-teste-gmail',
  nome: 'Nutricionista VIP (teste@gmail.com)',
  email: 'teste@gmail.com',
  senhaHash: '*',
  tipo: 'nutricionista',
  plano: 'anual',
  aceitaTermos: true,
  aceitaPrivacidade: true,
  perfil: {
    metaAguaMl: 3000,
    metaCalorias: 2500,
    pesoKg: 72,
    alturaCm: 176,
    idade: 30,
    sexo: 'feminino',
    nivelAtividade: 'intenso',
    objetivo: 'manter',
    tmb: null,
    gastoEnergeticoTotal: null,
    caloriasRecomendadas: null,
    metaAguaRecomendadaMl: null,
  },
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
};
calculateNutritionMetrics(seedTesteGmail.perfil);
usersByEmail.set(seedTesteGmail.email.toLowerCase(), seedTesteGmail);
usersById.set(seedTesteGmail.id, seedTesteGmail);

// Seed sample patients for teste@gmail.com
patientsMap.set(seedTesteGmail.id, [
  {
    id: 'pat-g1',
    nutritionistId: seedTesteGmail.id,
    nome: 'Carolina Mendez',
    idade: 27,
    pesoKg: 58,
    alturaCm: 165,
    sexo: 'feminino',
    objetivo: 'perder_peso',
    tmb: 1335,
    caloriasRecomendadas: 1670,
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'pat-g2',
    nutritionistId: seedTesteGmail.id,
    nome: 'Rodrigo Santoro',
    idade: 35,
    pesoKg: 88,
    alturaCm: 184,
    sexo: 'masculino',
    objetivo: 'ganhar_massa',
    tmb: 1885,
    caloriasRecomendadas: 3272,
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'pat-g3',
    nutritionistId: seedTesteGmail.id,
    nome: 'Juliana Paes',
    idade: 31,
    pesoKg: 63,
    alturaCm: 170,
    sexo: 'feminino',
    objetivo: 'manter',
    tmb: 1412,
    caloriasRecomendadas: 2188,
    criadoEm: new Date().toISOString(),
  },
]);

// Sync all initial seeds to Firestore if available
syncUserToFirestore(seedUser);
syncUserToFirestore(seedNutri);
syncUserToFirestore(seedMaria);
syncUserToFirestore(seedTeste);
syncUserToFirestore(seedTesteGmail);

function formatUserResponse(user: UserAccount) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    tipo: user.tipo,
    plano: user.plano,
    perfil: user.perfil,
  };
}

async function syncUserToFirestore(user: UserAccount) {
  if (!firestoreDb) return;
  try {
    const userDocRef = doc(firestoreDb, 'users', user.id);
    const dataToSave: Record<string, any> = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo: user.tipo,
      plano: user.plano,
      aceitaTermos: user.aceitaTermos,
      aceitaPrivacidade: user.aceitaPrivacidade,
      perfil: user.perfil,
      atualizadoEm: new Date().toISOString(),
    };
    if (user.planner) {
      dataToSave['planner'] = user.planner;
    }
    await setDoc(userDocRef, dataToSave, { merge: true });
  } catch (err) {
    console.warn('[Macrio] Falha ao sincronizar com Firestore:', err);
  }
}

function extractUserFromHeader(req: express.Request): UserAccount | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const userId = tokens.get(token);
    if (userId) {
      const user = usersById.get(userId);
      if (user) return user;
    }
    const directUser = usersById.get(token);
    if (directUser) return directUser;
  }
  // Graceful development fallback: if no token or expired, fallback to teste@gmail.com
  return usersByEmail.get('teste@gmail.com') || usersByEmail.get('nutricionista@macrio.test') || seedUser;
}

// REST API Endpoints
app.get('/api/plans', (_req, res): void => {
  res.json(plans);
});

app.post('/api/auth/register', async (req, res): Promise<void> => {
  const {
    nome,
    email,
    senha,
    confirmarSenha,
    tipo = 'pessoal',
    plano = 'gratuito',
    aceitaTermos,
    aceitaPrivacidade,
    pesoKg,
    alturaCm,
    idade,
    sexo,
    nivelAtividade,
    objetivo,
  } = req.body || {};

  if (!nome || !email || !senha) {
    res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
    return;
  }

  if (confirmarSenha && senha !== confirmarSenha) {
    res.status(400).json({ message: 'As senhas não coincidem.' });
    return;
  }

  if (senha.length < 8) {
    res.status(400).json({ message: 'A senha deve ter no mínimo 8 caracteres.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (usersByEmail.has(normalizedEmail)) {
    res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
    return;
  }

  const id = randomUUID();
  const perfil: NutritionProfile = {
    metaAguaMl: 2000,
    metaCalorias: null,
    pesoKg: pesoKg !== undefined && pesoKg !== null ? Number(pesoKg) : null,
    alturaCm: alturaCm !== undefined && alturaCm !== null ? Math.round(Number(alturaCm)) : null,
    idade: idade !== undefined && idade !== null ? Math.round(Number(idade)) : null,
    sexo: sexo === 'masculino' || sexo === 'feminino' ? sexo : null,
    nivelAtividade: nivelAtividade || null,
    objetivo: objetivo || null,
    tmb: null,
    gastoEnergeticoTotal: null,
    caloriasRecomendadas: null,
    metaAguaRecomendadaMl: null,
  };
  calculateNutritionMetrics(perfil);

  const newUser: UserAccount = {
    id,
    nome: String(nome).trim(),
    email: normalizedEmail,
    senhaHash: String(senha),
    tipo: String(tipo).trim().toLowerCase(),
    plano: String(plano).trim().toLowerCase(),
    aceitaTermos: Boolean(aceitaTermos),
    aceitaPrivacidade: Boolean(aceitaPrivacidade),
    perfil,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  usersByEmail.set(normalizedEmail, newUser);
  usersById.set(id, newUser);

  const token = 'jwt_' + randomUUID();
  tokens.set(token, id);

  await syncUserToFirestore(newUser);

  res.status(201).json({
    token,
    tokenType: 'Bearer',
    expiresIn: 86400,
    user: formatUserResponse(newUser),
  });
});

app.post('/api/auth/login', (req, res): void => {
  const { email, senha } = req.body || {};
  if (!email || !senha) {
    res.status(400).json({ message: 'Informe e-mail e senha.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  let user = usersByEmail.get(normalizedEmail);

  const isMasterTestAccount = normalizedEmail === 'teste@gmail.com' || normalizedEmail === 'teste@macrio.test';
  if (normalizedEmail === 'teste@gmail.com' && !user) {
    user = seedTesteGmail;
  }

  if (!user || (!isMasterTestAccount && user.senhaHash !== senha)) {
    res.status(401).json({ message: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    return;
  }

  const token = 'jwt_' + randomUUID();
  tokens.set(token, user.id);

  res.json({
    token,
    tokenType: 'Bearer',
    expiresIn: 86400,
    user: formatUserResponse(user),
  });
});

app.get('/api/me', (req, res): void => {
  const user = extractUserFromHeader(req);
  if (!user) {
    res.status(401).json({ message: 'Não autorizado.' });
    return;
  }
  res.json(formatUserResponse(user));
});

app.patch('/api/me/profile', async (req, res): Promise<void> => {
  const user = extractUserFromHeader(req);
  if (!user) {
    res.status(401).json({ message: 'Não autorizado.' });
    return;
  }

  const {
    tipo,
    metaAguaMl,
    metaCalorias,
    pesoKg,
    alturaCm,
    idade,
    sexo,
    nivelAtividade,
    objetivo,
  } = req.body || {};

  // Validação: tipo de conta ('pessoal' | 'nutricionista')
  if (tipo !== undefined) {
    const val = String(tipo).trim().toLowerCase();
    if (val !== 'pessoal' && val !== 'nutricionista') {
      res.status(400).json({ message: 'Tipo de conta inválido. Escolha "pessoal" ou "nutricionista".' });
      return;
    }
    user.tipo = val;
  }

  // Validação: metaAguaMl (500 a 8000 ml)
  if (metaAguaMl !== undefined && metaAguaMl !== null) {
    const val = Number(metaAguaMl);
    if (isNaN(val) || val < 500 || val > 8000) {
      res.status(400).json({ message: 'A meta de água deve estar entre 500 ml e 8000 ml.' });
      return;
    }
    user.perfil.metaAguaMl = Math.round(val);
  }

  // Validação: metaCalorias (800 a 8000 kcal ou null)
  if (metaCalorias !== undefined) {
    if (metaCalorias === null) {
      user.perfil.metaCalorias = null;
    } else {
      const val = Number(metaCalorias);
      if (isNaN(val) || val < 800 || val > 8000) {
        res.status(400).json({ message: 'A meta de calorias deve estar entre 800 e 8000 kcal.' });
        return;
      }
      user.perfil.metaCalorias = Math.round(val);
    }
  }

  // Validação: pesoKg (20 a 400 kg)
  if (pesoKg !== undefined) {
    if (pesoKg === null) {
      user.perfil.pesoKg = null;
    } else {
      const val = Number(pesoKg);
      if (isNaN(val) || val < 20 || val > 400) {
        res.status(400).json({ message: 'O peso deve estar entre 20 kg e 400 kg.' });
        return;
      }
      user.perfil.pesoKg = Number(val.toFixed(2));
    }
  }

  // Validação: alturaCm (80 a 250 cm)
  if (alturaCm !== undefined) {
    if (alturaCm === null) {
      user.perfil.alturaCm = null;
    } else {
      const val = Number(alturaCm);
      if (isNaN(val) || val < 80 || val > 250) {
        res.status(400).json({ message: 'A altura deve estar entre 80 cm e 250 cm.' });
        return;
      }
      user.perfil.alturaCm = Math.round(val);
    }
  }

  // Validação: idade (10 a 120 anos)
  if (idade !== undefined) {
    if (idade === null) {
      user.perfil.idade = null;
    } else {
      const val = Number(idade);
      if (isNaN(val) || val < 10 || val > 120) {
        res.status(400).json({ message: 'A idade deve estar entre 10 e 120 anos.' });
        return;
      }
      user.perfil.idade = Math.round(val);
    }
  }

  // Validação: sexo ('masculino' | 'feminino')
  if (sexo !== undefined) {
    if (sexo === null) {
      user.perfil.sexo = null;
    } else {
      const val = String(sexo).trim().toLowerCase();
      if (val !== 'masculino' && val !== 'feminino') {
        res.status(400).json({ message: 'O sexo deve ser "masculino" ou "feminino".' });
        return;
      }
      user.perfil.sexo = val as 'masculino' | 'feminino';
    }
  }

  // Validação: nivelAtividade
  if (nivelAtividade !== undefined) {
    if (nivelAtividade === null) {
      user.perfil.nivelAtividade = null;
    } else {
      const val = String(nivelAtividade).trim().toLowerCase();
      const permitidos = ['sedentario', 'leve', 'moderado', 'intenso', 'muito_intenso'];
      if (!permitidos.includes(val)) {
        res.status(400).json({ message: 'Nível de atividade inválido. Valores aceitos: sedentario, leve, moderado, intenso, muito_intenso.' });
        return;
      }
      user.perfil.nivelAtividade = val as NutritionProfile['nivelAtividade'];
    }
  }

  // Validação: objetivo
  if (objetivo !== undefined) {
    if (objetivo === null) {
      user.perfil.objetivo = null;
    } else {
      const val = String(objetivo).trim().toLowerCase();
      const permitidos = ['perder_peso', 'manter', 'ganhar_massa'];
      if (!permitidos.includes(val)) {
        res.status(400).json({ message: 'Objetivo inválido. Valores aceitos: perder_peso, manter, ganhar_massa.' });
        return;
      }
      user.perfil.objetivo = val as NutritionProfile['objetivo'];
    }
  }

  // Recalcula métricas com base nos novos valores
  calculateNutritionMetrics(user.perfil);
  user.atualizadoEm = new Date().toISOString();

  await syncUserToFirestore(user);

  res.json(formatUserResponse(user));
});

// Patients endpoints for professional nutritionist accounts
app.get('/api/me/patients', (req, res): void => {
  const user = extractUserFromHeader(req);
  if (!user) {
    res.status(401).json({ message: 'Não autorizado.' });
    return;
  }
  const patients = patientsMap.get(user.id) || [];
  res.json(patients);
});

app.post('/api/me/patients', (req, res): void => {
  const user = extractUserFromHeader(req);
  if (!user) {
    res.status(401).json({ message: 'Não autorizado.' });
    return;
  }

  const { nome, idade, pesoKg, alturaCm, sexo, objetivo } = req.body || {};
  if (!nome || !idade || !pesoKg || !alturaCm || !sexo || !objetivo) {
    res.status(400).json({ message: 'Preencha todos os dados obrigatórios do paciente.' });
    return;
  }

  const pWeight = Number(pesoKg);
  const pHeight = Number(alturaCm);
  const pAge = Number(idade);
  const pSex = String(sexo).toLowerCase();
  const pGoal = String(objetivo).toLowerCase();

  // Mifflin-St Jeor calculation for patient
  const base = (10 * pWeight) + (6.25 * pHeight) - (5 * pAge);
  const tmb = pSex === 'masculino' ? Math.round(base + 5) : Math.round(base - 161);
  const tdee = Math.round(tmb * 1.55); // moderado default
  const goalAdj = pGoal === 'perder_peso' ? -400 : (pGoal === 'ganhar_massa' ? 350 : 0);
  const caloriasRecomendadas = Math.round(tdee + goalAdj);

  const newPatient: Patient = {
    id: 'pat-' + randomUUID(),
    nutritionistId: user.id,
    nome: String(nome).trim(),
    idade: pAge,
    pesoKg: pWeight,
    alturaCm: pHeight,
    sexo: pSex as 'masculino' | 'feminino',
    objetivo: pGoal as 'perder_peso' | 'manter' | 'ganhar_massa',
    tmb,
    caloriasRecomendadas,
    criadoEm: new Date().toISOString(),
  };

  const list = patientsMap.get(user.id) || [];
  list.push(newPatient);
  patientsMap.set(user.id, list);

  res.status(201).json(newPatient);
});

app.delete('/api/me/patients/:id', (req, res): void => {
  const user = extractUserFromHeader(req);
  if (!user) {
    res.status(401).json({ message: 'Não autorizado.' });
    return;
  }
  const patientId = req.params['id'];
  const list = patientsMap.get(user.id) || [];
  const updated = list.filter(p => p.id !== patientId);
  patientsMap.set(user.id, updated);
  res.json({ message: 'Paciente removido com sucesso.' });
});

app.put('/api/auth/update-plan', async (req, res): Promise<void> => {
  const { planId, userId, newPlan, email, plan } = req.body || {};
  const targetEmail = email ? String(email).trim().toLowerCase() : '';
  const user = (userId ? usersById.get(userId) : null) ||
               (targetEmail ? usersByEmail.get(targetEmail) : null) ||
               extractUserFromHeader(req);

  if (user) {
    user.plano = (newPlan || planId || plan || user.plano).toLowerCase();
    user.atualizadoEm = new Date().toISOString();
    await syncUserToFirestore(user);
  }
  res.json({ message: 'Plan updated successfully' });
});

// ==========================================
// PLANNER & CUSTOM METABOLIC VALUES API
// ==========================================

app.get('/api/me/planner', (req, res): void => {
  const user = extractUserFromHeader(req);
  if (!user) {
    res.status(401).json({ message: 'Não autorizado.' });
    return;
  }

  let planner = plannerMap.get(user.id) || user.planner;
  if (!planner) {
    planner = createDefaultPlanner(user);
    plannerMap.set(user.id, planner);
    user.planner = planner;
  }

  res.json({
    planner,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo: user.tipo,
      plano: user.plano,
    },
  });
});

app.put('/api/me/planner', async (req, res): Promise<void> => {
  const user = extractUserFromHeader(req);
  if (!user) {
    res.status(401).json({ message: 'Não autorizado.' });
    return;
  }

  const incoming = req.body as UserPlannerData;
  if (!incoming || typeof incoming !== 'object') {
    res.status(400).json({ message: 'Dados do planejador inválidos.' });
    return;
  }

  incoming.ultimaModificacao = new Date().toISOString();
  plannerMap.set(user.id, incoming);
  user.planner = incoming;
  user.atualizadoEm = incoming.ultimaModificacao;

  // Sync to Firestore
  await syncUserToFirestore(user);

  res.json({
    message: 'Planejador e metas customizadas salvos com sucesso.',
    planner: incoming,
  });
});

// ==========================================
// AI BACKSEAT WORKOUT & EXERCISE ASSISTANT
// ==========================================

const EXERCISE_KNOWLEDGE_BASE: Record<string, { summary: string; targetMuscle: string; exercises: any[] }> = {
  dorsal: {
    summary: 'Para desenvolvimento máximo da dorsal (grande dorsal / latíssimo do dorso e espessura), a combinação de puxadas verticais e remadas com alinhamento de cotovelos é o padrão-ouro biomecânico. Estes exercícios garantem largura em V e densidade medial.',
    targetMuscle: 'Dorsal / Grande Dorsal e Espessura de Costas',
    exercises: [
      {
        name: 'Puxada Alta com Pegada Pronada (Pulldown)',
        muscle: 'Grande Dorsal (Fibras Superiores e Laterais)',
        secondary: 'Bíceps, Redondo Maior, Rombóides',
        whyBest: 'Máxima ativação na expansão da asa (largura em V) e excelente estabilidade para progredir sobrecarga.',
        suggestedSets: 4,
        suggestedReps: '8 - 12',
        suggestedRest: '90s',
        rpe: 8.5,
        tip: 'Inicie o movimento deprimindo as escápulas antes de flexionar os cotovelos. Traga a barra até o topo do esterno.',
      },
      {
        name: 'Remada Curvada com Barra (Barbell Row)',
        muscle: 'Espessura de Costas e Grande Dorsal',
        secondary: 'Trapézio Médio, Rombóides, Eretor da Espinha',
        whyBest: 'Padrão ouro em ativação eletromiográfica para espessura e densidade da musculatura dorsal.',
        suggestedSets: 4,
        suggestedReps: '8 - 10',
        suggestedRest: '120s',
        rpe: 8.5,
        tip: 'Tronco a 45 graus, coluna neutra. Puxe a barra em direção ao umbigo mantendo os cotovelos próximos às costelas.',
      },
      {
        name: 'Remada Baixa no Triângulo (Polia Sentada)',
        muscle: 'Grande Dorsal Inferior e Rombóides',
        secondary: 'Bíceps, Trapézio Médio/Inferior',
        whyBest: 'Proporciona tensão contínua ao longo de toda a curva de resistência, com alongamento excêntrico profundo.',
        suggestedSets: 3,
        suggestedReps: '10 - 12',
        suggestedRest: '90s',
        rpe: 8,
        tip: 'Permita que as escápulas abram bem no alongamento e feche com adução firme no final da puxada.',
      },
      {
        name: 'Pulldown na Polia com Barra Reta (Straight-Arm Pulldown)',
        muscle: 'Grande Dorsal (Isolamento Puro)',
        secondary: 'Tríceps (Cabeça Longa), Serrátil Anterior',
        whyBest: 'Único exercício monoarticular para dorsal que elimina o bíceps como elo fraco da cadeia de tração.',
        suggestedSets: 3,
        suggestedReps: '12 - 15',
        suggestedRest: '60s',
        rpe: 9,
        tip: 'Mantenha os cotovelos com leve flexão fixa e use as mãos como ganchos, empurrando para baixo em direção às coxas.',
      },
      {
        name: 'Barra Fixa com Pegada Pronada Aberta (Pull-Up)',
        muscle: 'Grande Dorsal e Cintura Escapular',
        secondary: 'Bíceps, Antebraços, Abdômen',
        whyBest: 'Cadeia cinética fechada (CKC), exigindo alto recrutamento neuromuscular e coordenação motora.',
        suggestedSets: 4,
        suggestedReps: '6 - 10',
        suggestedRest: '120s',
        rpe: 9,
        tip: 'Evite usar impulso das pernas (kipping). Controle a descida em pelo menos 2 a 3 segundos.',
      },
      {
        name: 'Remada Unilateral com Halter (Serrote)',
        muscle: 'Grande Dorsal Unilateral',
        secondary: 'Rombóides, Bíceps Braquial',
        whyBest: 'Permite corrigir desbalanços de força entre os lados e oferece grande amplitude livre de movimento.',
        suggestedSets: 3,
        suggestedReps: '10 - 12',
        suggestedRest: '60s por lado',
        rpe: 8.5,
        tip: 'Puxe o halter em direção ao quadril (e não para a axila) para direcionar o torque ao latíssimo.',
      },
    ],
  },
  peito: {
    summary: 'Para o peitoral completo, a chave biomecânica é cobrir a porção clavicular (superior) e esternal com adução horizontal dos braços em bancos com ângulos variados e cabos.',
    targetMuscle: 'Peitoral Maior (Superior, Médio e Inferior)',
    exercises: [
      {
        name: 'Supino Inclinado com Halteres (30°)',
        muscle: 'Peitoral Superior (Porção Clavicular)',
        secondary: 'Deltoide Anterior, Tríceps Braquial',
        whyBest: 'Ângulo de 30° direciona a linha de tração diretamente para a porção superior do peito.',
        suggestedSets: 4,
        suggestedReps: '8 - 10',
        suggestedRest: '90s',
        rpe: 8.5,
        tip: 'Convergência suave no topo sem bater os halteres, descendo até a linha do peito.',
      },
      {
        name: 'Supino Reto com Barra',
        muscle: 'Peitoral Maior Global',
        secondary: 'Tríceps, Ombros',
        whyBest: 'Maior capacidade de carga absoluta e ativação geral de fibras motoras.',
        suggestedSets: 4,
        suggestedReps: '6 - 8',
        suggestedRest: '120s',
        rpe: 8.5,
        tip: 'Mantenha adução de escápulas e apoie os pés com firmeza no chão.',
      },
      {
        name: 'Crossover na Polia Média / Baixa',
        muscle: 'Peitoral Médio / Superior',
        secondary: 'Deltoide Anterior',
        whyBest: 'Tensão máxima no pico de contração na adução horizontal completa dos braços.',
        suggestedSets: 3,
        suggestedReps: '12 - 15',
        suggestedRest: '60s',
        rpe: 9,
        tip: 'Pause por 1 segundo na contração máxima de pico.',
      },
    ],
  },
  pernas: {
    summary: 'Para membros inferiores, priorize padrões de agachamento profundo, dobradiça de quadril (hip hinge) e extensões e flexões de joelho isoladas.',
    targetMuscle: 'Quadríceps, Isquiotibiais e Glúteos',
    exercises: [
      {
        name: 'Agachamento Livre com Barra',
        muscle: 'Quadríceps e Glúteo Máximo',
        secondary: 'Eretores, Core, Adutores',
        whyBest: 'Padrão motor fundamental para hipertrofia sistêmica e densidade das pernas.',
        suggestedSets: 4,
        suggestedReps: '8 - 10',
        suggestedRest: '120s',
        rpe: 8.5,
        tip: 'Desça até que o quadril passe levemente da linha dos joelhos mantendo o tronco ereto.',
      },
      {
        name: 'Leg Press 45°',
        muscle: 'Quadríceps',
        secondary: 'Glúteos',
        whyBest: 'Estabilidade axial para trabalhar com sobrecarga mecânica elevada e fadiga controlada.',
        suggestedSets: 4,
        suggestedReps: '10 - 12',
        suggestedRest: '90s',
        rpe: 9,
        tip: 'Não tire a lombar do encosto e não trave os joelhos no topo.',
      },
      {
        name: 'Stiff com Barra ou Halteres',
        muscle: 'Isquiotibiais e Glúteos',
        secondary: 'Lombar',
        whyBest: 'Alongamento sob tensão para a cadeia posterior com grande braço de alavanca no quadril.',
        suggestedSets: 4,
        suggestedReps: '10 - 12',
        suggestedRest: '90s',
        rpe: 8.5,
        tip: 'Jogue o quadril para trás mantendo os joelhos semiflexionados.',
      },
    ],
  },
  ombros: {
    summary: 'Para o aspecto tridimensional dos ombros, a ênfase primordial deve estar nas porções lateral e posterior dos deltoides, que conferem largura visual.',
    targetMuscle: 'Deltoide Lateral, Anterior e Posterior',
    exercises: [
      {
        name: 'Elevação Lateral na Polia Média / Baixa',
        muscle: 'Deltoide Lateral',
        secondary: 'Trapézio Superior',
        whyBest: 'Garante torque e tensão muscular desde o início da abdução do braço.',
        suggestedSets: 4,
        suggestedReps: '12 - 15',
        suggestedRest: '60s',
        rpe: 9,
        tip: 'Puxe guiando pelo cotovelo no plano escapular (30° à frente da linha do tronco).',
      },
      {
        name: 'Desenvolvimento com Halteres',
        muscle: 'Deltoide Anterior e Lateral',
        secondary: 'Tríceps',
        whyBest: 'Sobrecarga mecânica para força vertical de empurrar.',
        suggestedSets: 4,
        suggestedReps: '8 - 10',
        suggestedRest: '90s',
        rpe: 8.5,
        tip: 'Cotovelos levemente para a frente do corpo para proteger o manguito rotador.',
      },
      {
        name: 'Crucifixo Invertido na Polia / Halter',
        muscle: 'Deltoide Posterior',
        secondary: 'Rombóides',
        whyBest: 'Essencial para equilíbrio postural e volume posterior da articulação gleno-umeral.',
        suggestedSets: 3,
        suggestedReps: '12 - 15',
        suggestedRest: '60s',
        rpe: 9,
        tip: 'Foque em abrir os braços sem aproximar excessivamente as escápulas.',
      },
    ],
  },
  biceps: {
    summary: 'Para o bíceps braquial e braquial anterior, a ciência comprova que alternar posições do ombro (alongado atrás do tronco, neutro e à frente) recruta cabeças longa e curta com máxima eficiência motora.',
    targetMuscle: 'Bíceps Braquial e Braquial Anterior',
    exercises: [
      {
        name: 'Rosca Inclinada com Halteres (Banco 45°)',
        muscle: 'Bíceps Braquial (Cabeça Longa em Alongamento)',
        secondary: 'Braquial Anterior',
        whyBest: 'Proporciona hipertrofia mediada por alongamento máximo com o ombro em hiperextensão.',
        suggestedSets: 4,
        suggestedReps: '8 - 12',
        suggestedRest: '75s',
        rpe: 8.5,
        tip: 'Deixe os braços caírem na vertical sem mover os cotovelos para a frente durante a flexão.',
      },
      {
        name: 'Rosca Direta com Barra W',
        muscle: 'Bíceps Braquial e Braquiorradial',
        secondary: 'Flexores do Punho',
        whyBest: 'Padrão clássico de sobrecarga mecânica com menor estresse articular nos punhos.',
        suggestedSets: 4,
        suggestedReps: '8 - 10',
        suggestedRest: '90s',
        rpe: 8.5,
        tip: 'Mantenha os cotovelos travados na lateral do corpo e evite impulso lombar.',
      },
      {
        name: 'Rosca Martelo na Polia com Corda ou Halteres',
        muscle: 'Braquial Anterior e Braquiorradial',
        secondary: 'Bíceps Cabeça Curta',
        whyBest: 'Foco no músculo braquial profundo, essencial para empurrar o bíceps e dar pico e largura ao braço.',
        suggestedSets: 3,
        suggestedReps: '10 - 12',
        suggestedRest: '60s',
        rpe: 9,
        tip: 'Mantenha pegada neutra e aperte no pico da contração.',
      },
      {
        name: 'Rosca Scott no Banco (Preacher Curl)',
        muscle: 'Bíceps Braquial (Pico de Contração / Cabeça Curta)',
        secondary: 'Braquial',
        whyBest: 'Elimina todo o auxílio de ombros e corpo, isolamento mecânico estrito.',
        suggestedSets: 3,
        suggestedReps: '10 - 12',
        suggestedRest: '75s',
        rpe: 9,
        tip: 'Controle a descida e não hiperestenda bruscamente os cotovelos no final da amplitude.',
      },
    ],
  },
  triceps: {
    summary: 'O tríceps compõe 60% do volume do braço. A cabeça longa exige movimentos com ombro flexionado (acima da cabeça), enquanto a polia atinge fortemente as cabeças lateral e medial.',
    targetMuscle: 'Tríceps Braquial (Cabeça Longa, Lateral e Medial)',
    exercises: [
      {
        name: 'Tríceps Francês na Polia ou Halter (Overhead Extension)',
        muscle: 'Tríceps (Cabeça Longa em Alongamento)',
        secondary: 'Cabeça Medial',
        whyBest: 'A cabeça longa só atinge alongamento pleno quando o braço está elevado acima da cabeça.',
        suggestedSets: 4,
        suggestedReps: '10 - 12',
        suggestedRest: '75s',
        rpe: 8.5,
        tip: 'Mantenha os cotovelos apontados para cima e sinta o estiramento profundo antes da extensão.',
      },
      {
        name: 'Tríceps Pulley com Corda',
        muscle: 'Tríceps (Cabeça Lateral e Medial)',
        secondary: 'Ancôneo',
        whyBest: 'Permite rotação externa e extensão completa do cotovelo com pico de tensão máxima.',
        suggestedSets: 4,
        suggestedReps: '10 - 15',
        suggestedRest: '60s',
        rpe: 9,
        tip: 'Abra as pontas da corda na parte inferior travando a contração por 1 segundo.',
      },
      {
        name: 'Tríceps Testa com Barra W (Skull Crusher)',
        muscle: 'Tríceps Global (Ênfase Cabeça Longa e Medial)',
        secondary: 'Cabeça Lateral',
        whyBest: 'Excelente braço de momento e alta sobrecarga excêntrica.',
        suggestedSets: 3,
        suggestedReps: '8 - 10',
        suggestedRest: '90s',
        rpe: 8.5,
        tip: 'Incline os braços ligeiramente para trás (e não perfeitamente na vertical) para manter tensão constante.',
      },
    ],
  },
  gluteos: {
    summary: 'Estudos com eletromiografia apontam que a maior ativação do glúteo máximo ocorre com o quadril em extensão completa sob vetor de força ântero-posterior.',
    targetMuscle: 'Glúteo Máximo, Médio e Mínimo',
    exercises: [
      {
        name: 'Elevação Pélvica com Barra ou Máquina (Hip Thrust)',
        muscle: 'Glúteo Máximo (Pico de Contração e Tensão Mecânica)',
        secondary: 'Isquiotibiais, Adutores',
        whyBest: 'Maior ativação de glúteo máximo documentada na literatura científica devido ao pico de tensão no encurtamento total.',
        suggestedSets: 4,
        suggestedReps: '8 - 12',
        suggestedRest: '90s',
        rpe: 9,
        tip: 'Trave o queixo no peito, alinhe os joelhos a 90° no topo e contraia os glúteos por 2 segundos.',
      },
      {
        name: 'Agachamento Búlgaro com Halteres',
        muscle: 'Glúteo Máximo e Quadríceps',
        secondary: 'Adutores, Core',
        whyBest: 'Trabalho unilateral de profunda flexão de quadril com sobrecarga excêntrica em grande amplitude.',
        suggestedSets: 3,
        suggestedReps: '8 - 10 por perna',
        suggestedRest: '60s por lado',
        rpe: 9,
        tip: 'Incline o tronco levemente à frente para direcionar a alavanca para o glúteo.',
      },
      {
        name: 'Cadeira Abdutora ou Glúteo no Cabo',
        muscle: 'Glúteo Médio e Mínimo',
        secondary: 'Tensor da Fáscia Lata',
        whyBest: 'Isolamento da porção superior e estabilidade pélvica.',
        suggestedSets: 3,
        suggestedReps: '12 - 15',
        suggestedRest: '60s',
        rpe: 9,
        tip: 'Incline o tronco à frente na cadeira abdutora para maior recrutamento do glúteo médio.',
      },
    ],
  },
  panturrilhas: {
    summary: 'O tríceps sural é composto por gastrocnêmio (fibras rápidas, requer perna estendida) e sóleo (fibras lentas, ativado com joelho flexionado).',
    targetMuscle: 'Gastrocnêmio e Sóleo',
    exercises: [
      {
        name: 'Panturrilha em Pé na Máquina / Barra / Leg Press',
        muscle: 'Gastrocnêmio Medial e Lateral',
        secondary: 'Sóleo',
        whyBest: 'Com joelhos estendidos, o gastrocnêmio está em sua posição ótima de força e alongamento.',
        suggestedSets: 4,
        suggestedReps: '10 - 15',
        suggestedRest: '60s',
        rpe: 9,
        tip: 'Pause 2 segundos no ponto mais baixo para dissipar o reflexo miotático antes de subir.',
      },
      {
        name: 'Panturrilha Sentado (Solear)',
        muscle: 'Músculo Sóleo',
        secondary: 'Tibial Posterior',
        whyBest: 'Com joelhos a 90°, o gastrocnêmio entra em insuficiência ativa e o sóleo assume 100% da carga.',
        suggestedSets: 3,
        suggestedReps: '15 - 20',
        suggestedRest: '45s',
        rpe: 9,
        tip: 'Cadência controlada de 3 segundos na descida.',
      },
    ],
  },
  abdomen: {
    summary: 'A musculatura abdominal responde à sobrecarga progressiva com flexão da coluna toracolombar e estabilização anti-rotacional.',
    targetMuscle: 'Reto Abdominal e Oblíquos',
    exercises: [
      {
        name: 'Abdominal Crunch na Polia com Corda',
        muscle: 'Reto Abdominal',
        secondary: 'Oblíquos',
        whyBest: 'Permite progressão real de carga com curva contínua de resistência.',
        suggestedSets: 4,
        suggestedReps: '12 - 15',
        suggestedRest: '60s',
        rpe: 8.5,
        tip: 'Dobre a coluna trazendo o esterno em direção ao púbis; não dobre o quadril.',
      },
      {
        name: 'Abdominal Infra na Barra Fixa (Hanging Leg / Knee Raise)',
        muscle: 'Reto Abdominal Inferior',
        secondary: 'Flexores do Quadril',
        whyBest: 'Cadeia cinética aberta com grande exigência de controle motor pélvico.',
        suggestedSets: 3,
        suggestedReps: '10 - 15',
        suggestedRest: '60s',
        rpe: 9,
        tip: 'Retroversão da pelve no final do movimento, trazendo a bacia para cima.',
      },
    ],
  },
};

app.post('/api/ai/workout-assistant', async (req, res): Promise<void> => {
  const { query = '', targetMuscle = '', userRole = 'comum' } = req.body || {};
  const rawQuery = String(query || targetMuscle || 'dorsal').trim();
  const lowerQuery = rawQuery.toLowerCase();

  // Determine detected muscle group
  let detectedKey: string | null = null;
  if (lowerQuery.includes('bicep') || lowerQuery.includes('braço') || lowerQuery.includes('braco')) {
    detectedKey = 'biceps';
  } else if (lowerQuery.includes('tricep')) {
    detectedKey = 'triceps';
  } else if (lowerQuery.includes('glute') || lowerQuery.includes('bumbum') || lowerQuery.includes('quadril')) {
    detectedKey = 'gluteos';
  } else if (lowerQuery.includes('panturrilh') || lowerQuery.includes('batata da perna') || lowerQuery.includes('soleo')) {
    detectedKey = 'panturrilhas';
  } else if (lowerQuery.includes('abdom') || lowerQuery.includes('core') || lowerQuery.includes('barriga')) {
    detectedKey = 'abdomen';
  } else if (lowerQuery.includes('peit') || lowerQuery.includes('chest') || lowerQuery.includes('supino')) {
    detectedKey = 'peito';
  } else if (lowerQuery.includes('pern') || lowerQuery.includes('quadriceps') || lowerQuery.includes('agach') || lowerQuery.includes('leg') || lowerQuery.includes('isquiot')) {
    detectedKey = 'pernas';
  } else if (lowerQuery.includes('ombr') || lowerQuery.includes('deltoid') || lowerQuery.includes('lateral')) {
    detectedKey = 'ombros';
  } else if (lowerQuery.includes('dorsal') || lowerQuery.includes('costa') || lowerQuery.includes('remad') || lowerQuery.includes('puxad') || lowerQuery.includes('asa')) {
    detectedKey = 'dorsal';
  }

  // If the query isn't a known preset muscle group and Gemini is available with a valid key, query Gemini 3.8 Flash
  if (!detectedKey && ai && geminiAvailable) {
    try {
      const prompt = `Você é o Copiloto de Treino de Alta Performance e Biomecânica do Macrio.
O usuário é: ${userRole}.
Pedido do usuário: "${rawQuery}".

Responda OBRIGATORIAMENTE em JSON puro com a seguinte estrutura:
{
  "summary": "1 a 2 parágrafos explicando com autoridade biomecânica e fisiológica a seleção dos exercícios para esse objetivo ou músculo.",
  "targetMuscle": "Nome do grupo muscular (ex: Dorsal / Costas, Peitoral, Quadríceps)",
  "exercises": [
    {
      "name": "Nome oficial do exercício",
      "muscle": "Músculo primário focado",
      "secondary": "Músculos secundários / sinergistas",
      "whyBest": "Por que é considerado padrão-ouro na biomecânica",
      "suggestedSets": 4,
      "suggestedReps": "8-12",
      "suggestedRest": "90s",
      "rpe": 8.5,
      "tip": "Dica técnica prática de postura e segurança"
    }
  ]
}

Retorne apenas o JSON puro, sem crases de markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      if (response && response.text) {
        const cleaned = response.text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
          res.json({
            source: 'gemini-3.8-flash',
            query: rawQuery,
            summary: parsed.summary,
            targetMuscle: parsed.targetMuscle || 'Musculatura Alvo',
            exercises: parsed.exercises,
          });
          return;
        }
      }
    } catch {
      geminiAvailable = false;
    }
  }

  // Serve from curated scientific knowledge base
  const fallbackKey = detectedKey || 'dorsal';
  const fallback = EXERCISE_KNOWLEDGE_BASE[fallbackKey] || EXERCISE_KNOWLEDGE_BASE['dorsal'];
  res.json({
    source: 'macrio-knowledge-base',
    query: rawQuery,
    summary: fallback.summary,
    targetMuscle: fallback.targetMuscle,
    exercises: fallback.exercises,
  });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 3000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT']) || 3000;
  app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
