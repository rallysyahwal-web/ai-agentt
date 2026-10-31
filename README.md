# Buku Tanya: web chat AI (NVIDIA NIM + Netlify)

## Kerangka prompt
- ROLE: developer web yang membuat chat AI aman dan ringan.
- TASK: web chat AI umum, di-hosting Netlify, memakai API key NVIDIA NIM.
- CONTEXT: laptop lemah (tidak bisa AI lokal), HP iPhone, dibuka siapa saja yang punya link, bahasa Indonesia.
- REASONING: key disimpan di server (Netlify Function), bukan di JavaScript halaman; ada batas pesan per IP.
- STOP CONDITIONS: jawaban muncul, error dijelaskan jelas, key tidak pernah terlihat di browser.
- OUTPUT: public/index.html, netlify/functions/chat.js, netlify.toml.

## Cara pasang
1. Buat repo GitHub, unggah seluruh isi folder ini (struktur folder harus tetap).
2. Di Netlify: Add new site, Import from Git, pilih repo itu, lalu Deploy.
3. Netlify: Site configuration, Environment variables, tambah `NVIDIA_API_KEY` = key nvapi-mu. Lalu Deploy ulang (Deploys, Trigger deploy).
4. Buka link situsmu. Selesai.

Opsional: variabel `NVIDIA_MODEL` untuk ganti model. Kalau sering "terlalu lama menjawab", pakai `meta/llama-3.1-8b-instruct`.

## Catatan keamanan
Karena siapa saja boleh pakai, kuota key-mu terpakai setiap ada yang chat. Batas 20 pesan per 10 menit per IP sudah ada, tapi sifatnya seadanya. Kalau key disalahgunakan, hapus key di build.nvidia.com lalu buat baru.
