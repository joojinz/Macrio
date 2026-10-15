import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../navbar/navbar';
import { ComoFuncionaComponent } from '../../components/como-funciona/como-funciona';

@Component({
  selector: 'app-como-funciona-page',
  standalone: true,
  imports: [RouterLink, Navbar, ComoFuncionaComponent],
  template: `
    <app-navbar></app-navbar>
    <a routerLink="/" class="back-link">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Voltar
    </a>
    <app-como-funciona></app-como-funciona>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-bg);
    }
    .back-link {
      position: fixed;
      top: 80px;
      left: 20px;
      z-index: 1001;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #9ca3af;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      padding: 10px 16px;
      background: #161b22;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 999px;
      transition: color 0.2s, border-color 0.2s;
    }
    .back-link:hover {
      color: #1cf52b;
      border-color: #1cf52b;
    }
    app-como-funciona {
      display: block;
      padding-top: 72px;
    }
  `]
})
export class ComoFuncionaPage {}
