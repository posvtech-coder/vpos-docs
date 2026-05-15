---
name: flutter-to-react
description: "Multi-domain expert skill: Flutter developer + React migration engineer + documentation/analysis specialist + security expert + CI/CD pipeline engineer. Transforms Flutter web applications to production-grade React TypeScript web apps with OWASP Top 10 security, zero overflow/layout issues, performance optimisation, and polished UX. Includes deep Flutter/Dart expertise for accurate source analysis, structured technical documentation (architecture diagrams, audit reports, migration plans), full CI/CD pipeline generation (GitHub Actions, Firebase Hosting, preview channels, Lighthouse CI), and comprehensive security hardening (Firestore rules, CSP, dependency auditing, auth hardening). Use when: migrating Flutter web to React, converting Dart widgets to React components, rewriting Flutter UI in React/TypeScript, translating Flutter state management (Provider, Riverpod, Bloc, GetX) to React hooks or Zustand/Redux, converting Flutter routing to React Router, mapping Flutter themes and styling to Tailwind CSS or styled-components, auditing Flutter/React codebases, writing technical documentation, setting up CI/CD pipelines, or conducting security reviews. DO NOT USE FOR: mobile-only Flutter apps, non-web targets, Dart backend services."
argument-hint: "Path to the Flutter source directory (e.g. lib/) or a specific widget file, or describe the documentation/security/CI-CD task"
---

# Flutter Web → React Migration Skill

## When to Use

- Converting a Flutter web app to a React (TypeScript) web app
- Translating Dart `Widget` classes to React functional components
- Migrating Flutter state management to React equivalents
- Rewriting Flutter navigation/routing to React Router v6
- Mapping Flutter `ThemeData` / `ColorScheme` to CSS variables or Tailwind tokens
- Replacing Flutter platform channels with standard Web APIs

---

## Migration Philosophy

1. **Web-first, not pixel-perfect Flutter clones** — build a better web app with proper hover states, tooltips, smooth transitions, and modern UX patterns.
2. **One widget → one component** — each Flutter `StatelessWidget` / `StatefulWidget` becomes one `.tsx` file.
3. **Type safety** — output TypeScript, not plain JavaScript.
4. **No magic** — avoid black-box wrappers; emit readable, idiomatic React code.
5. **Progressive** — migrate file-by-file; keep the Flutter source as the source of truth until the React version is verified.
6. **Secure by default** — every output must pass OWASP Top 10 checks before being considered complete.
7. **Layout-safe** — every container must handle overflow, empty states, and dynamic content without breaking.
8. **Performance-first** — lazy load routes, memoize expensive computations, virtualise long lists.
9. **Accessible & user-friendly** — WCAG 2.1 AA compliance, keyboard nav, focus management, and clear feedback on every action.
10. **Web-native patterns** — use localStorage for preferences, sessionStorage for temporary state, proper browser back button, and simplified URL structure.

**See [Web Enhancements Guide](./references/web-enhancements.md) for modern web patterns and improvements over Flutter web.**

---

## VPOS Admin — Shared Screen Architecture Pattern

When multiple roles (e.g. shopkeeper + manager) share the same UI (inventory, reports, transactions),
use the **shared screen + role-specific wrapper** pattern:

```
src/screens/shared/inventory/BranchInventoryScreen.tsx  ← accepts props (shopkeeperId, branchId, routeBase)
src/screens/shopkeeper/branches/ShopkeeperBranchInventoryScreen.tsx  ← thin wrapper: extracts URL params
src/screens/manager/ManagerInventoryScreen.tsx  ← thin wrapper: uses parentShopkeeperId + sessionStorage branchId
```

**Shopkeeper context:**
- `shopkeeperId = user.uid`
- `branchId` from URL param `:branchId`
- `routeBase = /shopkeeper/branches/${branchId}`

**Manager context:**
- `shopkeeperId = user.parentShopkeeperId` (custom claim)
- `branchId = sessionStorage.getItem('selectedBranchId')`
- `routeBase = /manager`

This pattern eliminates code duplication while keeping role-specific routing isolated. Never embed
role detection logic inside the shared screen — always inject it via props.

---

## Procedure

### Step 1 — Analyse the Flutter Project & Map Dependencies

1. Read `pubspec.yaml` — extract **every** dependency under `dependencies:` and `dev_dependencies:`.
2. Map each Flutter package to its React equivalent using the [Full Dependency Map](./references/dependency-map.md). For any package not in the map, search npm for the best-maintained equivalent (most weekly downloads + recent publish date).
3. Scan `lib/` to map the widget tree: identify screens, shared widgets, models, services, providers.
4. Identify the state management library in use:

| Flutter | React equivalent (latest) |
|---------|---------------------------|
| `Provider` / `ChangeNotifier` | React Context + `useReducer` |
| `Riverpod` | Zustand v5 or Jotai v2 |
| `Bloc` / `Cubit` | Zustand v5 or Redux Toolkit v2 |
| `GetX` | Zustand v5 |
| `setState` only | `useState` / `useReducer` |

5. Note custom fonts, asset paths, and `ThemeData` colour tokens.
6. Document the full dependency substitution list before writing any code — confirm with the user if any package has no clear equivalent.

### Step 2 — Scaffold the React Project

**Always use the latest stable versions. Do not pin to outdated majors.**

