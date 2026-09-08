# SignStack Architecture

## Purpose

This document records the technical architecture and important engineering decisions behind SignStack.

Architecture should evolve as the project develops.

Do not introduce complexity merely to satisfy this document.

---

# Current Architecture

The application is intended to be a client-side-first React application.

The initial architecture should prioritize:

- privacy
- simplicity
- maintainability
- performance
- good developer experience
- portfolio-quality engineering

---

# Frontend

The frontend should use React.

TypeScript is preferred.

The frontend is responsible for:

- UI
- document management
- PDF rendering
- editor interaction
- overlay configuration
- result preview
- PDF generation
- file download

---

# PDF Responsibilities

PDF functionality can be divided into two major responsibilities.

## PDF Rendering

Responsible for displaying PDFs inside the browser.

Potential technologies include:

- PDF.js
- react-pdf
- another appropriate PDF rendering library

The final library should be selected based on:

- browser support
- React integration
- rendering quality
- performance
- bundle size
- maintenance
- API flexibility
- suitability for the editor

---

## PDF Manipulation

Responsible for:

- creating PDFs
- copying pages
- embedding content
- overlaying content
- positioning content
- generating the final document

Potential technology:

- pdf-lib
- another appropriate PDF manipulation library

The final choice should be evaluated rather than assumed.

---

# Client-Side Processing

The preferred architecture is:

User
↓
Browser
↓
PDF Processing
↓
Generated PDF
↓
Download

PDF files should remain in the browser whenever practical.

A server should not receive document files unless a future requirement makes this necessary.

---

# Coordinate System

Coordinate conversion is one of the most important technical concerns.

The browser may operate using coordinates such as:

```text
mouse X/Y
screen pixels
CSS pixels
rendered canvas coordinates
```

The PDF operates using its own coordinate system:

```text
PDF page coordinates
PDF points
page width
page height
```

These coordinate systems must not be assumed to be identical.

The application should establish a clear transformation between:

Browser coordinates
↓
Rendered PDF coordinates
↓
Normalized coordinates
↓
Actual PDF coordinates

The exact implementation should be documented when developed.

---

# Overlay Model

An overlay represents the placement of content from a source document page onto a specific page of the Main Document.

Overlays are strictly **owned by a specific Main Document page**:

```text
Main Document
├── Page 1
│   └── Overlay A (e.g. Signature from Doc 2, Page 1)
├── Page 2
│   └── Overlay B (e.g. Date stamp from Doc 3, Page 1)
└── Page 3
    ├── Overlay C (e.g. Stamp from Doc 2, Page 2)
    └── Overlay D (e.g. Signature from Doc 4, Page 1)
```

### Domain Model (`PageOverlay`)

An overlay contains:

- **Identity**:
  - `id`: Unique stable identifier (UUID)
- **Main Page Ownership (Target)**:
  - `mainDocumentId`: ID of the destination document
  - `mainPageNumber`: 1-based page index of the destination document
- **Source Selection**:
  - `overlayDocumentId`: ID of the source PDF document
  - `overlayPageNumber`: 1-based page index of the source PDF document
- **Positioning & Transform**:
  - `position`: Normalized coordinates `{ x, y }` in `[0, 1]` relative to base page top-left origin
  - `scale`: Scale multiplier relative to base page dimensions (default: 1.0)
  - `opacity`: Transparency level in `[0, 1]` (default: 0.75)
  - `rotation`: Rotation in degrees (0, 90, 180, 270)
- **Optional Crop Region** (Phase 7):
  - `cropRect`: Optional sub-region of the overlay page to extract

### Multi-Overlay Support

Multiple overlays can be attached to the same Main Document page. When the user navigates to a page, all overlays associated with `(mainDocumentId, mainPageNumber)` are rendered. Navigating away unmounts them from the canvas, but preserves their state in the document model.

### Relationship to Eventual PDF Generation (Phase 9)

