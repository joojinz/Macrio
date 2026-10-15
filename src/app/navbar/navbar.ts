import { Component, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { ModalService } from '../services/modal.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatToolbarModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit, OnDestroy {
  menuAberto = false;
  private scrollHandler?: () => void;

  modal = inject(ModalService);
  auth = inject(AuthService);
  private router = inject(Router);

  @Output() modalStateChange = new EventEmitter<boolean>();

  ngOnInit() {
    this.scrollHandler = () => {
      const navbar = document.querySelector('.navbar-wrapper');
      if (!navbar) return;
      const container = document.querySelector('app-planos-page, app-como-funciona, app-recursos');
      const scrollY = container ? container.scrollTop : window.scrollY;
      if (scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', this.scrollHandler, true);
  }

  ngOnDestroy() {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
    }
  }

  toggleMenu() {
    this.menuAberto = !this.menuAberto;
    if (this.menuAberto) {
      this.modal.lockScroll();
    } else {
      this.modal.unlockScroll();
    }
  }

  fecharMenu() {
    if (this.menuAberto) {
      this.menuAberto = false;
      this.modal.unlockScroll();
    }
  }

  scrollToSection(id: string) {
    this.fecharMenu();
    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
