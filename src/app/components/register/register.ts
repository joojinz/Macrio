import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  @Output() closeMod = new EventEmitter<void>();

  modal = inject(ModalService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  step = 1;
  totalSteps = 5;

  form = {
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    tipo: 'pessoal',
    pesoKg: 74,
    alturaCm: 175,
    idade: 28,
    sexo: 'masculino' as 'masculino' | 'feminino',
    nivelAtividade: 'moderado' as 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'muito_intenso',
    objetivo: 'manter' as 'perder_peso' | 'manter' | 'ganhar_massa',
    plano: 'gratuito',
    aceitaTermos: false,
    aceitaPrivacidade: false,
  };

  forcaSenha = { classe: '', texto: '', porcentagem: 0 };

  isSubmitting = false;
  isGoogleLoading = false;
  isSuccess = false;
  erro = '';

  calcularForca() {
    const s = this.form.senha;
    let score = 0;
    if (s.length >= 8) score++;
    if (/[A-Z]/.test(s)) score++;
    if (/[0-9]/.test(s)) score++;
    if (/[^A-Za-z0-9]/.test(s)) score++;

    const mapa: Record<number, { classe: string; texto: string; porcentagem: number }> = {
      0: { classe: 'fraca', texto: 'Muito fraca', porcentagem: 20 },
      1: { classe: 'fraca', texto: 'Fraca', porcentagem: 35 },
      2: { classe: 'media', texto: 'Média', porcentagem: 55 },
      3: { classe: 'forte', texto: 'Forte', porcentagem: 75 },
      4: { classe: 'muito-forte', texto: 'Muito forte', porcentagem: 100 }
    };

    if (s.length === 0) {
      this.forcaSenha = { classe: '', texto: '', porcentagem: 0 };
    } else {
      this.forcaSenha = { ...mapa[score] };
    }
  }

  step1Valido(): boolean {
    return !!(
      this.form.nome &&
      this.form.email &&
      this.form.senha &&
      this.form.senha === this.form.confirmarSenha &&
      this.form.senha.length >= 8
    );
  }

  step3Valido(): boolean {
    const { pesoKg, alturaCm, idade, sexo, nivelAtividade, objetivo } = this.form;
    return !!(
      pesoKg && pesoKg >= 20 && pesoKg <= 400 &&
      alturaCm && alturaCm >= 80 && alturaCm <= 250 &&
      idade && idade >= 10 && idade <= 120 &&
      sexo && nivelAtividade && objetivo
    );
  }

  get previewTmb(): number {
    const { pesoKg, alturaCm, idade, sexo } = this.form;
    if (!pesoKg || !alturaCm || !idade) return 0;
    const base = (10 * pesoKg) + (6.25 * alturaCm) - (5 * idade);
    return Math.round(sexo === 'masculino' ? base + 5 : base - 161);
  }

  get previewGastoTotal(): number {
    const tmb = this.previewTmb;
    if (!tmb) return 0;
    const mults: Record<string, number> = {
      sedentario: 1.2,
      leve: 1.375,
      moderado: 1.55,
      intenso: 1.725,
      muito_intenso: 1.9,
    };
    return Math.round(tmb * (mults[this.form.nivelAtividade] || 1.2));
  }

  get previewCalorias(): number {
    const total = this.previewGastoTotal;
    if (!total) return 0;
    const ajustes: Record<string, number> = {
      perder_peso: -400,
      manter: 0,
      ganhar_massa: 350,
    };
    return Math.round(total + (ajustes[this.form.objetivo] ?? 0));
  }

  get previewAgua(): number {
    if (!this.form.pesoKg) return 2000;
    return Math.round(this.form.pesoKg * 35);
  }

  proximoStep() {
    if (this.step < this.totalSteps) {
      this.step++;
    }
  }

  finalizar() {
    if (!this.form.aceitaTermos || !this.form.aceitaPrivacidade) return;
    this.erro = '';
    this.isSubmitting = true;
    this.cdr.detectChanges();
    this.auth
      .register({
        nome: this.form.nome,
        email: this.form.email,
        senha: this.form.senha,
        confirmarSenha: this.form.confirmarSenha,
        tipo: this.form.tipo,
        plano: this.form.plano,
        pesoKg: Number(this.form.pesoKg),
        alturaCm: Number(this.form.alturaCm),
        idade: Number(this.form.idade),
        sexo: this.form.sexo,
        nivelAtividade: this.form.nivelAtividade,
        objetivo: this.form.objetivo,
        aceitaTermos: this.form.aceitaTermos,
        aceitaPrivacidade: this.form.aceitaPrivacidade,
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isSuccess = true;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.erro = err.error?.message || 'Não foi possível criar a conta. Tente novamente.';
          this.cdr.detectChanges();
        },
      });
  }

  async registerWithGoogle() {
    this.isGoogleLoading = true;
    this.cdr.detectChanges();
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.isSuccess = true;
      this.form.email = 'usuario@gmail.com';
    } catch (error) {
      console.error('Erro ao fazer cadastro com Google:', error);
    } finally {
      this.isGoogleLoading = false;
      this.cdr.detectChanges();
    }
  }

  close() {
    this.closeMod.emit();
  }

  backgroundClose(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
