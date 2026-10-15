import type { jsPDF } from 'jspdf';
import type { WorkoutDay, DietMeal, DietFoodItem } from '../../services/planner.service';

export interface ExportPdfOptions {
  planner: any;
  alunoNome: string | null;
  profissionalNome: string | null;
  currentDateShort: string;
  mode: 'simples' | 'completa';
  workoutLettersSummary: string;
  totalExercisesCount: number;
  fileName: string;
  formatKcal: (val: number | undefined | null) => string;
  formatInt: (val: number | undefined | null) => string;
  formatGrams: (val: number | undefined | null) => string;
  formatWaterLiters: (ml: number | undefined | null) => string;
  formatRepsSimple: (val: string | undefined | null) => string;
  formatRestSimple: (val: number | string | undefined | null) => string;
  formatReps: (val: string | undefined | null) => string;
  formatRestSeconds: (val: string | number | undefined | null) => string;
  getWorkoutHeader: (w: WorkoutDay, index: number) => { badge: string; subtitle: string };
  getMealTotals: (meal: DietMeal | { alimentos: DietFoodItem[] }) => {
    calorias: number;
    proteinaG: number;
    carboidratoG: number;
    gorduraG: number;
  };
}

/**
 * PDF 1: Plano de Treino
 * Documento independente contendo exclusivamente informações do treino,
 * resumo de treinos e exercícios, legenda de termos, e detalhamento de cada treino.
 */
