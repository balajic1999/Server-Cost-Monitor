# CloudPulse — Product Quality UI Polish Bundle

> Goal: ship the remaining "high-impact UI polish" items from the April 2026 audit (`implementation.md`) that are still gaps after the May 2026 redesign (`implementation-ui.md`).
> Stack: existing — Next.js 14, Tailwind, stone+teal tokens, `lib/ui.ts` primitives, light only, no shadcn, no blur.
> Date: 2026-05-29 · Branch: `ui-redesign`.

---

## 0. What we are NOT doing in this pass

Already shipped — leave alone:

- Stone+teal palette, Source Serif 4 headings (`tailwind.config.ts`, `layout.tsx`).
- Mobile sidebar with hamburger toggle (`dashboard/layout.tsx`).
- `EmptyState`, `Sparkline`, `SectionCard`, `Metric` shared components.
- Custom `ConfirmDeleteModal` on `dashboard/projects/page.tsx`.
- Plan-limit banner on Projects list with upgrade CTA.
- Alerts page filters + master-detail.
- Landing-page footer with legal links.

Out of scope for this pass (audit items that aren't visual / are bigger):

- Backend: GCP/Azure worker routing, password reset email, GDPR delete, etc. (covered by `implementation.md` weeks 2–3).
- Standalone `/pricing` and `/billing` pages (audit week 4).
- Onboarding wizard (audit week 6).
- Sentry / analytics / OG images.

---

## 1. Scope — five focused fixes

| # | Fix | Where it shows up | Why it lifts quality |
|---|---|---|---|
| 1 | Replace remaining native `confirm()` calls with custom modals | `dashboard/projects/[id]/page.tsx` lines 76 + 110 (account removal, rule deletion) | Two leftover native dialogs break the visual consistency of the rest of the app, which uses styled modals everywhere else. Users on the project detail page see ugly browser-chrome popups while users on the projects list see a polished modal. |
| 2 | Global subscription state banner | New `SubscriptionBanner` component, mounted in `dashboard/layout.tsx` above `<main>` | `Subscription.status` already supports `PAST_DUE` and `CANCELLED` but the UI does nothing with them. A user whose card declined sees no signal at all — they only find out when alerts stop. A sticky amber/red rail at the top of the dashboard makes this impossible to miss. |
| 3 | Plan badge in sidebar user block | `dashboard/layout.tsx` — small pill near user email | The user has no in-glance reminder of which plan they're on. A `FREE` pill that links to upgrade gives a constant low-friction CTA without being pushy; a `PRO` pill is reassurance. Pulls double duty as the entry to billing from any page. |
| 4 | Unified `PlanLimitBanner` component | New component, replaces ad-hoc text rows on `dashboard/projects/page.tsx`, `dashboard/projects/[id]/page.tsx`, `dashboard/connect/page.tsx` | The same "at-limit" condition is currently rendered three different ways: a full muted rectangle on the projects list, a one-liner inline span on the project detail, and a paragraph on connect. One shared component → consistent placement, consistent wording, single point of edit for the upgrade CTA. |
| 5 | Dashboard footer rail | Thin row inside `dashboard/layout.tsx` main column | The dashboard currently dead-ends — no link to the public Status page, no Privacy/Terms reachable from inside the app. A 32px high muted row with `Status · Privacy · Terms · Docs · v0.1.0` closes the loop and matches what every mature SaaS dashboard has. |

That's the entire deliverable. Five small components / mounts, no schema changes, no API changes.

---

## 2. Component additions to `apps/web/components/`

| File | Purpose | Notes |
|---|---|---|
| `ConfirmDialog.tsx` | Generic confirmation modal — title, description, danger-or-primary action button. The existing `ConfirmDeleteModal` in `projects/page.tsx` is project-specific; this is the reusable extraction. | Same look as existing modal (`border border-border bg-surface shadow-xl`, sm:items-center sm:rounded-lg). Accepts `tone: "danger" \| "default"`. |
| `SubscriptionBanner.tsx` | Reads subscription via `getSubscription()`, shows nothing on `ACTIVE`. Amber rail on `PAST_DUE`, red rail on `CANCELLED`. Lazy-fetched at mount, cached per pageload. | Single row, no border-bottom radius, dismissible per session via sessionStorage. |
| `PlanBadge.tsx` | Renders the user's plan ("Free" / "Pro" / "Team") as a pill; if Free, links to `/dashboard/settings?tab=billing`. | Stone background, accent text on Pro. Inline-flex so it sits next to email. |
| `PlanLimitBanner.tsx` | Renders only when `used >= limit`. Tight row above the gated action, with copy: "You've reached your plan limit (X/Y …). [Upgrade]". | Same visual treatment everywhere: muted background, border, accent CTA link. Hides itself entirely on Pro+. |
| `DashboardFooter.tsx` | Six text-only links in a thin row at the bottom of the main column. | `border-t border-border`, `text-xs text-muted-foreground`, only visible when scrolled to bottom of natural content (no `position: fixed`). |

No new dependencies. No new tailwind tokens.

---

## 3. Wiring changes (no new pages)

| File | Change |
|---|---|
| `apps/web/app/dashboard/layout.tsx` | (a) Mount `<SubscriptionBanner />` above `<main>`. (b) Replace inline user block at the bottom of the sidebar with one that includes `<PlanBadge />` next to email. (c) Mount `<DashboardFooter />` inside the main column wrapper, after `{children}`. |
| `apps/web/app/dashboard/projects/[id]/page.tsx` | Replace `if (!confirm(...))` patterns with `useState`-driven `<ConfirmDialog />` (one for account removal, one for rule deletion). Replace ad-hoc "X/Y used · Upgrade" inline text with `<PlanLimitBanner kind="cloudAccounts" />` and `<PlanLimitBanner kind="alertRules" />`. |
| `apps/web/app/dashboard/projects/page.tsx` | Replace existing custom upgrade banner (lines 160-168) with `<PlanLimitBanner kind="projects" />` so the visual is unified. Leave the local `ConfirmDeleteModal` (it has project-specific listing of accounts/rules to delete, so it stays specialised). |
| `apps/web/app/dashboard/connect/page.tsx` | Replace the inline "X/Y cloud account(s) used … Upgrade" paragraph (lines 198-218) with `<PlanLimitBanner kind="cloudAccounts" projectId={projectId} />`. |

No other files touched.

---

## 4. Behaviour details

### 4.1 SubscriptionBanner

- Calls `getSubscription()` once on mount; caches result in module-scoped `let` so it doesn't refetch as user navigates between dashboard pages.
- If `status === "ACTIVE"` → render `null` (no banner, no layout shift).
- If `status === "PAST_DUE"` → amber background (`bg-warning/10`), amber-700 text, message: "Your last payment failed. Update your card to avoid losing Pro features." with "Open billing portal" button.
- If `status === "CANCELLED"` → red background (`bg-danger/10`), red-700 text, message: "Your Pro subscription is cancelled. You'll keep access until {currentPeriodEnd}." with "Reactivate" button.
- One "Dismiss" close button — stores in `sessionStorage` keyed by status so it doesn't reappear in the same tab session but reappears on next visit.
- Does **not** render on `/dashboard/settings?tab=billing` itself (you're already there).

### 4.2 PlanBadge

- Reads from `getMyLimits()` (already used by other pages, has `plan` field).
- `FREE` → small stone pill, text "Free", linked to `/dashboard/settings?tab=billing` (no underline; pill hover lifts).
- `PRO` → accent-soft pill, text "Pro", not linked.
- Renders inside the existing sidebar bottom block, on the same line as the user's name (right-aligned).

### 4.3 PlanLimitBanner

- Props: `kind: "projects" | "cloudAccounts" | "alertRules"`, optional `projectId` (needed for cloud-account / alert-rule kinds to count usage from the right scope), optional `currentCount`.
- Internally fetches `getMyLimits()` (cached, see SubscriptionBanner approach).
- Decides the limit (`limits.projects` / `limits.cloudAccountsPerProject` / `limits.alertRulesPerProject`).
- Renders only if `currentCount >= limit` AND `plan === "FREE"` (Pro users shouldn't see the banner at all — even at limit, the right CTA is contact-sales, not "Upgrade").
- Copy:
  - Projects: `"You're using all {limit} project slots on the Free plan."`
  - Cloud accounts: `"You've connected {limit} cloud account{s} to this project — the Free plan max."`
  - Alert rules: `"You have {limit} alert rule{s} on this project — the Free plan max."`
- CTA: `"Upgrade to Pro"` link to `/dashboard/settings?tab=billing`.

### 4.4 ConfirmDialog

- API mirrors what `ConfirmDeleteModal` in `projects/page.tsx` already does: `{ open, onCancel, onConfirm, title, description, confirmLabel?, tone?, busy? }`.
- Backdrop close, ESC close (Esc currently not handled — add it once here and keep the existing `ConfirmDeleteModal` as-is so we don't risk regressing the projects list deletion flow).
- Sticky scrim, sm:items-center sm:rounded-lg, max-w-md — match the existing modal's geometry exactly so the visual feels identical.

### 4.5 DashboardFooter

- `<div class="border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8 flex flex-wrap gap-4">`
- Links: Status (`/status`), Privacy (`/privacy` — wire even though page TBD; soft 404 is acceptable until it lands per audit), Terms (`/terms`), Docs (`/api/docs` server Swagger), GitHub (external).
- A "v0.1.0" text on the right (hardcoded — version bumping is not on the table this pass).

---

## 5. Anti-goals (things we deliberately reject)

- **No icons in the SubscriptionBanner.** A coloured background + bold text is enough; a circle-with-exclamation triangle reads as toast / alert. The banner is structural, not transient.
- **No motion on the banner.** No slide-in. Already-bg-coloured rail with text. Saving the existing 200ms slide-up animation for component-level use only.
- **No "Are you sure? Type the project name to confirm" pattern.** The audit's `implementation.md` already calls for cascade-summary in delete modals; the projects-list modal does this. The new ConfirmDialog should NOT add typed-confirmation — it's overkill for "remove account" / "delete rule".
- **No notifications toggle persistence (audit 1.6 #1) in this pass.** That requires a backend route and falls under the "Settings + billing rebuild" scope option, not the polish bundle.
- **No PlanBadge in the topbar.** It lives in the sidebar block only. Adding it to the mobile topbar would clutter a 56px-high bar.

---

## 6. Open decisions

1. **Where exactly should `SubscriptionBanner` sit?** Two options: (a) inside the layout above `<main>` so it's part of every dashboard page (recommended), or (b) only on `/dashboard`. Recommendation: (a). Decision needed before implementation.
2. **Should `PlanLimitBanner` also handle "approaching limit" (e.g. 8/10 projects)?** Adds value but doubles the design surface. Recommendation: no — only show at limit. Soft-warn states get noisy.
3. **DashboardFooter — show on every dashboard page or only at scroll-end?** Recommendation: every page, low visual weight. Always visible is better than smart hiding.
4. **Should we add a `/privacy` and `/terms` skeleton page** to avoid 404s when the footer links to them? Recommendation: yes, two-paragraph placeholder pages, marked "Draft — updated YYYY-MM-DD." Better than dead links.

---

## 7. Phasing

Single PR. All five fixes go together — they share the `getSubscription()` / `getMyLimits()` cache and share the visual idiom (muted rail, accent CTA link). Splitting would introduce visual inconsistency for any time between PRs.

Suggested commit order inside the PR:

1. Add `ConfirmDialog`, `PlanBadge`, `PlanLimitBanner`, `SubscriptionBanner`, `DashboardFooter` components (no wiring).
2. Wire `SubscriptionBanner` + `PlanBadge` + `DashboardFooter` into `dashboard/layout.tsx`.
3. Replace `confirm()` calls + ad-hoc plan-limit text on `dashboard/projects/[id]/page.tsx`.
4. Unify plan-limit display on `dashboard/projects/page.tsx` + `dashboard/connect/page.tsx`.
5. Add stub `/privacy` and `/terms` pages.
