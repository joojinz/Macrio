import { Component, EventEmitter, Output, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-para-quem',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './para-quem.html',
  styleUrl: './para-quem.scss'
})
export class ParaQuemComponent implements AfterViewInit {
  @Output() closeMod = new EventEmitter<void>();
  modal = inject(ModalService);

  constructor(private router: Router) {}

  get isStandalonePage(): boolean {
    return this.router.url === '/para-quem';
  }

  close(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.emitClose();
    }
  }

  emitClose() {
    this.closeMod.emit();
  }

  ngAfterViewInit() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.bento-main, .bento-card').forEach(el => observer.observe(el));
  }
}
