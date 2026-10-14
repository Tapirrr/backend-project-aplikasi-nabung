# 💰 Backend Aplikasi Nabung

Backend RESTful API untuk aplikasi tabungan (Aplikasi Nabung) menggunakan **Express.js**, **TypeScript**, **MySQL (mysql2)**, **JWT Authentication**, dan **Cloudinary** untuk upload foto profil pengguna.

---

## 🗄️ Struktur Database (`project_backend`)

```sql
CREATE DATABASE IF NOT EXISTS project_backend;
USE project_backend;

-- Tabel Users
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  profile_image VARCHAR(255) NULL
);

-- Tabel Nabung (Target Tabungan)
CREATE TABLE IF NOT EXISTS nabung (
  id INT PRIMARY KEY AUTO_INCREMENT,
  users_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  target_nabung DECIMAL(15,2) NOT NULL,
  jumlah_sekarang DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel Transaksi (Deposit / Withdraw)
CREATE TABLE IF NOT EXISTS transaksi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nabung_id INT NOT NULL,
  users_id INT NOT NULL,
  type ENUM('deposit', 'withdraw') NOT NULL,
  jumlah DECIMAL(15,2) NOT NULL,
  catatan VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (nabung_id) REFERENCES nabung(id) ON DELETE CASCADE,
  FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## ⚙️ Konfigurasi `.env`

Sesuaikan file `.env` di root project:

```env
PORT=3000

# Konfigurasi Database MySQL
DB_HOST=localhost
DB_USER=root
DB_DATABASE=project_backend
DB_PASSWORD="your_mysql_password"

# JWT Secret
JWT_SECRET=super-secret-nabung-jwt-token-key

# Konfigurasi Akun Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🚀 Menjalankan Server

1. **Jalankan Inisialisasi Database** (opsional, server juga otomatis menginisialisasi tabel saat dijalankan):
   ```bash
   npm run db:init
   ```

2. **Jalankan Server Development** (dengan hot reload):
   ```bash
   npm run dev
   ```

3. **Jalankan Pengujian Otomatis (E2E Test)**:
   ```bash
   npm test
   ```

---

## 📚 Dokumentasi Endpoint API

Semua endpoint yang memerlukan login harus menyertakan header:
`Authorization: Bearer <token_jwt>`

### 1. Autentikasi (`/api`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/register` | Publik | Mendaftar akun (`username`, `email`, `password`, `role?: 'user'\|'admin'`) |
| `POST` | `/api/login` | Publik | Login & mendapatkan JWT token (`email`, `password`) |

### 2. Pengguna / Profile (`/api/users`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Auth | **Admin**: melihat semua user. **User**: hanya melihat dirinya sendiri |
| `GET` | `/api/users/me` | Auth | Melihat profil pengguna yang sedang login |
| `GET` | `/api/users/:id` | Auth | **Admin**: bebas melihat ID siapapun. **User**: hanya ID miliknya |
| `POST` | `/api/users/upload-profile` | Auth | Upload foto profil ke **Cloudinary** (`multipart/form-data`, key: `image`) |
| `DELETE`| `/api/users/:id` | **Admin Only** | Menghapus user (otomatis menghapus tabungan & transaksi terkait) |

### 3. Tabungan / Nabung (`/api/nabung`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/nabung` | Auth | Membuat target tabungan baru (`name`, `target_nabung`) |
| `GET` | `/api/nabung` | Auth | **Admin**: melihat semua tabungan semua user. **User**: hanya tabungan miliknya |
| `GET` | `/api/nabung/:id` | Auth | Melihat detail tabungan beserta persentase tercapai |
| `PUT` | `/api/nabung/:id` | Auth | Mengubah data tabungan (`name`, `target_nabung`) |
| `DELETE`| `/api/nabung/:id` | Auth | Menghapus tabungan (**Admin** bisa hapus tabungan apapun, **User** hanya tabungan miliknya) |

### 4. Transaksi (`/api/transaksi`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/transaksi` | Auth | Menambah saldo (**deposit**) atau menarik saldo (**withdraw**). Saldo pada `nabung` otomatis ter-update |
| `GET` | `/api/transaksi` | Auth | **Admin**: riwayat semua transaksi. **User**: hanya transaksi miliknya |
| `GET` | `/api/transaksi/:id` | Auth | Melihat detail satu transaksi |
| `GET` | `/api/transaksi/nabung/:nabung_id` | Auth | Melihat riwayat transaksi khusus pada 1 tabungan tertentu |

#### Contoh Request Body Transaksi:
```json
{
  "nabung_id": 1,
  "type": "deposit",
  "jumlah": 500000,
  "catatan": "Nabung uang saku minggu ini"
}
```
> **Catatan Validasi:**
> - Jika melakukan `withdraw` melebihi saldo tabungan saat ini, sistem otomatis menolak (HTTP 400).
> - Database transaction (`beginTransaction` & `commit`) digunakan agar saldo dan transaksi selalu sinkron.