```bash
npm create vite@latest <app-name> -- --template react-ts
cd <app-name>

# Core
npm install react-router-dom@7 zustand@5 @tanstack/react-query@5 axios@1

# Validation & Forms
npm install zod@3 react-hook-form@7 @hookform/resolvers@3

# UI Primitives (Radix — unstyled, accessible, composable)
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip
npm install @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-tabs
npm install @radix-ui/react-switch @radix-ui/react-checkbox @radix-ui/react-alert-dialog

# Icons — consistent, sharp business icons
npm install lucide-react@latest

# Notifications
npm install sonner@latest          # modern toast — replaces react-hot-toast

# Animations
npm install motion@latest          # Motion (ex Framer Motion) — subtle, professional

# Tables (for business data)
npm install @tanstack/react-table@8

# Charts (if Flutter used fl_chart / syncfusion)
npm install recharts@2

# Date handling
npm install date-fns@4

# Security
npm install dompurify@3
npm install -D @types/dompurify

# Error boundary
npm install react-error-boundary@4

# Virtualisation for large lists
npm install @tanstack/react-virtual@3

# Dev / DX
npm install -D tailwindcss@3 postcss autoprefixer
npm install -D eslint eslint-plugin-jsx-a11y eslint-plugin-react-hooks
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
npx tailwindcss init -p
```

Replicate the Flutter folder structure under `src/`:

```
src/
  components/     # shared reusable widgets
  screens/        # top-level route pages (lazy-loaded)
  hooks/          # custom hooks (replaces providers/services)
  store/          # Zustand stores
  models/         # TypeScript interfaces + Zod schemas
  services/       # API/Firebase calls (never expose secrets here)
  guards/         # Route guards / auth wrappers
  assets/         # images, fonts (imported, not public/)
  theme/          # CSS custom properties, design tokens
  utils/          # pure helpers (sanitise, format, validate)
  App.tsx
  main.tsx
```

**Security baseline — add to `vite.config.ts`:**
```ts
import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com",
    },
  },
});
```

### Step 3 — Design System: Tokens, Typography & Professional Visual Rules

This step is critical for a **professional business application**. Follow all sub-rules.

#### 3.1 — Extract Flutter ThemeData → CSS Custom Properties

```css
/* src/theme/tokens.css  — single source of truth */
:root {
  /* Brand */
  --color-primary:       #1E40AF;  /* from ThemeData.primaryColor */
  --color-primary-hover: #1D3FAA;
  --color-accent:        #0EA5E9;

  /* Neutrals — business palette (no vivid grays) */
  --color-bg:            #F8FAFC;
  --color-surface:       #FFFFFF;
  --color-border:        #E2E8F0;
  --color-text:          #0F172A;
  --color-text-muted:    #64748B;

  /* Semantic */
  --color-success:       #16A34A;
  --color-warning:       #D97706;
  --color-error:         #DC2626;
  --color-info:          #0284C7;

  /* Elevation — flat/professional, not over-shadowed */
  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:  0 2px 8px 0 rgb(0 0 0 / 0.08);
  --shadow-lg:  0 4px 16px 0 rgb(0 0 0 / 0.10);
  /* RULE: Never use shadow-xl or drop-shadow on cards in business UI */

  /* Radius */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;

  /* Spacing scale (mirrors Flutter's 4px grid) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;

  /* Typography */
  --font-sans: 'Inter', 'Geist', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

#### 3.2 — Tailwind Config (extend, never override defaults entirely)

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: 'var(--color-primary)', hover: 'var(--color-primary-hover)' },
        accent:   'var(--color-accent)',
        surface:  'var(--color-surface)',
        border:   'var(--color-border)',
        muted:    'var(--color-text-muted)',
        success:  'var(--color-success)',
        warning:  'var(--color-warning)',
        error:    'var(--color-error)',
      },
      fontFamily: { sans: ['Inter', 'Geist', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card:  'var(--shadow-sm)',
        panel: 'var(--shadow-md)',
        // No 'heavy' shadow entry — intentional
      },
      borderRadius: {
        DEFAULT: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        lg: 'var(--radius-lg)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
} satisfies Config;
```

#### 3.3 — Professional Visual Rules (MANDATORY for all components)

