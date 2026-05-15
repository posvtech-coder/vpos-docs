# Web-Native Enhancements

Guidelines for improving upon Flutter web during React migration.

## Storage Patterns

### localStorage (Persistent Across Sessions)

```typescript
// User preferences
const preferences = {
  theme: 'light' | 'dark',
  sidebarCollapsed: boolean,
  tablePageSize: number,
  defaultView: 'grid' | 'list',
};

// Save preference
localStorage.setItem('user_preferences', JSON.stringify(preferences));

// Load preference
const saved = localStorage.getItem('user_preferences');
const prefs = saved ? JSON.parse(saved) : defaultPreferences;
```

### sessionStorage (Cleared on Tab Close)

```typescript
// Temporary filter state (cleared when user closes tab)
sessionStorage.setItem('employees_search', searchQuery);
sessionStorage.setItem('employees_filter', JSON.stringify(filters));

// Restore on component mount
const [searchQuery, setSearchQuery] = useState(
  () => sessionStorage.getItem('employees_search') || ''
);
```

### Zustand (In-Memory State)

```typescript
// Auth tokens - NEVER in localStorage/sessionStorage
// Already handled by useAuthStore (tokens stay in memory only)
```

## Interaction Enhancements

### Hover States (Desktop)

```typescript
// Use Tailwind hover: variants
<button className="bg-blue-600 hover:bg-blue-700 hover:shadow-lg transition-all duration-200">
  Save
</button>

// Hover tooltips on icon buttons
<button title="Edit employee" className="p-2 hover:bg-gray-100 rounded">
  <Edit className="w-4 h-4" />
</button>
```

### Tooltips (Radix UI)

```typescript
import * as Tooltip from '@radix-ui/react-tooltip';

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <button className="IconButton">
        <PlusIcon />
      </button>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content className="bg-gray-900 text-white px-3 py-2 rounded text-sm">
        Create new employee
        <Tooltip.Arrow className="fill-gray-900" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

### Loading Skeletons

```typescript
// Replace spinner with skeleton during data load
{loading ? (
  <div className="space-y-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    ))}
  </div>
) : (
  <DataTable data={data} />
)}
```

### Empty States

```typescript
// Better than "No data found"
<div className="text-center py-16">
  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-gray-900 mb-2">
    No branches yet
  </h3>
  <p className="text-gray-600 mb-6">
    Create your first branch to start managing your stores.
  </p>
  <button onClick={onCreate} className="btn-primary">
    <Plus className="w-5 h-5 mr-2" />
    Create First Branch
  </button>
</div>
```

## Navigation Improvements

### Simplified Routes (vs Flutter)

```typescript
// ❌ Flutter (redundant paths)
'/admin/dashboard/employee-management'
'/admin/dashboard/employee-management/create'
'/admin/dashboard/employee-management/:id'

// ✅ React (clean paths)
'/admin/employees'
'/admin/employees/create'
'/admin/employees/:id'
```

### Breadcrumbs for Deep Navigation

```typescript
<nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
  <Link to="/admin" className="hover:text-primary">Admin</Link>
  <ChevronRight className="w-4 h-4" />
  <Link to="/admin/employees" className="hover:text-primary">Employees</Link>
  <ChevronRight className="w-4 h-4" />
  <span className="text-gray-900 font-medium">Create</span>
</nav>
```

### Back Button (Browser-Native)

```typescript
// Use navigate(-1) for browser back
const navigate = useNavigate();
<button onClick={() => navigate(-1)}>
  <ArrowLeft /> Back
</button>

// Or explicit path for specific route
<button onClick={() => navigate('/admin/employees')}>
  Back to Employees
</button>
```

## Form Enhancements

### Inline Validation

```typescript
// Show errors as user types (not just on submit)
<input
  {...register('email', { 
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address',
    },
  })}
  className={errors.email ? 'input border-red-500' : 'input'}
  onBlur={() => trigger('email')} // Validate on blur
/>
{errors.email && (
  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
    <AlertCircle className="w-4 h-4" />
    {errors.email.message}
  </p>
)}
```

### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateEmployee,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['employee', id] });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['employee', id]);
    
    // Optimistically update
    queryClient.setQueryData(['employee', id], newData);
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['employee', id], context.previous);
    toast.error('Update failed. Please try again.');
  },
  onSuccess: () => {
    toast.success('Employee updated successfully');
  },
});
```

## Accessibility Enhancements

### Keyboard Shortcuts

```typescript
// Add keyboard shortcuts for power users
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearchModal();
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);

// Show hint to users
<button onClick={openSearch} className="btn-secondary">
  <Search className="w-4 h-4" />
  Search
  <kbd className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded">⌘K</kbd>
</button>
```

### Focus Management

```typescript
// Auto-focus search input when search bar opens
const searchInputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (isSearchVisible && searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, [isSearchVisible]);

<input
  ref={searchInputRef}
  type="text"
  placeholder="Search..."
  className="input"
/>
```

### ARIA Labels

```typescript
// Proper labels for icon-only buttons
<button
  onClick={onDelete}
  className="p-2 text-red-600 hover:bg-red-50 rounded"
  aria-label="Delete employee"
  title="Delete employee"
>
  <Trash2 className="w-4 h-4" />
</button>
```

## Performance Patterns

### Debounced Search

```typescript
import { useDebouncedValue } from '@/hooks/useDebounce';

const [searchInput, setSearchInput] = useState('');
const debouncedSearch = useDebouncedValue(searchInput, 300);

// Use debounced value for filtering
const filtered = useMemo(() => {
  return items.filter(item => 
    item.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );
}, [items, debouncedSearch]);
```

### Virtual Scrolling (Large Lists)

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);
const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // Row height
});

<div ref={parentRef} className="h-[600px] overflow-auto">
  <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
    {rowVirtualizer.getVirtualItems().map((virtualRow) => (
      <div
        key={virtualRow.index}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
      >
        <ItemRow item={items[virtualRow.index]} />
      </div>
    ))}
  </div>
</div>
```

## Animation Guidelines

### Smooth Transitions (≤200ms)

```typescript
// Card hover
<div className="card hover:shadow-lg transition-shadow duration-200">

// Sidebar expand/collapse
<aside className="sidebar transition-all duration-200 ease-out">

// Modal fade in
<div className="modal opacity-0 animate-fadeIn">
```

### Loading Animations

```typescript
// Spinner (for quick operations)
<Loader2 className="w-6 h-6 animate-spin text-primary" />

// Progress bar (for file uploads, long operations)
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-primary h-2 rounded-full transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

## Flutter vs React Comparison

| Feature | Flutter Web | React Best Practice |
|---------|-------------|---------------------|
| Hover | Limited support | Full hover states with CSS |
| Tooltips | Manual Overlay | Radix UI Tooltip |
| Focus | Basic | Full keyboard navigation |
| Forms | Manual validation | react-hook-form + Zod |
| Lists | ListView | Virtual scrolling for 100+ items |
| Search | Immediate filter | Debounced (300ms) |
| Loading | CircularProgressIndicator | Skeletons + spinners |
| Storage | SharedPreferences | localStorage + sessionStorage |
| Navigation | Complex routes | Clean URL structure |
| Back button | Custom logic | Browser-native navigate(-1) |

## Summary

**Goal:** Build a better web app than Flutter web could deliver.

- Use web-native patterns (localStorage, hover, focus)
- Add professional polish (tooltips, skeletons, empty states)
- Simplify navigation (clean URLs, breadcrumbs)
- Optimize performance (debounce, virtual scrolling)
- Enhance accessibility (keyboard shortcuts, ARIA)
- Smooth animations (≤200ms, ease-out)
