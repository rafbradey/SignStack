# SignStack — Development Rules & Guardrails

These rules define the engineering standards, architecture constraints, and workflow disciplines for SignStack. Every contributor and AI agent must adhere to these rules.

---

## 1. Scope & Phase Discipline

- **Work Strictly Phase by Phase**: Refer to `.agents/docs/ROADMAP.md`. Only implement tasks belonging to the current active phase.
- **No Premature Feature Creep**: Never implement features from future phases (e.g., do not add PDF rendering or generation code while working on UI foundations).
- **Clear Definitions of Done**: Complete each phase's deliverables and verify all tests before requesting progression to the next phase.

---

## 2. Privacy & Architecture Guardrails

- **Strictly Client-Side Processing**: All PDF parsing, rendering, manipulation, and generation must happen in the browser. Do not introduce a backend server, cloud storage, or external API for document processing.
- **No Unnecessary State Libraries**: Start with standard React state (`useState`, `useReducer`, custom hooks). Do not add Redux, Zustand, or MobX unless component tree complexity genuinely warrants it.
- **Separation of Concerns**:
  - UI components belong in `src/components/`.
  - PDF operations and coordinate math belong in `src/core/` and `src/utils/`, completely decoupled from React DOM rendering so they can be unit tested in isolation.

---

## 3. TypeScript Standards

- **Strict Mode Always**: Maintain `"strict": true` in `tsconfig.app.json`.
- **No `any`**: Explicitly model all domain types (documents, overlays, bounding boxes, points). Use `unknown` with type guards if dealing with untyped inputs.
- **Path Aliases**: Always use `@/...` to reference files inside `src/` rather than deep relative imports (`../../..`).

---

## 4. Testing & Reliability

- **Unit Test Difficult Logic**: All coordinate transformations (screen pixels $\leftrightarrow$ PDF points), crop bounding calculations, and file validators must have unit tests in Vitest.
- **Never Break the Build**: Every modification must pass:
  1. `npm run test` (Vitest passes)
  2. `npm run lint` (ESLint passes with 0 errors)
  3. `npm run format:check` (Prettier passes)
  4. `npm run build` (`tsc -b` type checking passes and bundle succeeds)

---

## 5. UI & Accessibility

- **Responsive and Modern**: Prioritize clean layout, accessible semantic HTML, high contrast, and clear visual hierarchy.
- **User-Friendly Error States**: Errors (invalid PDF, corrupt document, rendering issue) must provide clear, non-technical feedback to the user without exposing raw stack traces.
