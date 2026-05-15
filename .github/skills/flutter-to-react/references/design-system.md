# Design System & Component Patterns for Business Applications

## Core Principles

A professional business web app must feel **precise, calm, and trustworthy**.
- Flat hierarchy: depth through borders and subtle shadow, not heavy elevation
- Consistent spacing: strict 4px grid (Tailwind scale)
- Restrained colour: brand + semantic only, never decorative gradients
- Typography: single sans-serif family, 5 weights max (300, 400, 500, 600, 700)
- Motion: functional only — confirm actions, guide attention, never entertain

---

## Typography Scale

```css
/* src/theme/typography.css */
.text-display { @apply text-3xl font-semibold tracking-tight text-text; }
.text-heading  { @apply text-xl  font-semibold text-text; }
.text-title    { @apply text-base font-medium  text-text; }
.text-body     { @apply text-sm  font-normal  text-text; }
.text-caption  { @apply text-xs  font-normal  text-muted; }
.text-label    { @apply text-xs  font-medium  text-text uppercase tracking-wide; }
```

**Rules:**
- Page title: `text-display` (one per page)
- Section titles: `text-heading`
- Card / widget titles: `text-title`
- All body content: `text-body`
- Table column headers: `text-label`
- Helper text / timestamps: `text-caption`

---

## Layout Templates

### App Shell (Sidebar + Content)
```tsx
export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex h-screen bg-[--color-bg] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main id="main-content" className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Page Header
```tsx
function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-display">{title}</h1>
        {subtitle && <p className="text-caption mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
```

### Stats Row (Dashboard)
```tsx
function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-label">{label}</span>
      <span className="text-2xl font-semibold text-text tabular-nums">{value}</span>
      {delta && (
        <span className={`text-caption ${delta > 0 ? 'text-success' : 'text-error'}`}>
          {delta > 0 ? '+' : ''}{delta}% vs last period
        </span>
      )}
    </div>
  );
}
// Usage: 4-column grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <StatCard label="Total Revenue" value="₹1,24,500" delta={12.4} />
</div>
```

---

## Table Pattern (TanStack Table v8)

```tsx
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, type ColumnDef,
} from '@tanstack/react-table';

function DataTable<T>({ data, columns }: { data: T[]; columns: ColumnDef<T>[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} className="text-left px-4 py-3 text-label text-muted font-medium whitespace-nowrap">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 text-body">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Modal / Dialog Pattern (Radix)

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" />
        <Dialog.Content
          className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-full ${sizeClass[size]} bg-surface rounded-lg shadow-panel
                      border border-border p-6 focus:outline-none`}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-heading">{title}</Dialog.Title>
              {description && <Dialog.Description className="text-caption mt-1">{description}</Dialog.Description>}
            </div>
            <button onClick={onClose} className="text-muted hover:text-text transition-colors p-1 -mr-1 rounded" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Form Field Pattern

```tsx
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId} className="text-label text-text">
          {label}
          {props.required && <span className="text-error ml-1">*</span>}
        </label>
        <input id={fieldId} ref={ref} className={`input ${error ? 'border-error focus:ring-error/20 focus:border-error' : ''}`} {...props} />
        {error  && <p role="alert" className="text-caption text-error">{error}</p>}
        {!error && hint && <p className="text-caption text-muted">{hint}</p>}
      </div>
    );
  }
);
```

---

## Sidebar Navigation Pattern

```tsx
const navItems = [
  { label: 'Dashboard', href: '/',        icon: LayoutDashboard },
  { label: 'Orders',    href: '/orders',  icon: ShoppingCart },
  { label: 'Products',  href: '/products',icon: Package },
  { label: 'Reports',   href: '/reports', icon: BarChart2 },
  { label: 'Settings',  href: '/settings',icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="h-14 flex items-center px-5 border-b border-border">
        <Logo className="h-6" />
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = location.pathname === href ||
                         (href !== '/' && location.pathname.startsWith(href));
          return (
            <NavLink
              key={href} to={href}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium
                         transition-colors duration-100
                         ${active
                           ? 'bg-primary/10 text-primary'
                           : 'text-muted hover:bg-gray-100 hover:text-text'}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

## Toast Notifications (Sonner)

```tsx
// main.tsx
import { Toaster } from 'sonner';
<Toaster
  position="bottom-right"
  toastOptions={{
    classNames: {
      toast:   'bg-surface border border-border shadow-panel text-text text-sm',
      success: 'border-l-4 border-l-success',
      error:   'border-l-4 border-l-error',
      warning: 'border-l-4 border-l-warning',
    },
  }}
/>

// Usage anywhere in the app
import { toast } from 'sonner';
toast.success('Order saved');
toast.error('Failed to load products', { description: 'Check your connection and try again.' });
toast.loading('Uploading…', { id: 'upload' });
toast.dismiss('upload');
```

---

## Motion (Animation) Rules

```tsx
import { motion, AnimatePresence } from 'motion/react';

// Page enter — subtle, fast
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.1 } },
};

export function AnimatedPage({ children }: PropsWithChildren) {
  return <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">{children}</motion.div>;
}

// List item stagger
const itemVariants = {
  initial: { opacity: 0, y: 6 },
  animate: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.15 } }),
};

// NEVER use spring physics or bounce on data/table rows
// NEVER animate layout shifts (no layoutId on list items)
// OK to use layoutId on modals, drawers, tabs
```

---

## Empty State Component

```tsx
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <PackageOpen size={40} className="text-border mb-4" strokeWidth={1.5} />
      <h3 className="text-title">{title}</h3>
      {description && <p className="text-caption mt-1 max-w-xs">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-4">
          {action.label}
        </button>
      )}
    </div>
  );
}
```

---

## Error Banner Component

```tsx
import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorBanner({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 p-4 rounded border border-red-200 bg-red-50">
      <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-body text-error font-medium">Something went wrong</p>
        <p className="text-caption text-red-600 mt-0.5">{message}</p>
      </div>
      {retry && (
        <button onClick={retry} className="btn-secondary text-xs gap-1.5 shrink-0">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}
```

---

## Checklist — Professional Visual Audit

Before completing migration, verify each screen:
- [ ] No `shadow-xl` or `shadow-2xl` on any card or panel
- [ ] No gradient backgrounds (except brand hero, if any)
- [ ] All colours come from CSS tokens, not raw hex in JSX
- [ ] Font is Inter/Geist — no system emoji or serif fonts in UI
- [ ] Spacing is Tailwind scale only — no `p-[13px]` arbitrary values
- [ ] Icon size is 16px (`size-4`) or 20px (`size-5`) consistently
- [ ] Animations ≤ 200ms, `ease-out`, no bounce
- [ ] Tables have sticky header on scroll for long data
- [ ] All numbers use `tabular-nums` class (prevents layout shift while polling)
- [ ] Dark mode tokens defined (even if not yet enabled) under `@media (prefers-color-scheme: dark)`
