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

# Phase 15 — Production Preparation [COMPLETED]

Goals:

- production build (chunk splitting configured via manualChunks, 0 build warnings)
- environment configuration (SEO, OpenGraph, theme-color, and web manifest tags configured in index.html)
- security review (npm audit 0 vulnerabilities, zero document leakage, client-side only)
- dependency review (minimal dependencies: react, react-dom, pdfjs-dist, pdf-lib, lucide-react)
- browser compatibility (High-DPI retina canvas scaling, cross-browser touch/pointer events)
- accessibility review (ARIA landmarks, polite screen reader regions, keyboard shortcuts)
- performance review (RAF-throttled drag loops, canvas backing store disposal, React.memo)
- README & architecture documentation (fully synchronized with ADRs and Backend Evaluation)
- privacy documentation (zero cloud storage, 100% in-browser processing verified)

Deliverable:

A production-ready application. (Completed)

---

# Phase 16 — Deployment [COMPLETED]

Goals:

- choose hosting (selected Vercel for instant static edge hosting, HTTP/2, and zero-config Git integration)
- configure deployment (created `vercel.json` with SPA rewrites, security headers, and immutable asset caching)
- configure production environment (verified Vite production build with code splitting)
- deploy guide (added GitHub and Vercel CLI deployment workflows in README.md)
- verify production behavior (build, test, lint, and preview validated)

Deliverable:

Production deployment configuration and deployment guide completed. (Completed)

---

# Phase 17 — Mobile Support & Touch UX

## Phase Objective

Enable a full, touch-friendly, high-performance SignStack experience across smartphones, tablets, and small laptops without compromising the desktop split-pane workflow, introducing a separate codebase, or compromising client-side privacy.

## Mobile UX Goals

- **Zero Desktop Regression**: Desktop (`>= 1024px`) retains the high-productivity `Editor Workspace | Result Preview` side-by-side split view.
- **Workflow Completeness**: All 11 core steps of the SignStack workflow (Upload, Queue management, Main Document selection, Overlay selection, Viewing, Cropping, Positioning/Resizing, Opacity, Scale, Result preview, and PDF generation/download) must be easily performable on a handheld mobile device.
- **Ergonomics & Thumb Reach**: Touch controls should be reachable, with primary actions anchored within thumb reach on mobile viewports.
- **No Pinch-Zoom Interference**: Canvas touch interactions (crop dragging, overlay positioning) must not accidentally trigger browser viewport zoom or unwanted document scrolling.

## Responsive Layout Strategy

- **Adaptive Split vs. Tabbed View**:
  - `Desktop (>= 1024px)`: Side-by-side split pane (`Editor | Result`).
  - `Tablet & Mobile (< 1024px)`: Tabbed navigation (`Editor Workspace` and `Result Preview` tabs). Tab switcher pinned with high-contrast active state indicators and live badges showing overlay status or generation readiness.
  - `Small Mobile (< 640px)`: Full-width stacked layout with dynamic viewport height (`100dvh`) accounting for mobile browser address bars and home indicator notches (`env(safe-area-inset-bottom)`).
- **Controls Presentation**:
  - Replace dense single-row desktop toolbars with collapsible drawers or bottom-anchored sheets on small screens so the canvas remains visible while tweaking overlay settings.

## Touch Interaction Requirements

- **Minimum Touch Targets**: All interactive elements (buttons, selectors, stepper arrows, delete icons, tabs) must have a minimum touch hitbox of 44x44px per WCAG 2.5.5.
- **Touch-Action Scoping**: Explicit `touch-action: none` applied during active dragging of overlays and crop handles, preventing browser pan/pull-to-refresh conflicts.
- **Precision Crop Handles**: Expand visual 12px crop corner handles with invisible 44px pseudo-element touch targets (`::after`), ensuring effortless mobile selection without visual clutter.
- **Pointer Capture Resilience**: Use standard `PointerEvent` APIs (`setPointerCapture` / `releasePointerCapture`) for seamless tracking even if fingers move past the canvas boundary.

## PDF Viewer Requirements

