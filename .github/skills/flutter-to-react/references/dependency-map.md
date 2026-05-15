# Flutter → React Dependency Map (Latest Packages)

Use this table during Step 1. For every `pubspec.yaml` dependency, find the React equivalent and install the **latest stable** version shown.

---

## State Management

| Flutter Package | React Equivalent | npm Package | Notes |
|-----------------|-----------------|-------------|-------|
| `provider` | React Context + `useReducer` | built-in | Simple cases only |
| `riverpod` / `flutter_riverpod` | Zustand v5 | `zustand@5` | Preferred default |
| `bloc` / `flutter_bloc` | Zustand v5 or RTK | `zustand@5` or `@reduxjs/toolkit@2` | |
| `get` (GetX) | Zustand v5 | `zustand@5` | |
| `mobx` / `flutter_mobx` | Jotai v2 | `jotai@2` | Observable-style |
| `signals` | Jotai v2 | `jotai@2` | |

---

## Routing / Navigation

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `go_router` | React Router v7 | `react-router-dom@7` |
| `auto_route` | React Router v7 | `react-router-dom@7` |
| `beamer` | React Router v7 | `react-router-dom@7` |
| `routemaster` | React Router v7 | `react-router-dom@7` |

---

## HTTP / Networking

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `http` | Axios + React Query | `axios@1` + `@tanstack/react-query@5` |
| `dio` | Axios + React Query | `axios@1` + `@tanstack/react-query@5` |
| `retrofit` (dart) | tRPC or typed Axios | `axios@1` (typed wrappers) |
| `chopper` | Axios + React Query | `axios@1` + `@tanstack/react-query@5` |
| `web_socket_channel` | native WebSocket / `@stomp/stompjs` | `@stomp/stompjs@7` or native |

---

## Firebase

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `firebase_core` | Firebase JS SDK | `firebase@11` |
| `cloud_firestore` | `firebase/firestore` | `firebase@11` |
| `firebase_auth` | `firebase/auth` | `firebase@11` |
| `firebase_storage` | `firebase/storage` | `firebase@11` |
| `firebase_messaging` | `firebase/messaging` | `firebase@11` |
| `firebase_analytics` | `firebase/analytics` | `firebase@11` |
| `firebase_crashlytics` | Sentry | `@sentry/react@8` |
| `firebase_remote_config` | `firebase/remote-config` | `firebase@11` |
| `firebase_app_check` | `firebase/app-check` | `firebase@11` |
| `cloud_functions` | `firebase/functions` | `firebase@11` |

---

## UI Components

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| Material widgets | Radix UI + Tailwind | `@radix-ui/*` + `tailwindcss@3` |
| `flutter_svg` | `lucide-react` or inline SVG | `lucide-react@latest` |
| `cached_network_image` | `<img loading="lazy">` + `react-lazy-load-image-component` | `react-lazy-load-image-component@1` |
| `shimmer` | Tailwind `animate-pulse` skeleton | built-in CSS |
| `lottie` | Motion (Lottie) | `motion@12` + `@lottiefiles/dotlottie-react` |
| `flutter_animate` | Motion | `motion@12` |
| `animations` (Material) | Motion | `motion@12` |
| `page_transition` | React Router + Motion layout | `motion@12` |
| `flutter_spinkit` | CSS spinner or `react-loading-skeleton` | `react-loading-skeleton@3` |
| `pinput` | Custom `<input maxLength=1>` array | custom component |
| `numberpicker` | `<input type="number">` | native |
| `photo_view` | `react-image-gallery` or `yet-another-react-lightbox` | `yet-another-react-lightbox@3` |
| `image_picker` | `<input type="file" accept="image/*">` | native |
| `file_picker` | `<input type="file">` | native |

---

## Forms & Validation

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `flutter_form_builder` | React Hook Form + Zod | `react-hook-form@7` + `zod@3` + `@hookform/resolvers@3` |
| `formz` | Zod | `zod@3` |
| `email_validator` | `z.string().email()` | `zod@3` |

---

## Date & Time

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `intl` (DateFormat) | date-fns v4 | `date-fns@4` |
| `jiffy` | date-fns v4 | `date-fns@4` |
| `timeago` | `date-fns/formatDistanceToNow` | `date-fns@4` |
| `table_calendar` | `react-day-picker` v9 | `react-day-picker@9` |

---

