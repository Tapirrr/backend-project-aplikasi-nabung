import mysql from "mysql2/promise";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const caPath = path.resolve(process.cwd(), "ca.pem");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME || "project_backend",
  password: process.env.DB_PASSWORD || "123",
  ssl: {
    ca: fs.readFileSync("./ca.pem"),
    rejectUnauthorized: true,
  },
});

export default pool;
