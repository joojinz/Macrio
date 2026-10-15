import { Component, EventEmitter, Output, inject, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-como-funciona',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './como-funciona.html',
  styleUrl: './como-funciona.scss'
})
export class ComoFuncionaComponent implements AfterViewInit, OnInit, OnDestroy {
  @Output() closeMod = new EventEmitter<void>();

  modal = inject(ModalService);
  private isStandalone = false;

  constructor(private router: Router) {}

  get isStandalonePage(): boolean {
    return this.router.url === '/como-funciona';
  }

  close(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.emitClose();
    }
  }

  emitClose() {
    this.closeMod.emit();
  }

  ngOnInit() {
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

  ngAfterViewInit() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.timeline-track, .timeline-step').forEach(el => observer.observe(el));
  }
}
