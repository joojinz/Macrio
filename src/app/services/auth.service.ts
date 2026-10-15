import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NutritionProfile {
  metaAguaMl: number;
  metaCalorias: number | null;
  pesoKg?: number | null;
  alturaCm?: number | null;
  idade?: number | null;
  sexo?: 'masculino' | 'feminino' | null;
  nivelAtividade?: 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'muito_intenso' | null;
  objetivo?: 'perder_peso' | 'manter' | 'ganhar_massa' | null;
  tmb?: number | null;
  gastoEnergeticoTotal?: number | null;
  caloriasRecomendadas?: number | null;
  metaAguaRecomendadaMl?: number | null;
}

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  plano: string;
  perfil: NutritionProfile | null;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  tipo: string;
  plano: string;
  aceitaTermos: boolean;
  aceitaPrivacidade: boolean;
  pesoKg?: number | null;
  alturaCm?: number | null;
  idade?: number | null;
  sexo?: 'masculino' | 'feminino' | null;
  nivelAtividade?: string | null;
  objetivo?: string | null;
}

export interface Patient {
  id: string;
  nutritionistId: string;
  nome: string;
  idade: number;
  pesoKg: number;
  alturaCm: number;
  sexo: 'masculino' | 'feminino';
  objetivo: 'perder_peso' | 'manter' | 'ganhar_massa';
  tmb: number;
  caloriasRecomendadas: number;
  criadoEm?: string;
}

export interface UpdateProfilePayload extends Partial<NutritionProfile> {
  tipo?: string;
}

const TOKEN_KEY = 'macrio_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  currentUser = signal<AuthUser | null>(this.readStoredUser());

  register(payload: RegisterPayload) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload).pipe(
      tap((response) => this.persistSession(response, true))
    );
  }

  updateProfile(payload: UpdateProfilePayload) {
    return this.http.patch<AuthUser>(`${environment.apiUrl}/me/profile`, payload).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.writeStoredUser(user);
      })
    );
  }

  getPatients() {
    return this.http.get<Patient[]>(`${environment.apiUrl}/me/patients`);
  }

  addPatient(patient: Omit<Patient, 'id' | 'nutritionistId' | 'tmb' | 'caloriasRecomendadas'>) {
    return this.http.post<Patient>(`${environment.apiUrl}/me/patients`, patient);
  }

  deletePatient(id: string) {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/me/patients/${id}`);
  }

  login(email: string, senha: string, lembrar: boolean) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, senha }).pipe(
      tap((response) => this.persistSession(response, lembrar))
    );
  }

  me() {
    return this.http.get<AuthUser>(`${environment.apiUrl}/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.writeStoredUser(user);
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('macrio_user');
    sessionStorage.removeItem('macrio_user');
    this.currentUser.set(null);
  }

  token(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  private persistSession(response: AuthResponse, persist: boolean) {
    if (typeof window === 'undefined') {
      this.currentUser.set(response.user);
      return;
    }
    const storage = persist ? localStorage : sessionStorage;
    const other = persist ? sessionStorage : localStorage;
    other.removeItem(TOKEN_KEY);
    other.removeItem('macrio_user');
    storage.setItem(TOKEN_KEY, response.token);
    storage.setItem('macrio_user', JSON.stringify(response.user));
    this.currentUser.set(response.user);
  }

  private readStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem('macrio_user') ?? sessionStorage.getItem('macrio_user');
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private writeStoredUser(user: AuthUser) {
    if (localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem('macrio_user', JSON.stringify(user));
    } else if (sessionStorage.getItem(TOKEN_KEY)) {
      sessionStorage.setItem('macrio_user', JSON.stringify(user));
    }
  }
}