| Rule | Do | Do NOT |
|------|----|--------|
| Shadows | Use `shadow-card` (1px) on cards, `shadow-panel` (8px) on modals | Use `shadow-xl`, `shadow-2xl`, `drop-shadow` on cards |
| Borders | Use `border border-border` (1px, #E2E8F0) | Use `border-2` or dark borders on cards |
| Background | `bg-surface` (#FFF) for cards, `bg-[--color-bg]` for page | Gradient backgrounds on dashboards |
| Color | Use semantic tokens only | Use raw hex values in JSX |
| Typography | Inter/Geist, weight 400/500/600 only | `font-black`, `font-extrabold` in body |
| Buttons | Flat primary with 1px border, subtle hover (`-5% lightness`) | Gradient buttons, glow effects |
| Spacing | 4px grid strictly (Tailwind p-1=4px, p-2=8px…) | Arbitrary `p-[13px]` values |
| Icons | Lucide-react, `size-4` (16px) or `size-5` (20px) | Mix icon libraries in one screen |
| Animation | `motion` — max 200ms ease-out on enter, 150ms on exit | Bouncing, spinning, pulsing decorative animations |

#### 3.4 — Reusable Component Classes (add to `src/index.css`)

```css
@layer components {
  .btn-primary {
    @apply inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-white
           text-sm font-medium hover:bg-primary-hover active:scale-[0.98]
           transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-secondary {
    @apply inline-flex items-center gap-2 px-4 py-2 rounded border border-border
           bg-surface text-text text-sm font-medium hover:bg-gray-50
           active:scale-[0.98] transition-colors duration-150
           disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-danger {
    @apply inline-flex items-center gap-2 px-4 py-2 rounded bg-error text-white
           text-sm font-medium hover:bg-red-700 active:scale-[0.98]
           transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .card {
    @apply bg-surface border border-border rounded-lg shadow-card p-4;
  }
  .input {
    @apply w-full rounded border border-border bg-surface px-3 py-2 text-sm
           text-text placeholder:text-muted focus:outline-none
           focus:ring-2 focus:ring-primary/20 focus:border-primary
           transition-colors duration-150 disabled:opacity-50;
  }
  .badge {
    @apply inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium;
  }
  .badge-success { @apply badge bg-green-50 text-green-700 border border-green-200; }
  .badge-warning { @apply badge bg-amber-50 text-amber-700 border border-amber-200; }
  .badge-error   { @apply badge bg-red-50   text-red-700   border border-red-200;   }
  .badge-info    { @apply badge bg-blue-50  text-blue-700  border border-blue-200;  }
}
```

### Step 4 — Convert Dart Models → TypeScript Interfaces + Zod Schemas

For each Dart class that holds data (no widgets):
- Remove `final`, `const`, `required` keywords → TypeScript `readonly` / optional `?`.
- Replace Dart `fromJson` factory → Zod schema + inferred type (validates at runtime boundary).
- `DateTime` → ISO string (`string`) — never trust raw `Date` from external sources.
- **Never use `any`** — use `unknown` and narrow with Zod.

**Pattern:**
```dart
// Dart
class Product {
  final String id;
  final double price;
  Product({required this.id, required this.price});
  factory Product.fromJson(Map<String, dynamic> json) =>
      Product(id: json['id'], price: json['price'].toDouble());
}
```
```ts
// TypeScript — validated at the API boundary
import { z } from 'zod';
export const ProductSchema = z.object({
  id: z.string().min(1),
  price: z.number().nonnegative(),
});
export type Product = z.infer<typeof ProductSchema>;

// In your service layer — parse, never cast:
export async function fetchProduct(id: string): Promise<Product> {
  const raw = await api.get(`/products/${encodeURIComponent(id)}`);
  return ProductSchema.parse(raw.data); // throws on bad shape
}
```

### Step 5 — Convert Widgets → React Components

Apply these mappings for every widget:

| Flutter Widget | React / HTML equivalent |
|----------------|------------------------|
| `Scaffold` | `<div className="screen">` + layout wrappers |
| `AppBar` | `<header>` / `<Navbar>` component |
| `Column` | `<div className="flex flex-col">` |
| `Row` | `<div className="flex flex-row">` |
| `Stack` | `<div className="relative">` + `absolute` children |
| `Expanded` | `flex: 1` / `flex-grow` |
| `Container` | `<div>` with inline style or Tailwind classes |
| `Text` | `<p>` / `<span>` / `<h1>`…`<h6>` |
| `ElevatedButton` | `<button className="btn-primary">` |
| `TextButton` | `<button className="btn-text">` |
| `IconButton` | `<button aria-label="…"><Icon /></button>` |
| `TextField` | `<input>` / `<textarea>` |
| `Image.asset` | `<img src="/assets/…">` |
| `Image.network` | `<img src={url} loading="lazy">` |
| `ListView` | `<ul>` or scrollable `<div>` |
| `GridView` | CSS Grid `<div className="grid">` |
| `Card` | `<div className="card">` |
| `Divider` | `<hr>` |
| `CircularProgressIndicator` | CSS spinner or library component |
| `SnackBar` | Toast notification (react-hot-toast) |
| `Dialog` / `AlertDialog` | `<dialog>` or modal component |
| `BottomNavigationBar` | `<nav>` at bottom with flex |
| `Drawer` | Sidebar component |
| `TabBar` / `TabBarView` | Tab component + conditional render |

**Conversion template for `StatelessWidget`:**
```dart
class MyCard extends StatelessWidget {
  final String title;
  const MyCard({required this.title});
  @override Widget build(BuildContext ctx) => Text(title);
}
```
```tsx
interface MyCardProps { title: string; }
export function MyCard({ title }: MyCardProps) {
  return <p>{title}</p>;
}
```

**Conversion template for `StatefulWidget`:**
```dart
class Counter extends StatefulWidget { ... }
class _CounterState extends State<Counter> {
  int _count = 0;
  void _increment() => setState(() => _count++);
  @override Widget build(ctx) => Text('$_count');
}
```
```tsx
export function Counter() {
  const [count, setCount] = useState(0);
  return <p onClick={() => setCount(c => c + 1)}>{count}</p>;
}
```

### Step 6 — Convert Routing (with Auth Guards & Code Splitting)

| Flutter | React Router v6 |
|---------|----------------|
| `MaterialApp(routes: {...})` | `<BrowserRouter><Routes>…` |
| `Navigator.push(…Route(…))` | `useNavigate(); navigate('/path')` |
| `Navigator.pop()` | `navigate(-1)` |
| Route arguments | `useLocation().state` or URL params |
| `GoRouter` | React Router v6 (1-to-1 mapping) |

**Always lazy-load screens and wrap protected routes:**
```tsx
const HomeScreen   = lazy(() => import('./screens/HomeScreen'));
const AdminScreen  = lazy(() => import('./screens/AdminScreen'));

function PrivateRoute({ children }: PropsWithChildren) {
  const user = useAuthStore(s => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/admin" element={<PrivateRoute><AdminScreen /></PrivateRoute>} />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </Suspense>
  );
}
```

**Never trust `location.state` without validation** — validate with Zod before use.

### Step 7 — Convert State Management

Follow the table in Step 1. For Zustand stores:
```ts
// store/useProductStore.ts
import { create } from 'zustand';
interface ProductStore {
  items: Product[];
  fetch: () => Promise<void>;
}
export const useProductStore = create<ProductStore>((set) => ({
  items: [],
  fetch: async () => {
    const data = await api.getProducts();
    set({ items: data });
  },
}));
```

### Step 8 — Convert Firebase / API Calls

Follow the complete guide in [Firebase Direct Connections](./references/firebase-direct-connections.md).

**Key rules:**
- All Firebase services (Auth, Firestore, Storage, RTDB, FCM, App Check) are initialised once in `src/services/firebase.ts`.
- Cloud Functions **must** use region `asia-south1` — matches the deployed functions.
- Auth token refresh runs every 5 min via `setInterval` — mirrors Flutter's `Timer.periodic`.
- Replace `cloud_firestore` Dart SDK with `firebase/firestore` JS SDK.
- Replace `firebase_auth` with `firebase/auth`.
- Replace `firebase_storage` with `firebase/storage`.
- Replace `firebase_database` (RTDB) with `firebase/database` — used for device presence.
- Replace `http` / `dio` with typed `httpsCallable` wrappers in `src/services/functions.ts`.
- Wrap all Cloud Function calls in React Query `useQuery` / `useMutation`.
- App Check is required — use `ReCaptchaV3Provider` for web (same as Flutter web).

### Step 9 — Convert Assets

1. Copy `assets/images/` → `public/assets/images/`.
2. Copy `assets/fonts/` → `public/fonts/`.
3. Update all references from `Image.asset('assets/...')` → `<img src="/assets/...">`.

### Step 10 — Verify & Polish

- Run `npm run dev` and navigate every screen.
- Fix TypeScript errors (`npm run tsc --noEmit`).
- Ensure responsiveness matches the Flutter breakpoints.
- Replace any Flutter-specific UX patterns (e.g., `showModalBottomSheet`) with idiomatic web alternatives.
- Run `npm run build` and confirm zero errors.

---

## Step 11 — Security Hardening (OWASP Top 10)

Apply all of the following before marking the migration complete.

### 11.1 — XSS Prevention
- **Never use `dangerouslySetInnerHTML`** unless the content is sanitised first:
  ```ts
  import DOMPurify from 'dompurify';
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rawHtml) }} />
  ```
- Never interpolate user input into template strings rendered as HTML.
- Use React's JSX interpolation (`{value}`) — it escapes by default.

### 11.2 — Injection Prevention
- **Never build Firestore queries with unvalidated user strings** — use Zod-parsed values.
- **Never `eval()`** or `new Function(userInput)`.
- URL params and route state must be validated before use:
  ```ts
  const raw = useParams().id;
  const id = z.string().uuid().parse(raw); // throws → caught by ErrorBoundary
  ```

### 11.3 — Authentication & Authorization
- Store auth tokens **only in memory** (Zustand store) or `httpOnly` cookies — never `localStorage`.
- Every private route must have a `<PrivateRoute>` guard (see Step 6).
- Re-validate user role/permissions on the server — never rely on client-side checks alone.
- Implement token refresh silently; show session-expired toast and redirect on 401.

### 11.4 — Sensitive Data Exposure
- **No secrets in source code** — use `.env` prefixed with `VITE_` only for public config.
- Never log `user.email`, tokens, or PII to the console in production:
  ```ts
  if (import.meta.env.DEV) console.log(sensitiveData);
  ```
- Mask sensitive fields in UI (card numbers, passwords) with `type="password"` or `•••` placeholders.

### 11.5 — CSRF Protection
- Prefer `httpOnly` `SameSite=Strict` cookies for session tokens.
- For REST APIs, include a CSRF token header or use `SameSite` cookies.
- Firebase JS SDK handles its own token management securely — do not copy tokens into custom headers.

### 11.6 — Dependency Security
```bash
npm audit --audit-level=high   # fail CI on high/critical
npx better-npm-audit audit      # friendlier output
```
Pin major versions in `package.json`; run audit in CI on every PR.

---

## Step 12 — Layout Safety (No Overflow, No Break)

Apply these rules to **every** component output.

### 12.1 — Text Overflow
```tsx
// Single-line truncation
<p className="truncate max-w-full">…</p>

// Multi-line clamp
<p className="line-clamp-2">…</p>  {/* Tailwind v3.3+ */}
```
Never allow raw `<p>{text}</p>` on dynamic strings without overflow handling.

### 12.2 — Container Overflow
- Every scrollable list must have an explicit `max-h-*` and `overflow-y-auto`.
- Flex/grid containers must use `min-w-0` on children to prevent blowout:
  ```html
  <div class="flex"><div class="min-w-0 flex-1 truncate">{title}</div></div>
  ```
- Images must always have `max-w-full h-auto` to prevent viewport overflow.

### 12.3 — Long Lists — Virtualise
For lists > 100 items, use `react-window`:
```tsx
import { FixedSizeList } from 'react-window';
<FixedSizeList height={600} itemCount={items.length} itemSize={72} width="100%">
  {({ index, style }) => <Row style={style} item={items[index]} />}
</FixedSizeList>
```

### 12.4 — Empty & Error States
Every data-driven list/table **must** render one of three states:
```tsx
function ProductList() {
  const { data, isLoading, error } = useQuery(…);
  if (isLoading) return <Skeleton count={5} />;
  if (error)    return <ErrorBanner message={error.message} retry={refetch} />;
  if (!data?.length) return <EmptyState message="No products found" />;
  return <ul>{data.map(p => <ProductRow key={p.id} product={p} />)}</ul>;
}
```

### 12.5 — Responsive Breakpoints
Map Flutter `MediaQuery` breakpoints to Tailwind:
| Flutter | Tailwind |
|---------|----------|
| `width < 600` | `sm:` (≥640px) |
| `width < 1024` | `lg:` (≥1024px) |
| `width >= 1280` | `xl:` (≥1280px) |

Every screen must be tested at 375px, 768px, 1280px, and 1920px widths.

---

## Step 13 — Performance (No Bottlenecks)

### 13.1 — Component Memoisation
```tsx
// Prevent re-renders of pure list items
const ProductRow = memo(function ProductRow({ product }: { product: Product }) {
  return <li>{product.name}</li>;
});

// Expensive derivations
const sortedItems = useMemo(() => [...items].sort(byPrice), [items]);

// Stable callbacks passed to children
const handleDelete = useCallback((id: string) => store.delete(id), [store]);
```

### 13.2 — Image Optimisation
```tsx
<img
  src={product.imageUrl}
  alt={product.name}
  loading="lazy"
  decoding="async"
  width={300}
  height={200}
  className="max-w-full h-auto object-cover"
/>
```
Use WebP format. Serve via CDN. Add `width` + `height` to prevent layout shift (CLS).

### 13.3 — Bundle Splitting
- Every route screen → `lazy()` import (already enforced in Step 6).
- Large third-party libs (charts, PDF) → dynamic `import()` at point of use.
- Check bundle with `npx vite-bundle-visualizer` — no single chunk > 250 kB.

### 13.4 — Query Caching
Configure React Query globally:
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 min — avoid waterfall refetches
      gcTime: 5 * 60_000,         // 5 min cache
      retry: 2,
      refetchOnWindowFocus: false, // avoid surprise refetches in POS context
    },
  },
});
```

### 13.5 — Debounce User Input
```tsx
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 300); // custom hook or 'use-debounce'
useEffect(() => { search(debouncedQuery); }, [debouncedQuery]);
```

---

## Step 14 — UX & Accessibility (User-Friendly)

### 14.1 — Loading Feedback
- Show skeleton screens (not spinners alone) for content areas on first load.
- Show inline spinners on buttons during async actions; disable the button to prevent double-submit.
```tsx
<button disabled={isPending} className="btn-primary">
  {isPending ? <Spinner size="sm" /> : 'Save'}
