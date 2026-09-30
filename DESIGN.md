# Doloyal design system

Rules for building any new page or feature in the staff app (`apps/web/src/app/(dashboard)/app`).
Follow these so new work looks like the rest of the product. The values below are taken from the
code as it is today: tokens in `apps/web/src/app/globals.css`, components in `packages/ui/src/components`.

If a rule here and an existing page disagree, the rule wins — fix the page.

## 1. Principles

1. **Use the shared components.** Everything in section 5 already exists in `@doloyal/ui`. Do not
   rebuild a button, card, badge, table or page title by hand.
2. **Use tokens, never raw colours.** No `slate-500`, `blue-600`, `bg-white` or `#2563EB` in app
   pages. Tokens are what make tenant branding and dark mode work.
3. **Colour means state.** Green, amber and red are reserved for success, warning and danger.
   Neutral information stays neutral.
4. **Quiet surfaces.** White cards with a 1px border. No gradients, no glow, no tinted pill
   backgrounds, no decorative blobs.
5. **Real data only.** Never hardcode a number, trend ("+18%") or label that looks like live data.
   If there is no data, show the empty state.

## 2. Colour tokens

Use as `text-[rgb(var(--color-foreground))]`, `bg-[rgb(var(--color-primary)/0.08)]`, and so on.

| Token | Light value | Use for |
| --- | --- | --- |
| `--color-background` | `#FFFFFF` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels, inputs, menus |
| `--color-muted` | `#F5F4F7` | Hover rows, subtle fills, skeleton base |
| `--color-border` | `#E5E4EC` | Every border and divider |
| `--color-foreground` | `#111111` | Headings and primary text |
| `--color-muted-foreground` | `#666666` | Descriptions, labels, secondary text |
| `--color-subtle` | `#A0A0A8` | Timestamps, placeholders, tertiary text |
| `--color-primary` | `#105EF6` | Primary actions, links, active nav, focus ring |
| `--color-success` | `#10B981` | Positive state, increases |
| `--color-warning` | `#F59E0B` | Needs attention |
| `--color-danger` | `#EF4444` | Errors, destructive actions, decreases |

Tints: a state background is the token at low opacity, e.g. `bg-[rgb(var(--color-danger)/0.08)]`.
Dark mode redefines the same tokens under `.dark`; a page that only uses tokens needs no dark-mode work.

Replacing old classes:

| Do not write | Write |
| --- | --- |
| `text-slate-900/800/700`, `text-gray-900` | `text-[rgb(var(--color-foreground))]` |
| `text-slate-600/500` | `text-[rgb(var(--color-muted-foreground))]` |
| `text-slate-400` | `text-[rgb(var(--color-subtle))]` |
| `border-slate-200`, `border-gray-200` | `border-[rgb(var(--color-border))]` |
| `bg-white` | `bg-[rgb(var(--color-surface))]` |
| `bg-slate-50/100` | `bg-[rgb(var(--color-muted))]` |
| `text-blue-600`, `bg-blue-600` | `…-[rgb(var(--color-primary))]` |

## 3. Typography

Font: Inter (loaded in `app/layout.tsx`), via `font-sans`.

| Element | Classes |
| --- | --- |
| Page title (`h1`) | `text-2xl font-semibold tracking-tight md:text-[1.7rem]` — comes from `PageHeader` |
| Page description | `text-sm` + muted-foreground |
| Card title | `text-base font-semibold tracking-tight` — comes from `CardTitle` |
| Section label / table header / KPI label | `text-[11px]`–`text-xs font-medium uppercase tracking-wide` + muted-foreground |
| Body | `text-sm` |
| KPI number | `text-[1.5rem] font-semibold tabular-nums` — comes from `KpiCard` |
| Meta / timestamp | `text-xs` + subtle |

- One `h1` per page. Never larger than the page title size above.
- Weights: 400, 500, 600 only. No `font-bold` for titles.
- Numbers in tables and stats use `tabular-nums`.
- Text is sentence case ("Attention needed"). Uppercase is only for the small section/table labels
  above. Never show a raw enum like `ATTENTION_NEEDED`.

## 4. Layout and spacing

The app shell (`app/(dashboard)/app/layout.tsx`) already gives every page its padding:
`p-4` on mobile, `p-8` from `lg`. A page must not add its own outer padding, `max-w-7xl`,
`min-h-screen` or background.

```tsx
export default function ExamplePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Example" description="One sentence on what this page is for." actions={…} />
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">…</div>
      {/* content */}
      <Card>…</Card>
    </div>
  );
}
```

| Spacing | Value |
| --- | --- |
| Between page sections | `space-y-6` (24px) |
| Grid gap between cards | `gap-4` (16px) |
| Card padding | `px-5 py-4` header, `px-5 pb-5` content (from `Card*`) |
| Between a label and its field | `space-y-1.5` |
| Between form fields | `space-y-4` |
| Header actions | `gap-2` |

Radius: cards and panels `rounded-[var(--radius)]` (16px); buttons and inputs `0.625rem` (10px);
badges `rounded-md`. Avatars and the unread count are the only fully round elements.

