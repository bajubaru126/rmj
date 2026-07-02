# Dashboard Map - Fitur Route STO

## Overview

Dashboard Map sekarang menampilkan route STO (Station to Station) untuk setiap project yang diklik, mirip dengan fitur KML viewer.

## Fitur Utama

### 1. View Awal - List Project

- Menampilkan semua project sebagai marker di map
- Marker berwarna sesuai status project
- Icon berbeda untuk setiap tipe project (tower, fiber, infrastructure, maintenance)
- Hover pada marker menampilkan popup informasi singkat
- **Fix**: Koordinat awal map diperbaiki ke center Indonesia yang benar (tidak lagi ngawur ke laut)
- **Fix**: Icon marker tidak blur lagi dengan CSS optimization
- **Fix**: Posisi marker stabil saat zoom in/out (menggunakan anchor: 'center')

### 2. Detail Project dengan Route STO

Ketika project diklik:

- Map zoom ke area project
- Menampilkan route linestring dari STO to STO
- Setiap route memiliki:
  - Warna berbeda berdasarkan jenis tanah (soil type)
  - Start point (🟢) dan end point (🔴)
  - Informasi: nama route, STO from/to, panjang, jenis tanah
- Legend jenis tanah ditampilkan di pojok kiri atas
- Panel detail di kanan menampilkan semua route dalam project

### 3. Interaksi Route

- **Hover**: Cursor berubah menjadi pointer
- **Click pada line**: Menampilkan popup dengan detail route
- **Click pada endpoint**: Menampilkan popup dengan info STO

## Jenis Tanah (Soil Types)

Route diberi warna berdasarkan jenis tanah:

- 🟤 Tanah Liat (Clay) - #8B4513
- 🟠 Tanah Berpasir (Sandy) - #F4A460
- 🟫 Tanah Lempung (Loam) - #D2691E
- ⚫ Tanah Humus (Humus) - #654321
- ⚪ Tanah Kapur (Limestone) - #F5F5DC
- ⬛ Tanah Gambut (Peat) - #2F4F4F
- 🔴 Tanah Laterit (Laterite) - #CD5C5C
- 🟡 Tanah Aluvial (Alluvial) - #DAA520
- ⚫ Tanah Vulkanik (Volcanic) - #696969
- 🟤 Tanah Podsolik (Podzolic) - #BC8F8F

## Data Structure

### ProjectRoute

```typescript
interface ProjectRoute {
  id: string;
  name: string;
  stoFrom: string;
  stoTo: string;
  soilType: string;
  color: string;
  coordinates: [number, number][];
  length: number; // in meters
  description?: string;
}
```

### ProjectLocation (Updated)

```typescript
interface ProjectLocation {
  // ... existing fields
  routes?: ProjectRoute[];
}
```

## Project dengan Route (Semua 12 Project)

Semua project sekarang memiliki route STO:

- **PRJ-001**: Jakarta Tower Modernization (3 routes)
- **PRJ-002**: Surabaya Fiber Optic Expansion (2 routes)
- **PRJ-003**: Bandung Smart City Infrastructure (2 routes)
- **PRJ-004**: Medan Network Maintenance (2 routes)
- **PRJ-005**: Bali Tourism Network (3 routes)
- **PRJ-006**: Makassar Port Connectivity (2 routes)
- **PRJ-007**: Semarang Industrial Zone (2 routes)
- **PRJ-008**: Palembang City Network (2 routes)
- **PRJ-009**: Yogyakarta Campus Network (2 routes)
- **PRJ-010**: Balikpapan Energy Sector (2 routes)
- **PRJ-011**: Manado Tourism Infrastructure (2 routes)
- **PRJ-012**: Pontianak Border Network (2 routes)

## Perbaikan Bug

### 1. Koordinat Ngawur ke Laut

**Problem**: Map awal menampilkan koordinat di tengah laut
**Solution**:

- Ubah center dari `[118.0, -2.5]` ke `[118.0, -2.0]`
- Ubah zoom dari `4.5` ke `5`
- Ubah pitch dari `45` ke `0` untuk view awal yang lebih flat

### 2. Icon Blur saat Hover

**Problem**: Icon marker kabur saat hover
**Solution**: Tambahkan CSS optimization:

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
image-rendering: -webkit-optimize-contrast;
image-rendering: crisp-edges;
```

### 3. Posisi Marker Berubah-ubah saat Zoom

**Problem**: Marker bergeser posisinya saat zoom in/out atau pan
**Solution**:

- Ubah anchor dari `'bottom'` ke `'center'`
- Hapus elemen arrow/pointer di bawah marker
- Simplifikasi struktur HTML marker menjadi single div
- Gunakan fixed width/height (40x40px) tanpa flex-direction column

## File yang Dimodifikasi

1. `src/types/map.ts` - Tambah interface ProjectRoute
2. `src/data/projectLocations.ts` - Tambah data route untuk SEMUA 12 project
3. `src/components/map/MapView.tsx` - Implementasi route rendering + fix marker position
4. `src/components/map/ProjectDetailPanel.tsx` - Tampilkan list route

## Testing

1. Buka Dashboard Map
2. Verifikasi posisi marker stabil saat zoom in/out
3. Klik semua project (PRJ-001 sampai PRJ-012)
4. Verifikasi setiap project menampilkan route
5. Test interaksi:
   - Map zoom ke area route
   - Route line muncul dengan warna berbeda
   - Start/end point muncul
   - Legend jenis tanah muncul
   - Click pada route menampilkan popup
   - Panel detail menampilkan list route

## Next Steps

- Integrasi dengan backend API untuk data route real
- Tambahkan fitur upload KML untuk route
- Tambahkan evidence photos untuk setiap route
- Tambahkan filter route berdasarkan jenis tanah
