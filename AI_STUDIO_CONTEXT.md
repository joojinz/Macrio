# AI Studio Context — Macrio (Montador de Treino & Dieta)

Este documento define o contexto arquitetural, regras de negócio, convenções de código e diretrizes de desenvolvimento para o projeto **Macrio** no Google AI Studio.

---

## 1. Visão Geral

- **O que é:** Plataforma web completa de prescrição e acompanhamento físico-nutricional, integrando montador interativo de treinos (divisões A/B/C/D/E, séries, repetições, carga, RPE, descanso e dicas biomecânicas), planejador dietético quantitativo baseado na Tabela TACO (alimentos, gramas, calorias e macronutrientes), calculadora metabólica clínica e exportação de fichas em PDF.
- **Para quem é:** Atletas/praticantes individuais (modo Pessoal) e profissionais de saúde (Nutricionistas e Educadores Físicos) que necessitam prescrever planos e gerenciar carteira de pacientes/alunos.
- **Proposta de Valor:** Centralizar o cálculo calórico-metabólico preciso, a elaboração da rotina de treinamento e a dieta em uma experiência visual escura, sem fricção, com persistência na nuvem (Firestore) e geração de relatórios oficiais para impressão.

---

## 2. Stack e Versões

- **Framework Frontend:** Angular 21 (v21.1.0, zoneless-ready, Standalone Components, Signals).
- **Backend & SSR:** Angular SSR (`@angular/ssr` 21.1.4) integrado com Node.js Express 5 (`express` 5.1.0) executando na porta 3000 (`src/server.ts`).
- **Banco de Dados & Autenticação:** Firebase SDK 11 (Firestore e Firebase Auth) com fallback resiliente para armazenamento em memória (`Map` de usuários, pacientes e planejadores).
- **Inteligência Artificial:** Google Gen AI SDK (`@google/genai` 1.0.0) modelo `gemini-3.8-flash` no backend para o Copiloto de Treino e Biomecânica, com fallback científico offline pré-indexado.
- **Estilização:** SCSS modular com Design Tokens globais (`src/styles.scss`).
- **Ícones & UI:** Google Material Icons / Material Symbols e Angular Material (`@angular/material` 21.1.0) seletivo.
- **Exportação de Documentos:** `jspdf` (4.2.1) + `jspdf-autotable` (5.0.8) em formato vetorial limpo.
- **Ambiente & Bundler:** `@angular/build` (Application Builder com Vite e esbuild integrados), Node.js 22 LTS, npm.

---

## 3. Estrutura de Pastas

```
/
├── src/
│   ├── app/
│   │   ├── components/         # Modais e seções reutilizáveis (login, register, planos, etc.)
│   │   ├── hero/               # Seção hero e destaques visuais da landing page
│   │   ├── navbar/             # Barra de navegação com gatilhos de modal e status de auth
│   │   ├── pages/              # Páginas roteadas da aplicação
│   │   │   ├── planner-page/   # Núcleo da aplicação: Montador de Treino & Dieta (tabs, metas, TACO)
│   │   │   │   ├── planner-page.ts       # Lógica reativa do planner, abas, filtros e modals
│   │   │   │   ├── planner-page.html     # Template das abas (Metas, Treino, Dieta, Resumo)
│   │   │   │   ├── planner-page.scss     # Estilização profissional dark mode
│   │   │   │   └── planner-export.util.ts# Gerador de relatórios PDF (treinos e cardápio)
│   │   │   └── planos-page/ ...          # Páginas institucionais isoladas
│   │   ├── services/           # Camada de dados e lógica desacoplada
│   │   │   ├── auth.service.ts      # Gerenciamento de sessão, token JWT e perfil
│   │   │   ├── auth.interceptor.ts  # Injeção de Bearer token nas requisições HTTP
│   │   │   ├── modal.service.ts     # Controle reativo de modais via Signals
│   │   │   ├── planner.service.ts   # CRUD do planejador, chamadas ao backend e IA
│   │   │   └── taco-database.ts     # Banco de dados de alimentos TACO (100+ itens brasileiros)
│   │   ├── app.routes.ts       # Rotas do Angular Router (/, /planner, /planos, etc.)
│   │   └── app.ts              # Componente raiz com host dos modais globais
│   ├── index.html              # Shell HTML com fontes Google e metadados SEO/OG
│   ├── main.ts                 # Bootstrap da aplicação Angular
│   ├── server.ts               # Servidor Express: API REST, Firestore e integração Gemini
│   └── styles.scss             # Design system global, variáveis CSS e tipografia
├── public/                     # Assets estáticos essenciais (icon.png, textlogovetor.png)
├── scripts/                    # Utilitários de teste (test-endpoints.js com 38 testes de motor)
├── _quarentena/                # Arquivos não utilizados preservados para auditoria
├── firebase-applet-config.json # Configuração de conexão do Firebase Firestore
├── metadata.json               # Metadados e capacidades do Google AI Studio
└── package.json                # Dependências limpas e scripts de execução
```

