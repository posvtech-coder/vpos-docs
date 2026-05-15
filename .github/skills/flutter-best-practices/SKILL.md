---
name: flutter-best-practices
description: "On-demand Flutter + Firebase best-practices knowledge base and code pattern library. Use when: looking up recommended Flutter patterns, checking Firebase integration best practices, verifying architecture decisions, reviewing state management approaches, or need canonical code templates for common Flutter scenarios."
---

# Flutter + Firebase Best Practices Knowledge Base

## Architecture Patterns

### Clean Architecture Layer Rules
- **Entities** (`domain/entities/`): Pure Dart, zero Flutter/Firebase imports
- **Repository interfaces** (`domain/repositories/`): Abstract, returns `Either<Failure, T>` or `Stream<T>`
- **Repository implementations** (`data/repositories/`): Converts DTO ↔ entity, handles exceptions
- **Use cases** (`domain/usecases/`): Single public method `call()`, one responsibility
- **State notifiers / Cubits** (`presentation/providers/`): Call use cases, never touch datasources directly
- **Widgets** (`presentation/`): Read state, dispatch events — no business logic

### Riverpod Patterns (Preferred)

```dart
// ✅ Async provider with auto-dispose
@riverpod
Future<List<Product>> productList(ProductListRef ref) async {
  final repo = ref.watch(productRepositoryProvider);
  return repo.getAll();
}

// ✅ State notifier for mutations
@riverpod
class CartNotifier extends _$CartNotifier {
  @override
  CartState build() => CartState.empty();

  Future<void> addItem(Product product) async {
    state = state.copyWith(status: CartStatus.loading);
    final result = await ref.read(addToCartUseCaseProvider).call(product);
    result.fold(
      (failure) => state = state.copyWith(status: CartStatus.error, error: failure.message),
      (cart) => state = state.copyWith(status: CartStatus.success, cart: cart),
    );
  }
}
```

### Firestore Best Practices

```dart
// ✅ Always use .withConverter() for type safety
final productsRef = FirebaseFirestore.instance
    .collection('products')
    .withConverter<Product>(
      fromFirestore: (snap, _) => Product.fromFirestore(snap),
      toFirestore: (product, _) => product.toFirestore(),
    );

// ✅ Offline persistence (configure once in main.dart)
await FirebaseFirestore.instance.enablePersistence(
  const PersistenceSettings(synchronizeTabs: true),
);

// ✅ Always handle FirebaseException specifically
try {
  await docRef.set(data);
} on FirebaseException catch (e) {
  // Handle specific error codes
  if (e.code == 'permission-denied') { /* ... */ }
  throw FirestoreFailure.fromCode(e.code);
}

// ✅ Paginated queries
Query<Product> paginatedQuery(DocumentSnapshot? lastDoc) {
  var query = productsRef.orderBy('name').limit(20);
  if (lastDoc != null) query = query.startAfterDocument(lastDoc);
  return query;
}
```

### Firebase Auth Patterns

```dart
// ✅ Auth state stream — single source of truth
@riverpod
Stream<User?> authStateChanges(AuthStateChangesRef ref) {
  return FirebaseAuth.instance.authStateChanges();
}

// ✅ mounted check after every await in widgets
Future<void> _signIn() async {
  await authService.signIn(email, password);
  if (!mounted) return;  // <-- ALWAYS
  context.go('/dashboard');
}
```

### FCM Best Practices

```dart
// ✅ Request permission before subscribing
Future<void> initialiseFCM() async {
  final settings = await FirebaseMessaging.instance.requestPermission(
    alert: true, badge: true, sound: true,
  );
  if (settings.authorizationStatus != AuthorizationStatus.authorized) return;

  final token = await FirebaseMessaging.instance.getToken();
  await _saveTokenToFirestore(token);

  // Refresh handler
  FirebaseMessaging.instance.onTokenRefresh.listen(_saveTokenToFirestore);
}

// ✅ Background message handler must be top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Handle message
}
```

## State Management Decision Matrix

