# Potato Disease Detection API — Dokumentasi

API untuk mendeteksi penyakit daun kentang menggunakan model ONNX (EfficientNet).

- **Runtime:** Node.js + ONNX Runtime
- **Deployment:** Vercel Serverless
- **Base URL (production):** `https://node-js-potato-be-e7k2.vercel.app`
- **Base URL (lokal):** `http://localhost:8000`

---

## Endpoints

### `GET /`

Health check — cek apakah server berjalan.

**Response `200`**
```json
{
  "status": "✅ Server berjalan!",
  "message": "Potato Disease Detection API (Node.js + ONNX)"
}
```

---

### `POST /predict`

Upload gambar daun kentang dan dapatkan hasil deteksi penyakit.

**Request**

| Field | Tipe | Keterangan |
|-------|------|------------|
| `image` | `file` (form-data) | Gambar daun kentang (JPG/PNG, maks 5MB) |

Content-Type: `multipart/form-data`

**Contoh dengan `curl`**
```bash
curl -X POST http://localhost:8000/predict \
  -F "image=@/path/to/gambar.jpg"
```

**Contoh dengan JavaScript (fetch)**
```js
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const res = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  body: formData,
});
const data = await res.json();
console.log(data);
```

**Contoh dengan Python (requests)**
```python
import requests

with open('gambar.jpg', 'rb') as f:
    res = requests.post(
        'http://localhost:8000/predict',
        files={'image': f}
    )
print(res.json())
```

**Response `200` — Berhasil**
```json
{
  "class": "Early Blight",
  "confidence": "94.27%",
  "all_predictions": {
    "Early Blight": "94.27%",
    "Late Blight": "4.51%",
    "Healthy": "1.22%"
  }
}
```

| Field | Tipe | Keterangan |
|-------|------|------------|
| `class` | `string` | Kelas prediksi tertinggi |
| `confidence` | `string` | Persentase confidence prediksi terpilih |
| `all_predictions` | `object` | Confidence semua kelas |

**Kelas yang tersedia:**
- `Early Blight` — Penyakit bercak daun awal
- `Late Blight` — Penyakit busuk daun
- `Healthy` — Daun sehat

---

## Error Responses

| Status | Kondisi | Contoh Response |
|--------|---------|-----------------|
| `400` | Tidak ada gambar | `{ "detail": "Tidak ada gambar yang diunggah." }` |
| `400` | Format bukan JPG/PNG | `{ "detail": "Hanya file JPG/PNG yang diizinkan." }` |
| `400` | File > 5MB | `{ "detail": "Ukuran file melebihi batas 5MB." }` |
| `500` | Gagal proses model | `{ "detail": "Gagal memproses gambar: ..." }` |

---

## Preprocessing Gambar

Gambar diproses sebelum masuk ke model:
1. Resize ke **300×300 px**
2. Konversi ke **RGB** (alpha channel dihapus)
3. Normalisasi: `pixel = (pixel / 127.5) - 1.0` → range `[-1, 1]`
4. Format tensor: `[1, 300, 300, 3]` (NHWC)

---

## Menjalankan Lokal

```bash
# Install dependensi
npm install

# Development (auto-reload)
npm run dev

# Production
npm start
```

Server berjalan di `http://localhost:8000`.
