import { Component, EventEmitter, Output, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, Patient } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile-modal.html',
  styleUrl: './profile-modal.scss',
})
export class ProfileModal implements OnInit {
  @Output() closeMod = new EventEmitter<void>();

  auth = inject(AuthService);
  modal = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  activeTab: 'parametros' | 'pacientes' = 'parametros';

  form = {
    tipo: 'nutricionista' as 'pessoal' | 'nutricionista',
    pesoKg: 78.5,
    alturaCm: 178,
    idade: 28,
    sexo: 'masculino' as 'masculino' | 'feminino',
    nivelAtividade: 'moderado' as 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'muito_intenso',
    objetivo: 'manter' as 'perder_peso' | 'manter' | 'ganhar_massa',
    metaAguaMl: 2500,
    metaCalorias: 2400 as number | null,
  };

  patients: Patient[] = [];
  isLoadingPatients = false;
  isSavingPatient = false;

  novoPaciente = {
    nome: '',
    idade: 25,
    pesoKg: 65,
    alturaCm: 170,
    sexo: 'feminino' as 'masculino' | 'feminino',
    objetivo: 'perder_peso' as 'perder_peso' | 'manter' | 'ganhar_massa',
  };

  isSaving = false;
  mensagemSucesso = '';
  erro = '';

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.form.tipo = (user.tipo === 'nutricionista' ? 'nutricionista' : 'pessoal');
      if (user.perfil) {
        const p = user.perfil;
        this.form.pesoKg = p.pesoKg || 78.5;
        this.form.alturaCm = p.alturaCm || 178;
        this.form.idade = p.idade || 28;
        this.form.sexo = p.sexo || 'masculino';
        this.form.nivelAtividade = p.nivelAtividade || 'moderado';
        this.form.objetivo = p.objetivo || 'manter';
        this.form.metaAguaMl = p.metaAguaMl || 2500;
        this.form.metaCalorias = p.metaCalorias;
      }
    }
    this.carregarPacientes();
  }

  carregarPacientes() {
    this.isLoadingPatients = true;
    this.auth.getPatients().subscribe({
      next: (list) => {
        this.patients = list;
        this.isLoadingPatients = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingPatients = false;
        this.cdr.detectChanges();
      }
    });
  }

  get liveTmb(): number {
    const { pesoKg, alturaCm, idade, sexo } = this.form;
    if (!pesoKg || !alturaCm || !idade) return 0;
    const base = (10 * pesoKg) + (6.25 * alturaCm) - (5 * idade);
    return Math.round(sexo === 'masculino' ? base + 5 : base - 161);
  }

  get liveGastoTotal(): number {
    const tmb = this.liveTmb;
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

  get liveCalorias(): number {
    const total = this.liveGastoTotal;
    if (!total) return 0;
    const ajustes: Record<string, number> = {
      perder_peso: -400,
      manter: 0,
      ganhar_massa: 350,
    };
    return Math.round(total + (ajustes[this.form.objetivo] ?? 0));
  }

  get liveAguaRecomendada(): number {
    if (!this.form.pesoKg) return 2000;
    return Math.round(this.form.pesoKg * 35);
  }

  get liveNovoPacienteTmb(): number {
    const { pesoKg, alturaCm, idade, sexo } = this.novoPaciente;
    if (!pesoKg || !alturaCm || !idade) return 0;
    const base = (10 * pesoKg) + (6.25 * alturaCm) - (5 * idade);
    return Math.round(sexo === 'masculino' ? base + 5 : base - 161);
  }

  get liveNovoPacienteCalorias(): number {
    const tmb = this.liveNovoPacienteTmb;
    if (!tmb) return 0;
    const tdee = Math.round(tmb * 1.55);
    const adj = this.novoPaciente.objetivo === 'perder_peso' ? -400 : (this.novoPaciente.objetivo === 'ganhar_massa' ? 350 : 0);
    return Math.round(tdee + adj);
  }

  alternarTipo(novoTipo: 'pessoal' | 'nutricionista') {
    this.form.tipo = novoTipo;
    this.salvar();
  }

  salvar() {
    this.erro = '';
    this.mensagemSucesso = '';
    this.isSaving = true;
    this.cdr.detectChanges();

    this.auth.updateProfile({
      tipo: this.form.tipo,
      pesoKg: Number(this.form.pesoKg),
      alturaCm: Number(this.form.alturaCm),
      idade: Number(this.form.idade),
      sexo: this.form.sexo,
      nivelAtividade: this.form.nivelAtividade,
      objetivo: this.form.objetivo,
      metaAguaMl: this.form.metaAguaMl,
      metaCalorias: this.form.metaCalorias,
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.mensagemSucesso = this.form.tipo === 'nutricionista'
          ? 'Conta configurada para Nutricionista (Uso Profissional)!'
          : 'Conta configurada para Uso Pessoal!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensagemSucesso = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        this.erro = err.error?.message || 'Falha ao atualizar perfil. Verifique os valores.';
        this.cdr.detectChanges();
      }
    });
  }

  adicionarPaciente() {
    if (!this.novoPaciente.nome) return;
    this.isSavingPatient = true;
    this.auth.addPatient({
      nome: this.novoPaciente.nome,
      idade: Number(this.novoPaciente.idade),
      pesoKg: Number(this.novoPaciente.pesoKg),
      alturaCm: Number(this.novoPaciente.alturaCm),
      sexo: this.novoPaciente.sexo,
      objetivo: this.novoPaciente.objetivo,
    }).subscribe({
      next: (criado) => {
        this.patients.unshift(criado);
        this.isSavingPatient = false;
        this.novoPaciente.nome = '';
        this.mensagemSucesso = 'Paciente cadastrado com sucesso!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensagemSucesso = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: () => {
        this.isSavingPatient = false;
        this.erro = 'Erro ao cadastrar paciente.';
        this.cdr.detectChanges();
      }
    });
  }

  removerPaciente(id: string) {
    this.auth.deletePatient(id).subscribe({
      next: () => {
        this.patients = this.patients.filter(p => p.id !== id);
        this.cdr.detectChanges();
      }
    });
  }

  logout() {
    this.auth.logout();
    this.close();
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