</button>
```

### 14.2 — Form UX (react-hook-form + Zod)
```tsx
const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
const { register, handleSubmit, formState: { errors, isSubmitting } } =
  useForm({ resolver: zodResolver(schema) });
// Inline error messages under each field — never alert()
<input {...register('email')} aria-invalid={!!errors.email} />
{errors.email && <p role="alert" className="text-red-500 text-sm">{errors.email.message}</p>}
```

### 14.3 — Toast Notifications
Use `react-hot-toast` for all async feedback:
```ts
try {
  await store.save(data);
  toast.success('Saved successfully');
} catch (e) {
  toast.error('Failed to save. Please try again.');
}
```
Never use `window.alert()` or `window.confirm()`.

### 14.4 — Keyboard Navigation & Focus Management
- All interactive elements must be reachable by `Tab`.
- Modals must trap focus (Radix Dialog does this automatically).
- After closing a modal, return focus to the trigger element.
- Use `autoFocus` on the first field of forms/modals.

### 14.5 — Accessibility (a11y)
- Every `<img>` must have a meaningful `alt` (or `alt=""` for decorative).
- Every icon button needs `aria-label`.
- Use semantic HTML: `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>`.
- Color contrast must meet WCAG AA (4.5:1 for normal text, 3:1 for large).
- Run `npx axe-core` or install `eslint-plugin-jsx-a11y` and fix all warnings.

### 14.6 — Error Boundaries
Wrap every screen in an Error Boundary so one crash doesn't kill the whole app:
```tsx
import { ErrorBoundary } from 'react-error-boundary';

