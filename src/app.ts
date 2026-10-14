import express, { type Express, type Request, type Response } from "express";
import pool from "./db/index.ts";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { authMiddleware } from "./middlewares/authMiddleware.ts";
import { adminMiddlewares } from "./middlewares/adminMiddleware.ts";

const app: Express = express();
const port = process.env.port || 3000;

app.use(express.json());

// ini buat register
app.post("/api/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email & password are required!",
      });
    }

    const [exist]: any = await pool.execute(
      "select id from users where email = ?",
      [email],
    );

    if (exist.length) {
      return res.status(409).json({ message: "Email already registered!" });
    }

    const [result]: any = await pool.execute(
      "insert into users (username, email, password) values (?, ?, ?)",
      [username, email, password],
    );

    res.status(201).json({
      message: "Register success!",
      data: { id: result.insertId, username, email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// ini buat login
app.post("/api/login", async (req: Request, res: Response) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({
      message: "Email & Password are required!",
    });
  }

  const [users]: any = await pool.execute(
    "select * from users where email = ?",
    [req.body.email],
  );

  if (!users.length) {
    return res.status(400).json({
      message: "Login failed!",
    });
  }

  if (users[0].password != req.body.password) {
    return res.status(400).json({
      message: "Login failed!",
    });
  }

  const token = jwt.sign(users[0], process.env.JWT_SECRET || "super-secret", {
    expiresIn: "1h",
  });

  res.status(200).json({
    message: "Login success!",
    token: token,
  });
});

// admin: semua user, user biasa: cuma dirinya sendiri
app.get("/api/users", authMiddleware, async (req: Request, res: Response) => {
  try {
    let users;

    if (req.user.role === "admin") {
      [users] = await pool.query(
        "select id, username, email, role from users",
      );
    } else {
      [users] = await pool.execute(
        "select id, username, email, role from users where id = ?",
        [req.user.id],
      );
    }

    res.status(200).json({
      message: "Users fetched!",
      data: users,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ini buat hapus user, harus admin
app.delete(
  "/api/users/:id",
  authMiddleware,
  adminMiddlewares,
  async (req: Request, res: Response) => {
    await pool.execute("delete from users where id = ?", [req.params.id]);

    res.status(200).json({
      message: "User deleted!",
    });
  },
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
