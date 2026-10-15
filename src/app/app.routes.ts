import { Routes } from '@angular/router';
import { Main } from './components/main/main';
import { Termos } from './termos/termos';
import { Contato } from './components/contato/contato';
import { ComoFuncionaPage } from './pages/como-funciona-page/como-funciona-page';
import { RecursosPage } from './pages/recursos-page/recursos-page';
import { PlanosPage } from './pages/planos-page/planos-page';

export const routes: Routes = [
    { path: "", component: Main },
    { path: "montador", loadComponent: () => import('./pages/planner-page/planner-page').then(m => m.PlannerPage) },
    { path: "planner", redirectTo: "montador", pathMatch: "full" },
    { path: "planejador", redirectTo: "montador", pathMatch: "full" },
    { path: "treino-dieta", redirectTo: "montador", pathMatch: "full" },
    { path: "termos", component: Termos },
    { path: "contato", component: Contato },
    { path: "como-funciona", component: ComoFuncionaPage },
    { path: "recursos", component: RecursosPage },
    { path: "planos", component: PlanosPage }
];
