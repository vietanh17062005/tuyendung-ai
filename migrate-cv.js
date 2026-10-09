
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { put } = require("@vercel/blob");
const db = require("./database/db");

const id = 60006;

const mimeTypes = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
};

async function migrateCV() {
    try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            throw new Error("Thiếu BLOB_READ_WRITE_TOKEN trong file .env");
        }

        const [rows] = await db.query(
            "SELECT id, ten_file, duong_dan FROM cv WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            throw new Error(`Không tìm thấy CV có ID ${id} trong TiDB Cloud.`);
        }

        const cv = rows[0];

        if (/^https:\/\//i.test(cv.duong_dan || "")) {
            console.log("CV đã có đường dẫn URL, không cần chuyển nữa.");
            return;
        }

        const root = path.resolve(process.cwd(), "uploads", "cv");
        const filePath = path.resolve(process.cwd(), cv.duong_dan);

        if (!filePath.startsWith(root + path.sep)) {
            throw new Error("Đường dẫn file không nằm trong thư mục uploads/cv.");
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`Không tìm thấy file gốc: ${filePath}`);
        }

        const extension = path.extname(cv.ten_file || filePath).toLowerCase();
        const contentType = mimeTypes[extension] || "application/octet-stream";
        const safeName = path.basename(cv.ten_file || filePath)
            .replace(/[^\w.-]/g, "_");

        console.log("Đang tải file CV lên Vercel Blob...");

        const blob = await put(
            `cv/migrated-${id}-${Date.now()}-${safeName}`,
            fs.readFileSync(filePath),
            {
                access: "private",
                contentType,
            }
        );

        const [result] = await db.query(
            "UPDATE cv SET duong_dan = ? WHERE id = ?",
            [blob.url, id]
        );

        if (result.affectedRows !== 1) {
            throw new Error("Không cập nhật được đường dẫn CV trong cơ sở dữ liệu.");
        }

        console.log("Chuyển CV thành công!");
        console.log("ID:", id);
        console.log("Đường dẫn mới:", blob.url);
        console.log("File gốc vẫn được giữ nguyên.");
    } catch (error) {
        console.error("Lỗi chuyển CV:", error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

migrateCV();