export async function exportWorkoutPdf(opts: ExportPdfOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || autoTableModule;

  const {
    planner: p,
    alunoNome,
    profissionalNome,
    currentDateShort,
    mode,
    workoutLettersSummary,
    totalExercisesCount,
    fileName,
    formatRepsSimple,
    formatRestSimple,
    formatReps,
    formatRestSeconds,
    getWorkoutHeader,
  } = opts;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const leftMargin = 18;
  const rightMargin = 192;
  const contentWidth = 174;
  let currentY = 18;

  // Linha de destaque verde escuro (#0B7A55) com contraste >= 4.5:1
  doc.setFillColor(11, 122, 85);
  doc.rect(leftMargin, currentY, contentWidth, 2, 'F');
  currentY += 8;

  // Cabeçalho Principal: MACRIO (esquerda) | Plano de treino (direita)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text('MACRIO', leftMargin, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(55, 65, 81);
  doc.text('Plano de treino', rightMargin, currentY, { align: 'right' });

  currentY += 4;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, currentY, rightMargin, currentY);
  currentY += 5;

  // Metadados (Aluno, Data, Profissional apenas se existirem)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);

  if (alunoNome && profissionalNome) {
    doc.text(`Aluno: ${alunoNome}`, leftMargin, currentY);
    doc.text(`Data: ${currentDateShort}`, 105, currentY, { align: 'center' });
    doc.text(`Profissional: ${profissionalNome}`, rightMargin, currentY, { align: 'right' });
  } else if (alunoNome) {
    doc.text(`Aluno: ${alunoNome}`, leftMargin, currentY);
    doc.text(`Data: ${currentDateShort}`, rightMargin, currentY, { align: 'right' });
  } else if (profissionalNome) {
    doc.text(`Profissional: ${profissionalNome}`, leftMargin, currentY);
    doc.text(`Data: ${currentDateShort}`, rightMargin, currentY, { align: 'right' });
  } else {
    doc.text(`Data: ${currentDateShort}`, leftMargin, currentY);
  }

  currentY += 4;
  doc.line(leftMargin, currentY, rightMargin, currentY);
  currentY += 7;

  // Resumo da capa (uma linha): "3 treinos · 13 exercícios"
  // Sem nenhuma informação de calorias, macros ou água
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(leftMargin, currentY, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 122, 85);
  doc.text('SEU PLANO DE TREINO EM RESUMO', leftMargin + 4, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  const treinosCount = p.treinos ? p.treinos.length : 0;
  const letterPart = workoutLettersSummary ? ` (${workoutLettersSummary})` : '';
  const resumoTreinoText = `${treinosCount} ${treinosCount === 1 ? 'treino' : 'treinos'}${letterPart}   ·   ${totalExercisesCount} ${totalExercisesCount === 1 ? 'exercício' : 'exercícios'}`;
  doc.text(resumoTreinoText, leftMargin + 4, currentY + 9);

  currentY += 17;

  // Legenda única de 3 linhas (Série, Repetição, Descanso) antes do primeiro treino (apenas na Simples)
  if (mode === 'simples') {
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(leftMargin, currentY, contentWidth, 14, 1.5, 1.5, 'FD');

    // Borda esquerda verde de destaque
    doc.setFillColor(11, 122, 85);
    doc.rect(leftMargin, currentY, 2.2, 14, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    doc.text('Série = um bloco de repetições.', leftMargin + 6, currentY + 4.2);
    doc.text('Repetição = cada vez que você faz o movimento.', leftMargin + 6, currentY + 8.2);
    doc.text('Descanso = pausa entre uma série e outra.', leftMargin + 6, currentY + 12.2);

    currentY += 19;
  }

  // Cada Treino
  if (p.treinos && p.treinos.length > 0) {
    for (const [wIdx, w] of p.treinos.entries()) {
      if (!w.exercicios || w.exercicios.length === 0) continue;

      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      const hInfo = getWorkoutHeader(w, wIdx);

      // Título "TREINO A" em destaque e nome abaixo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(11, 122, 85);
      doc.text(hInfo.badge, leftMargin, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`${w.exercicios.length} exercícios`, rightMargin, currentY, { align: 'right' });
      currentY += 4.5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text(hInfo.subtitle, leftMargin, currentY);
      currentY += 4.5;

      if (mode === 'completa') {
        if (w.foco) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(75, 85, 99);
          doc.text(`Foco: ${w.foco}`, leftMargin, currentY);
          currentY += 4;
        }
        if (w.observacoes) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.text(`Observações: ${w.observacoes}`, leftMargin, currentY);
          currentY += 4;
        }
      }

      if (mode === 'simples') {
        // Tabela 5 colunas: #, Exercício, Séries, Repetições, Descanso
        // Sem coluna de observações, sem "Foco:". Dica sob o nome.
        const tableBody = w.exercicios.map((ex: any, idx: number) => {
          const tipText = ex.observacoes || ex.dicaBiomecanica;
          const exNameCell = tipText ? `${ex.nome}\nDica: ${tipText}` : ex.nome;
          return [
            String(idx + 1),
            exNameCell,
            String(ex.series || 3),
            formatRepsSimple(ex.repeticoes),
            formatRestSimple(ex.descansoSegundos),
          ];
        });

        autoTable(doc, {
          startY: currentY,
          showHead: 'everyPage',
          head: [['#', 'Exercício', 'Séries', 'Repetições', 'Descanso']],
          body: tableBody,
          theme: 'plain',
          styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 2.4,
            lineColor: [229, 231, 235],
            lineWidth: 0.25,
          },
          headStyles: {
            fillColor: [243, 244, 246],
            textColor: [31, 41, 55],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 2.8,
          },
          bodyStyles: {
            textColor: [31, 41, 55],
            valign: 'middle',
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center', textColor: [107, 114, 128] },
            1: { cellWidth: 94, halign: 'left' },
            2: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
            3: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
            4: { cellWidth: 24, halign: 'right' },
          },
          margin: { left: leftMargin, right: 18 },
        });
      } else {
        // Tabela Completa (6 colunas com Músculo e Observações)
        const tableBody = w.exercicios.map((ex: any, idx: number) => [
          String(idx + 1),
          `${ex.nome}\n${ex.grupoMuscular || 'Geral'}`,
          String(ex.series || 3),
          formatReps(ex.repeticoes),
          formatRestSeconds(ex.descansoSegundos),
          ex.observacoes || '—',
        ]);

        autoTable(doc, {
          startY: currentY,
          showHead: 'everyPage',
          head: [['#', 'Exercício & Músculo', 'Séries', 'Reps', 'Descanso', 'Observações']],
          body: tableBody,
          theme: 'plain',
          styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2.2,
            lineColor: [229, 231, 235],
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: [243, 244, 246],
            textColor: [31, 41, 55],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 2.5,
          },
          bodyStyles: {
            textColor: [31, 41, 55],
            valign: 'middle',
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 62 },
            2: { cellWidth: 18, halign: 'right' },
            3: { cellWidth: 24, halign: 'right' },
            4: { cellWidth: 24, halign: 'right' },
            5: { cellWidth: 36 },
          },
          margin: { left: leftMargin, right: 18 },
        });
      }

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // Rodapé e cabeçalho paginado
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      const headerName = alunoNome ? ` · Aluno: ${alunoNome}` : '';
      doc.text(`MACRIO · Plano de treino${headerName}`, leftMargin, 10);
      doc.text(`Pág. ${i}/${totalPages}`, rightMargin, 10, { align: 'right' });

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, 12, rightMargin, 12);
    }

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, 283, rightMargin, 283);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('MACRIO', leftMargin, 288);
    doc.text(`Plano de treino · Página ${i} de ${totalPages}`, rightMargin, 288, { align: 'right' });
  }

  doc.save(fileName);
}

