# SignStack — Project Context

## Project Name

SignStack

## Project Type

Privacy-first web application for PDF document manipulation.

---

# Product Vision

SignStack is a simple PDF utility that allows users to combine specific content from multiple PDF documents into a final PDF.

The primary use case is precisely overlaying part of one PDF document onto another PDF document.

Examples include:

- signatures
- dates
- names
- fields
- stamps
- approvals
- corrections
- form sections
- other document elements

The goal is to make this process significantly easier than manually editing or combining PDFs using complicated software.

---

# Core Concept

The primary workflow is:

1. Upload two or more PDFs.
2. View the uploaded documents.
3. Select the relevant pages.
4. Choose a base document.
5. Choose one or more overlay documents.
6. Optionally select/crop a specific area from an overlay page.
7. Position the selected content over the base document.
8. Adjust opacity when necessary.
9. Preview the resulting document.
10. Generate the final PDF.
11. Download the result.

---

# Optional Precision Editor

The crop/selection editor is optional.

Users should be able to perform a simple PDF stack without needing to understand the editor.

For users who need precision, the editor allows them to select only the portion of a PDF page that should be placed onto another document.

The editor should support:

- rectangular selection
- crop/selection
- moving the selected region
- resizing
- deleting/resetting
- zooming
- panning
- overlay positioning
- overlay resizing
- opacity
- alignment
- result preview

---

# Main Editor UX

The main editor concept is:

EDITOR | RESULT

### Editor

The left side contains the editing workspace.

Users can:

- view PDF pages
- select content
- crop content
- position overlays
- resize overlays
- adjust opacity
- navigate pages

### Result

The right side shows the resulting PDF composition.

The user should be able to understand immediately:

> "This is what my final PDF will look like."

---

# MVP

The MVP focuses only on PDF stacking and overlaying.

The MVP should include:

- PDF upload
- multiple PDF documents
- document metadata
- remove documents
- reorder documents
- PDF rendering
- page navigation
- zoom
- base document selection
- overlay document selection
- page selection
- optional crop/selection
- overlay positioning
- overlay resizing
- opacity adjustment
- result preview
- PDF generation
- PDF download
- useful error handling

---

# Privacy Philosophy

SignStack should be privacy-first.

Whenever practical, PDF processing should happen entirely in the user's browser.

The architecture should minimize unnecessary file uploads to servers.

When evaluating technologies, consider:

- privacy
- security
- browser memory
- performance
- large PDF behavior
- scalability
- hosting cost

A backend should not be introduced simply because it is common in web applications.

---

# Long-Term Vision

Future versions may eventually support:

- PDF stacking
- PDF merging
- PDF conversion
- PDF comparison
- PDF editing
- saved projects
- document history
- authentication
- cloud storage
- collaboration
- subscriptions
- other PDF utilities

These are future possibilities.

They should not influence MVP implementation unless a decision must be made with future expansion in mind.

---

# Explicitly Out of Scope for MVP

Do not build:

- authentication
- login
- user accounts
- subscriptions
- payments
- analytics
- collaboration
- cloud document history
- AI/OCR
- full PDF editor
- e-signature functionality
- annotation systems
- chat
- admin dashboard
- mobile application

---

# Target User Experience

The application should feel:

- simple
- fast
- modern
- professional
- intuitive
- reliable
- privacy-conscious

The user should not need to understand PDF internals to use the basic workflow.

Advanced controls should be available when necessary without making the basic workflow complicated.

---

# Development Philosophy

SignStack is also a learning project.

The implementation should demonstrate good software engineering practices.

The project should prioritize:

- readable code
- maintainable architecture
- sensible abstractions
- strong TypeScript usage
- testing
- accessibility
- responsive design
- Git discipline
- clear technical decisions

Avoid over-engineering.

The application should be portfolio-quality without becoming unnecessarily complex.
