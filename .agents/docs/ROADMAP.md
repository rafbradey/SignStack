# SignStack Development Roadmap

The project should be developed incrementally.

Only the current phase should be implemented unless explicitly instructed otherwise.

---

# Phase 1 — Project Setup

Goals:

- initialize repository
- initialize React application
- configure TypeScript
- configure linting
- configure formatting if needed
- establish basic folder structure
- configure Git
- create initial documentation

Deliverable:

A clean development environment with a working React application.

---

# Phase 2 — UI Foundation

Goals:

- application shell
- header
- navigation where necessary
- typography
- spacing
- responsive layout
- basic design system
- buttons
- cards
- dialogs
- error states
- loading states

Deliverable:

A clean SignStack interface without PDF functionality.

---

# Phase 3 — PDF Upload

Goals:

- file picker
- drag-and-drop
- PDF validation
- multiple files
- document cards
- metadata
- remove documents
- reorder documents

Deliverable:

Users can manage multiple uploaded PDFs.

---

# Phase 4 — PDF Rendering

Goals:

- evaluate PDF rendering library
- render PDF pages
- page navigation
- page selection
- zoom
- loading states
- rendering errors

Deliverable:

Users can view uploaded PDFs in the browser.

---

# Phase 5 — Document Management

Goals:

- document state
- selected document
- selected page
- base document
- overlay document
- document ordering

Deliverable:

The application has a reliable document model.

---

# Phase 6 — Overlay Engine

Goals:

- associate overlays with specific Main Document pages (page-specific overlay ownership)
- support multiple overlays per Main Document page
- overlay one PDF page onto another
- define overlay coordinates
- define dimensions
- handle scaling
- handle opacity
- handle page size differences
- establish coordinate conversion strategy

Deliverable:

A basic overlay works correctly with page-specific association and multi-overlay support.

---

# Phase 7 — Precision Editor

Goals:

- rectangular selection
- crop region
- move
- resize
- reset
- delete
- zoom
- pan

Deliverable:

Users can select only the relevant portion of a PDF page.

---

# Phase 8 — Editor | Result

Goals:

- editor workspace
- result preview
- synchronized editor state
- real-time or near-real-time result updates
- clear visual relationship between editing and output

Deliverable:

Users can see the final composition while editing.

---

# Phase 9 — PDF Generation

Goals:

- convert editor state into a real PDF
- preserve correct dimensions
- preserve positioning
- preserve crop region
- preserve opacity where supported
- handle page sizes/orientations

Deliverable:

A valid downloadable PDF is generated.

---

# Phase 10 — Error Handling

Goals:

Handle:

- invalid files
- corrupted PDFs
- unsupported files
- empty uploads
- large documents
- rendering failures
- generation failures
- incompatible page dimensions

Deliverable:

Useful and understandable error handling.

---

# Phase 11 — UX Refinement

Goals:

- improve interaction flow
- improve empty states
- improve loading states
- improve accessibility
- improve keyboard interaction where appropriate
- improve responsive behavior
- improve visual hierarchy

Deliverable:

A polished MVP experience.

---

# Phase 12 — Performance [COMPLETED]

Goals:

Evaluate:

- large PDF behavior (single-page lazy rasterization, orphan proxy pruning)
- browser memory (explicit canvas backing store buffer release on unmount/clear)
- rendering performance (requestAnimationFrame drag coalescing)
- unnecessary React renders (React.memo on DocumentCard, PdfPageCanvas, PdfOverlayLayer, CropSelectionBox)
- lazy rendering (render only the active viewport page)
- expensive PDF operations (in-flight render task cancellation)

Deliverable:

A stable MVP for realistic document sizes. (Completed)

---

# Phase 13 — Architecture Review [COMPLETED]

Review:

- component structure (unidirectional hierarchy, clean separation of concerns)
- state management (decoupled custom hooks useDocuments and usePdfPage without global state overhead)
- PDF architecture (dual-engine: pdfjs-dist for rendering, pdf-lib for vector generation)
- coordinate system (3-tier normalized transformation with origin inversion)
- error handling (3-tier error hierarchy with ErrorBoundary isolation)
- performance (RAF throttled interactions, memoized presentation layers)
- dependency choices (minimal, zero unused dependencies)
- maintainability (0 TypeScript errors, 0 ESLint warnings, 0 any shortcuts, 226 passing tests)

Deliverable:

A clean portfolio-quality codebase with formalized Architectural Decision Records (ADRs). (Completed)

---

# Phase 14 — Future Backend Evaluation [COMPLETED]

Evaluated backend requirements against privacy-first principles in [.agents/docs/BACKEND_EVALUATION.md](BACKEND_EVALUATION.md):

- **MVP Decision**: Retain 100% client-side architecture (zero document leakage, zero infrastructure cost, instant processing).
- **Post-MVP Step 1**: Local-first browser persistence via IndexedDB for saving templates without accounts.
- **Post-MVP Step 2**: Supabase selected as primary BaaS candidate when authentication, cloud sync, and team collaboration are required.

Deliverable:

Comprehensive architectural evaluation document completed. (Completed)

---

# Phase 15 — Production Preparation

Goals:

- production build
- environment configuration
- security review
- dependency review
- browser compatibility
- accessibility review
- performance review
- README
- architecture documentation
- privacy documentation

Deliverable:

A production-ready application.

---

# Phase 16 — Deployment

Only after production preparation is complete.

Goals:

- choose hosting
- configure deployment
- configure production environment
- deploy
- verify production behavior

---

# Development Rule

Never skip ahead simply because a future feature is interesting.

The project should evolve one stable phase at a time.
