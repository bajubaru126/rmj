# Dashboard Map - Update Lengkap

## ✅ Yang Sudah Dikerjakan

### 1. Route STO untuk Semua Project

Semua 12 project sekarang memiliki route STO dengan detail lengkap:

- PRJ-001: Jakarta (3 routes)
- PRJ-002: Surabaya (2 routes)
- PRJ-003: Bandung (2 routes)
- PRJ-004: Medan (2 routes)
- PRJ-005: Bali (3 routes)
- PRJ-006: Makassar (2 routes)
- PRJ-007: Semarang (2 routes)
- PRJ-008: Palembang (2 routes)
- PRJ-009: Yogyakarta (2 routes)
- PRJ-010: Balikpapan (2 routes)
- PRJ-011: Manado (2 routes)
- PRJ-012: Pontianak (2 routes)

### 2. Perbaikan Bug Posisi Marker

**Problem**: Marker bergeser saat zoom in/out
**Solution**:

- Ubah anchor dari `'bottom'` ke `'center'`
- Hapus elemen arrow/pointer
- Simplifikasi HTML marker (single div 40x40px)
- Posisi sekarang stabil di semua zoom level

### 3. Perbaikan Koordinat Awal

**Problem**: Map awal ngawur ke laut
**Solution**:

- Center: `[118.0, -2.0]` (sebelumnya -2.5)
- Zoom: `5` (sebelumnya 4.5)
- Pitch: `0` (sebelumnya 45)

### 4. Perbaikan Icon Blur

**Solution**: Tambah CSS optimization

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
image-rendering: -webkit-optimize-contrast;
image-rendering: crisp-edges;
```

## Fitur Route STO

### Tampilan Route

- Linestring dengan warna berbeda per jenis tanah
- Start point (🟢) dan end point (🔴)
- Legend jenis tanah di pojok kiri atas
- Popup detail saat click route/endpoint

### Jenis Tanah

10 jenis tanah dengan warna unik:

- Tanah Liat (Clay) - Coklat tua
- Tanah Berpasir (Sandy) - Sandy brown
- Tanah Lempung (Loam) - Chocolate
- Tanah Humus (Humus) - Dark brown
- Tanah Kapur (Limestone) - Beige
- Tanah Gambut (Peat) - Dark slate
- Tanah Laterit (Laterite) - Indian red
- Tanah Aluvial (Alluvial) - Goldenrod
- Tanah Vulkanik (Volcanic) - Dim gray
- Tanah Podsolik (Podzolic) - Rosy brown

## Testing Checklist

- [x] Posisi marker stabil saat zoom
- [x] Semua 12 project punya route
- [x] Route tampil saat project diklik
- [x] Legend jenis tanah muncul
- [x] Popup route berfungsi
- [x] Panel detail menampilkan list route
- [x] Koordinat awal benar (tidak ke laut)
- [x] Icon tidak blur

## File yang Dimodifikasi

1. `src/types/map.ts` - Interface ProjectRoute
2. `src/data/projectLocations.ts` - Route untuk 12 project
3. `src/components/map/MapView.tsx` - Rendering + fix marker
4. `src/components/map/ProjectDetailPanel.tsx` - Display route info
