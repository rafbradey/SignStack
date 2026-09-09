# SignStack — Backend Evaluation (Phase 14)

## Purpose

This document provides a technical evaluation of future backend architectures for SignStack, specifically assessing whether **Supabase**, a custom backend, or alternative solutions should be introduced to support features beyond the MVP.

Per project rules and roadmap constraints:
> **The current priority is the SignStack MVP. Do not automatically implement backend infrastructure.**

---

## 1. Executive Summary & Recommendation

| Strategy | Recommended Stage | Rationale |
| :--- | :--- | :--- |
| **Pure Client-Side (Current MVP)** | **Current MVP (Immediate)** | Maximum user privacy, zero document liability, zero hosting cost, instant processing. |
| **Local-First / IndexedDB** | **Post-MVP Step 1** | Allows saved projects, recent files, and custom templates without requiring accounts or cloud infrastructure. |
| **Supabase (BaaS)** | **Post-MVP Step 2 (Pro/Team)** | Ideal choice when cross-device sync, authentication, and team collaboration become product requirements. |
| **Custom Node/Express Backend** | **Not Recommended** | High maintenance, infrastructure overhead, and security burden with no functional advantage over Supabase. |

**Final Recommendation for MVP**: **Do NOT add a backend for the MVP.** SignStack's 100% client-side architecture is a core feature, not a limitation.

---

## 2. Why Pure Client-Side is the Correct MVP Architecture

SignStack’s current architecture processes all PDF rendering (via `pdfjs-dist`) and PDF generation (via `pdf-lib`) entirely inside the user’s browser.

### Advantages of Staying 100% Client-Side for MVP:
1. **Absolute Privacy by Design**:
   - Documents never leave the user’s machine.
   - Eliminates GDPR, HIPAA, and data retention compliance hurdles.
   - Users are far more willing to upload sensitive contracts, financial statements, and signature sheets to a tool that explicitly guarantees their files are never uploaded to a server.
2. **Zero Operating / Ingestion Cost**:
   - Bandwidth and compute costs scale at $0.00 regardless of document sizes or user counts.
   - No risk of runaway serverless bills or EC2 CPU spikes during heavy PDF rendering.
3. **No Latency**:
   - Instant file loading directly into memory without network upload/download delays.
4. **Reliability & Simplicity**:
   - No backend downtime, database connection pool exhaustion, or migration failures can take the editor down.

---

## 3. Evaluation of Future Backend Capabilities

If SignStack evolves to include account-based features, the following requirements will arise:

### A. Authentication & User Management
- **Requirements**: Email/password, Magic Link (passwordless), and OAuth (Google, GitHub, Apple).
- **Evaluation**: Supabase Auth provides native support for all modern auth providers with built-in JWT validation and Row Level Security (RLS).

### B. Project & Overlay Persistence (Saved Projects)
- **Requirements**: Saving overlay layouts (e.g. "Vendor Signature Template", "Corporate Stamp Placement") so users can reapply them to future documents without manually recreating coordinates.
- **Data Model Fit**:
  - `projects` table: `id`, `user_id`, `name`, `created_at`, `updated_at`.
  - `overlay_templates` table: `id`, `user_id`, `name`, `normalized_rect`, `opacity`, `scale`, `rotation`.
- **Evaluation**: PostgreSQL in Supabase is ideal for relational data with RLS (`auth.uid() = user_id`).

### C. Cloud Document Storage
- **Requirements**: Persisting source PDFs and generated outputs in the cloud.
- **Trade-off**: Requires encrypted S3-compatible buckets. For privacy-first users, an opt-in toggle ("Do not save documents to cloud") is mandatory.
- **Evaluation**: Supabase Storage provides S3-compatible private buckets with access policies integrated directly with Postgres RLS.

### D. Team Collaboration & Presets
- **Requirements**: Sharing standard signature blocks and document presets across an organization.
- **Evaluation**: Supabase Realtime and Postgres multi-tenant policies allow organizations/teams to share approved overlay templates.

### E. Subscriptions & Billing
- **Requirements**: Stripe checkout, customer portal, and webhook handling for Pro tier features.
- **Evaluation**: Supabase Edge Functions (Deno) or a minimal webhook handler integrates cleanly with Stripe.

---

## 4. Platform Comparison

| Dimension | 100% Client-Side (Current) | Supabase | Firebase | Custom Backend (Node/Postgres) |
| :--- | :--- | :--- | :--- | :--- |
| **Privacy / Compliance** | **Highest (No data leaves browser)** | High (Encrypted, RLS, self-hostable) | Moderate (Google Cloud ecosystem) | Depends on implementation |
| **Hosting & Operating Cost** | **$0 / Free static hosting** | Free tier -> $25/mo Pro | Pay-as-you-go | Server hosting + DB hosting ($30+/mo) |
| **Relational Data Modeling** | N/A (In-memory models) | **Excellent (PostgreSQL)** | Poor (NoSQL Firestore) | Excellent (PostgreSQL + Prisma) |
| **Time to Implement** | **0 days (Already complete)** | 2–4 days | 3–5 days | 2–3 weeks |
| **Maintenance Burden** | **Zero** | Low (Managed BaaS) | Low (Managed BaaS) | High (OS patches, DB backups, scaling) |

---

## 5. Phased Roadmap Decision

### Stage 1: MVP (Current) — Pure Client-Side
- No accounts, no database, no server.
- Static hosting via Vercel, Netlify, Cloudflare Pages, or GitHub Pages.

### Stage 2: Post-MVP Polish — Local-First Persistence
- Add browser `IndexedDB` (e.g. via `idb` or `dexie`) to preserve recent documents and custom overlay presets locally across browser reloads without requiring user registration.

### Stage 3: Commercial / Team Tier — Supabase Integration
- When user accounts, cloud project saving, and team template sharing are introduced, use **Supabase** as the official backend platform.
