# Designator Management - Frontend Guide

## 📋 Overview

Halaman Designator Management adalah interface untuk mengelola designator V2 yang mencakup material, equipment, dan service. Halaman ini terintegrasi penuh dengan backend API dan mengikuti design pattern yang sama dengan halaman lain di aplikasi.

---

## 🎯 Features

### Core Features
- ✅ View all designators dalam table format
- ✅ Create new designator
- ✅ Edit existing designator
- ✅ Delete designator
- ✅ Search designators
- ✅ Filter by category
- ✅ Filter by sub-category
- ✅ Sort by multiple columns
- ✅ Real-time data sync dengan backend

### UI/UX Features
- Modern glassmorphism design
- Responsive layout
- Loading states
- Error handling dengan toast notifications
- Modal dialogs dengan blur backdrop
- Sortable table columns
- Badge colors untuk categories
- Empty state illustrations

---

## 📁 File Structure

```
rmj-new-design/src/
├── pages/
│   ├── DesignatorManagement.tsx    # Main page component
│   └── Configuration.tsx            # Parent page with sub-tabs
├── services/
│   └── designatorV2Service.ts      # API service layer
└── App.tsx                          # Route configuration
```

---

## 🚀 How to Access

1. Login sebagai Admin
2. Navigate ke tab "Configuration"
3. Pilih sub-tab "Designator Management"

**Note:** Halaman ini hanya dapat diakses oleh user dengan role `admin`.

---

## 🔧 Technical Implementation

### Service Layer (`designatorV2Service.ts`)

```typescript
// Get all designators with optional filters
await designatorV2Service.getAllDesignators(category?, subCategory?);

// Get single designator
await designatorV2Service.getDesignatorById(id);

// Create new designator
await designatorV2Service.createDesignator(data);

// Update designator
await designatorV2Service.updateDesignator(id, data);

// Delete designator
await designatorV2Service.deleteDesignator(id);

// Get categories
await designatorV2Service.getAllCategories();

// Get sub-categories
await designatorV2Service.getSubCategoriesByCategory(category);
```

### Component Structure

```typescript
DesignatorManagement
├── Header Section
│   ├── Title & Icon
│   └── Action Buttons (Refresh, Add)
├── Search & Filter Bar
│   ├── Search Input
│   └── Category/Sub-Category Filters
├── Data Table
│   ├── Sortable Headers
│   ├── Data Rows
│   └── Action Buttons (Edit, Delete)
└── Modals
    ├── Create Modal
    ├── Edit Modal
    └── Delete Confirmation Modal
```

---

## 🎨 Design System

### Colors

**Category Badges:**
- Material: `bg-blue-100 text-blue-800`
- Equipment: `bg-green-100 text-green-800`
- Service: `bg-purple-100 text-purple-800`

**Buttons:**
- Primary (Add): Blue gradient `rgba(0, 94, 184, 0.95)` to `rgba(0, 119, 204, 0.95)`
- Danger (Delete): Red gradient `rgba(220, 38, 38, 0.95)` to `rgba(185, 28, 28, 0.95)`

### Typography
- Page Title: `text-xl font-semibold`
- Table Headers: `text-xs font-semibold uppercase`
- Body Text: `text-sm`

### Spacing
- Container Padding: `px-6 py-4`
- Modal Padding: `p-6`
- Button Padding: `px-4 py-2`

---

## 📊 Data Flow

```
User Action
    ↓
Component Handler
    ↓
Service Layer (designatorV2Service)
    ↓
API Request (fetch)
    ↓
Backend API (/designators-v2)
    ↓
Database (SurrealDB)
    ↓
Response
    ↓
Update State
    ↓
Re-render UI
```

---

## 🔍 Features Detail

### 1. Search Functionality

Search across multiple fields:
- Name
- Description
- Category
- Sub-category
- Number

```typescript
const filteredDesignators = designators.filter(
  (designator) =>
    designator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    designator.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    // ... other fields
);
```

### 2. Filter by Category

```typescript
// Fetch designators with category filter
await designatorV2Service.getAllDesignators('Material', undefined);

// Fetch designators with both filters
await designatorV2Service.getAllDesignators('Material', 'Kabel');
```

### 3. Sorting

Sortable columns:
- No
- Name
- Category
- Sub-Category
- Created At

Click column header to sort. Click again to reverse order.

### 4. CRUD Operations