In Phase 9, PDF generation converts each `PageOverlay` into an embedded PDF form XObject / page copy using `pdf-lib`:
- For each base page, iterate over its associated overlays.
- Copy each overlay page from its source document.
- Convert normalized `(x, y)` and `scale` to standard 72 DPI PDF point coordinates `(pdfX, pdfY, width, height)` using `calculateOverlayPdfBounds`.
- Draw the overlay onto the base page with the specified `opacity`.

---

# Editor State

Potential editor state includes:

- uploaded documents
- selected document
- selected page
- base document
- overlay documents
- crop region
- overlay position
- overlay dimensions
- overlay opacity
- zoom
- pan
- processing state
- result state
- errors

State ownership should be determined based on where the state is actually needed.

Do not automatically place all state in global state.

---

# State Management

Start with React state.

Use:

- local component state when appropriate
- lifted state when shared between nearby components
- custom hooks for reusable stateful behavior
- Context only when multiple distant components genuinely need shared state

A third-party state-management library should only be introduced if the application complexity demonstrates that it is necessary.

---

# Component Architecture

Prefer focused components.

Potential areas include:

```text
UI
├── Upload
├── DocumentList
├── DocumentCard
├── PDFViewer
├── PageSelector
├── Editor
├── CropSelector
├── OverlayControls
├── ResultPreview
└── DownloadControls
```

These are conceptual boundaries, not requirements.

Components should be created when they have a clear responsibility.

Avoid creating components simply because a file is becoming slightly long.

---

# Business Logic

PDF operations and coordinate calculations should not be tightly coupled to UI components.

Prefer reusable utilities/services/hooks for:

- PDF processing
- coordinate conversion
- crop calculations
- overlay calculations
- PDF generation
- validation

This makes the difficult logic easier to test.

---

# Error Architecture

Errors should be separated conceptually into:

## User Errors

Examples:

- unsupported file
- missing document
- missing page
- invalid selection

These should have understandable UI messages.

## Processing Errors

Examples:

- PDF rendering failure
- PDF parsing failure
- PDF generation failure

These should be handled gracefully and provide useful feedback.

## Unexpected Errors

Unexpected errors should not expose sensitive technical information to users.

Development environments may provide additional debugging information.

---

# Performance Strategy

Do not prematurely optimize.

First make the application correct.

Then measure and identify bottlenecks.

Potential performance strategies include:

- lazy page rendering
- avoiding rendering unnecessary pages
- reducing unnecessary React renders
- memoizing expensive calculations when justified
- virtualization for large page lists
- avoiding repeated PDF parsing
- managing browser memory carefully

Optimization should be based on actual behavior rather than assumptions.

---

# Privacy and Security

SignStack should minimize data exposure.

Principles:

- process PDFs locally when practical
- avoid unnecessary uploads
- avoid persistent document storage in MVP
- avoid collecting unnecessary user information
- validate files
- handle potentially malicious PDFs carefully
- keep dependencies maintained

Future server-side processing must include an explicit security review.

---

# Supabase

Supabase is not required for the MVP.

It may be evaluated later for:

- authentication
- user profiles
- saved projects
- document history
- cloud storage
- preferences
- collaboration
- subscription-related data

Do not add Supabase solely because it is available.

---

# Architecture Decision Records

Important architectural decisions should eventually be documented using this format:

## Decision

What was decided?

## Context

Why was the decision necessary?

## Options Considered

What alternatives were evaluated?

## Decision Reasoning

Why was this option selected?

## Tradeoffs

What are the advantages and disadvantages?

## Consequences

What does this decision mean for the rest of the system?

---

# Current Architectural Questions

These should be answered during development rather than assumed in advance:

- Which PDF rendering library should be used?
- Which PDF manipulation library should be used?
- React + Vite or another frontend setup?
- How should coordinate conversion work?
- How should crop regions be represented?
- How should overlays be represented?
- How much editor state should be shared?
- Is a third-party state-management library necessary?
- How should large PDFs be handled?
- How should PDF rendering be optimized?
- What browser limitations need to be handled?

---

# Architecture Principle

The best architecture for SignStack is not the architecture with the most abstractions.

It is the simplest architecture that:

1. correctly solves the problem,
2. remains maintainable,
3. performs well,
4. protects user documents,
5. can evolve when future requirements actually appear.
