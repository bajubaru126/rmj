# Auto Logout Feature Documentation

## Overview
Fitur auto logout akan mendeteksi ketika token JWT expired dan menampilkan modal dengan countdown timer. Setelah countdown selesai, user akan otomatis logout dan diarahkan ke halaman login.

## Cara Kerja

### 1. Token Expiration Detection
- **Periodic Check**: Setiap 30 detik, sistem akan mengecek apakah token akan expired
- **Warning Time**: Modal akan muncul 60 detik sebelum token expired
- **API Response**: Jika API mengembalikan 401 (Unauthorized), modal akan langsung muncul

### 2. Modal Countdown
- **Countdown Duration**: 10 detik (dapat dikonfigurasi)
- **Auto Logout**: Setelah countdown selesai, user otomatis logout
- **Manual Logout**: User dapat klik tombol "Logout Now" untuk logout sebelum countdown selesai

### 3. Components

#### `TokenExpiredModal.tsx`
Modal yang menampilkan:
- Warning icon dan pesan "Session Expired"
- Countdown timer dengan animasi
- Tombol "Logout Now" untuk logout manual
- Auto logout ketika countdown mencapai 0

#### `useTokenExpiration.ts`
Hook yang menangani:
- Decode JWT token untuk mendapatkan expiration time
- Periodic checking setiap 30 detik
- Listen untuk event `token-expired` dari API interceptor
- Trigger modal ketika token expired atau akan expired

#### `apiInterceptor.ts`
Interceptor yang:
- Override `window.fetch` untuk menangkap semua API calls
- Detect 401 response dari backend
- Dispatch event `token-expired` untuk trigger modal

### 4. Configuration

Di `App.tsx`, konfigurasi dapat diubah:

```typescript
const { showExpiredModal, handleLogout, countdownTime } = useTokenExpiration({
  checkInterval: 30000,  // Check setiap 30 detik
  warningTime: 60000,    // Warning 60 detik sebelum expired
  countdownTime: 10      // Countdown 10 detik
});
```

## Testing

### Test Manual
1. Login ke aplikasi
2. Tunggu hingga token hampir expired (atau ubah `warningTime` menjadi lebih kecil untuk testing)
3. Modal akan muncul dengan countdown
4. Setelah countdown selesai, user akan logout otomatis

### Test dengan API 401
1. Login ke aplikasi
2. Hapus atau ubah token di localStorage
3. Lakukan action yang membutuhkan API call (misal: upload file)
4. Modal akan muncul karena API mengembalikan 401

## Features

✅ **Auto Detection**: Deteksi otomatis token expired
✅ **Countdown Timer**: Visual countdown 10 detik
✅ **Manual Logout**: User dapat logout sebelum countdown selesai
✅ **API Interceptor**: Menangkap 401 response dari semua API calls
✅ **Responsive Design**: Modal responsive dan user-friendly
✅ **No Duplicate**: Modal hanya muncul sekali meskipun banyak API call yang gagal

## UI/UX

- **Modal Design**: Gradient merah dengan icon warning
- **Countdown Display**: Angka besar dengan animasi
- **Button**: Gradient merah dengan hover effect
- **Z-Index**: 9999 untuk memastikan modal selalu di atas
- **Backdrop**: Semi-transparent black overlay

## Security

- Token disimpan di localStorage
- Token di-decode untuk mendapatkan expiration time
- Tidak ada sensitive data yang di-log ke console (hanya preview token)
- Auto logout memastikan user tidak bisa mengakses aplikasi dengan token expired
