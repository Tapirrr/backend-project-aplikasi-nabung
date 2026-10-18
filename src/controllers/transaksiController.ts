import express, { type Express, type Request, type Response } from "express";
import pool from "../db/index.ts";
import jwt from "jsonwebtoken";
import multer from "multer";
import "dotenv/config";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import { adminMiddleware } from "../middlewares/adminMiddleware.ts";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";
import { uploadToCloudinary } from "../db/cloudinary.ts";

export async function newTransaksi(req: AuthRequest, res: Response) {
  const conn = await pool.getConnection();
  try {
    const { nabung_id, type, jumlah, catatan } = req.body;

    if (!nabung_id || !type || !jumlah) {
      return res
        .status(400)
        .json({ message: "nabung_id, type, & jumlah wajib diisi!" });
    }

    if (type !== "deposit" && type !== "withdraw") {
      return res
        .status(400)
        .json({ message: "Type harus 'deposit' atau 'withdraw'!" });
    }

    const [rows]: any = await conn.execute(
      "select * from nabung where id = ?",
      [nabung_id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Tabungan tidak ditemukan!" });

    const nabung = rows[0];

    if (req.user!.role !== "admin" && nabung.users_id !== req.user!.id) {
      return res.status(403).json({ message: "Akses ditolak!" });
    }

    const saldo = Number(nabung.jumlah_sekarang);
    const nominal = Number(jumlah);

    if (type === "withdraw" && saldo < nominal) {
      return res
        .status(400)
        .json({ message: `Saldo tidak cukup! Saldo saat ini: ${saldo}` });
    }

    const saldoBaru = type === "deposit" ? saldo + nominal : saldo - nominal;

    await conn.beginTransaction();

    const [result]: any = await conn.execute(
      "insert into transaksi (nabung_id, users_id, type, jumlah, catatan) values (?, ?, ?, ?, ?)",
      [nabung_id, req.user!.id, type, nominal, catatan || null],
    );

    await conn.execute("update nabung set jumlah_sekarang = ? where id = ?", [
      saldoBaru,
      nabung_id,
    ]);

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
}

export async function historyTransaksi (req: AuthRequest, res: Response) {
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
      [rows] = await pool.execute(
        `
        select t.*, n.name as nama_tabungan from transaksi t
        join nabung n on t.nabung_id = n.id
        where t.users_id = ?
        order by t.id desc
      `,
        [req.user!.id],
      );
    }

    res.status(200).json({ message: "Transaksi fetched!", data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};