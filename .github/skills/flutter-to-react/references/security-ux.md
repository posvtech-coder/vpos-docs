# Security & UX Patterns Reference

## OWASP Top 10 — React Checklist

| Risk | Prevention in React |
|------|---------------------|
| A01 Broken Access Control | `<PrivateRoute>` guard on every protected route; re-validate on server |
| A02 Cryptographic Failures | Never store tokens in `localStorage`; use `httpOnly` cookies or memory only |
| A03 Injection | Zod validation at all API boundaries; no `eval()` or `new Function()` |
| A04 Insecure Design | Zod schemas as single source of truth for data shapes |
| A05 Security Misconfiguration | CSP headers in vite.config; `npm audit` in CI |
| A06 Vulnerable Components | `npm audit --audit-level=high`; Dependabot / Renovate |
| A07 Auth Failures | Token in memory only; session-expired redirect on 401 |
| A08 Software Integrity | `package-lock.json` committed; integrity hashes in CI |
| A09 Logging Failures | No PII in console logs in production; structured error logging |
| A10 SSRF | Not directly applicable to React; validate all URLs before fetch |

---

## XSS — Safe HTML Rendering

```ts
import DOMPurify from 'dompurify';

// Only use when you MUST render HTML (e.g., rich-text content)
function SafeHtml({ html }: { html: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
      }}
    />
  );
}
```

**Allowed patterns (React escapes these automatically):**
```tsx
<p>{userInput}</p>              // safe — JSX escapes
<input value={userInput} />     // safe
<a href={url}>link</a>          // UNSAFE if url can be javascript:
```

**Safe link rendering:**
```tsx
function SafeLink({ href, children }: { href: string; children: ReactNode }) {
  const safe = href.startsWith('https://') || href.startsWith('/');
  if (!safe) return <span>{children}</span>;
  return <a href={href} rel="noopener noreferrer" target="_blank">{children}</a>;
}
```

---

## Authentication Pattern

```ts
// store/useAuthStore.ts
interface AuthStore {
  user: User | null;
  token: string | null; // in-memory only
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  login: async (email, pass) => {
    const { user, token } = await authService.login(email, pass);
    set({ user, token }); // never localStorage.setItem('token', ...)
  },
  logout: () => {
    authService.signOut();
    set({ user: null, token: null });
  },
}));
```

**Axios interceptor — handle 401 globally:**
```ts
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      toast.error('Session expired. Please log in again.');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);
```

---

## Input Validation — Zod Patterns

```ts
// Reusable schemas
export const EmailSchema = z.string().email('Invalid email address');
export const PasswordSchema = z.string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[0-9]/, 'Must contain a number');

export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

// URL param validation
export function useValidatedParam(key: string, schema: z.ZodSchema) {
  const params = useParams();
  const result = schema.safeParse(params[key]);
  if (!result.success) throw new Error(`Invalid route param: ${key}`);
  return result.data;
}
```

---

## UX Patterns — Loading States

```tsx
// Skeleton loader (prevents layout shift)
function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl bg-gray-100 p-4 space-y-2">
      <div className="h-4 bg-gray-300 rounded w-3/4" />
      <div className="h-4 bg-gray-300 rounded w-1/2" />
    </div>
  );
}

// Usage
{isLoading
  ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
  : data.map(p => <ProductCard key={p.id} product={p} />)
}
```

---

## UX Patterns — Async Button

```tsx
function SaveButton({ onSave }: { onSave: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await onSave();
        toast.success('Saved!');
      } catch {
        toast.error('Save failed. Please try again.');
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
      aria-busy={isPending}
    >
      {isPending ? <Spinner size="sm" /> : 'Save'}
    </button>
  );
}
```

---

## UX Patterns — Confirmation Dialog (no `window.confirm`)

```tsx
import * as Dialog from '@radix-ui/react-dialog';

function DeleteConfirmDialog({
  open, onConfirm, onCancel,
}: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-xl w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold">Delete item?</Dialog.Title>
          <Dialog.Description className="text-gray-500 mt-1">
            This action cannot be undone.
          </Dialog.Description>
          <div className="flex gap-3 mt-6 justify-end">
            <button onClick={onCancel} className="btn-secondary">Cancel</button>
            <button onClick={onConfirm} className="btn-danger">Delete</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Overflow-Safe CSS Utilities (add to `index.css`)

```css
/* Prevent any element from causing horizontal scroll */
*, *::before, *::after { box-sizing: border-box; }
html, body { overflow-x: hidden; max-width: 100vw; }

/* Safe image defaults */
img, video { max-width: 100%; height: auto; display: block; }

/* Flex blowout prevention */
.flex-safe { display: flex; min-width: 0; }
.flex-safe > * { min-width: 0; }
```

---

## Accessibility Quick Reference

```tsx
// Bad
<div onClick={handleClick}>Click me</div>

// Good
<button type="button" onClick={handleClick}>Click me</button>

// Icon-only button
<button type="button" aria-label="Delete product" onClick={handleDelete}>
  <TrashIcon aria-hidden="true" />
</button>

// Live region for dynamic content
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Skip link (add as first child of <body>)
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-4 py-2 z-50">
  Skip to main content
</a>
<main id="main-content">...</main>
```
