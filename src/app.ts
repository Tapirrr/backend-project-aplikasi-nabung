import express, { type Express, type Request, type Response } from "express";
import pool from "./db/index.ts";
import jwt from "jsonwebtoken";
import multer from "multer";
import "dotenv/config";
import { authMiddleware } from "./middlewares/authMiddleware.ts";
import { adminMiddleware } from "./middlewares/adminMiddleware.ts";
import type { AuthRequest } from "./middlewares/authMiddleware.ts";
import { uploadToCloudinary } from "./db/cloudinary.ts";

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// =====================================================================
// MULTER (upload foto profil)
// =====================================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Hanya file gambar yang diperbolehkan!"));
  },
});

// =====================================================================
// AUTH
// =====================================================================

// ini buat register
app.post("/api/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email & password wajib diisi!" });
    }

    const [exist]: any = await pool.execute(
      "select id from users where email = ?",
      [email]
    );

    if (exist.length) {
      return res.status(409).json({ message: "Email sudah terdaftar!" });
    }

    const [result]: any = await pool.execute(
      "insert into users (username, email, password) values (?, ?, ?)",
      [username, email, password]
    );

    res.status(201).json({
      message: "Register berhasil!",
      data: { id: result.insertId, username, email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ini buat login
app.post("/api/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email & password wajib diisi!" });
    }

    const [users]: any = await pool.execute(
      "select * from users where email = ?",
      [email]
    );

    if (!users.length || users[0].password !== password) {
      return res.status(400).json({ message: "Email atau password salah!" });
    }

    const token = jwt.sign(
      { id: users[0].id, username: users[0].username, email: users[0].email, role: users[0].role },
      process.env.JWT_SECRET || "super-secret",
      { expiresIn: "24h" }
    );

    res.status(200).json({ message: "Login berhasil!", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================================================================
// USERS
// =====================================================================

// admin: semua user, user biasa: cuma dirinya sendiri
app.get("/api/users", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let users;

    if (req.user!.role === "admin") {
      [users] = await pool.query(
        "select id, username, email, role, profile_image from users"
      );
    } else {
      [users] = await pool.execute(
        "select id, username, email, role, profile_image from users where id = ?",
        [req.user!.id]
      );
    }

    res.status(200).json({ message: "Users fetched!", data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// upload foto profil ke cloudinary
app.post(
  "/api/users/upload-profile",
  authMiddleware,
  upload.single("image"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File gambar wajib diupload! (key: image)" });
      }

      const imageUrl = await uploadToCloudinary(req.file.buffer);

      await pool.execute(
        "update users set profile_image = ? where id = ?",
        [imageUrl, req.user!.id]
      );

      res.status(200).json({ message: "Foto profil berhasil diupload!", profile_image: imageUrl });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: err.message || "Gagal upload foto profil" });
    }
  }
);

// hapus user, harus admin
app.delete("/api/users/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [exist]: any = await pool.execute("select id from users where id = ?", [req.params.id]);
    if (!exist.length) return res.status(404).json({ message: "User tidak ditemukan!" });

    await pool.execute("delete from users where id = ?", [req.params.id]);
    res.status(200).json({ message: "User berhasil dihapus!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// edit profil user (username, email, password) - hanya diri sendiri atau admin
app.put("/api/users/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = Number(req.params.id);

    if (req.user!.role !== "admin" && req.user!.id !== targetId) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    const [exist]: any = await pool.execute("select * from users where id = ?", [targetId]);
    if (!exist.length) return res.status(404).json({ message: "User tidak ditemukan!" });

    const { username, email, password } = req.body;

    const newUsername = username || exist[0].username;
    const newEmail    = email    || exist[0].email;
    const newPassword = password || exist[0].password;

    await pool.execute(
      "update users set username = ?, email = ?, password = ? where id = ?",
      [newUsername, newEmail, newPassword, targetId]
    );

    res.status(200).json({ message: "User berhasil diupdate!", data: { id: targetId, username: newUsername, email: newEmail } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================================================================
// NABUNG (TABUNGAN)
// =====================================================================

// buat tabungan baru
app.post("/api/nabung", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, target_nabung } = req.body;

    if (!name || !target_nabung) {
      return res.status(400).json({ message: "Nama & target nabung wajib diisi!" });
    }

    const [result]: any = await pool.execute(
      "insert into nabung (users_id, name, target_nabung) values (?, ?, ?)",
      [req.user!.id, name, target_nabung]
    );

    res.status(201).json({
      message: "Tabungan berhasil dibuat!",
      data: { id: result.insertId, name, target_nabung, jumlah_sekarang: 0 },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// admin: semua tabungan, user: miliknya sendiri
app.get("/api/nabung", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let rows;

    if (req.user!.role === "admin") {
      [rows] = await pool.query(`
        select n.*, u.username, u.email from nabung n
        join users u on n.users_id = u.id
        order by n.id desc
      `);
    } else {
      [rows] = await pool.execute(
        "select * from nabung where users_id = ? order by id desc",
        [req.user!.id]
      );
    }

    res.status(200).json({ message: "Tabungan fetched!", data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// detail tabungan
app.get("/api/nabung/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.execute(
      "select * from nabung where id = ?",
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: "Tabungan tidak ditemukan!" });

    if (req.user!.role !== "admin" && rows[0].users_id !== req.user!.id) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    res.status(200).json({ message: "Tabungan fetched!", data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// hapus tabungan (admin bisa hapus semua, user hanya miliknya)
app.delete("/api/nabung/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.execute("select * from nabung where id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Tabungan tidak ditemukan!" });

    if (req.user!.role !== "admin" && rows[0].users_id !== req.user!.id) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    await pool.execute("delete from nabung where id = ?", [req.params.id]);
    res.status(200).json({ message: "Tabungan berhasil dihapus!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// edit tabungan (name & target_nabung)
app.put("/api/nabung/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, target_nabung } = req.body;

    const [rows]: any = await pool.execute("select * from nabung where id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Tabungan tidak ditemukan!" });

    if (req.user!.role !== "admin" && rows[0].users_id !== req.user!.id) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    const newName = name || rows[0].name;
    const newTarget = target_nabung || rows[0].target_nabung;

    await pool.execute(
      "update nabung set name = ?, target_nabung = ? where id = ?",
      [newName, newTarget, req.params.id]
    );

    res.status(200).json({ message: "Tabungan berhasil diupdate!", data: { id: req.params.id, name: newName, target_nabung: newTarget } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================================================================
// TRANSAKSI
// =====================================================================

// buat transaksi deposit / withdraw
app.post("/api/transaksi", authMiddleware, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const { nabung_id, type, jumlah, catatan } = req.body;

    if (!nabung_id || !type || !jumlah) {
      return res.status(400).json({ message: "nabung_id, type, & jumlah wajib diisi!" });
    }

    if (type !== "deposit" && type !== "withdraw") {
      return res.status(400).json({ message: "Type harus 'deposit' atau 'withdraw'!" });
    }

    const [rows]: any = await conn.execute("select * from nabung where id = ?", [nabung_id]);
    if (!rows.length) return res.status(404).json({ message: "Tabungan tidak ditemukan!" });

    const nabung = rows[0];

    if (req.user!.role !== "admin" && nabung.users_id !== req.user!.id) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    const saldo = Number(nabung.jumlah_sekarang);
    const nominal = Number(jumlah);

    if (type === "withdraw" && saldo < nominal) {
      return res.status(400).json({ message: `Saldo tidak cukup! Saldo saat ini: ${saldo}` });
    }

    const saldoBaru = type === "deposit" ? saldo + nominal : saldo - nominal;

    await conn.beginTransaction();

    const [result]: any = await conn.execute(
      "insert into transaksi (nabung_id, users_id, type, jumlah, catatan) values (?, ?, ?, ?, ?)",
      [nabung_id, req.user!.id, type, nominal, catatan || null]
    );

    await conn.execute(
      "update nabung set jumlah_sekarang = ? where id = ?",
      [saldoBaru, nabung_id]
    );

    await conn.commit();

    res.status(201).json({
      message: `Transaksi ${type} berhasil!`,
      data: {
        id: result.insertId,
        nabung_id,
        type,
        jumlah: nominal,
        saldo_sebelum: saldo,
        saldo_sesudah: saldoBaru,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// riwayat transaksi
app.get("/api/transaksi", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let rows;

    if (req.user!.role === "admin") {
      [rows] = await pool.query(`
        select t.*, u.username, n.name as nama_tabungan from transaksi t
        join users u on t.users_id = u.id
        join nabung n on t.nabung_id = n.id
        order by t.id desc
      `);
    } else {
      [rows] = await pool.execute(`
        select t.*, n.name as nama_tabungan from transaksi t
        join nabung n on t.nabung_id = n.id
        where t.users_id = ?
        order by t.id desc
      `, [req.user!.id]);
    }

    res.status(200).json({ message: "Transaksi fetched!", data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
