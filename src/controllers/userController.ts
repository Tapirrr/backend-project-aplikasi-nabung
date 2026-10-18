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

export async function uploadProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "File gambar wajib diupload! (key: image)" });
    }

    const imageUrl = await uploadToCloudinary(req.file.buffer);

    await pool.execute("update users set profile_image = ? where id = ?", [
      imageUrl,
      req.user!.id,
    ]);

    res.status(200).json({
      message: "Foto profil berhasil diupload!",
      profile_image: imageUrl,
    });
  } catch (err: any) {
    console.error(err);
    res
      .status(500)
      .json({ message: err.message || "Gagal upload foto profil" });
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

// ini buat edit profile users
export async function editUser (req: AuthRequest, res: Response) {
  try {
    const targetId = Number(req.params.id);

    if (req.user!.role !== "admin" && req.user!.id !== targetId) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    const [exist]: any = await pool.execute(
      "select * from users where id = ?",
      [targetId],
    );
    if (!exist.length)
      return res.status(404).json({ message: "User tidak ditemukan!" });

    const { username, email, password } = req.body;

    const newUsername = username || exist[0].username;
    const newEmail = email || exist[0].email;
    const newPassword = password || exist[0].password;

    await pool.execute(
      "update users set username = ?, email = ?, password = ? where id = ?",
      [newUsername, newEmail, newPassword, targetId],
    );

    res
      .status(200)
      .json({
        message: "User berhasil diupdate!",
        data: { id: targetId, username: newUsername, email: newEmail },
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }}

export async function getMyProfile(req: AuthRequest, res: Response) {
  try {
    const [rows]: any = await pool.execute(
      "select id, username, email, role, profile_image from users where id = ?",
      [req.user!.id],
    );
    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User profile fetched!", data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}