function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="p-8 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-gray-500">{error.message}</p>
      <button onClick={resetErrorBoundary} className="btn-primary mt-4">Try again</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={AppErrorFallback}>
  <AppRoutes />
</ErrorBoundary>
```

---

## Common Pitfalls

| Flutter Pattern | Mistake to Avoid | Correct React Pattern |
|-----------------|------------------|----------------------|
| `BuildContext` passed everywhere | Prop-drilling context | React Context or Zustand |
| `initState()` | `useEffect` with deps | `useEffect(() => { … }, [])` |
| `dispose()` | Forgetting cleanup | Return cleanup fn from `useEffect` |
| `async` in `build()` | Calling async in render | `useEffect` + state, or `useQuery` |
| `MediaQuery.of(ctx)` | Hardcoded breakpoints | CSS media queries / Tailwind responsive |
| `FutureBuilder` | Manual loading flags | `@tanstack/react-query` `useQuery` |
| `StreamBuilder` | Manual subscription | `useEffect` + event listener or RxJS |

---

---

## Migration Completion Checklist

Before declaring the migration done, verify every item:

**Security**
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] No secrets in source code or `localStorage`
- [ ] All routes protected by auth guards
- [ ] All API inputs validated with Zod at the boundary
- [ ] `npm audit` passes with no high/critical issues
- [ ] CSP headers configured in `vite.config.ts`

**Layout Safety**
- [ ] No text truncation issues (all dynamic strings have `truncate` or `line-clamp`)
- [ ] No horizontal scroll on any viewport width
- [ ] All flex children have `min-w-0`
- [ ] All images have `max-w-full h-auto`
- [ ] Lists > 100 items are virtualised
- [ ] Every list has empty state, error state, and loading state

**Performance**
- [ ] All route screens are lazy-loaded
- [ ] No component re-renders unnecessarily (use React DevTools Profiler)
- [ ] Bundle chunk < 250 kB (check with vite-bundle-visualizer)
- [ ] Images are lazy-loaded, WebP format, with explicit dimensions
- [ ] Search/filter inputs are debounced

**UX & Accessibility**
- [ ] All async actions show inline loading state
- [ ] All errors show user-friendly toast or inline message
- [ ] Forms validate inline with react-hook-form + Zod
- [ ] Keyboard navigation works on all interactive elements
- [ ] All images have `alt` text
- [ ] All icon buttons have `aria-label`
- [ ] Color contrast passes WCAG AA
- [ ] Error boundaries wrap all screens
- [ ] Tested at 375px, 768px, 1280px, 1920px

---

## Firebase Hosting — Fast Development Workflow

When migrating VPOS Admin or similar multi-environment projects, create a **fast build + deploy script** for each Firebase project to enable rapid iteration without localhost issues.

### PowerShell Deploy Script Pattern

Create `deploy-dev.ps1` (and `deploy-prod.ps1` for production):

```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fast build + deploy to Firebase Hosting (Dev)
.DESCRIPTION
    Builds the React app for dev environment and deploys to Firebase Hosting.
    Skips functions, Firestore rules, and other services for speed.
