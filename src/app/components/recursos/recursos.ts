import { Component, AfterViewInit, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-recursos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recursos.html',
  styleUrls: ['./recursos.scss']
})
export class Recursos implements AfterViewInit, OnInit, OnDestroy {
  modal = inject(ModalService);
  private isStandalone = false;

  constructor(private router: Router) {}

  get isStandalonePage(): boolean {
    return this.router.url === '/recursos';
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

    document.querySelectorAll('.recurso-col').forEach(el => observer.observe(el));
  }
}