**Create:**
1. Click "Tambah Designator" button
2. Fill form (No, Name, Description, Category, Sub-Category)
3. Click "Simpan"

**Edit:**
1. Click edit icon on row
2. Modify fields
3. Click "Update"

**Delete:**
1. Click delete icon on row
2. Confirm deletion
3. Click "Hapus"

---

## 🎯 Form Validation

All fields are required:
- ✅ No (number)
- ✅ Name (string)
- ✅ Description (string)
- ✅ Category (string)
- ✅ Sub-Category (string)

---

## 🔔 Toast Notifications

Success messages:
- ✅ "Designator berhasil ditambahkan"
- ✅ "Designator berhasil diupdate"
- ✅ "Designator berhasil dihapus"

Error messages:
- ❌ "Gagal memuat data designator"
- ❌ "Gagal menyimpan designator"
- ❌ "Gagal menghapus designator"

---

## 🎭 Modal States

### Create/Edit Modal
- Header: Blue gradient
- Form fields with validation
- Submit button: "Simpan" or "Update"
- Cancel button

### Delete Modal
- Header: Red gradient
- Warning message
- Designator details preview
- Confirm button: "Hapus"
- Cancel button

---

## 📱 Responsive Design

The page is fully responsive:
- Desktop: Full table view
- Tablet: Scrollable table
- Mobile: Horizontal scroll for table

---

## 🔐 Security

- Only admin users can access
- Authentication token required for API calls
- Token automatically included in service layer
- Unauthorized access redirected

---

## 🐛 Error Handling

```typescript
try {
  await designatorV2Service.createDesignator(formData);
  toast.success('Designator berhasil ditambahkan');
} catch (error) {
  toast.error(error instanceof Error ? error.message : 'Gagal menyimpan designator');
}
```

---

## 🔄 State Management

```typescript
const [designators, setDesignators] = useState<DesignatorV2[]>([]);
const [categories, setCategories] = useState<string[]>([]);
const [subCategories, setSubCategories] = useState<string[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState('');
const [filterCategory, setFilterCategory] = useState('');
const [filterSubCategory, setFilterSubCategory] = useState('');
const [sortField, setSortField] = useState<SortField>(null);
const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
const [modalType, setModalType] = useState<ModalType>(null);
```

---

## 🎨 Styling Approach

### Inline Styles (for gradients)
```typescript
style={{
  background: 'linear-gradient(135deg, rgba(0, 94, 184, 0.95) 0%, rgba(0, 119, 204, 0.95) 100%)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 4px 15px rgba(0, 94, 184, 0.3)'
}}
```

### Tailwind Classes (for layout)
```typescript
className="flex items-center gap-3 px-4 py-2 text-white rounded-lg"
```

---

## 🚦 Loading States

```typescript
{isLoading ? (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      <p className="text-sm text-gray-500">Memuat data...</p>
    </div>
  </div>
) : (
  // Table content
)}
```

---

## 📈 Performance Optimization

1. **Debounced Search**: Search executes on every keystroke (consider debouncing for large datasets)
2. **Memoization**: Consider using `useMemo` for filtered/sorted data
3. **Lazy Loading**: Consider pagination for large datasets
4. **Optimistic Updates**: Consider updating UI before API response

---

## 🧪 Testing Checklist

- [ ] Create designator with all fields
- [ ] Edit designator (partial update)
- [ ] Delete designator
- [ ] Search functionality
- [ ] Filter by category
- [ ] Filter by sub-category
- [ ] Sort by each column
- [ ] Modal open/close
- [ ] Form validation
- [ ] Error handling
- [ ] Loading states
- [ ] Toast notifications
- [ ] Responsive design

---

## 🔮 Future Enhancements

1. **Bulk Operations**
   - Bulk delete
   - Bulk edit
   - CSV import/export

2. **Advanced Filters**
   - Date range filter
   - Multiple category selection
   - Custom filters

3. **Pagination**
   - Server-side pagination
   - Items per page selector

4. **Search Improvements**
   - Debounced search
   - Advanced search with operators
   - Search history

5. **UI Enhancements**
   - Drag & drop reordering
   - Inline editing
   - Quick actions menu

---

## 📞 Support

Jika ada pertanyaan atau issue:
1. Check dokumentasi API di `API_DESIGNATORS_V2.md`
2. Check backend setup di `DESIGNATOR_V2_SETUP_GUIDE.md`
3. Review Postman collection untuk testing API
4. Contact development team

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
