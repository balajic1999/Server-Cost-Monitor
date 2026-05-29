# CloudPulse — Polish Bundle Mockups

> Visual delta for `implementation-quality.md` (2026-05-29).
> All sketches assume the existing stone+teal tokens. Backgrounds are stone-50, surfaces are white, accent is teal-700.

---

## 1. SubscriptionBanner — global, above main content

### 1.1 ACTIVE → no banner (no layout shift)

Identical to today. No row injected. This is important — we don't want to add 40px of empty space to every dashboard page for the 90% of users whose card works.

### 1.2 PAST_DUE (most common failure mode)

```
┌─ dashboard layout ────────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────────────────────────┐  │
│ │ Sidebar  │ │  ▌ Your last payment failed. Update your card   │  │
│ │          │ │  ▌ to avoid losing Pro features. [Open billing] │  │
│ │          │ │                                              ✕  │  │
│ │          │ ├─────────────────────────────────────────────────┤  │
│ │          │ │                                                 │  │
│ │          │ │   Dashboard                                     │  │
│ │          │ │   2 projects · 3 connections                    │  │
│ │          │ │                                                 │  │
│ │          │ │   ┌─────────────────────────────────────────┐   │  │
│ │          │ │   │ Spend this month                        │   │  │
│ │          │ │   │ $1,284.50                               │   │  │
│ │          │ │   │ ───────                                 │   │  │
│ │          │ │   └─────────────────────────────────────────┘   │  │
│ │          │ │                                                 │  │
│ └──────────┘ └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

- Background `bg-warning/10`, left rail (`▌`) at `bg-warning` (4px wide).
- Single-line message on desktop, wraps on mobile.
- Inline button "Open billing portal" → opens Stripe portal in same window.
- `✕` dismiss → stores `pastDueDismissed` in `sessionStorage`. Reappears on next page reload.
- 12px vertical padding. No bottom border (it sits right above the existing layout border).
- Not rendered on `/dashboard/settings?tab=billing`.

### 1.3 CANCELLED (post-cancel grace period)

```
┌─ dashboard layout ────────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────────────────────────┐  │
│ │ Sidebar  │ │  ▌ Your Pro subscription is cancelled. You'll   │  │
│ │          │ │  ▌ keep access until Jun 14, 2026.  [Reactivate]│  │
│ │          │ │                                              ✕  │  │
│ │          │ └─────────────────────────────────────────────────┘  │
│ └──────────┘                                                       │
└───────────────────────────────────────────────────────────────────┘
```

- Same shape, swapped to `bg-danger/10` rail.
- Date formatted from `currentPeriodEnd`.

---

## 2. PlanBadge — sidebar bottom block

### Before

```
┌─ sidebar bottom ───────────────┐
│ ───────────────────────────────│
│ Siva Nookala                   │
│ siva.nookala@gmail.com         │
│                                │
│ Sign out                       │
└────────────────────────────────┘
```

### After (Free plan)

```
┌─ sidebar bottom ───────────────┐
│ ───────────────────────────────│
│ Siva Nookala       ┌─────────┐ │
│ siva.nookala@gma…  │  Free → │ │   ← clickable pill, routes to
│                    └─────────┘ │     /dashboard/settings?tab=billing
│ Sign out                       │
└────────────────────────────────┘
```

### After (Pro plan)

```
┌─ sidebar bottom ───────────────┐
│ ───────────────────────────────│
│ Siva Nookala       ┌────────┐  │
│ siva.nookala@gma…  │  Pro   │  │   ← muted accent fill, not linked
│                    └────────┘  │
│ Sign out                       │
└────────────────────────────────┘
```

- Free pill: `bg-muted text-muted-foreground border border-border`, small arrow on hover only (hover lifts the text to `text-accent`).
- Pro pill: `bg-accent-soft text-accent` (uses the existing `accent-soft` token), no border.
- Pill is `text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded`.
- Email truncates to make room.

---

## 3. PlanLimitBanner — used in three places, one component

### 3.1 On Projects list page (current)

```
┌──────────────────────────────────────────────────────────────────┐
│ You've reached the Free plan limit.                              │
│ Upgrade to Pro to add up to 10 projects.                         │
└──────────────────────────────────────────────────────────────────┘
```

(today's text is fine — the issue is it's bespoke. After this PR it's emitted by `<PlanLimitBanner kind="projects" />`.)

### 3.2 On Project detail page — accounts section (current → after)

**Before:**

```
┌─ Cloud accounts ─────────────────────────────────────────────────┐
│ Cloud accounts                                  1 / 1 used · Upgrade │
│ ┌──── account row 1 ──── [Sync] [Remove] ─────┐                   │
│ └───────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

**After:**

