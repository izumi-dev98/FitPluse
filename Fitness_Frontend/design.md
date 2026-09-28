# Design system: fitness web app

Stack: React, Tailwind CSS v4 (tokens in `@theme` in `index.css`), lucide-react, dark theme only.
Reference implementation: `GoalsPage.tsx`. When restyling a page, match it.

## How to use this file

Paste this file plus the page's code into the chat and say:
"Restyle this page to follow design.md. Keep all logic, data fetching and props unchanged. Only change className strings, markup structure for layout, and remove duplicated UI. Return the full file."

## Core principle

Color carries meaning, so every color has exactly one job. If an element is colored and the color doesn't say something the user needs, make it neutral. Most of every page (about 85%) is neutral. Lime is the only loud color.

## Tokens (already in `index.css`)

| Token | Value | Tailwind usage | Job |
|---|---|---|---|
| `ink` | `#080b11` | `bg-ink`, `text-ink` | Page background, inset fields, and text on lime buttons |
| `panel-card` | `#111a2e` | `bg-panel-card` | Card and modal surface |
| `panel-border` | `#1a263d` | `border-panel-border` | All borders and dividers |
| `brand-400` | `#ccff00` | `bg-brand-400`, `text-brand-400` | Primary actions, active state, key numbers |
| `brand-300` | `#d9f99d` | `text-brand-300`, `hover:bg-brand-300` | Hover and text on lime tints |
| `brand-500` | `#a3e635` | `bg-brand-500` | Progress fill inside tables and bars |
| `protein` | `#38bdf8` | `bg-protein` | Protein only |
| `fat` | `#c084fc` | `bg-fat` | Fat only |
| `carbs` | `#fb923c` | `bg-carbs` | Carbs only |
| `water` | `#2dd4bf` | `bg-water` | Water progress bar only, when a page has a dedicated one |

Text colors: `text-white` for values and headings, `text-slate-300` for body and secondary values, `text-slate-400` for descriptions, `text-slate-500` for labels, units and hints, `text-slate-600` for empty placeholders (`—`).

Status colors (use sparingly):

- Over target or warning: `amber-400` (`bg-amber-400`, `text-amber-300`).
- Destructive (delete, error): `red-400` text on hover, `bg-red-500/10` hover background, `#ef4444` for confirm buttons.
- On target or success: lime (never green).

## Hard rules

1. Allowed hues: lime, the four data tokens, amber, red. Nothing else. No sky, violet, yellow, orange, emerald or green classes anywhere in UI chrome.
2. Macro colors appear only as 8px dots (`h-2 w-2 rounded-full`) and thin bars (`h-1.5`). Never as large text, tile backgrounds or borders. Numbers stay white.
3. Macro colors are consistent app-wide: protein is sky, fat is purple, carbs is orange. Never remap them per page.
4. Icons are neutral (`text-slate-400` or `text-slate-500`). They turn lime only on hover, or when they mark the active state.
5. One primary action per section. Do not repeat the same button in a header, a card corner and a footer.
6. No gradient backgrounds, no colored glows (`shadow-*/20`), no `backdrop-blur` except the modal overlay.
7. No tinted card variants (amber card, red card, sky card). Every card is `panel-card`.
8. Never use `slate-900`, `slate-800` or `slate-950` for surfaces or borders. Use the tokens. Never use `text-slate-950` on lime. Use `text-ink`.
9. Avoid uppercase, letter-spaced labels. Use sentence case, `text-xs text-slate-500`.
10. Status is never color-only. Pair color with a text label or an icon.

## Old to new color mapping

Use this when converting existing code.

| Found in old code | Replace with |
|---|---|
| `text-red-400` / `text-blue-400` / `text-yellow-400` on macro values | White value plus a `bg-protein` / `bg-fat` / `bg-carbs` dot |
| Tinted tiles (`bg-amber-500/20 border-amber-500/30`, `bg-red-500/20`, `bg-sky-500/20`, `bg-violet-500/20`) | Neutral tile: `border-panel-border bg-ink/60` |
| `text-orange-300`, `text-sky-300`, `text-violet-300` on table cells | `text-slate-300` or `text-slate-400` |
| `text-brand-300` for ordinary numbers | `text-white` (reserve lime for the single key number) |
| Green badges (`bg-green-600/30 text-green-300`) | `bg-brand-400/15 text-brand-300` |
| Neutral or inactive badges | `bg-white/10 text-slate-400` |
| `bg-gradient-to-*` washes | Solid `bg-panel-card` |
| Icon boxes with colored backgrounds | `bg-white/5 text-slate-300` (`bg-brand-400/10 text-brand-400` for the one hero icon) |
| Rings or charts with 4 different colors | One lime ring, or macro-token bars |

## Component recipes

Copy these class strings. Define them as constants at the top of a file, or extract shared components if they are used on 3+ pages.

```ts
const card = "rounded-2xl border border-panel-border bg-panel-card";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-400 px-4 py-2 text-sm font-bold text-ink transition hover:bg-brand-300 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-panel-border px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white";
const inputCls =
  "w-full rounded-xl border border-panel-border bg-ink p-3 text-white focus:border-brand-500 focus:outline-none";
```