## Charts & Data Visualisation

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `fl_chart` | Recharts | `recharts@2` |
| `syncfusion_flutter_charts` | Recharts or Nivo | `recharts@2` or `@nivo/core` |
| `charts_flutter` | Recharts | `recharts@2` |
| `graphic` | Recharts | `recharts@2` |

---

## Tables & Lists

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `data_table_2` | TanStack Table v8 | `@tanstack/react-table@8` |
| `pluto_grid` | TanStack Table v8 | `@tanstack/react-table@8` |
| `flutter_slidable` | Custom swipe or context menu | `@radix-ui/react-context-menu` |
| `infinite_scroll_pagination` | TanStack Query infinite | `@tanstack/react-query@5` `useInfiniteQuery` |

---

## Maps

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `google_maps_flutter` | `@vis.gl/react-google-maps` | `@vis.gl/react-google-maps@1` |
| `flutter_map` (Leaflet) | `react-leaflet` | `react-leaflet@5` |
| `mapbox_gl` | `react-map-gl` | `react-map-gl@8` |

---

## Storage / Local DB

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `shared_preferences` | `localStorage` wrapper (secure) | custom `useLocalStorage` hook |
| `hive` | `idb-keyval` (IndexedDB) | `idb-keyval@6` |
| `drift` (moor) | Dexie.js | `dexie@4` |
| `sqflite` | Dexie.js | `dexie@4` |
| `flutter_secure_storage` | `httpOnly` cookie via server | server-side only |

---

## Printing & PDF

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `printing` | `react-to-print` | `react-to-print@3` |
| `pdf` (dart_pdf) | `@react-pdf/renderer` | `@react-pdf/renderer@3` |
| `screenshot` | `html-to-image` | `html-to-image@1` |

---

## QR / Barcode

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `qr_flutter` | `qrcode.react` | `qrcode.react@4` |
| `mobile_scanner` / `barcode_scanner` | `@zxing/browser` | `@zxing/browser@0.1` |
| `flutter_barcode_scanner` | `@zxing/browser` | `@zxing/browser@0.1` |

---

## Payments

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `flutter_stripe` | `@stripe/react-stripe-js` | `@stripe/react-stripe-js@3` + `@stripe/stripe-js@5` |
| `pay` (Google/Apple Pay) | Stripe Payment Request | `@stripe/react-stripe-js@3` |
| `razorpay_flutter` | Razorpay JS SDK | `razorpay-web@1` |

---

## Notifications / Messaging

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `firebase_messaging` (FCM) | `firebase/messaging` + Service Worker | `firebase@11` |
| `awesome_notifications` | `sonner` (in-app) | `sonner@2` |
| `flutter_local_notifications` | Web Notifications API | native browser API |

---

## Misc Utilities

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `uuid` | `uuid` | `uuid@10` |
| `crypto` | `crypto-js` or Web Crypto API | Web Crypto (native) |
| `url_launcher` | `<a href>` or `window.open` | native |
| `share_plus` | Web Share API | native |
| `clipboard` | `navigator.clipboard.writeText` | native |
| `connectivity_plus` | `navigator.onLine` + `online` event | native |
| `device_info_plus` | `ua-parser-js` | `ua-parser-js@2` |
| `package_info_plus` | `import.meta.env.VITE_APP_VERSION` | env var |
| `flutter_dotenv` | `import.meta.env.VITE_*` | Vite built-in |
| `logger` | `pino` (structured) | `pino@9` + `pino-pretty` |
| `get_it` (DI) | React Context or module singletons | built-in |
| `injectable` | No direct equivalent \u2014 use module singletons | N/A |

---

## Internationalisation

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `intl` (l10n) | `i18next` + `react-i18next` | `i18next@23` + `react-i18next@15` |
| `easy_localization` | `react-i18next` | `react-i18next@15` |
| `slang` | `i18next` | `i18next@23` |

---

## Error Monitoring

| Flutter Package | React Equivalent | npm Package |
|-----------------|-----------------|-------------|
| `sentry_flutter` | `@sentry/react` | `@sentry/react@8` |
| `firebase_crashlytics` | `@sentry/react` | `@sentry/react@8` |

---

## Version Pinning Strategy

Always install with an explicit major version to avoid breaking changes:
```bash
# Good
npm install zustand@5 react-router-dom@7 @tanstack/react-query@5

# Avoid
npm install zustand react-router-dom  # picks whatever latest major is
```

After installing, commit `package-lock.json` and add `npm audit` to CI.