- **Mobile Viewport Fit**: Automatic initial fit (`calculateFitScale`) tailored for portrait or landscape orientation changes on mobile devices.
- **Floating Zoom & Pan Controls**: Floating zoom pill (Fit Page, Zoom In, Zoom Out) accessible above the bottom tab bar.
- **Smooth Canvas Panning**: Two-finger or single-finger pan inside scrollable canvas container with inertia and smooth scroll snapping.

## Document Queue Behavior

- **Mobile Horizontal Queue**: Queue items sized responsively (e.g. `min-width: 240px` on phones, `280px` on desktop) with snap-scrolling to prevent awkward half-card cutoff.
- **Touch-Friendly Card Actions**:
  - Always-visible reorder buttons (Move Left / Move Right) on touch screens instead of relying on hover-only CSS states.
  - Generous tap target for "Set as Main" and "Remove Document".
- **Mobile File Picker**: Upload zone optimized for mobile document selection (Files app on iOS/Android, photo library prevention via appropriate MIME types).

## Editor & Result Preview Behavior

- **State Synchronization**: Switching tabs between Editor and Result Preview never resets zoom, page index, crop rect, or overlay position.
- **One-Tap Generation & Preview**: Preview tab features prominent "Generate & Download PDF" floating action bar with loading indicators.
- **Mobile PDF Download**: Direct blob download using standard mobile download triggers (`downloadPdfBlob` with object URL fallback for mobile Safari/Chrome).

## Accessibility Considerations

- Minimum touch target sizing (44x44px target size compliance).
- Dynamic focus management when switching between Editor and Preview tabs.
- Screen reader announcements when switching mobile view modes.
- Visual focus outlines remain crisp on mobile keyboard/switch-control inputs.

## Performance Considerations

- **Memory Efficiency**: Mobile browser tab memory limits (e.g. iOS WebKit 1.5GB cap) require immediate disposal of unused canvas backing stores.
- **RAF Throttling**: Keep all touch dragging operations coalesced via `requestAnimationFrame` to maintain a steady 60fps on mobile displays.
- **Prevent Canvas Re-renders**: Maintain `React.memo` boundaries so typing or slider adjustments on mobile controls do not re-render the underlying PDF canvas.

## Tasks Breakdown

- **Task 17.1 — Responsive Workspace Architecture & Mobile Tabbed Viewport**:
  - Dynamic viewport sizing (`100dvh`, safe-area insets).
  - Refined mobile tab bar (`Editor` vs. `Result Preview`) with active indicators.
  - Responsive header collapse and navigation.
- **Task 17.2 — Touch-Optimized Document Queue & Card Controls**:
  - Mobile card layout with responsive widths and touch-scroll snap.
  - Touch-accessible Move Left/Right and Set Main buttons (no hover dependency).
  - Mobile file upload trigger integration.
- **Task 17.3 — Mobile Toolbar & Responsive Controls Sheet**:
  - Reorganize dense desktop overlay controls into a collapsible or bottom-anchored control panel for small screens.
  - Ensure all inputs, sliders, and stepper buttons meet 44x44px touch targets.
- **Task 17.4 — Touch Gestures & Precision Overlay / Crop Interaction**:
  - Expand `CropSelectionBox` corner handle touch hitboxes (`::after` 44x44px hit areas).
  - Scoped `touch-action` and pointer-event handling to eliminate canvas gesture conflicts.
  - Floating mobile zoom/fit controls.
- **Task 17.5 — Cross-Device Verification, Automated Mobile Tests & Polish**:
  - Vitest test suite for mobile viewport transitions and touch interactions.
  - Mobile end-to-end workflow verification across phone and tablet viewports.
  - Visual polish, clean CSS media query organization, and zero desktop regressions.

## Definition of Done

- SignStack is fully functional on smartphone viewports (360px - 480px), tablets (768px - 1024px), and desktop (>= 1024px).
- Complete workflow (upload, queue, main doc, overlay doc, crop, move, opacity, scale, preview, download) can be completed purely via touch.
- Touch target sizes meet or exceed 44x44px for primary actions.
- Zero regressions in desktop split-view functionality.
- All automated tests, TypeScript checks, and linting pass with 0 errors.

---

# Development Rule

Never skip ahead simply because a future feature is interesting.

The project should evolve one stable phase at a time.
