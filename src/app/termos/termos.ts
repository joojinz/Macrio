import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-termos',
  standalone: true,
  templateUrl: './termos.html',
  styleUrl: './termos.scss'
})
export class Termos {
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