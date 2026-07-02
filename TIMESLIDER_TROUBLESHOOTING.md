# TimeSlider Troubleshooting

## Issue: TimeSlider tidak muncul di UI

### Penyebab Potensial:

1. ❌ Z-index terlalu rendah (tertutup komponen lain)
2. ❌ Position bottom terlalu rendah (tertutup MapBottomBar)
3. ❌ Error saat render (check console)
4. ❌ Data project tidak valid

### Solusi yang Sudah Diterapkan:

#### 1. Increase Z-index

```tsx
// Sebelum: z-10
// Sesudah: z-50
<div className="... z-50">
```

#### 2. Adjust Bottom Position

```tsx
// Sebelum: bottom-6 (24px)
// Sesudah: bottom-20 (80px)
<div className="absolute bottom-20 ...">
```

#### 3. Add Border untuk Visibility

```tsx
<div className="... border border-gray-200">
```

#### 4. Add Console Logs

```tsx
console.log("Project Date Range:", projectDateRange);
console.log("Total Projects:", projects.length);
console.log("Filtered Projects:", filteredProjects.length);
```

### Cara Debugging:

#### 1. Check Browser Console

Buka Developer Tools (F12) dan lihat:

- Apakah ada error?
- Apakah console.log muncul?
- Berapa jumlah project?

#### 2. Check Element Inspector

- Klik kanan pada map → Inspect
- Cari element dengan class `bottom-20`
- Apakah element ada di DOM?
- Apakah style applied dengan benar?

#### 3. Check Z-index Stack

- Lihat z-index komponen lain:
  - MapBottomBar: z-?
  - ProjectDetailPanel: z-?
  - TimeSlider: z-50

#### 4. Temporary Test

Tambahkan style inline untuk test:

```tsx
<TimeSlider
  style={{
    position: 'fixed',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    backgroundColor: 'red' // untuk visibility
  }}
  ...
/>
```

### Expected Result:

TimeSlider harus muncul di bottom-center map dengan:

- Width: 800px
- Background: white/95 dengan blur
- Shadow: 2xl
- Border: gray-200
- Position: 80px dari bottom
- Z-index: 50

### Jika Masih Tidak Muncul:

#### Option 1: Pindahkan ke Top

```tsx
<div className="absolute top-20 left-1/2 ...">
```

#### Option 2: Pindahkan ke Sidebar

Integrasikan TimeSlider ke MapSidebar

#### Option 3: Buat Toggle Button

Tambahkan button untuk show/hide TimeSlider

### Quick Fix:

Jika urgent, gunakan inline style:

```tsx
<div
  style={{
    position: "absolute",
    bottom: "100px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    width: "800px",
    backgroundColor: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(8px)",
    borderRadius: "8px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    padding: "16px",
    border: "1px solid #e5e7eb",
  }}
>
  {/* TimeSlider content */}
</div>
```

## Verification Checklist:

- [ ] TimeSlider component imported
- [ ] TimeSlider rendered in JSX
- [ ] Props passed correctly
- [ ] No console errors
- [ ] Element exists in DOM
- [ ] Z-index higher than other components
- [ ] Position not overlapped
- [ ] Width fits screen
- [ ] Background visible
