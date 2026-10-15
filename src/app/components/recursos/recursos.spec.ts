// recursos.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-recursos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recursos.html',
  styleUrls: ['./recursos.scss']
})
export class RecursosComponent {

  modalAberto = false;
  modalAtual: string = '';

  openModal(recurso: string): void {
    this.modalAtual = recurso;
    this.modalAberto = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.modalAberto = false;
    document.body.style.overflow = '';
    setTimeout(() => {
      this.modalAtual = '';
    }, 300);
  }

}
