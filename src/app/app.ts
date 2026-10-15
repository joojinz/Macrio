import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Register } from './components/register/register';
import { Login } from './components/login/login';
import { ProfileModal } from './components/profile-modal/profile-modal';
import { ModalService } from './services/modal.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Register, Login, ProfileModal],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  modal = inject(ModalService);
}
