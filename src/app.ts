import express, { type Express, type Request, type Response } from "express";
import pool from "./db/index.ts";
import jwt from "jsonwebtoken";
import multer from "multer";
import "dotenv/config";
import { authMiddleware } from "./middlewares/authMiddleware.ts";
import { adminMiddleware } from "./middlewares/adminMiddleware.ts";
import type { AuthRequest } from "./middlewares/authMiddleware.ts";
import { uploadToCloudinary } from "./db/cloudinary.ts";
import { deleteUser, editUser, getAllUsers, login, register, uploadProfile } from "./controllers/userController.ts";
import { deleteTabungan, detailTabungan, editTabungan, getAllTabungan, newTabungan } from "./controllers/nabungController.ts";
import { historyTransaksi, newTransaksi } from "./controllers/transaksiController.ts";

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Hanya file gambar yang diperbolehkan!"));
  },
});


// ini buat register
app.post("/api/register", register );

// ini buat login
app.post("/api/login", login);

// admin: semua user, user biasa: cuma dirinya sendiri
app.get("/api/users", authMiddleware, getAllUsers);

// upload foto profil ke cloudinary
app.post("/api/users/upload-profile", authMiddleware, upload.single("image"), uploadProfile);

// hapus user, harus admin
app.delete("/api/users/:id", authMiddleware, adminMiddleware, deleteUser);

// edit profil user (username, email, password) - hanya diri sendiri atau admin
app.put("/api/users/:id", authMiddleware, editUser);

// =====================================================================
// NABUNG (TABUNGAN)
// =====================================================================

// buat tabungan baru
app.post("/api/nabung", authMiddleware, newTabungan);

// admin: semua tabungan, user: miliknya sendiri
app.get("/api/nabung", authMiddleware, getAllTabungan);

// detail tabungan
app.get("/api/nabung/:id", authMiddleware, detailTabungan);

// hapus tabungan (admin bisa hapus semua, user hanya miliknya)
app.delete("/api/nabung/:id", authMiddleware, deleteTabungan);

// edit tabungan (name & target_nabung)
app.put("/api/nabung/:id", authMiddleware, editTabungan);

// =====================================================================
// TRANSAKSI
// =====================================================================

// buat transaksi deposit / withdraw
app.post("/api/transaksi", authMiddleware, newTransaksi);

// riwayat transaksi
app.get("/api/transaksi", authMiddleware, historyTransaksi);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
