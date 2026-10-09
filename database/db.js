const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  ssl: {
    minVersion: "TLSv1.2",
  },
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

db.on("connection", function () {
  console.log("Đã kết nối tới TiDB Cloud.");
});

module.exports = db;