// src/db/init.ts
import mysql from "mysql2/promise";
import "dotenv/config";

async function init() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
  // Create database if not exists
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`project_backend\`;`);
  await connection.query(`USE \`project_backend\`;`);
  // Users table
  await connection.query(`CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    profile_image VARCHAR(255) NULL
  );`);
  // Nabung table
  await connection.query(`CREATE TABLE IF NOT EXISTS nabung (
    id INT PRIMARY KEY AUTO_INCREMENT,
    users_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_nabung DECIMAL(15,2) NOT NULL,
    jumlah_sekarang DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE
  );`);
  // Transaksi table
  await connection.query(`CREATE TABLE IF NOT EXISTS transaksi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nabung_id INT NOT NULL,
    users_id INT NOT NULL,
    type ENUM('deposit', 'withdraw') NOT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    catatan VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nabung_id) REFERENCES nabung(id) ON DELETE CASCADE,
    FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE
  );`);
  console.log("Database initialized.");
  await connection.end();
}

init().catch((err) => {
  console.error("Initialization error:", err);
  process.exit(1);
});
