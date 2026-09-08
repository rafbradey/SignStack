# SignStack MVP

## Objective

Build a working privacy-first PDF stacking and overlaying application.

The MVP should allow a user to combine content from multiple PDFs and produce a downloadable final PDF.

---

# Primary User Flow

## Step 1 — Upload

User uploads two or more PDF files.

The application should:

- validate the files
- display uploaded documents
- show basic metadata
- allow removing documents
- allow reordering documents

---

# Step 2 — View Documents

Users can inspect uploaded PDFs.

The application should support:

- PDF rendering
- page navigation
- page selection
- zoom
- basic document information

---

# Step 3 — Select Base Document

The user chooses which PDF acts as the base document.

The base document is the PDF onto which other content will be placed.

---

# Step 4 — Select Overlay Document

The user chooses another PDF as the overlay source.

The user should be able to select:

- overlay document
- overlay page

Multiple overlay documents may eventually be supported.

---

# Step 5 — Optional Crop

The user may optionally select a rectangular region from the overlay page.

The selected region becomes the content that will be placed onto the base document.

This step must remain optional.

A user should be able to overlay an entire page without cropping.

---

# Step 6 — Position Overlay

The user positions the overlay on the base document.

The editor should support:

- moving
- resizing
- zooming
- panning
- opacity
- reset
- delete

Where useful, alignment controls may be provided.

---

# Step 7 — Result Preview

The application should display the resulting composition.

Primary UI concept:

EDITOR | RESULT

The user should be able to visually verify the final document before generating it.

---

# Step 8 — Generate PDF

The application converts the editor state into an actual PDF.

The generated PDF should preserve:

- correct positioning
- correct dimensions
- correct page orientation
- correct scaling
- selected crop regions
- opacity where supported

---

# Step 9 — Download

The user can download the resulting PDF.

---

# Required MVP Features

### Documents

- [ ] Upload PDF
- [ ] Upload multiple PDFs
- [ ] Validate files
- [ ] Display metadata
- [ ] Remove document
- [ ] Reorder documents

### PDF Viewer

- [ ] Render PDF
- [ ] Navigate pages
- [ ] Zoom
- [ ] Handle rendering errors

### Overlay

- [ ] Select base document
- [ ] Select overlay document
- [ ] Select overlay page
- [ ] Position overlay
- [ ] Resize overlay
- [ ] Adjust opacity
- [ ] Reset overlay
- [ ] Delete overlay

### Optional Editor

- [ ] Rectangular crop/selection
- [ ] Move selection
- [ ] Resize selection
- [ ] Zoom
- [ ] Pan
- [ ] Reset selection

### Result

- [ ] Preview result
- [ ] Generate PDF
- [ ] Download PDF

### Error Handling

- [ ] Invalid PDF
- [ ] Corrupted PDF
- [ ] Empty upload
- [ ] Only one document
- [ ] Unsupported file
- [ ] Large PDF
- [ ] Rendering failure
- [ ] PDF generation failure

---

# MVP UX Requirements

The basic workflow should remain understandable without using the advanced editor.

The optional editor should enhance precision rather than become a mandatory complicated step.

Users should always understand:

1. What document they are working with.
2. Which document is the base.
3. Which content is being overlaid.
4. Where the overlay will appear.
5. What the final result will look like.

---

# MVP Technical Constraints

Prefer client-side PDF processing when practical.

Avoid introducing a backend unless a requirement cannot reasonably be handled in the browser.

Do not add authentication or persistent storage for the MVP.

---

# MVP Non-Goals

The following should not be implemented as part of MVP:

- user accounts
- authentication
- Supabase
- cloud storage
- saved projects
- payment system
- subscriptions
- analytics
- collaboration
- AI features
- OCR
- e-signatures
- annotations
- full PDF editing
- mobile application
- admin dashboard

---

# Definition of Done

The MVP is complete when a user can:

1. Upload at least two PDFs.
2. Select a base document.
3. Select an overlay document/page.
4. Optionally crop the overlay.
5. Position the overlay.
6. Preview the result.
7. Generate a final PDF.
8. Download the final PDF.

The workflow must work reliably for normal PDF files and provide understandable errors for unsupported/problematic cases.