.EXAMPLE
    .\deploy-dev.ps1
#>

$ErrorActionPreference = "Stop"

# Colors
function Write-Status { param($msg) Write-Host "🔵 $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  VPOS Admin React → Firebase Hosting (Dev)" -ForegroundColor White
Write-Host "  Project: smbs-dev-b84ad" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Step 1: Clean previous build
# ============================================================================
Write-Status "Cleaning previous build..."
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "   Removed dist/" -ForegroundColor Gray
}

# ============================================================================
# Step 2: Build React app (development mode)
# ============================================================================
Write-Status "Building React app (dev mode)..."
npm run build:dev

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Build failed!"
    exit 1
}
Write-Success "Build complete → dist/"

# ============================================================================
# Step 3: Deploy to Firebase Hosting
# ============================================================================
Write-Status "Deploying to Firebase Hosting (smbs-dev-b84ad)..."
firebase deploy --only hosting --project smbs-dev-b84ad

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Deploy failed!"
    exit 1
}

Write-Host ""
Write-Success "Deployment complete!"
Write-Host ""
Write-Host "🌐 Live URL: https://smbs-dev-b84ad.web.app" -ForegroundColor Green
Write-Host "🌐 Alt URL:  https://smbs-dev-b84ad.firebaseapp.com" -ForegroundColor Green
Write-Host ""
```

### Firebase Configuration

Ensure `firebase.json` is configured for SPA routing:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

### Package.json Scripts

Add build modes:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:dev": "tsc && vite build --mode development",
    "build:prod": "tsc && vite build --mode production",
    "preview": "vite preview"
  }
}
```

### Usage

```powershell
# Deploy to dev environment
.\deploy-dev.ps1

# Deploy to production
.\deploy-prod.ps1
```

**Benefits:**
- ⚡ Fast iteration (30-60 seconds from code change to live)
- 🔒 No localhost auth issues (deployed domain is pre-authorized)
- 🌐 Shareable URLs for testing on real devices
- 🎯 `--only hosting` skips functions/Firestore for speed
- ✅ Production-ready Firebase APIs (no emulator quirks)

---

## Step 15 — Flutter Source Analysis (Pre-Migration Audit)

Before writing any React code, perform a deep Flutter project audit. This step ensures accurate, idiomatic React output — never guess what a Dart widget or service does.

### 15.1 — Dart / Flutter Architecture Analysis

