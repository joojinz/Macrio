import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-privacidade',
  standalone: true,
  imports: [],
  templateUrl: './privacidade.html',
  styleUrl: './privacidade.scss'
})
export class Privacidade {
  @Output() closeMod = new EventEmitter<void>();

  close(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.emitClose();
    }
  }

  emitClose() {
    this.closeMod.emit();
  }
}