import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../navbar/navbar';
import { Planos } from '../../components/planos/planos';

@Component({
  selector: 'app-planos-page',
  standalone: true,
  imports: [RouterLink, Navbar, Planos],
  template: `
    <app-navbar></app-navbar>
    <a routerLink="/" class="back-link">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Voltar
    </a>
    <app-planos></app-planos>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
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
    app-planos {
      display: block;
      padding-top: 72px;
    }
  `]
})
export class PlanosPage {}