1. **Widget tree mapping** — trace every screen from `main.dart` → `MaterialApp` → route → screen → child widgets. Document the full tree in a Mermaid diagram.
2. **State management audit** — identify which library is used per screen (some projects mix `setState` + Provider + Riverpod). Map each state class to its React equivalent.
3. **Service layer** — identify all service classes (`*Service`, `*Repository`, `*Api`). Document their public methods and map to React Query hooks or Zustand actions.
4. **Dart null-safety patterns** — identify `late`, `?`, `!`, and `required` usage to correctly type React props and state as `T | null` vs `T | undefined`.
5. **Flutter lifecycle methods** — map `initState`, `dispose`, `didChangeDependencies`, `didUpdateWidget` to the correct `useEffect` dependency arrays.
6. **Custom painters / canvas** — identify `CustomPainter` / `Canvas` usage and plan equivalent SVG or `<canvas>` implementations in React.
7. **Platform channels** — identify any `MethodChannel` calls and plan Web API replacements.

### 15.2 — pubspec.yaml Deep Scan

For every package in `pubspec.yaml`:

| Category | Flutter packages | React replacement strategy |
|----------|-----------------|---------------------------|
| HTTP | `http`, `dio` | `axios` or Firebase `httpsCallable` |
| Local DB | `hive`, `drift`, `sembast` | `IndexedDB` via `idb-keyval` or `localforage` |
| Charts | `fl_chart`, `syncfusion_flutter_charts` | `recharts` v2 |
| PDF | `pdf`, `printing` | `@react-pdf/renderer` |
| QR | `qr_flutter`, `mobile_scanner` | `qrcode.react`, `html5-qrcode` |
| Camera | `camera`, `image_picker` | Web `<input type="file" accept="image/*" capture>` |
| Notifications | `firebase_messaging` | Firebase JS SDK `getMessaging()` |
| Connectivity | `connectivity_plus` | `navigator.onLine` + `online`/`offline` events |
| Shared prefs | `shared_preferences` | `localStorage` (non-sensitive) or Zustand persist |
| Animations | `lottie`, `rive` | `motion` (Framer Motion) or Lottie Web |
| Biometrics | `local_auth` | WebAuthn (`navigator.credentials`) |

---

## Step 16 — Technical Documentation & Analysis

Every migration must produce the following documentation artifacts.

### 16.1 — Architecture Decision Record (ADR)

Create `docs/adr/001-migration-approach.md` for every migration:

```markdown
# ADR-001: Flutter Web → React TypeScript Migration

## Status
Accepted

## Context
[Describe why the Flutter web app is being migrated]

## Decision
Migrate to React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Query.

## Consequences
- Positive: better web UX, smaller bundle, stronger TypeScript ecosystem
- Negative: full rewrite required; Flutter mobile app remains unchanged

## Alternatives Considered
- Next.js: rejected — SSR not required; adds complexity
- Vue 3: rejected — team TypeScript expertise is React-focused
```

### 16.2 — Migration Plan Document

Create `docs/MIGRATION_PLAN.md`:

```markdown
# Migration Plan

## Phase 1 — Foundation (Week 1)
- [ ] Scaffold React project (Vite + TypeScript)
- [ ] Design system (tokens, Tailwind config, component classes)
- [ ] Firebase initialisation (Auth, Firestore, Storage, App Check)
- [ ] Auth flow (login, logout, token refresh, route guards)
- [ ] CI/CD pipeline (.github/workflows/ci.yml)

## Phase 2 — Core Screens (Week 2–3)
- [ ] Dashboard
- [ ] [List all screens from Flutter app]

## Phase 3 — Polish & Harden (Week 4)
- [ ] Security audit (OWASP checklist)
- [ ] Accessibility audit (axe-core)
- [ ] Performance audit (Lighthouse CI ≥ 90)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

## Risk Register
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Missing Flutter screen | Medium | High | Full widget-tree audit before Phase 2 |
| Firebase rule breakage | Low | Critical | Test rules in emulator before deploy |
```

### 16.3 — Codebase Audit Report

When asked to audit (not migrate) a Flutter or React project, produce `docs/AUDIT_REPORT.md`:

```markdown
# Codebase Audit Report — [Project Name]
**Date:** [ISO date]  **Auditor:** Flutter → React Converter Agent

## Executive Summary
[2–3 sentences: overall health, top risks]

## Architecture
[Mermaid diagram of current structure]

## Dependency Analysis
| Package | Version | Status | Risk |
|---------|---------|--------|------|
| firebase_core | ^2.4.0 | Outdated | Upgrade to ^3.x |

## Security Issues
| Severity | Finding | Location | Recommendation |
|----------|---------|----------|----------------|
| CRITICAL | Firestore allow read, write: if true | firestore.rules:3 | Add auth check |

## Performance Issues
[List identified bottlenecks]

## Recommendations
[Prioritised action list]
```

### 16.4 — API Contract Document

For every Cloud Function called by the app, document in `docs/api-contracts.md`:

```markdown
## `createShopkeeper` (asia-south1)
**Trigger:** HTTPS Callable  
**Auth:** Required (admin role)  
**Request:**
```json
{ "name": "string", "email": "string", "phone": "string" }
```
**Response:**
```json
{ "success": true, "shopkeeperId": "string" }
```
**Errors:** `permission-denied`, `already-exists`, `invalid-argument`
```

---

## Step 17 — CI/CD Pipeline Generation

Generate a complete CI/CD setup for every migrated project.