---

## 4. Mapa de Telas e Funcionalidades

### 4.1 Landing Page (`/`)
- **Componentes:** `Navbar`, `Hero`, `ComoFunciona`, `ParaQuem`, `Planos`, `Contato`, `Privacidade`, `Termos`.
- **Ações:** Apresentação da plataforma, seleção de planos (Gratuito, Mensal, Anual) e modais de Cadastro e Login.

### 4.2 Montador de Treino & Dieta (`/planner`)
A tela de trabalho possui 4 abas principais controladas por estado local reativo:

1. **Aba Metas & Fisiologia:**
   - Visualização e edição dos parâmetros corporais (peso, altura, idade, sexo biológico, nível de atividade física e objetivo).
   - Modo de cálculo duplo: **Cálculo Clínico Automático** (Mifflin-St Jeor) vs. **Valores Livres/Customizados** (o usuário ou nutricionista define calorias, TMB, GET, água e gramas exatas de proteínas, carboidratos, gorduras e fibras).
2. **Aba Treinos:**
   - Divisão em múltiplos dias/fichas (ex.: Treino A, Treino B, Treino C).
   - Adição e edição de exercícios com grupo muscular, séries, repetições, carga (kg), RPE (escala 1 a 10), descanso (segundos) e dica biomecânica.
   - Biblioteca de presets com mais de 30 exercícios clássicos.
   - Copiloto IA de Treino: consulta orientada a grupos musculares que sugere exercícios padrão-ouro biomecânicos.
   - Exportação direta da ficha para PDF vetorizado.
3. **Aba Dieta & Refeições:**
   - Criação e ordenação de refeições por horário (Café da Manhã, Almoço, Lanche, Jantar).
   - Busca instantânea no banco de dados de alimentos (Tabela TACO) com cálculo em tempo real proporcional à quantidade em gramas.
   - Totalizadores por refeição e balanço diário contra as metas estabelecidas (com barras de progresso de calorias e macros).
   - Exportação da prescrição alimentar para PDF detalhado.
4. **Aba Ficha Resumo:**
   - Visão consolidada em um único painel: balanço energético, divisão percentual e absoluta de macronutrientes, estrutura de treinos da semana e distribuição das refeições.

---

## 5. Modelo de Dados e Estado