```
┌────────────────────────────────────────────────────────────────┐
│ You've connected 1 cloud account to this project — the Free   │
│ plan max.                                  [Upgrade to Pro →] │
└────────────────────────────────────────────────────────────────┘

┌─ Cloud accounts ─────────────────────────────────────────────────┐
│ Cloud accounts                                                    │
│ ┌──── account row 1 ──── [Sync] [Remove] ─────┐                   │
│ └───────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

The banner sits **above** the card — same height/treatment as the projects-page banner — so the friction message is visually consistent across pages. The right-aligned "1/1 used" microcopy inside the card stays for at-a-glance reference.

### 3.3 On Connect page (current → after)

**Before:**

```
1 / 1 cloud account used in this project. Limit reached.
Upgrade or remove an account in the project first.
```

**After:**

```
┌────────────────────────────────────────────────────────────────┐
│ You've connected 1 cloud account to this project — the Free   │
│ plan max.                                  [Upgrade to Pro →] │
└────────────────────────────────────────────────────────────────┘
```

Same component. The "remove an account first" guidance is dropped — that's now redundant with the card on the project detail page.

### Visual spec

- `border border-border rounded-md bg-muted px-4 py-3`
- `text-sm text-muted-foreground` for message
- CTA is a right-side `text-accent` link (`text-sm font-medium`) with `→` chevron.
- On Pro/Team plans → component returns `null`, no rendered banner.

---

## 4. ConfirmDialog — replaces remaining `confirm()` calls

### 4.1 Account removal (currently a native popup)

**Before** — the OS-themed `window.confirm("Remove this account?")` popup. Ugly and inconsistent with the rest of the app.

**After:**

```
┌─ modal ───────────────────────────────────────────────┐
│ Remove cloud account?                                 │
│                                                       │
│ This will remove "Production AWS" from this project.  │
│ Stored cost records for this account will be deleted. │
│                                                       │
│                          [ Cancel ]   [ Remove ]      │
└───────────────────────────────────────────────────────┘
```

- Same modal frame as the existing `ConfirmDeleteModal` (max-w-md, sm:rounded-lg, sm:items-center).
- Tone `"danger"` → confirm button is `btnDanger`.
- ESC closes, backdrop click closes, focus is trapped on the modal.

### 4.2 Rule deletion

```
┌─ modal ───────────────────────────────────────────────┐
│ Delete budget rule?                                   │
│                                                       │
│ Removing this rule will stop notifications for the    │
│ $5,000 monthly cap on this project.                   │
│                                                       │
│                       [ Cancel ]    [ Delete rule ]   │
└───────────────────────────────────────────────────────┘
```

Same dialog component, different props. Note the existing `ConfirmDeleteModal` in `projects/page.tsx` keeps its specialised body (lists how many accounts / rules / records will be deleted) — that's project-specific enough to warrant its own component.

---

## 5. DashboardFooter — bottom of every dashboard page

```
┌── main content ────────────────────────────────────────────────────┐
│                                                                    │
│   …last card on the page…                                          │
│                                                                    │
│ ──────────────────────────────────────────────────────────────────  │
│   Status   Privacy   Terms   Docs   GitHub          CloudPulse v0.1.0 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- `border-t border-border`, `px-4 py-4 sm:px-6 lg:px-8`, `text-xs text-muted-foreground`.
- Links are plain text with `hover:text-foreground` (no underline, no accent — this is structural / utility chrome, not navigation).
- Version string is right-aligned, hidden on `< sm` breakpoint (it'd squish).
- Sits **inside** the main column (so it aligns with content, not the sidebar) and AFTER `{children}` so the footer always trails the page.

---

## 6. Full dashboard layout — composite after-shot

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ┌────────────┐ ┌───────────────────────────────────────────────────────┐ │
│ │            │ │ ▌ Your last payment failed. [Open billing]         ✕  │ │ ← SubscriptionBanner (PAST_DUE)
│ │ CloudPulse │ ├───────────────────────────────────────────────────────┤ │
│ │            │ │                                                       │ │
│ │ Dashboard  │ │   Dashboard                                           │ │
│ │ Projects   │ │   2 projects · 3 connections    [Sync now] [Projects] │ │
│ │ Alerts     │ │                                                       │ │
│ │ Settings   │ │   Spend this month                                    │ │
│ │            │ │   $1,284.50                                           │ │
│ │            │ │   ╱╲╱╲                                                │ │
│ │            │ │                                                       │ │
│ │            │ │   By service        Recent alerts                     │ │
│ │            │ │   EC2     $480      Budget breached on Production     │ │
│ │            │ │   RDS     $312      Production · email · 2h ago       │ │
│ │            │ │   S3       $98                                        │ │
│ │            │ │                                                       │ │
│ │            │ │ ──────────────────────────────────────────────────────│ │
│ │            │ │   Status · Privacy · Terms · Docs · GitHub     v0.1.0 │ │ ← DashboardFooter
│ │ ────────── │ └───────────────────────────────────────────────────────┘ │
│ │ Siva N.    │                                                           │
│ │ siva.n@g.. │                                                           │
│ │ ┌────────┐ │                                                           │
│ │ │ Free → │ │  ← PlanBadge (FREE)                                       │
│ │ └────────┘ │                                                           │
│ │ Sign out   │                                                           │
│ └────────────┘                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

That's the full chrome change in one shot. Sidebar gains a `Free →` pill; layout gains a top banner (only when needed) and a bottom utility row.

---

## 7. Mobile (≤640px) considerations

- SubscriptionBanner: text wraps to two/three lines, button drops below text on `sm:` and below.
- PlanBadge: stays in sidebar (which is the slide-in drawer on mobile). Doesn't appear in the mobile topbar — that stays minimal.
- PlanLimitBanner: same shape, but CTA stacks below message at `sm:`.
- DashboardFooter: hides the version string `< sm`, wraps links to two rows.
- ConfirmDialog: slides up from the bottom (`items-end` at `< sm`, `items-center` at `sm:` and up) — same as the existing project-delete modal.

No new breakpoint logic. Tailwind `sm:` (640px) is the only boundary.
