# State Management Migration Patterns

## Provider / ChangeNotifier → React Context + useReducer

```dart
// Flutter
class CartProvider extends ChangeNotifier {
  List<Item> _items = [];
  void add(Item i) { _items.add(i); notifyListeners(); }
}
```
```tsx
// React
type Action = { type: 'ADD'; item: Item };
function cartReducer(state: Item[], action: Action) {
  if (action.type === 'ADD') return [...state, action.item];
  return state;
}
const CartContext = createContext<[Item[], Dispatch<Action>]>([[], () => {}]);
export function CartProvider({ children }: PropsWithChildren) {
  const value = useReducer(cartReducer, []);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
```

## Riverpod StateNotifier → Zustand

```dart
// Flutter
class ProductNotifier extends StateNotifier<List<Product>> {
  ProductNotifier() : super([]);
  Future<void> load() async { state = await api.fetch(); }
}
final productProvider = StateNotifierProvider((ref) => ProductNotifier());
```
```ts
// React (Zustand)
interface ProductStore { items: Product[]; load: () => Promise<void>; }
export const useProductStore = create<ProductStore>((set) => ({
  items: [],
  load: async () => set({ items: await api.fetch() }),
}));
```

## Bloc / Cubit → Redux Toolkit (RTK)

```ts
// React (RTK)
const productSlice = createSlice({
  name: 'products',
  initialState: [] as Product[],
  reducers: { set: (_, a) => a.payload },
  extraReducers: (b) => b.addCase(fetchProducts.fulfilled, (_, a) => a.payload),
});
export const fetchProducts = createAsyncThunk('products/fetch', api.fetch);
```

## GetX Controller → Zustand

```ts
// React (Zustand)
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  login: async (email, pass) => {
    const user = await auth.signIn(email, pass);
    set({ user });
  },
  logout: () => { auth.signOut(); set({ user: null }); },
}));
```

## FutureBuilder → React Query useQuery

```dart
// Flutter
FutureBuilder<List<Product>>(
  future: api.fetchProducts(),
  builder: (ctx, snap) {
    if (snap.hasError) return Text('Error');
    if (!snap.hasData) return CircularProgressIndicator();
    return ProductList(items: snap.data!);
  },
)
```
```tsx
// React
function ProductScreen() {
  const { data, isLoading, error } = useQuery({ queryKey: ['products'], queryFn: api.fetchProducts });
  if (isLoading) return <Spinner />;
  if (error) return <p>Error</p>;
  return <ProductList items={data!} />;
}
```

## StreamBuilder → useEffect subscription

```dart
// Flutter
StreamBuilder<User?>(
  stream: FirebaseAuth.instance.authStateChanges(),
  builder: (ctx, snap) => snap.data == null ? LoginScreen() : HomeScreen(),
)
```
```tsx
// React
function App() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub; // cleanup
  }, []);
  return user ? <HomeScreen /> : <LoginScreen />;
}
```
