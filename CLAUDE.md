# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Monorepo with two applications and a standalone prototype:

- **`app/`** — Angular 21.1.0 frontend (SSR configured, client-side rendering active)
- **`Macrio/`** — Spring Boot 4.0.2 backend (minimal, no controllers yet)
- **`landing-redesign.html`** — Standalone HTML prototype with a different design palette

## Development Commands

### Frontend (app/)
```bash
cd app
npm install          # Install dependencies
ng serve            # Dev server at http://localhost:4200
ng build            # Production build to dist/
ng test             # Run Vitest unit tests (jsdom environment)
ng test --include='**/specific.spec.ts'  # Run a single test file
```

No linter is configured (no ESLint in dependencies). Prettier is configured in `package.json` (100 char print width, single quotes, Angular HTML parser).

The SSR server entry is at `src/server.ts` (Express 5 on port 4000), but all routes currently use `RenderMode.Client`. To run the SSR server after building: `node dist/frontend/server/server.mjs`.

### Backend (Macrio/)
```bash
cd Macrio
./mvnw spring-boot:run  # Start Spring Boot (port 8080)
./mvnw test            # Run tests
./mvnw package         # Build JAR
```

Backend is skeletal — `MacrioApplication` class only. `com.formules.Mifflin` is an empty placeholder class in a different package (`com.formules` vs `com.example.Macrio`). No controllers, services, or repositories exist yet. `application.properties` configures a PostgreSQL datasource but no JDBC driver is in the POM. Security debug logging is enabled (`logging.level.org.springframework.security=DEBUG`).

## Frontend Architecture

### Routing and Dual-Use Components

Routes in `app.routes.ts`: root (`Main`), `termos`, `contato`, `como-funciona`, `recursos`, `planos`.

Key pattern: `ComoFuncionaComponent`, `ParaQuemComponent`, `Recursos`, and `Planos` serve dual duty — they render as inline sections on the landing page AND as standalone routed pages. They detect context via `this.router.url` and show a "Voltar" link when standalone.

### Component Tree (Landing Page)

```
App (root)
  ├── <router-outlet>
  └── <app-register> modal (global, controlled by ModalService)

Main (landing page route)
  ├── <app-navbar> — sticky nav, owns Login modal locally
  ├── <app-header> — empty/unused
  └── <app-hero> — contains ALL landing page content:
        ├── Hero section (CTA, social proof, stats ticker, trust bar)
        ├── <app-como-funciona> (inline section)
        ├── <app-para-quem> (inline section)
        ├── Plans section (HTML directly in hero.html)
        ├── Testimonials section
        ├── CTA section
        ├── Footer with modals (contato, privacidade, termos)
        └── <app-register> modal (controlled by ModalService)
```

### State Management

- **ModalService** (`services/modal.service.ts`): Singleton using Angular **signals** (`signal(false)`) to toggle the Register modal. Toggles `modal-open` class on `<body>` and `<html>`.
- Login modal: controlled locally by `Navbar` via boolean + `@Output()`.
- Contato/Privacidade/Termos modals: controlled locally by `Hero` via boolean properties.
- All modals use `@Output() closeMod = new EventEmitter<void>()` for close events.

### Angular Material

Used selectively — only in `Navbar` (`MatIconModule`, `MatButtonModule`, `MatToolbarModule`). Not a project-wide UI framework.

### Testing

Tests use **Vitest** with `jsdom` environment. Vitest globals (`describe`, `it`, `expect`, etc.) are available without imports (configured in `tsconfig.spec.json`). Test files use the `*.spec.ts` convention and live alongside their components.

### Design System (Angular app)

Defined as CSS custom properties in `styles.scss`:
- Dark palette: `--color-bg: #0b0e12`, `--color-surface: #161b22`
- Accent: `--color-accent: #1cf52b` (neon green)
- Fonts: **Barlow Condensed** (display, 900 weight, uppercase), **Inter** (body)
- 8px spacing scale, max-width 1280px
- Varied radius tokens: `--radius-sm: 6px`, `--radius: 12px`, `--radius-lg: 16px`, `--radius-pill: 999px`
- All UI text is in **Portuguese (pt-BR)**.

### Standalone Redesign (`landing-redesign.html`)

A self-contained HTML prototype with a different design direction:
- Accent: `#39FF14` (slightly different green)
- Display font: **Bebas Neue** (not Barlow Condensed)
- Background: `#0d0d0d` (vs Angular app's `#0b0e12`)
- Uses `IntersectionObserver` for scroll animations, vanilla JS only

### Key Dependencies

Angular 21.1.0, TypeScript 5.9.2, Angular Material/CDK 21.2.2, Express 5.1.0 (SSR), Vitest (testing).

## Backend Architecture

Spring Boot 4.0.2 with Java 21. Dependencies: spring-boot-starter-webmvc, devtools, lombok. Entry point: `com.example.Macrio.MacrioApplication`. No controllers or business logic implemented yet.
