<div align="center">
  <h1>TaskGrid</h1>
  <p><strong>Excel-inspired task management</strong> untuk tim dengan alur kerja cepat dan terstruktur.</p>
</div>

# Run and deploy your AI Studio app
## Overview

TaskGrid adalah aplikasi manajemen tugas berbasis React + Firebase yang dirancang untuk:
- Mengelola task per bulan dengan tampilan grid.
- Mengelompokkan pekerjaan berdasarkan project.
- Melacak status, prioritas, assignee, komentar, dan history perubahan.

## Key Features

- Google Sign-In authentication.
- Project-based task organization.
- Task status & priority tracking.
- Activity logs dan komentar per task.
- Cheat sheet view untuk referensi operasional tim.

This contains everything you need to run your app locally.
## Tech Stack

View your app in AI Studio: https://ai.studio/apps/c5f881d4-0e9f-4730-b550-1a2698b1296b
- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS + Lucide Icons + Motion
- **Backend:** Firebase Authentication + Cloud Firestore

## Run Locally
## Getting Started (Local Development)

**Prerequisites:**  Node.js
### Prerequisites

- Node.js 18+ (direkomendasikan)
- NPM
- Firebase project yang sudah aktif

### Installation

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
   ```bash
   npm install
   ```
2. Siapkan konfigurasi environment:
   - Copy `.env.example` ke `.env.local`
   - Isi variabel Firebase dan `GEMINI_API_KEY` sesuai environment Anda
3. Jalankan aplikasi:
   ```bash
   npm run dev
   ```
4. Build production:
   ```bash
   npm run build
   ```

## Contoh Project (Maret 2026)

Gunakan contoh berikut untuk uji coba data project dan task.

### Project

- **Nama:** Website Revamp Q2
- **Deskripsi:** Redesign website marketing dan optimasi performa.

### Task List

| Tanggal     | Task                                                     | Status       | Priority |
|-------------|----------------------------------------------------------|--------------|----------|
| 2026-03-04  | Audit halaman utama & baseline Lighthouse                | Todo         | High     |
| 2026-03-11  | Finalisasi wireframe homepage & pricing                 | In Progress  | Medium   |
| 2026-03-18  | Implementasi komponen hero + CTA baru                   | Todo         | High     |
| 2026-03-25  | QA responsif + perbaikan bug kritikal                   | Todo         | Urgent   |

## Deployment

Build output tersedia di folder `dist/` setelah menjalankan:

```bash
npm run build
```

Silakan deploy sesuai platform pilihan Anda (Firebase Hosting, Vercel, Netlify, dll.).