Shadows: none on cards at rest. `shadow-sm` on inputs, `shadow-2xl` only on floating layers
(dropdowns, popovers, dialogs).

Narrow forms (settings, wizards) use `max-w-3xl`. Full-screen tools (AI assistant, workflow canvas,
website and client-page builders) are the only pages allowed to break out of the shell padding.

Every page must work at 375px wide: grids collapse to one column, tables scroll inside their card,
header actions wrap, nothing scrolls the page horizontally.

## 5. Components (`@doloyal/ui`)

| Need | Use | Notes |
| --- | --- | --- |
| Page title area | `PageHeader` | `title`, `description`, `actions`, optional `breadcrumbs` |
| Action | `Button` | Variants: `primary`, `secondary`, `ghost`, `outline`, `danger`, `success`. Sizes: `sm` (32px), `md` (40px), `lg` (48px), `icon`, `icon-sm` |
| Container | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | |
| Headline number | `KpiCard` | Label, value, optional real comparison |
| Status label | `Badge` | See 5.1 |
| Data list | `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableCell` | |
| Text field | `Input`, `Textarea`, `Field` | 40px high |
| Choice | `Select`, `Switch`, `Tabs` | |
| Overlay | `Dialog`, `DropdownMenu` | |
| Loading | `Skeleton` | Same shape as the content it replaces |
| Nothing to show | `EmptyState` | |
| Person | `Avatar` | |

Icons: `lucide-react` only, `h-4 w-4` inside buttons and rows, `h-3.5 w-3.5` in `sm` buttons.

One primary button per page header. Everything else is `secondary` or `ghost`.
Page-header buttons use `size="sm"` when there are three or more.

### 5.1 Status: `Badge`

A neutral bordered chip with a small coloured dot. No tinted fill, no uppercase, no tiny font overrides.

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Attention needed</Badge>
<Badge variant="danger">Failed</Badge>
<Badge variant="outline">Draft</Badge>
```

| Variant | Meaning |
| --- | --- |
| `success` | Working, paid, completed, active |
| `warning` | Needs attention, pending, expiring |
| `danger` | Failed, overdue, cancelled, critical |
| `primary` | Informational highlight (current plan, new) |
| `outline` / default | Neutral (draft, archived, type labels) |

Do not pass `className` to change size, case or colour. All-caps enum strings are turned into
sentence case by the component.

### 5.2 Levels and trends

- A four-step level (churn risk) uses `ChurnRisk` from `components/customers/churn-risk.tsx`:
  a small bar meter plus the word. Reuse the pattern for any other low → critical scale.
- A change over time is plain text, not a pill: a coloured `↑ 12.5%` / `↓ 4.0%` (success / danger)
  followed by muted "vs last period". Show `—` when there is nothing to compare.

### 5.3 Tables

- Table lives inside a `Card`. Header row uses the small uppercase label style.
- First column is the record name in `font-medium`; numbers are right-aligned or `tabular-nums`.
- Row actions go in a `DropdownMenu` on the right, or as `icon-sm` ghost buttons.
- Long lists are paginated or cursor-loaded (20–50 rows); never render an unbounded list.

### 5.4 Forms

- Label above the field (`Field`), helper text below in muted-foreground `text-xs`.
- Save is the primary button, bottom right of the form or card. Destructive actions are
  `variant="danger"` and ask for confirmation in a `Dialog`.
- Errors: inline under the field in danger colour, plus a `sonner` toast for request failures.

## 6. Page states

Every data view handles all four:

1. **Loading:** `Skeleton` blocks in the final layout. No full-page spinner.
2. **Empty:** `EmptyState` with one sentence and the action that creates the first item.
3. **Error:** a short message and a Retry button; keep the rest of the page usable.
4. **Loaded:** keep showing the previous data while a refresh is in flight.

## 7. Data fetching (keeps pages fast)

- Read with `useResource` from `lib/use-resource.ts` and call the API through `lib/api.ts`.
  This gives caching, request de-duplication and instant paint from the last visit.
- A page fetches only its own data. Tenant, user and branches come from the shared providers.
- Independent requests run in parallel. Polling pauses when the tab is hidden.
- Add a sidebar-hover prefetch entry in `lib/prefetch-workspace.ts` for a new top-level page.

## 8. Wording

- Plain, specific labels: "New campaign", "Export report". Title case only for page titles and
  proper names.
- No filler marketing copy inside the app, no emoji in the UI.
- Dates: `Sep 30, 2026`; relative time for recent activity ("2 hours ago").
- Money always goes through `useCurrency()` (`format` / `formatCompact`).

## 9. Checklist before shipping a page

- [ ] Root is `<div className="space-y-6">` with a `PageHeader`; no extra outer padding or background
- [ ] No raw colour classes or hex values; only tokens
- [ ] Only `@doloyal/ui` components and `lucide-react` icons
- [ ] Status uses `Badge`; no custom pills, no uppercase status text
- [ ] Loading, empty and error states exist
- [ ] Works at 375px and at desktop width; no horizontal page scroll
- [ ] No hardcoded numbers or trends pretending to be data
- [ ] `pnpm --filter @doloyal/web typecheck` and `lint` pass
