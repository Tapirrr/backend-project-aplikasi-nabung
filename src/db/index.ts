import mysql from "mysql2/promise";
import "dotenv/config";

const pool = await mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  database: process.env.DB_DATABASE || "db_dummy",
  password: process.env.DB_PASSWORD || "123",
});

export default pool;