### 17.1 — GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI / CD

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ─── Quality Gate ────────────────────────────────────────────────────────
  quality:
    name: Lint · Type-check · Test · Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: ESLint
        run: npm run lint

      - name: Security audit
        run: npm audit --audit-level=high

      - name: Unit tests
        run: npm test -- --run --reporter=verbose

      - name: Build (smoke test)
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.DEV_FIREBASE_API_KEY }}
          VITE_FIREBASE_APP_ID: ${{ secrets.DEV_FIREBASE_APP_ID }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.DEV_FIREBASE_PROJECT_ID }}
          VITE_RECAPTCHA_SITE_KEY: ${{ secrets.DEV_RECAPTCHA_SITE_KEY }}

  # ─── PR Preview Deploy ───────────────────────────────────────────────────
  preview:
    name: Firebase Preview Channel
    needs: quality
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run build:dev
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.DEV_FIREBASE_API_KEY }}
          VITE_FIREBASE_APP_ID: ${{ secrets.DEV_FIREBASE_APP_ID }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.DEV_FIREBASE_PROJECT_ID }}
          VITE_RECAPTCHA_SITE_KEY: ${{ secrets.DEV_RECAPTCHA_SITE_KEY }}
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.DEV_FIREBASE_SERVICE_ACCOUNT }}
          projectId: ${{ secrets.DEV_FIREBASE_PROJECT_ID }}
          # No channelId = auto preview channel per PR

  # ─── Deploy Dev ──────────────────────────────────────────────────────────
  deploy-dev:
    name: Deploy → Dev
    needs: quality
    if: github.ref == 'refs/heads/dev' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run build:dev
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.DEV_FIREBASE_API_KEY }}
          VITE_FIREBASE_APP_ID: ${{ secrets.DEV_FIREBASE_APP_ID }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.DEV_FIREBASE_PROJECT_ID }}
          VITE_RECAPTCHA_SITE_KEY: ${{ secrets.DEV_RECAPTCHA_SITE_KEY }}
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.DEV_FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.DEV_FIREBASE_PROJECT_ID }}

  # ─── Deploy Prod ─────────────────────────────────────────────────────────
  deploy-prod:
    name: Deploy → Production
    needs: quality
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production   # requires manual approval in GitHub Environments
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run build:prod
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.PROD_FIREBASE_API_KEY }}
          VITE_FIREBASE_APP_ID: ${{ secrets.PROD_FIREBASE_APP_ID }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.PROD_FIREBASE_PROJECT_ID }}
          VITE_RECAPTCHA_SITE_KEY: ${{ secrets.PROD_RECAPTCHA_SITE_KEY }}
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.PROD_FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.PROD_FIREBASE_PROJECT_ID }}
```

### 17.2 — Lighthouse CI Performance Budget

Create `.lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173"],
      "startServerCommand": "npm run preview",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.8 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

Add to CI workflow:
```yaml
      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### 17.3 — Branch Protection Rules Documentation

Create `docs/branch-protection.md` with recommended GitHub branch protection settings:

```markdown
# Branch Protection Rules

## `main` (Production)
- Require PR before merging
- Required status checks: `quality`, `deploy-dev` (must pass on dev first)
- Require 1 approving review
- Dismiss stale reviews on new commits
- Require `production` environment approval (manual gate)
- Restrict force push — disabled
- Restrict deletions — disabled

## `dev` (Staging)
- Require PR before merging
- Required status checks: `quality`
- Require 1 approving review
- Allow force push — enabled (for rebase workflow)
```

### 17.4 — Required GitHub Secrets

Document all required secrets in `docs/secrets-reference.md`:

```markdown
# GitHub Secrets Reference

## Dev Environment
| Secret | Description |
|--------|-------------|
| DEV_FIREBASE_API_KEY | Firebase Web API Key (dev project) |
| DEV_FIREBASE_APP_ID | Firebase App ID (dev project) |
| DEV_FIREBASE_PROJECT_ID | Firebase Project ID (dev) |
| DEV_FIREBASE_SERVICE_ACCOUNT | JSON service account for hosting deploy |
| DEV_RECAPTCHA_SITE_KEY | reCAPTCHA v3 site key (dev) |

## Production Environment
| Secret | Description |
|--------|-------------|
| PROD_FIREBASE_API_KEY | Firebase Web API Key (prod project) |
| PROD_FIREBASE_APP_ID | Firebase App ID (prod project) |
| PROD_FIREBASE_PROJECT_ID | Firebase Project ID (prod) |
| PROD_FIREBASE_SERVICE_ACCOUNT | JSON service account for hosting deploy |
| PROD_RECAPTCHA_SITE_KEY | reCAPTCHA v3 site key (prod) |

## Optional
| Secret | Description |
|--------|-------------|
| LHCI_GITHUB_APP_TOKEN | Lighthouse CI token for PR comments |
```

---

## Reference Files

- [Widget Mapping Cheatsheet](./references/widget-map.md)
- [State Management Patterns](./references/state-patterns.md)
- [Firebase JS Migration (general)](./references/firebase-migration.md)
- [Firebase Direct Connections — Auth, Firestore, Functions, Storage, RTDB, FCM, App Check](./references/firebase-direct-connections.md)
- [Security & UX Patterns](./references/security-ux.md)
- [Full Dependency Map (Flutter → React)](./references/dependency-map.md)
- [Design System & Component Patterns](./references/design-system.md)
