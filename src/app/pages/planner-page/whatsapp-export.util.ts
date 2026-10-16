/**
 * Funções utilitárias puras para geração de texto formatado para WhatsApp
 * Lendo sempre o estado real de treinos, refeições, metas e hidratação.
 */

import { PlannerState, Workout, DietMeal } from '../../services/planner.service';

/**
 * Remove caracteres de formatação do WhatsApp (*, _, ~, `) para não quebrar a sintaxe
 */
export function sanitizeWhatsApp(str: string | undefined | null): string {
  if (!str) return '';
  return String(str).replace(/[*_~`]/g, '').trim();
}

/**
 * Formata números no padrão brasileiro (vírgula decimal, ponto como separador de milhar)
 */
export function formatNumberBR(num: number | undefined | null, decimals = 0): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Retorna emoji numérico para exercícios (1️⃣ a 🔟) ou "11." para 11 em diante
 */
export function getExerciseNumberEmoji(index: number): string {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  if (index >= 0 && index < emojis.length) {
    return emojis[index];
  }
  return `${index + 1}.`;
}

/**
 * Calcula tempo estimado de treino em minutos
 */
export function calculateWorkoutMinutes(workout: Workout): number {
  if (!workout || !workout.exercicios || workout.exercicios.length === 0) return 0;
  let totalSec = 0;
  for (const ex of workout.exercicios) {
    const sets = Number(ex.series) || 0;
    const rest = Number(ex.descansoSegundos) || 60;
    totalSec += sets * (40 + rest);
  }
  return Math.max(1, Math.round(totalSec / 60));
}

/**
 * Totais de uma refeição
 */
export function calculateMealTotalsPure(meal: DietMeal): {
  calorias: number;
  proteinaG: number;
  carboidratoG: number;
  gorduraG: number;
} {
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

/**
 * Modelo de treino (um bloco por treino cadastrado):
 * 🏋️ *TREINO A: {nome}*
 * _Foco: {foco}_
 * 1️⃣ *{exercício}*
 *      {séries} séries × {reps} reps · {descanso}s desc.
 * 📊 {n} exercícios · {n} séries · ~{min} min
 * Versão Completa: incluir a dica de cada exercício em itálico na linha abaixo. Versão Simples: omitir.
 */
export function formatWhatsAppTreino(
  state: PlannerState,
  exportMode: 'simples' | 'completa' = 'simples'
): string {
  if (!state || !state.treinos || state.treinos.length === 0) return '';

  const blocks: string[] = [];

  state.treinos.forEach((w, idx) => {
    let letter = w.identificador?.toUpperCase() || '';
    if (!letter) {
      const match = w.nome.match(/Treino\s+([A-Za-z0-9]+)/i);
      letter = match ? match[1].toUpperCase() : String.fromCharCode(65 + idx);
    }
    const nome = sanitizeWhatsApp(w.nome);
    let block = `🏋️ *TREINO ${letter}: ${nome}*`;

    if (w.foco) {
      block += `\n_Foco: ${sanitizeWhatsApp(w.foco)}_`;
    }

    if (w.exercicios && w.exercicios.length > 0) {
      block += `\n`;
      w.exercicios.forEach((ex, exIdx) => {
        const num = getExerciseNumberEmoji(exIdx);
        const exName = sanitizeWhatsApp(ex.nome);
        const reps = sanitizeWhatsApp(String(ex.repeticoes));
        const rest = ex.descansoSegundos ?? 60;
        block += `\n${num} *${exName}*`;
        block += `\n     ${ex.series} séries × ${reps} reps · ${rest}s desc.`;

        if (exportMode === 'completa') {
          const dica = sanitizeWhatsApp(ex.observacoes || ex.dicaBiomecanica);
          if (dica) {
            block += `\n     _${dica}_`;
          }
        }
      });
    }

    const exCount = w.exercicios ? w.exercicios.length : 0;
    const seriesCount = w.exercicios
      ? w.exercicios.reduce((acc, e) => acc + (Number(e.series) || 0), 0)
      : 0;
    const estMin = calculateWorkoutMinutes(w);

    block += `\n\n📊 ${exCount} exercícios · ${seriesCount} séries · ~${estMin} min`;
    blocks.push(block);
  });

  return `${blocks.join('\n\n')}\n\n_Gerado pelo Macrio_`;
}

/**
 * Modelo de alimentação:
 * 🍽️ *PLANO ALIMENTAR*
 * 🎯 Meta: *{kcal} kcal* | P {p}g · C {c}g · G {g}g
 * ⏰ *{hora} · {refeição}*
 * - {alimento} ({qtd} g)
 * ↳ _{kcal} kcal · P {p}g · C {c}g · G {g}g_
 * 💧 Água: {litros} L por dia
 * Refeições ordenadas por horário crescente.
 */
export function formatWhatsAppDieta(
  state: PlannerState,
  exportMode: 'simples' | 'completa' = 'simples',
  waterGoalMl?: number
): string {
  if (!state || !state.dieta || state.dieta.length === 0) return '';

  const goals = state.metasCustomizadas || {
    calorias: 2000,
    proteinaG: 150,
    carboidratoG: 200,
    gorduraG: 60,
  };

  const lines: string[] = [];
  lines.push(`🍽️ *PLANO ALIMENTAR*`);
  lines.push(
    `🎯 Meta: *${formatNumberBR(goals.calorias)} kcal* | P ${formatNumberBR(goals.proteinaG)}g · C ${formatNumberBR(goals.carboidratoG)}g · G ${formatNumberBR(goals.gorduraG)}g`
  );

  // Ordenar refeições por horário crescente
  const sortedMeals = [...state.dieta].sort((a, b) => {
    const tA = a.horario ? a.horario.trim() : '99:99';
    const tB = b.horario ? b.horario.trim() : '99:99';
    return tA.localeCompare(tB);
  });

  sortedMeals.forEach((meal) => {
    const timeStr = meal.horario ? `${sanitizeWhatsApp(meal.horario)} · ` : '';
    const mealName = sanitizeWhatsApp(meal.nome);
    let mealBlock = `⏰ *${timeStr}${mealName}*`;

    if (meal.alimentos && meal.alimentos.length > 0) {
      meal.alimentos.forEach((food) => {
        mealBlock += `\n- ${sanitizeWhatsApp(food.nome)} (${formatNumberBR(food.quantidadeG)} g)`;
      });
      const totals = calculateMealTotalsPure(meal);
      mealBlock += `\n↳ _${formatNumberBR(totals.calorias)} kcal · P ${formatNumberBR(totals.proteinaG, 1)}g · C ${formatNumberBR(totals.carboidratoG, 1)}g · G ${formatNumberBR(totals.gorduraG, 1)}g_`;
    }

    lines.push(mealBlock);
  });

  const waterMl = waterGoalMl || state.metasCustomizadas?.metaAguaMl || 3000;
  const liters = waterMl / 1000;
  const waterStr = formatNumberBR(liters, liters % 1 === 0 ? 0 : 1);
  lines.push(`💧 Água: ${waterStr} L por dia`);

  return `${lines.join('\n\n')}\n\n_Gerado pelo Macrio_`;
}

/**
 * Modelo de resumo: metas do dia (kcal, P, C, G, fibras, água), nº de treinos e nº de refeições.
 */
export function formatWhatsAppResumo(
  state: PlannerState,
  exportMode: 'simples' | 'completa' = 'simples',
  waterGoalMl?: number
): string {
  if (!state) return '';

  const goals = state.metasCustomizadas || {
    calorias: 2000,
    proteinaG: 150,
    carboidratoG: 200,
    gorduraG: 60,
    metaAguaMl: 3000,
    fibrasG: 30,
  };

  const waterMl = waterGoalMl || goals.metaAguaMl || 3000;
  const liters = waterMl / 1000;
  const waterStr = formatNumberBR(liters, liters % 1 === 0 ? 0 : 1);

  const treinosCount = state.treinos?.length || 0;
  const mealsCount = state.dieta?.length || 0;

  // Letras dos treinos
  let lettersSummary = '';
  if (state.treinos && state.treinos.length > 0) {
    const letters = state.treinos.map((w, i) => {
      if (w.identificador && w.identificador.length <= 2) return w.identificador.toUpperCase();
      const match = w.nome.match(/Treino\s+([A-Za-z0-9]+)/i);
      if (match) return match[1].toUpperCase();
      return String.fromCharCode(65 + i);
    });
    if (letters.length === 1) lettersSummary = letters[0];
    else if (letters.length === 2) lettersSummary = `${letters[0]} e ${letters[1]}`;
    else lettersSummary = `${letters.slice(0, -1).join(', ')} e ${letters[letters.length - 1]}`;
  }
  const lettersPart = lettersSummary ? ` (${lettersSummary})` : '';

  const lines: string[] = [];
  lines.push(`📋 *RESUMO DO PLANO*`);

  let metasBlock = `🎯 *Metas do Dia*`;
  metasBlock += `\n• Calorias: *${formatNumberBR(goals.calorias)} kcal*`;
  metasBlock += `\n• Proteínas: ${formatNumberBR(goals.proteinaG)} g`;
  metasBlock += `\n• Carboidratos: ${formatNumberBR(goals.carboidratoG)} g`;
  metasBlock += `\n• Gorduras: ${formatNumberBR(goals.gorduraG)} g`;
  if (goals.fibrasG) {
    metasBlock += `\n• Fibras: ${formatNumberBR(goals.fibrasG)} g`;
  }
  metasBlock += `\n• Água: ${waterStr} L por dia`;
  lines.push(metasBlock);

  let overviewBlock = `📊 *Visão Geral*`;
  overviewBlock += `\n• Treinos na semana: *${treinosCount}* ${treinosCount === 1 ? 'treino' : 'treinos'}${lettersPart}`;
  overviewBlock += `\n• Refeições por dia: *${mealsCount}* ${mealsCount === 1 ? 'refeição' : 'refeições'}`;
  lines.push(overviewBlock);

  if (exportMode === 'completa' && (goals.gastoEnergeticoTotal || goals.taxaMetabolicaBasal)) {
    let metaBlock = `🔬 *Detalhes Metabólicos*`;
    if (goals.gastoEnergeticoTotal) {
      metaBlock += `\n• GET (Gasto Energético Total): ${formatNumberBR(goals.gastoEnergeticoTotal)} kcal`;
    }
    if (goals.taxaMetabolicaBasal) {
      metaBlock += `\n• TMB (Taxa Metabólica Basal): ${formatNumberBR(goals.taxaMetabolicaBasal)} kcal`;
    }
    lines.push(metaBlock);
  }

  return `${lines.join('\n\n')}\n\n_Gerado pelo Macrio_`;
}

/**
 * Copia texto para a área de transferência com fallback para execCommand
 */
export async function copyToClipboardWithFallback(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return !!successful;
    } catch {
      return false;
    }
  }

  return false;
}
