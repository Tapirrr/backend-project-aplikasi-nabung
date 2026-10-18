import express, { type Express, type Request, type Response } from "express";
import pool from "../db/index.ts";
import jwt from "jsonwebtoken";
import multer from "multer";
import "dotenv/config";

import { uploadToCloudinary } from "../db/cloudinary.ts";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";


// ini buat register
export async function register(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email & password wajib diisi!" });
    }

    const [exist]: any = await pool.execute(
      "select id from users where email = ?",
      [email],
    );

    if (exist.length) {
      return res.status(409).json({ message: "Email sudah terdaftar!" });
    }

    const [result]: any = await pool.execute(
      "insert into users (username, email, password) values (?, ?, ?)",
      [username, email, password],
    );

    res.status(201).json({
      message: "Register berhasil!",
      data: { id: result.insertId, username, email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ini buat login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email & password wajib diisi!" });
    }

    const [users]: any = await pool.execute(
      "select * from users where email = ?",
      [email],
    );

    if (!users.length || users[0].password !== password) {
      return res.status(400).json({ message: "Email atau password salah!" });
    }

    const token = jwt.sign(
      {
        id: users[0].id,
        username: users[0].username,
        email: users[0].email,
        role: users[0].role,
      },
      process.env.JWT_SECRET || "super-secret",
      { expiresIn: "24h" },
    );

    res.status(200).json({ message: "Login berhasil!", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ini buat ambil semua data user (ADMIN ONLY)
export async function getAllUsers(req: AuthRequest, res: Response) {
  try {
    let users;

    if (req.user!.role === "admin") {
      [users] = await pool.query(
        "select id, username, email, role, profile_image from users",
      );
    } else {
      [users] = await pool.execute(
        "select id, username, email, role, profile_image from users where id = ?",
        [req.user!.id],
      );
    }

    res.status(200).json({ message: "Users fetched!", data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ini buat hapus users (ADMIN ONLY)
export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const [exist]: any = await pool.execute(
      "select id from users where id = ?",
      [req.params.id],
    );
    if (!exist.length)
      return res.status(404).json({ message: "User tidak ditemukan!" });

    await pool.execute("delete from users where id = ?", [req.params.id]);
    res.status(200).json({ message: "User berhasil dihapus!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ini buat edit profile
export async function editProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const [rows]: any = await pool.execute("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);

    if (!rows.length) {
      return res.status(404).json({
        message: "User tidak ditemukan!",
      });
    }

    const user = rows[0];
    const { username, email, password } = req.body;

    const newUsername = username || user.username;
    const newEmail = email || user.email;
    const newPassword = password || user.password;

    let profileImage = user.profile_image;

    if (req.file) {
      profileImage = await uploadToCloudinary(req.file.buffer);
    }

    await pool.execute(
      `UPDATE users
       SET username = ?,
           email = ?,
           password = ?,
           profile_image = ?
       WHERE id = ?`,
      [newUsername, newEmail, newPassword, profileImage, userId],
    );

    return res.status(200).json({
      message: "Profil berhasil diupdate!",
      data: {
        id: userId,
        username: newUsername,
        email: newEmail,
        profile_image: profileImage,
      },
    });
  } catch (err: any) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Username atau email sudah digunakan!",
      });
    }

    return res.status(500).json({
      message: "Gagal mengupdate profil",
    });
  }
}
