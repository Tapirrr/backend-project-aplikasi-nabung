import mysql from "mysql2/promise";
import "dotenv/config";
import fs from "node:fs";

const ca = process.env.DB_CA
  ? process.env.DB_CA.replace(/\\n/g, "\n")
  : fs.readFileSync("./ca.pem");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || "project_backend",
  password: process.env.DB_PASSWORD || "123",
  ssl: {
    ca,
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 3,
  enableKeepAlive: true,
});

export default pool;