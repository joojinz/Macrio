import { Component, inject, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-planos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './planos.html',
  styleUrl: './planos.scss',
  encapsulation: ViewEncapsulation.None
})
export class Planos implements OnInit, OnDestroy {
  modal = inject(ModalService);
  private isStandalone = false;

  constructor(private router: Router) {}

  get isStandalonePage(): boolean {
    return this.router.url === '/planos';
  }

  faqAberto: number | null = 0;

  toggleFaq(index: number) {
    this.faqAberto = this.faqAberto === index ? null : index;
  }

  selectPlano(index: number) {
    const btns = document.querySelectorAll('.seg-btn');
    const cards = document.querySelectorAll('.m-card');
    btns.forEach((b, i) => b.classList.toggle('active', i === index));
    cards.forEach((c, i) => c.classList.toggle('m-card-active', i === index));
  }

  // Comparativo mobile
  private cmpCur = 1;
  private cmpVals = ['g', 'm', 'a'] as const;
  private cmpLabels: Record<string, string> = { g: 'Gratuito', m: 'Mensal', a: 'Anual' };
  private cmpData = [
    { f: 'Registro de refeições', g: '✓', m: '✓', a: '✓' },
    { f: 'Controle de água', g: '✓', m: '✓', a: '✓' },
    { f: 'Treinos básicos', g: '✓', m: '✓', a: '✓' },
    { f: 'Gráficos de progresso', g: 'Básicos', m: 'Avançados', a: 'Avançados' },
    { f: 'Análise de macros', g: '✕', m: '✓', a: '✓' },
    { f: 'Insights de IA', g: '✕', m: '✓', a: '✓' },
    { f: 'Múltiplos perfis', g: '✕', m: '✓', a: '✓' },
    { f: 'Sem anúncios', g: '✕', m: '✓', a: '✓' },
    { f: 'Relatórios anuais', g: '✕', m: '✕', a: '✓' },
    { f: 'Suporte prioritário 24/7', g: '✕', m: '✕', a: '✓' },
    { f: 'Exportação em PDF', g: '✕', m: '✕', a: '✓' },
  ];

  cmpSelect(i: number) {
    this.cmpCur = i;
    const btns = document.querySelectorAll('.cmp-seg-btn');
    btns.forEach((b, idx) => b.classList.toggle('active', idx === i));
    this.cmpRender();
  }

  private cmpRender() {
    const cur = this.cmpCur;
    const hi = cur === 0 ? 2 : cur - 1;
    const planKey = this.cmpVals[cur];
    const refKey = this.cmpVals[hi];

    // Update hint text
    const hint = document.getElementById('cmp-hint-text');
    if (hint) hint.textContent = `Comparando ${this.cmpLabels[planKey]}`;

    // Update dots
    for (let d = 0; d < 3; d++) {
      const dot = document.getElementById(`cmp-dot-${d}`);
      if (dot) dot.classList.toggle('active', d === cur);
    }

    // Render table
    const table = document.getElementById('cmp-table');
    if (!table) return;

    let html = `<div class="cmp-row cmp-hdr">
      <div class="cmp-f">Recurso</div>
      <div class="cmp-r">${this.cmpLabels[refKey]}</div>
      <div class="cmp-h">${this.cmpLabels[planKey]}</div>
    </div>`;

    this.cmpData.forEach(row => {
      html += `<div class="cmp-row">
        <div class="cmp-f">${row.f}</div>
        <div class="cmp-r">${this.cmpVal(row[refKey], false)}</div>
        <div class="cmp-h">${this.cmpVal(row[planKey], true)}</div>
      </div>`;
    });

    table.innerHTML = html;
  }

  private cmpVal(v: string, hl: boolean): string {
    if (v === '✓') return `<span class="cmp-ck">✓</span>`;
    if (v === '✕') return `<span class="cmp-x">✕</span>`;
    if (v === 'Básicos') return hl
      ? `<span class="cmp-basic-h">Básicos</span>`
      : `<span class="cmp-basic-r">Básicos</span>`;
    if (v === 'Avançados') return hl
      ? `<span class="cmp-adv-h">Avançados</span>`
      : `<span class="cmp-adv-r">Avançados</span>`;
    return v;
  }

  ngOnInit() {
    this.selectPlano(1);
    this.cmpRender();
    if (this.isStandalonePage) {
      this.isStandalone = true;
      this.modal.lockStandalone();
    }
  }

  ngOnDestroy() {
    if (this.isStandalone) {
      this.modal.unlockStandalone();
    }
  }
}
