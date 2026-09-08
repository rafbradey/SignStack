# SignStack

> Privacy-first web application for precise PDF document stacking and overlaying.

SignStack enables users to precisely overlay content from one PDF document onto another (signatures, stamps, dates, form corrections, or approval blocks) entirely inside the browser.

---

## Key Principles

- **Privacy-First (Client-Side)**: Documents are processed entirely in the browser using HTML5 Canvas, Web Workers, and client-side PDF libraries. No document data is sent to a remote server.
- **Split-Screen Workflow**: Clear visual feedback structured as `EDITOR | RESULT` — you always see what the final composite PDF looks like while adjusting overlays.
- **Optional Precision**: Fast whole-page stacking by default, with an optional precision crop/selection editor when sub-regions are needed.
- **Portfolio-Quality Engineering**: Strict TypeScript, modular architecture, comprehensive unit testing for coordinate transformations, and zero unnecessary dependencies.

---

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 8
- **Language**: TypeScript (Strict mode)
- **Styling**: Vanilla CSS with modern custom properties & design tokens
- **Testing**: Vitest
- **Code Quality**: ESLint (typescript-eslint flat config) & Prettier

---

## Project Structure

```text
SignStack/
├── .agents/               # Project context, architecture specs, roadmap, and rules
│   ├── docs/              # ARCHITECTURE.md, MVP.md, PROJECT_CONTEXT.md, ROADMAP.md
│   └── rules/             # development-rules.md
├── public/                # Static assets (favicons, icons)
├── src/
│   ├── assets/            # App media and visual assets
│   ├── components/        # Modular UI components (upload, viewer, editor, preview)
│   ├── core/              # PDF engine (rendering, canvas compositing, pdf assembly)
│   ├── hooks/             # Custom React hooks (canvas zoom/pan, crop handles)
│   ├── types/             # Domain type definitions
│   ├── utils/             # Coordinate math, geometry, and utility functions
│   ├── App.tsx            # Main application shell
│   ├── index.css          # Base design system tokens and typography
│   └── main.tsx           # Application entry point
├── index.html             # HTML entry point
├── package.json           # Scripts and dependencies
├── tsconfig.json          # Root TypeScript configuration
└── vite.config.ts         # Vite build configuration with `@` path aliases
```

---

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm

### Installation

```bash
npm install
```

### Available Scripts

| Command                | Description                                         |
| :--------------------- | :-------------------------------------------------- |
| `npm run dev`          | Starts the Vite development server with HMR         |
| `npm run build`        | Type-checks with `tsc -b` and builds for production |
| `npm run preview`      | Locally previews the production build               |
| `npm run test`         | Runs the test suite via Vitest                      |
| `npm run test:watch`   | Runs Vitest in interactive watch mode               |
| `npm run lint`         | Lints the codebase with ESLint                      |
| `npm run format`       | Automatically formats all files using Prettier      |
| `npm run format:check` | Verifies formatting compliance without writing      |

---

## Current Status & Roadmap

Development is phased incrementally according to [.agents/docs/ROADMAP.md](.agents/docs/ROADMAP.md):

- [x] **Phase 1: Project Setup** (TypeScript, Vite, ESLint, Prettier, Vitest, architecture baseline)
- [ ] **Phase 2: UI Foundation** (Application shell, layout tokens, responsive workspace)
- [ ] **Phase 3: PDF Upload** (Drag & drop, multi-file validation, document cards)
- [ ] **Phase 4: PDF Rendering** (Client-side PDF page rendering & navigation)
- [ ] **Phase 5: Document Management** (Base document & overlay source models)
- [ ] **Phase 6: Overlay Engine** (Coordinate transformation & positioning)
- [ ] **Phase 7: Precision Editor** (Crop rectangle, drag/resize handles)
- [ ] **Phase 8: Editor | Result Split View** (Real-time composition preview)
- [ ] **Phase 9: PDF Generation** (Client-side binary export & download)
