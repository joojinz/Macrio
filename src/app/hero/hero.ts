import { Component, ChangeDetectorRef, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Contato } from '../components/contato/contato';
import { Termos } from '../termos/termos';
import { Privacidade } from '../privacidade/privacidade';
import { ComoFuncionaComponent } from '../components/como-funciona/como-funciona';
import { ParaQuemComponent } from '../components/para-quem/para-quem';
import { Planos } from '../components/planos/planos';
import { ModalService } from '../services/modal.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, RouterModule, Contato, Termos, Privacidade, ComoFuncionaComponent, ParaQuemComponent, Planos],
  templateUrl: './hero.html',
  styleUrl: './hero.scss'
})
export class Hero implements AfterViewInit {
  isContatoAberto = false;
  isPrivacidadeAberto = false;
  isTermosAberto = false;

  modal = inject(ModalService);

  constructor(private cdr: ChangeDetectorRef) {}

  abrirModal(tipo: string) {
    this.modal.lockScroll();
    if (tipo === 'contato') this.isContatoAberto = true;
    if (tipo === 'privacidade') this.isPrivacidadeAberto = true;
    if (tipo === 'termos') this.isTermosAberto = true;
    this.cdr.detectChanges();
  }

  fecharModal() {
    this.modal.unlockScroll();
    this.isContatoAberto = false;
    this.isPrivacidadeAberto = false;
    this.isTermosAberto = false;
  }

  scrollToDemo() {
    document.getElementById('para-quem')?.scrollIntoView({ behavior: 'smooth' });
  }

  ngAfterViewInit() {
    this.gerarTicker();
    this.animarContadores();
  }

  private gerarTicker() {
    const track = document.getElementById('ticker-depoimentos-track');
    if (!track) return;

    const depoimentos = [
      { i: 'CA', n: 'Carlos Almeida', r: 'Nutricionista', t: 'Como nutricionista, recomendo o Macrio para todos os meus pacientes. O controle de macros é preciso e os relatórios me ajudam muito nas consultas.' },
      { i: 'FS', n: 'Felipe Santos', r: 'Atleta amador', t: 'Treino há 3 anos e nunca mantive uma alimentação consistente. Com o Macrio, finalmente entendi como equilibrar meus macros.' },
      { i: 'LO', n: 'Larissa Oliveira', r: 'Usuária há 5 meses', t: 'Perdi 8kg em 4 meses seguindo o plano do Macrio. O app é simples e os gráficos mostram o progresso de verdade.' },
      { i: 'RB', n: 'Rafael Barros', r: 'Personal Trainer', t: 'Indico o Macrio para todos os meus alunos. A análise de macros é completa e os clientes chegam nas consultas com dados reais.' },
      { i: 'JP', n: 'Julia Pereira', r: 'Usuária há 1 ano', t: 'Finalmente um app que não me faz sentir culpa. Entendi minha relação com a comida de um jeito que nunca tinha conseguido.' },
      { i: 'MF', n: 'Marcos Ferreira', r: 'Crossfiteiro', t: 'A parte de treinos integrada com a alimentação faz toda diferença. Consigo ver como a dieta impacta diretamente minha performance.' },
    ];

    const todos = [...depoimentos, ...depoimentos];

    todos.forEach(d => {
      const card = document.createElement('div');
      card.innerHTML = `
        <div style="background:#111213; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:22px 24px; width:280px; flex-shrink:0; cursor:default; transition:border-color 0.2s;">
          <p style="color:rgba(255,255,255,0.6); font-size:13px; line-height:1.6; margin:0 0 16px;">"${d.t}"</p>
          <div style="display:flex; align-items:center; gap:9px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06);">
            <div style="width:30px; height:30px; border-radius:50%; background:#1a3320; border:1.5px solid rgba(28,245,43,0.45); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:#1cf52b; flex-shrink:0;">${d.i}</div>
            <div>
              <div style="color:#e5e5e5; font-size:12px; font-weight:600;">${d.n}</div>
              <div style="color:rgba(255,255,255,0.3); font-size:11px;">${d.r}</div>
            </div>
          </div>
        </div>
      `;
      track.appendChild(card);
    });
  }

  private animarContadores() {
    const stats = document.querySelectorAll('.stat-value');
    if (!stats.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const texto = el.textContent || '';
          this.contarNumero(el, texto);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    stats.forEach(el => observer.observe(el));
  }

  private contarNumero(el: HTMLElement, textoFinal: string) {
    const match = textoFinal.match(/([\d.,]+)/);
    if (!match) return;

    const numStr = match[1].replace('.', '').replace(',', '.');
    const alvo = parseFloat(numStr);
    const sufixo = textoFinal.replace(match[1], '').trim();
    const prefixo = textoFinal.substring(0, textoFinal.indexOf(match[1]));
    const temDecimal = numStr.includes('.');
    const duracao = 1500;
    const inicio = performance.now();

    const animar = (agora: number) => {
      const progresso = Math.min((agora - inicio) / duracao, 1);
      const ease = 1 - Math.pow(1 - progresso, 3);
      const atual = alvo * ease;

      if (temDecimal) {
        el.textContent = prefixo + atual.toFixed(1).replace('.', ',') + sufixo;
      } else {
        el.textContent = prefixo + Math.floor(atual).toLocaleString('pt-BR') + sufixo;
      }

      if (progresso < 1) {
        requestAnimationFrame(animar);
      } else {
        el.textContent = textoFinal;
      }
    };

    requestAnimationFrame(animar);
  }
}
