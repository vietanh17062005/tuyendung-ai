const mysql = require("mysql2/promise");

const dangChayVercel = process.env.VERCEL === "1";

const cauHinh = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5
};

if (dangChayVercel) {
    cauHinh.ssl = {
        rejectUnauthorized: true
    };
}

const db = mysql.createPool(cauHinh);

module.exports = db;