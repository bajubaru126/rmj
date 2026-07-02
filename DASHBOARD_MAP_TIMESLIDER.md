# Dashboard Map - TimeSlider Widget

## ✅ Fitur Baru: Timeline Filter

### Overview

Menambahkan TimeSlider widget untuk memfilter project berdasarkan rentang waktu, mirip dengan Historical TimeSlider pada aplikasi GIS.

## Fitur TimeSlider

### 1. **Main Slider**

- Slider utama untuk navigasi timeline
- Menampilkan bulan/tahun saat ini
- Progress bar berwarna biru
- Tick marks setiap 6 bulan dengan label tanggal

### 2. **Range Sliders**

- **Start Range**: Filter tanggal mulai (hijau)
- **End Range**: Filter tanggal akhir (merah)
- Project hanya ditampilkan jika dalam rentang waktu

### 3. **Playback Controls**

- ⏮️ **Reset**: Kembali ke awal timeline
- ▶️ **Play/Pause**: Auto-play timeline
- ⏭️ **Skip to End**: Langsung ke akhir timeline
- **Speed Control**: 0.5x, 1x, 2x, 4x

### 4. **Display**

- Tanggal saat ini (besar, biru)
- Rentang tanggal yang dipilih
- Counter bulan (Bulan X dari Y)

## Data Project

### Total: 30 Project

Ditambahkan 18 project baru dengan tanggal bervariasi:

**2023 Projects (Completed):**

- PRJ-013: Aceh (Mar-Dec 2023)
- PRJ-020: Denpasar (May 2023-Jan 2024)
- PRJ-025: Palu (Jun 2023-Mar 2024)
- PRJ-029: Ternate (Sep 2023-Jun 2024)

**2024 Projects (Active/Construction):**

- PRJ-001: Jakarta (Jan-Dec 2024)
- PRJ-002: Surabaya (Mar 2024-Feb 2025)
- PRJ-004: Medan (Feb-Aug 2024)
- PRJ-005: Bali (completed)
- PRJ-006: Makassar (Apr 2024-Apr 2025)
- PRJ-007: Semarang (Jan-Oct 2024)
- PRJ-009: Yogyakarta (Feb-Nov 2024)
- PRJ-010: Balikpapan (Mar 2024-Mar 2025)
- PRJ-011: Manado (completed)
- PRJ-012: Pontianak (Jan-Dec 2024)
- PRJ-014: Lampung (Feb 2024-Jan 2025)
- PRJ-015: Batam (Apr 2024-Mar 2025)
- PRJ-017: Malang (Jan-Oct 2024)
- PRJ-018: Samarinda (Mar 2024-Feb 2025)
- PRJ-019: Pekanbaru (Nov 2023-Aug 2024)
- PRJ-021: Padang (May 2024-Jun 2025)
- PRJ-023: Mataram (Feb-Nov 2024)
- PRJ-024: Kupang (Apr 2024-Apr 2025)
- PRJ-026: Kendari (Jan-Sep 2024)
- PRJ-027: Gorontalo (Jun 2024-May 2025)

**2024-2025 Projects (Planning/Future):**

- PRJ-003: Bandung (Jun 2024-Dec 2025)
- PRJ-008: Palembang (Jul 2024-Jun 2025)
- PRJ-016: Solo (Aug 2024-Dec 2025)
- PRJ-022: Jambi (Sep 2024-Aug 2025)
- PRJ-028: Ambon (Oct 2024-Dec 2025)

**2024-2026 Projects (Long-term):**

- PRJ-030: Jayapura (Jul 2024-Jun 2026)

## Cara Kerja

### Filter Logic

```typescript
const dateMatch =
  projectStart <= dateRange.end && projectEnd >= dateRange.start;
```

Project ditampilkan jika:

- Start date ≤ End range
- End date ≥ Start range

### Auto-play

- Interval berdasarkan speed (250ms - 2000ms)
- Otomatis berhenti di akhir timeline
- Dapat di-pause kapan saja

### Date Calculation

- Total months = (maxYear - minYear) × 12 + (maxMonth - minMonth)
- Current index = (currentYear - minYear) × 12 + (currentMonth - minMonth)

## UI/UX

### Position

- Bottom center map
- Width: 800px
- Background: white/95 dengan backdrop blur
- Shadow: 2xl untuk depth

### Colors

- Main slider: Blue (#3b82f6)
- Start range: Green
- End range: Red
- Text: Gray scale

### Responsive

- Tick marks setiap 6 bulan
- Labels auto-format (MMM YYYY)
- Smooth transitions

## Testing

### Skenario Test:

1. **Initial Load**
   - Semua 30 project tampil
   - Timeline dari 2023-2026

2. **Play Timeline**
   - Click play button
   - Project muncul/hilang sesuai tanggal
   - Auto-stop di akhir

3. **Range Filter**
   - Geser start range ke 2024
   - Hanya project 2024+ yang tampil
   - Geser end range ke 2024
   - Hanya project 2024 yang tampil

4. **Speed Control**
   - Test 0.5x (lambat)
   - Test 4x (cepat)

5. **Reset**
   - Click reset
   - Kembali ke awal timeline
   - Semua project tampil

## File Modified/Created

### Created:

- `src/components/map/TimeSlider.tsx` - TimeSlider component

### Modified:

- `src/pages/DashboardMap.tsx` - Integrate TimeSlider
- `src/data/projectLocations.ts` - Add 18 new projects (total 30)

## Benefits

✅ **Visual Timeline**: Lihat evolusi project dari waktu ke waktu
✅ **Historical Analysis**: Analisis project yang sudah selesai
✅ **Future Planning**: Lihat project yang akan datang
✅ **Interactive**: Play/pause, speed control, range filter
✅ **Professional**: UI mirip GIS tools (ArcGIS, QGIS)

## Next Steps

- Add animation saat project muncul/hilang
- Add statistics per periode
- Export timeline data
- Add milestone markers
- Integration dengan backend API