/**
 * PDF 2: Plano de Alimentação
 * Documento independente contendo exclusivamente informações nutricionais:
 * resumo de refeições e água em litros, metas diárias (calorias, proteínas, carbs, gorduras),
 * detalhamento de cada refeição com alimentos e quantidades, e fechamento com total calórico.
 */
export async function exportDietPdf(opts: ExportPdfOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || autoTableModule;

  const {
    planner: p,
    alunoNome,
    profissionalNome,
    currentDateShort,
    mode,
    fileName,
    formatKcal,
    formatInt,
    formatGrams,
    formatWaterLiters,
    getMealTotals,
  } = opts;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const leftMargin = 18;
  const rightMargin = 192;
  const contentWidth = 174;
  let currentY = 18;

  // Linha superior de destaque verde escuro (#0B7A55)
  doc.setFillColor(11, 122, 85);
  doc.rect(leftMargin, currentY, contentWidth, 2, 'F');
  currentY += 8;

  // Cabeçalho Principal: MACRIO (esquerda) | Plano de alimentação (direita)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text('MACRIO', leftMargin, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(55, 65, 81);
  doc.text('Plano de alimentação', rightMargin, currentY, { align: 'right' });

  currentY += 4;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, currentY, rightMargin, currentY);
  currentY += 5;

  // Metadados
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);

  if (alunoNome && profissionalNome) {
    doc.text(`Aluno: ${alunoNome}`, leftMargin, currentY);
    doc.text(`Data: ${currentDateShort}`, 105, currentY, { align: 'center' });
    doc.text(`Profissional: ${profissionalNome}`, rightMargin, currentY, { align: 'right' });
  } else if (alunoNome) {
    doc.text(`Aluno: ${alunoNome}`, leftMargin, currentY);
    doc.text(`Data: ${currentDateShort}`, rightMargin, currentY, { align: 'right' });
  } else if (profissionalNome) {
    doc.text(`Profissional: ${profissionalNome}`, leftMargin, currentY);
    doc.text(`Data: ${currentDateShort}`, rightMargin, currentY, { align: 'right' });
  } else {
    doc.text(`Data: ${currentDateShort}`, leftMargin, currentY);
  }

  currentY += 4;
  doc.line(leftMargin, currentY, rightMargin, currentY);
  currentY += 7;

  // Resumo da capa: "4 refeições por dia   ·   3 litros de água por dia"
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(leftMargin, currentY, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 122, 85);
  doc.text('SEU PLANO DE ALIMENTAÇÃO EM RESUMO', leftMargin + 4, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  const mealsCount = p.dieta ? p.dieta.length : 0;
  const waterText = formatWaterLiters(p.metasCustomizadas?.metaAguaMl);
  const resumoDietaText = `${mealsCount} ${mealsCount === 1 ? 'refeição' : 'refeições'} por dia   ·   ${waterText} de água por dia`;
  doc.text(resumoDietaText, leftMargin + 4, currentY + 9);

  currentY += 17;

  // METAS DO DIA: Quatro Cards Grandes Completos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text('METAS DO DIA', leftMargin, currentY);
  currentY += 4;

  const metaCards = [
    { value: p.metasCustomizadas?.calorias ? `${formatKcal(p.metasCustomizadas.calorias)}` : '—', label: 'calorias' },
    { value: p.metasCustomizadas?.proteinaG ? `${formatInt(p.metasCustomizadas.proteinaG)} g` : '—', label: 'proteínas' },
    { value: p.metasCustomizadas?.carboidratoG ? `${formatInt(p.metasCustomizadas.carboidratoG)} g` : '—', label: 'carboidratos' },
    { value: p.metasCustomizadas?.gorduraG ? `${formatInt(p.metasCustomizadas.gorduraG)} g` : '—', label: 'gorduras' },
  ];

  const cardGap = 3.5;
  const cardW = (contentWidth - 3 * cardGap) / 4;
  const cardH = 18;

  metaCards.forEach((c, idx) => {
    const cx = leftMargin + idx * (cardW + cardGap);
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(cx, currentY, cardW, cardH, 1.5, 1.5, 'FD');

    if (idx === 0) {
      doc.setFillColor(11, 122, 85);
      doc.rect(cx, currentY, cardW, 1.2, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(idx === 0 ? 11 : 31, idx === 0 ? 122 : 41, idx === 0 ? 85 : 55);
    doc.text(c.value, cx + cardW / 2, currentY + 8.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(c.label, cx + cardW / 2, currentY + 14, { align: 'center' });
  });

  currentY += cardH + 6;

  // Na versão Completa: detalhes metabólicos (GET, TMB, Fibras, etc.)
  if (mode === 'completa') {
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(leftMargin, currentY, contentWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(55, 65, 81);

    const row1 = `GET (Gasto Energético Total): ${formatKcal(p.metasCustomizadas?.gastoEnergeticoTotal)} kcal   ·   TMB (Taxa Metabólica Basal): ${formatKcal(p.metasCustomizadas?.taxaMetabolicaBasal)} kcal   ·   Hidratação: ${formatInt(p.metasCustomizadas?.metaAguaMl)} mL/dia`;
    doc.text(row1, leftMargin + 4, currentY + 5);

    const pKcal = formatKcal((p.metasCustomizadas?.proteinaG || 0) * 4);
    const cKcal = formatKcal((p.metasCustomizadas?.carboidratoG || 0) * 4);
    const gKcal = formatKcal((p.metasCustomizadas?.gorduraG || 0) * 9);
    const fibrasPart = p.metasCustomizadas?.fibrasG ? `   ·   Fibras: ${formatInt(p.metasCustomizadas.fibrasG)} g` : '';
    const row2 = `Proteínas: ${pKcal} kcal (4 kcal/g)   ·   Carboidratos: ${cKcal} kcal (4 kcal/g)   ·   Gorduras: ${gKcal} kcal (9 kcal/g)${fibrasPart}`;
    doc.text(row2, leftMargin + 4, currentY + 10.5);

    currentY += 19;
  }

  // Refeições
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 122, 85);
  doc.text('REFEIÇÕES DO DIA', leftMargin, currentY);
  currentY += 5;

  if (p.dieta && p.dieta.length > 0) {
    for (const m of p.dieta) {
      if (!m.alimentos || m.alimentos.length === 0) continue;

      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      const mealTotals = getMealTotals(m);
      const mealTitle = `${m.nome.toUpperCase()}${m.horario ? ' · ' + m.horario : ''}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55);
      doc.text(mealTitle, leftMargin, currentY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(11, 122, 85);
      doc.text(`${formatKcal(mealTotals.calorias)} kcal`, rightMargin, currentY, { align: 'right' });
      currentY += 4;

      if (mode === 'simples') {
        // Versão Simples (2 Colunas: Alimento | Quantidade)
        const foodRows = m.alimentos.map((f: any) => [
          f.nome,
          `${formatInt(f.quantidadeG)} g`,
        ]);

        autoTable(doc, {
          startY: currentY,
          showHead: 'everyPage',
          head: [['Alimento', 'Quantidade']],
          body: foodRows,
          theme: 'plain',
          styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 2.4,
            lineColor: [229, 231, 235],
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: [243, 244, 246],
            textColor: [31, 41, 55],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 2.8,
          },
          bodyStyles: {
            textColor: [31, 41, 55],
          },
          columnStyles: {
            0: { cellWidth: 134, halign: 'left' },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: leftMargin, right: 18 },
        });
      } else {
        // Versão Completa (6 colunas com macros e subtotal)
        const foodRows = m.alimentos.map((f: any) => [
          f.nome,
          `${formatInt(f.quantidadeG)} g`,
          `${formatKcal(f.calorias)} kcal`,
          `${formatGrams(f.proteinaG)} g`,
          `${formatGrams(f.carboidratoG)} g`,
          `${formatGrams(f.gorduraG)} g`,
        ]);

        const foodFooter = [
          'Subtotal da Refeição',
          '—',
          `${formatKcal(mealTotals.calorias)} kcal`,
          `${formatGrams(mealTotals.proteinaG)} g`,
          `${formatGrams(mealTotals.carboidratoG)} g`,
          `${formatGrams(mealTotals.gorduraG)} g`,
        ];

        autoTable(doc, {
          startY: currentY,
          showHead: 'everyPage',
          head: [['Alimento', 'Qtd (g)', 'Calorias', 'Proteína', 'Carboidrato', 'Gordura']],
          body: foodRows,
          foot: [foodFooter],
          theme: 'plain',
          styles: {
            font: 'helvetica',
            fontSize: 7.5,
            cellPadding: 2,
            lineColor: [229, 231, 235],
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: [243, 244, 246],
            textColor: [31, 41, 55],
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 2.4,
          },
          bodyStyles: {
            textColor: [31, 41, 55],
          },
          footStyles: {
            fillColor: [243, 244, 246],
            textColor: [17, 24, 39],
            fontStyle: 'bold',
            fontSize: 7.5,
          },
          columnStyles: {
            0: { cellWidth: 64 },
            1: { cellWidth: 22, halign: 'right' },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' },
          },
          margin: { left: leftMargin, right: 18 },
        });
      }

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // Fecho da dieta
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  let totalCal = 0;
  let totalProt = 0;
  let totalCarb = 0;
  let totalFat = 0;
  if (p.dieta) {
    for (const m of p.dieta) {
      const mt = getMealTotals(m);
      totalCal += mt.calorias;
      totalProt += mt.proteinaG;
      totalCarb += mt.carboidratoG;
      totalFat += mt.gorduraG;
    }
  }

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(leftMargin, currentY, contentWidth, 10, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);

  if (mode === 'simples') {
    doc.text(`Total do dia: ${formatKcal(totalCal)} kcal`, leftMargin + 4, currentY + 6.3);
  } else {
    const fullTotals = `Total do dia: ${formatKcal(totalCal)} kcal   ·   ${formatGrams(totalProt)} g proteínas   ·   ${formatGrams(totalCarb)} g carboidratos   ·   ${formatGrams(totalFat)} g gorduras`;
    doc.text(fullTotals, leftMargin + 4, currentY + 6.3);
  }

  // Rodapé e cabeçalho paginado
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      const headerName = alunoNome ? ` · Aluno: ${alunoNome}` : '';
      doc.text(`MACRIO · Plano de alimentação${headerName}`, leftMargin, 10);
      doc.text(`Pág. ${i}/${totalPages}`, rightMargin, 10, { align: 'right' });

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, 12, rightMargin, 12);
    }

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, 283, rightMargin, 283);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('MACRIO', leftMargin, 288);
    doc.text(`Plano de alimentação · Página ${i} de ${totalPages}`, rightMargin, 288, { align: 'right' });
  }

  doc.save(fileName);
}
