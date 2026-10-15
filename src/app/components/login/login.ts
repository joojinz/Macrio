import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  @Output() closeMod = new EventEmitter<void>();

  modal = inject(ModalService);
  private auth = inject(AuthService);

  email = 'teste@gmail.com';
  senha = '12345678';
  lembrar = true;
  isLoadingGoogle = false;
  isSubmitting = false;
  erro = '';

  ngOnInit() {
    const emailSalvo = localStorage.getItem('macrio_email');
    if (emailSalvo) {
      this.email = emailSalvo;
    }
    this.loadGoogleSDK();
  }

  loadGoogleSDK() {
    if (!document.querySelector('script[src*="accounts.google.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }

  entrar() {
    this.erro = '';
    if (!this.email || !this.senha) {
      this.erro = 'Informe e-mail e senha';
      return;
    }

    if (this.lembrar) {
      localStorage.setItem('macrio_email', this.email);
    } else {
      localStorage.removeItem('macrio_email');
    }

    this.isSubmitting = true;
    this.auth.login(this.email, this.senha, this.lembrar).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.close();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.erro = err.error?.message || 'Não foi possível entrar. Tente novamente.';
      },
    });
  }

  loginComTesteGmail() {
    this.email = 'teste@gmail.com';
    this.senha = '12345678';
    this.entrar();
  }

  preencherNutricionista(email: string, senha: string) {
    this.email = email;
    this.senha = senha;
    this.entrar();
  }

  async loginWithGoogle() {
    this.isLoadingGoogle = true;
    this.erro = '';
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      this.auth.login('teste@gmail.com', '12345678', true).subscribe({
        next: () => {
          this.isLoadingGoogle = false;
          this.close();
        },
        error: () => {
          this.isLoadingGoogle = false;
          this.erro = 'Conecte com sua conta Macrio usando e-mail e senha.';
        }
      });
    } catch {
      this.isLoadingGoogle = false;
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
