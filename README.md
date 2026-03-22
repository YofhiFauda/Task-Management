<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c5f881d4-0e9f-4730-b550-1a2698b1296b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Firebase Authentication troubleshooting

Jika login Google menampilkan error `auth/unauthorized-domain`, domain deploy Anda belum diizinkan oleh Firebase Authentication.

1. Buka **Firebase Console → Authentication → Settings → Authorized domains**.
2. Tambahkan domain aplikasi yang aktif, misalnya `v0-task-management-app-flax-two.vercel.app`.
3. Pastikan `projectId` dan `authDomain` di `firebase-applet-config.json` mengarah ke project Firebase yang sama.
4. Deploy ulang aplikasi setelah konfigurasi diperbarui jika cache Vercel masih memakai bundle lama.

Aplikasi sekarang juga menampilkan pesan error yang lebih jelas di layar login untuk membantu mengidentifikasi masalah konfigurasi domain.