**Card:** `card` with `p-6` (`p-6 md:p-8` for the hero card). Nested tile inside a card: `rounded-xl border border-panel-border bg-ink/60 p-4`.

**Stat tile:** label `text-xs text-slate-500` (with an optional macro dot before it), value `text-2xl font-extrabold text-white`, unit `ml-1 text-sm font-medium text-slate-500`.

**Highlighted tile** (one per group at most, for the key number such as the calorie target): `rounded-xl border border-brand-500/30 bg-brand-400/10 p-4`, with label `text-brand-300` and value `text-brand-400`.

**Badge:** `rounded-full px-2.5 py-0.5 text-xs font-bold`. Active is `bg-brand-400/15 text-brand-300`, inactive is `bg-white/10 text-slate-400`, warning is `bg-amber-400/15 text-amber-300`.

**Tabs and segmented control:** container `flex rounded-xl border border-panel-border bg-ink p-1`. Item is `rounded-lg px-3 py-1.5 text-sm font-semibold`, selected `bg-brand-400 text-ink`, unselected `text-slate-400 hover:text-white`. Add `role="tab"` and `aria-selected`.

**Filter chips:** `rounded-lg border px-2.5 py-1 text-xs font-bold`. Selected `border-brand-500/40 bg-brand-400/10 text-brand-300`, unselected `border-panel-border bg-ink text-slate-400 hover:text-white`.

**Progress bar:** track `h-1.5 rounded-full bg-white/10 overflow-hidden`, fill `h-full rounded-full` with `bg-brand-500` (normal), `bg-amber-400` (over target), or the macro token for macro bars. Cap width at 100%.

**Table:** header row `border-y border-panel-border text-left text-xs text-slate-500`. Body row `border-b border-panel-border/70 hover:bg-white/[0.03]`. Primary cell white and semibold, secondary cells `text-slate-300`, units `text-xs text-slate-500`. Wrap in `overflow-x-auto` with a `min-w-[...]` on the table.

**Quick-action tile (link):** `group flex items-center gap-3 rounded-xl border border-panel-border bg-ink/60 p-3 hover:border-brand-500/50`. Icon box `h-10 w-10 rounded-lg bg-white/5 text-slate-300 group-hover:text-brand-400`.

**Modal:** overlay `fixed inset-0 z-50 bg-black/70 backdrop-blur-sm`, panel `rounded-3xl border border-panel-border bg-panel-card shadow-2xl max-h-[90vh] overflow-y-auto`, `role="dialog" aria-modal="true"`, Escape closes it, click on the overlay closes it. The header is sticky with a bottom border.

**Destructive icon button:** `rounded-xl p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400`, with `aria-label`. Neutral until hover.

**Loading:** `Loader2` from lucide with `animate-spin text-brand-400`. Do not spin unrelated icons.

**Empty state:** one short sentence saying what to do, plus one `btnPrimary`. No decorative colored icons.

## Charts and data-viz

- Single series: lime (`#a3e635`).
- Macro breakdowns: the three macro tokens, with a legend of dots.
- Comparison of 2 series: lime plus `slate-500`.
- More than 3 series: reconsider the chart. If it's unavoidable, use lime plus neutrals of different lightness, and label directly instead of relying on a legend.
- Gridlines: `panel-border`. Axis text: `slate-500`, 11px.
- Target or goal line: dashed `slate-400`. Over-target values: amber.

## Layout and shape

- Page container: `mx-auto max-w-4xl px-4 py-6 space-y-6`.
- Radius scale: page cards `rounded-2xl`, nested tiles and inputs `rounded-xl`, modals `rounded-3xl`, badges `rounded-full`. Don't mix beyond this.
- Font: Plus Jakarta Sans. Headings `font-bold` or `font-extrabold`. Body 14px (`text-sm`). Hints 11 to 12px.
- Sentence case everywhere ("Add log", not "ADD LOG" or "Add Log").
- Motion: transitions on hover and state change only. No entrance animations. Respect `prefers-reduced-motion` (already global).
- Mobile first: grids collapse to 2 columns, tables scroll horizontally, tap targets at least 40px.

## Copy

- Buttons say what they do: "Save changes", "Create goal", "Delete". Same verb in the confirmation toast.
- Errors say what failed and what to try: "Couldn't save goal. Please try again."
- Don't use exclamation marks in system messages.

## Accessibility

- Contrast: `text-ink` on lime (passes). Don't put `text-slate-500` on tinted backgrounds for anything users must read.
- Icon-only buttons need `aria-label`. Toggles need `aria-pressed` or `aria-selected`.
- Focus ring is global (`:focus-visible`, lime). Don't remove it with `outline-none` unless replaced by a visible border change.

## Review checklist (run before returning a page)

1. Search the file for `red-`, `blue-`, `yellow-`, `orange-`, `sky-`, `violet-`, `green-`, `emerald-`, `indigo-`, `pink-`. Only `red-` (destructive) may remain. `amber-` only for over-target or warnings.
2. Search for `gradient`, `shadow-` with a color, `slate-900`, `slate-800`, `slate-950`. None should remain.
3. Every macro color appears only as a dot or bar.
4. Each section has one primary button, and no action is duplicated.
5. Count distinct hues visible on screen at once: lime plus at most the three macro dots and amber.
6. Logic, props, hooks, API calls and data shapes are unchanged.