### 5.1 Entidades Principais
- **`UserAccount`:** `id`, `nome`, `email`, `tipo` ('pessoal' | 'nutricionista'), `plano` ('gratuito' | 'mensal' | 'anual'), `perfil`, `planner`.
- **`NutritionProfile`:** `pesoKg`, `alturaCm`, `idade`, `sexo` ('masculino' | 'feminino'), `nivelAtividade`, `objetivo` ('perder_peso' | 'manter' | 'ganhar_massa'), `metaAguaMl`, `metaCalorias`, `tmb`, `gastoEnergeticoTotal`, `caloriasRecomendadas`, `metaAguaRecomendadaMl`.
- **`WorkoutDay`:** `id`, `identificador`, `nome`, `foco`, `exercicios: WorkoutExercise[]`.
- **`WorkoutExercise`:** `id`, `nome`, `grupoMuscular`, `series`, `repeticoes`, `cargaKg`, `descansoSegundos`, `rpe`, `observacoes`, `dicaBiomecanica`.
- **`DietMeal`:** `id`, `nome`, `horario`, `alimentos: DietFoodItem[]`.
- **`DietFoodItem`:** `id`, `nome`, `quantidadeG`, `calorias`, `proteinaG`, `carboidratoG`, `gorduraG`, `fibrasG`.
- **`CustomMetabolicGoals`:** `useCustomValues`, `calorias`, `gastoEnergeticoTotal`, `taxaMetabolicaBasal`, `metaAguaMl`, `proteinaG`, `carboidratoG`, `gorduraG`, `fibrasG`, `deficitSuperavitKcal`.

### 5.2 Fluxo de Estado
- O estado de autenticação e usuário atual é mantido no `AuthService` com persistência em `localStorage` e espelhamento no Firestore.
- O planejador (`UserPlannerData`) é carregado via `GET /api/me/planner` e sincronizado via `PUT /api/me/planner`. As modificações na interface refletem imediatamente no estado em memória e são salvas no backend.

---

## 6. Regras de Negócio e Cálculos

1. **Taxa Metabólica Basal (TMB) — Equação de Mifflin-St Jeor:**
   - Base = `(10 × pesoKg) + (6.25 × alturaCm) - (5 × idade)`
   - Homens: `TMB = round(Base + 5)`
   - Mulheres: `TMB = round(Base - 161)`
2. **Gasto Energético Total (GET / TDEE):**
   - Multiplicadores por nível de atividade física:
     - Sedentário: `1.2`
     - Leve: `1.375`
     - Moderado: `1.55`
     - Intenso: `1.725`
     - Muito Intenso: `1.9`
   - `GET = round(TMB × fatorAtividade)`
3. **Calorias Recomendadas (Balanço Energético):**
   - Perder peso (Déficit): `GET - 400 kcal`
   - Manter peso (Normocalórica): `GET`
   - Ganhar massa (Superávit): `GET + 350 kcal`
4. **Recomendação Diária de Hidratação:**
   - `Meta Água (ml) = round(pesoKg × 35)`
5. **Conversão de Macronutrientes para Calorias:**
   - 1g Proteína = 4 kcal
   - 1g Carboidrato = 4 kcal
   - 1g Gordura = 9 kcal
   - 1g Fibra = 2 kcal (consideradas para digestão e saciedade)
6. **Limites de Validação da API:**
   - Peso: 20 kg a 400 kg
   - Altura: 80 cm a 250 cm
   - Idade: 10 a 120 anos
   - Meta de água: 500 ml a 8000 ml
   - Meta de calorias: 800 kcal a 8000 kcal

---

## 7. Design System

- **Paleta de Cores (Dark Mode):**
  - Fundo principal: `#0b0e12` (`--color-bg`)
  - Superfície / Cards: `#161b22` (`--color-surface`)
  - Bordas sutis: `#30363d` (`--color-border`)
  - Acento Primário: `#1cf52b` (`--color-accent`, verde neon esportivo)
  - Textos: `#f0f6fc` (primário), `#8b949e` (secundário/muted)
- **Tipografia:**
  - Títulos e Destaques: **Barlow Condensed** (900 weight, uppercase, tracking ajustado).
  - Textos de Apoio e Tabelas: **Inter** (400, 500, 600 weight).
  - Tamanho mínimo absoluto: 11px (nunca utilizar fontes menores que 11px para acessibilidade).
