import express, { type Express, type Request, type Response } from "express";
import pool from "../db/index.ts";
import jwt from "jsonwebtoken";
import multer from "multer";
import "dotenv/config";

import { uploadToCloudinary } from "../db/cloudinary.ts";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";

export async function newTabungan(req: AuthRequest, res: Response) {
  try {
    const { name, target_nabung } = req.body;
    if (!name || target_nabung === undefined) {
      return res.status(400).json({ message: "name and target_nabung are required" });
    }
    // Insert new tabungan linked to the authenticated user
    const [result]: any = await pool.execute(
      `insert into nabung (users_id, name, target_nabung) values (?, ?, ?)`,
      [req.user!.id, name, target_nabung],
    );
    const newId = result.insertId;
    // Return created tabungan details
    const [rows]: any = await pool.execute(`select * from nabung where id = ?`, [newId]);
    res.status(201).json({ message: "Tabungan berhasil dibuat", data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getAllTabungan(req: AuthRequest, res: Response) {
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
        [req.user!.id],
      );
    }

    res.status(200).json({ message: "Tabungan fetched!", data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function detailTabungan(req: AuthRequest, res: Response) {
  try {
    const [rows]: any = await pool.execute(
      "select * from nabung where id = ?",
      [req.params.id],
    );

    if (!rows.length)
      return res.status(404).json({ message: "Tabungan tidak ditemukan!" });

    if (req.user!.role !== "admin" && rows[0].users_id !== req.user!.id) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    res.status(200).json({ message: "Tabungan fetched!", data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteTabungan(req: AuthRequest, res: Response) {
  try {
    const [rows]: any = await pool.execute(
      "select * from nabung where id = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Tabungan tidak ditemukan!" });

    if (req.user!.role !== "admin" && rows[0].users_id !== req.user!.id) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    await pool.execute("delete from nabung where id = ?", [req.params.id]);
    res.status(200).json({ message: "Tabungan berhasil dihapus!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function editTabungan (req: AuthRequest, res: Response) {
  try {
    const { name, target_nabung } = req.body;

    const [rows]: any = await pool.execute(
      "select * from nabung where id = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Tabungan tidak ditemukan!" });

    if (req.user!.role !== "admin" && rows[0].users_id !== req.user!.id) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    const newName = name || rows[0].name;
    const newTarget = target_nabung || rows[0].target_nabung;

    await pool.execute(
      "update nabung set name = ?, target_nabung = ? where id = ?",
      [newName, newTarget, req.params.id],
    );

    res
      .status(200)
      .json({
        message: "Tabungan berhasil diupdate!",
        data: { id: req.params.id, name: newName, target_nabung: newTarget },
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};