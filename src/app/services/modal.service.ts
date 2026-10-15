import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalService {
  registerAberto = signal(false);
  loginAberto = signal(false);
  profileAberto = signal(false);
  private scrollY = 0;
  private lockCount = 0;

  lockScroll() {
    if (this.lockCount === 0) {
      this.scrollY = window.scrollY;
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
      document.body.style.top = `-${this.scrollY}px`;
    }
    this.lockCount++;
  }

  unlockScroll() {
    this.lockCount--;
    if (this.lockCount <= 0) {
      this.lockCount = 0;
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
      document.body.style.removeProperty('top');
      window.scrollTo(0, this.scrollY);
    }
  }

  /** Standalone page: lock body, component handles its own scroll */
  lockStandalone() {
    this.scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollY}px`;
    document.body.style.width = '100%';
    document.body.classList.add('standalone-open');
  }

  unlockStandalone() {
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.classList.remove('standalone-open');
    window.scrollTo(0, this.scrollY);
  }

  /** Emergency reset — clears any stuck scroll lock */
  forceUnlock() {
    this.lockCount = 0;
    document.body.classList.remove('modal-open', 'standalone-open');
    document.documentElement.classList.remove('modal-open');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('height');
  }

  abrirRegister() {
    this.lockScroll();
    this.registerAberto.set(true);
  }

  fecharRegister() {
    this.unlockScroll();
    this.registerAberto.set(false);
  }

  abrirLogin() {
    this.lockScroll();
    this.loginAberto.set(true);
  }

  fecharLogin() {
    this.unlockScroll();
    this.loginAberto.set(false);
  }

  abrirProfile() {
    this.lockScroll();
    this.profileAberto.set(true);
  }

  fecharProfile() {
    this.unlockScroll();
    this.profileAberto.set(false);
  }
}