- **Espaçamento e Raio:**
  - Escala estrita de 8pt (8px, 16px, 24px, 32px, 48px).
  - Raios padronizados: 6px (`--radius-sm`), 12px (`--radius`), 16px (`--radius-lg`), 999px (`--radius-pill`).
  - Largura máxima de container: `1200px` (centralizado com `margin: 0 auto`).
- **Regras Visuais Estritas:**
  - Apenas **UM único botão verde sólido** (`--color-accent` com texto escuro) em evidência por viewport/seção para CTA primário.
  - Ações secundárias devem usar estilo ghost, contorno (`border: 1px solid --color-border`) ou tons neutros.
  - Formatação monetária em Real (`R$`) e decimal com vírgula em padrão brasileiro (`pt-BR`).

---

## 8. Convenções de Código

- **Angular Moderno:** Standalone Components obrigatórios (`standalone: true` implícito no Angular 21, imports explícitos na anotação `@Component`).
- **Sem NgModel / FormsModule:** Usar Reactive Forms ou event bindings com Signals para inputs e controles.
- **Nomenclatura:** Classes e arquivos sem sufixos redundantes no estilo Angular moderno (ex.: `Hero`, `Navbar`, `PlannerService`).
- **Tipagem Estrita:** TypeScript com `strict: true`. Não utilizar `any` sem necessidade comprovada.
- **Isolamento de Estilos:** Estilos de componentes em arquivos `.scss` dedicados ou classes Tailwind/CSS nativas bem estruturadas.

---

## 9. Regras para a IA Editar o Projeto

1. **Escopo Restrito:** Altere apenas o que o usuário solicitar explicitamente. Não faça refatorações cosméticas em código que já está funcionando.
2. **Preservação de Cálculos:** Nunca altere as fórmulas de Mifflin-St Jeor, GET, TDEE ou gramas de macros sem solicitação explícita.
3. **Não Adicionar Dependências:** Utilize apenas as bibliotecas já instaladas no `package.json`.
4. **Preservar o Design System:** Respeite a paleta escura, o limite de 1200px e a regra do único botão verde de destaque.
5. **Verificação Obrigatória:** Após qualquer alteração, rode `npm run lint` ou use a ferramenta `lint_applet` para assegurar que não há quebra de imports ou tipagem.

---

## 10. Como Rodar

### Instalação
```bash
npm install
```

### Variáveis de Ambiente Necessárias
Declaradas em `.env.example`:
- `FIREBASE_API_KEY` (Chave de autenticação Firebase / Firestore)
- `GEMINI_API_KEY` (Chave de API do Google Gemini para o copiloto de treinos no backend)
- `PORT` (Porta do servidor, padrão: 3000)

### Comandos de Execução
```bash
# Iniciar servidor de desenvolvimento (Angular SSR + API Express na porta 3000)
npm run dev

# Compilar para produção
npm run build

# Validação estática de tipos (Typecheck / Lint)
npm run lint

# Execução da bateria de 38 testes de validação dos endpoints e motor de cálculo
node scripts/test-endpoints.js
```

---

## 11. Pendências Conhecidas e Decisões Tomadas

- **Protótipo Standalone:** O arquivo `landing-redesign.html` foi movido para a pasta `_quarentena/` para não interferir na aplicação Angular principal, ficando disponível para consulta ou descarte pelo usuário.
- **Assets de Imagens Não Referenciados:** 8 imagens binárias antigas (`firstimg.png`, `celphone.png`, `graphicandnote.png`, etc.) foram movidas para `_quarentena/public/`, reduzindo o volume de assets da aplicação em 8.1 MB.
- **Dependências Removidas:** `html2canvas` foi removido do `package.json` por ser redundante, já que a exportação oficial de relatórios é feita com `jspdf` e `jspdf-autotable`.
- **Modo Offline Resiliente:** O backend possui seeds automáticos e armazenamento em memória para garantir que todas as rotas e o login da conta master (`teste@gmail.com`) funcionem perfeitamente mesmo sem conexão externa ativa com o Firestore.