| Scenario | Solution |
|----------|----------|
| Simple local UI state (toggle, animation) | `setState` in small StatefulWidget |
| Feature-level async state with loading/error | Riverpod `AsyncNotifierProvider` |
| App-wide auth / user session | Riverpod `StreamProvider` |
| Complex multi-step form | Riverpod `NotifierProvider` |
| Real-time Firestore data | Riverpod `StreamProvider` |
| Offline-first with sync queue | Riverpod + Isar/Hive repository |

## Performance Checklist

### Widget Optimisation
```dart
// ✅ Use const everywhere possible
const SizedBox(height: 16)
const Text('Label', style: TextStyle(fontSize: 14))

// ✅ Extract stateless leaf widgets
class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product});
  final Product product;
  // ...
}

// ✅ RepaintBoundary for independently animating widgets
RepaintBoundary(child: AnimatedWidget(...))

// ✅ ListView.builder for lists (NEVER Column + map)
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ItemTile(item: items[index]),
)
```

### Image Optimisation
```dart
// ✅ Always cache network images
CachedNetworkImage(
  imageUrl: url,
  placeholder: (_, __) => const ShimmerBox(),
  errorWidget: (_, __, ___) => const Icon(Icons.broken_image),
  memCacheWidth: 300,  // Decode at display size
)
```

## Error Handling Standards

```dart
// ✅ Failure sealed class pattern
sealed class Failure {
  const Failure(this.message);
  final String message;
}
final class NetworkFailure extends Failure { const NetworkFailure() : super('No internet connection'); }
final class ServerFailure extends Failure { const ServerFailure(super.message); }
final class CacheFailure extends Failure { const CacheFailure(super.message); }

// ✅ Global Flutter error handler in main.dart
void main() {
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    FirebaseCrashlytics.instance.recordFlutterFatalError(details);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };
  runApp(const App());
}
```

## Navigation (GoRouter)

```dart
// ✅ Route guard with redirect
GoRouter(
  refreshListenable: GoRouterRefreshStream(authStateStream),
  redirect: (context, state) {
    final isLoggedIn = authState.value != null;
    final isOnAuthPage = state.matchedLocation == '/login';
    if (!isLoggedIn && !isOnAuthPage) return '/login';
    if (isLoggedIn && isOnAuthPage) return '/dashboard';
    return null;
  },
  routes: [...],
)
```

## Documentation Standards (DartDoc)

```dart
/// A repository that manages product data from Firestore.
///
/// This repository implements the offline-first pattern: reads come from
/// local cache (Hive) and writes are queued for Firestore sync.
///
/// Example:
/// ```dart
/// final products = await ref.read(productRepositoryProvider).getAll();
/// ```
abstract class ProductRepository {
  /// Returns all products for the given [branchId].
  ///
  /// Throws [NetworkFailure] when offline and cache is empty.
  /// Throws [ServerFailure] on Firestore permission errors.
  Future<List<Product>> getAll({required String branchId});
}
```

## Security Checklist

- [ ] `flutter_secure_storage` for tokens and secrets (never SharedPreferences for sensitive data)
- [ ] Firebase AppCheck enabled and enforced
- [ ] Firestore rules deny all by default — explicit allow only
- [ ] No API keys or secrets in Dart source code
- [ ] `--obfuscate --split-debug-info` in release builds
- [ ] Input validation on all user-supplied data before Firestore writes
- [ ] Deep link validation (don't trust incoming URI params blindly)

## Offline-First Sync Pattern

```dart
// ✅ Write-through cache with sync queue
Future<void> createTransaction(Transaction tx) async {
  // 1. Write to local DB immediately (optimistic)
  await localDb.insert(tx);
  // 2. Queue for remote sync
  await syncQueue.enqueue(SyncTask.create(collection: 'transactions', data: tx.toJson()));
  // 3. Attempt immediate sync if online
  if (await connectivity.isOnline) {
    await syncService.processQueue();
  }
}
```

## Self-Update Protocol

When the Flutter Expert agent discovers a new pattern or best practice during a task, it should append it to this skill under the appropriate section with:
- A descriptive heading
- The problem it solves
- A code example
- Date added (as a DartDoc `@since` annotation in the comment)
