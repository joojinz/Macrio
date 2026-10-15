import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-contato',
  standalone: true,
  imports: [],
  templateUrl: './contato.html',
  styleUrl: './contato.scss'
})
export class Contato {
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