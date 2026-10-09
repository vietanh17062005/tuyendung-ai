const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const { put, get, del } = require("@vercel/blob");
const yauzl = require("yauzl");
const db = require("../database/db");
const { goiAI } = require("../services/ai");
const { trichXuatNoiDungCV } = require("../services/cvParser");
const { kiemTraDangNhap, kiemTraVaiTro } = require("../middleware/auth");

const router = express.Router();
const dangChayTrenVercel = process.env.VERCEL === "1";
const thuMucUpload = path.join(process.cwd(), "uploads", "cv");
const thuMucCV = thuMucUpload;

const rawMaxFileSizeMb = Number(process.env.CV_MAX_FILE_SIZE_MB);
const MAX_FILE_SIZE_MB = Number.isFinite(rawMaxFileSizeMb)
    ? Math.min(25, Math.max(1, rawMaxFileSizeMb)) : 10;
const MAX_FILE_SIZE = Math.round(MAX_FILE_SIZE_MB * 1024 * 1024);
const MAX_BATCH_SIZE = 50 * 1024 * 1024;
const MAX_BATCH_FILES = 20;
const MAX_MULTIPART_FILES = 10;
const DUOI_CV_CHO_PHEP = new Set([".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]);

// Cấu hình upload
const storage = dangChayTrenVercel ? multer.memoryStorage() : multer.diskStorage({
    destination(req, file, cb) {
        fs.mkdirSync(thuMucUpload, { recursive: true });
        cb(null, thuMucUpload);
    },
    filename(req, file, cb) {
        const tenGoc = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}_${tenGoc}`);
    },
});

function kiemTraDuoiFile(file, choPhepZip = false) {
    const duoi = path.extname(file.originalname).toLowerCase();
    if (choPhepZip && duoi === ".zip") return true;
    return DUOI_CV_CHO_PHEP.has(duoi);
}

const fileFilter = (req, file, cb) => {
    if (!kiemTraDuoiFile(file)) {
        return cb(new Error("Chỉ cho phép PDF, DOC, DOCX, JPG, JPEG hoặc PNG."));
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
});

const uploadBatch = multer({
    storage: multer.memoryStorage(),
    fileFilter(req, file, cb) {
        if (!kiemTraDuoiFile(file, true)) {
            return cb(new Error("Chỉ cho phép PDF, DOC, DOCX, JPG, JPEG, PNG hoặc ZIP."));
        }
        cb(null, true);
    },
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_MULTIPART_FILES },
});

// Đọc file ZIP chứa nhiều CV
function docZip(buffer) {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(buffer, {
            lazyEntries: true,
            validateEntrySizes: true,
        }, (error, zip) => {
            if (error) return reject(new Error("File ZIP không hợp lệ hoặc bị hỏng."));

            const files = [];
            let soEntry = 0;
            let tongKichThuoc = 0;
            let daKetThuc = false;

            function thatBai(message) {
                if (daKetThuc) return;
                daKetThuc = true;
                zip.close();
                reject(new Error(message));
            }

            zip.on("error", () => thatBai("Không thể đọc file ZIP."));
            zip.on("end", () => {
                if (daKetThuc) return;
                daKetThuc = true;
                resolve(files);
            });

            zip.on("entry", entry => {
                soEntry++;
                if (soEntry > 2000) {
                    return thatBai("ZIP có quá nhiều mục, tối đa 2.000 mục.");
                }

                if (/\/$/.test(entry.fileName)) {
                    zip.readEntry();
                    return;
                }

                const tenFile = path.basename(entry.fileName);
                const duoi = path.extname(tenFile).toLowerCase();

                if (!DUOI_CV_CHO_PHEP.has(duoi)) {
                    zip.readEntry();
                    return;
                }

                if (files.length >= MAX_BATCH_FILES || entry.uncompressedSize > MAX_FILE_SIZE) {
                    return thatBai(`ZIP vượt giới hạn ${MAX_BATCH_FILES} CV hoặc ${MAX_FILE_SIZE_MB} MB/CV.`);
                }

                if (tongKichThuoc + entry.uncompressedSize > MAX_BATCH_SIZE) {
                    return thatBai("Tổng dung lượng CV giải nén vượt quá 50 MB.");
                }

                zip.openReadStream(entry, (streamError, stream) => {
                    if (streamError) return thatBai("Không thể đọc CV trong file ZIP.");

                    const chunks = [];
                    let kichThuoc = 0;

                    stream.on("data", chunk => {
                        kichThuoc += chunk.length;
                        if (kichThuoc > MAX_FILE_SIZE || tongKichThuoc + kichThuoc > MAX_BATCH_SIZE) {
                            stream.destroy(new Error("CV vượt giới hạn dung lượng."));
                            return;
                        }
                        chunks.push(chunk);
                    });

                    stream.on("error", () => {
                        thatBai("CV trong ZIP vượt giới hạn hoặc không đọc được.");
                    });

                    stream.on("end", () => {
                        if (daKetThuc) return;
                        const bufferFile = Buffer.concat(chunks);
                        tongKichThuoc += bufferFile.length;
                        files.push({ tenFile, buffer: bufferFile });
                        zip.readEntry();
                    });
                });
            });

            zip.readEntry();
        });
    });
}

function layTenUngVien(tenFile) {
    const ten = path.basename(tenFile, path.extname(tenFile))
        .replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
    return ten || "Ứng viên từ CV tải lên";
}

function laUrlBlob(duongDan) {
    return typeof duongDan === "string" && /^https?:\/\//i.test(duongDan);
}

function taoTenFile(tenFileGoc) {
    const tenGoc = path.basename(tenFileGoc || "CV")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${crypto.randomUUID()}_${tenGoc}`;
}

function layMimeType(loaiFile, tenFile) {
    if (loaiFile) return loaiFile;

    const mimeTypes = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    };

    return mimeTypes[path.extname(tenFile || "").toLowerCase()] || "application/octet-stream";
}

function layDuoiFile(tenFile) {
    return tenFile && tenFile.includes(".") ? tenFile.split(".").pop().toLowerCase() : "";
}

// Đọc Blob Private bằng pathname, không fetch URL công khai
async function layBufferBlob(duongDan) {
    if (!laUrlBlob(duongDan)) throw new Error("Đường dẫn Blob không hợp lệ.");

    const url = new URL(duongDan);
    if (url.protocol !== "https:" || !/(^|\.)blob\.vercel-storage\.com$/i.test(url.hostname)) {
        throw new Error("Đường dẫn CV lưu trữ không hợp lệ.");
    }

    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const result = await get(pathname, { access: "private" });

    if (!result || result.statusCode !== 200 || !result.stream) {
        throw new Error("Không tìm thấy CV trong Blob.");
    }

    const chunks = [];
    let kichThuoc = 0;

    for await (const chunk of result.stream) {
        kichThuoc += chunk.length;
        if (kichThuoc > MAX_FILE_SIZE) {
            throw new Error("Dung lượng CV vượt giới hạn cho phép.");
        }
        chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    if (!buffer.length) throw new Error("File CV trống.");

    return buffer;
}

// Đọc CV từ Blob Private hoặc ổ đĩa local
async function layNoiDungFileCV(cv) {
    if (laUrlBlob(cv.duong_dan)) return layBufferBlob(cv.duong_dan);

    const roots = [
        path.resolve(thuMucUpload),
        path.resolve(thuMucCV),
    ];

    const candidates = [
        path.resolve(process.cwd(), cv.duong_dan || ""),
        path.resolve(thuMucUpload, path.basename(cv.duong_dan || "")),
    ];

    const filePath = candidates.find(file =>
        roots.some(root => file.startsWith(root + path.sep)) && fs.existsSync(file)
    );

    if (!filePath) throw new Error("Không tìm thấy file CV trên máy chủ.");

    const buffer = await fs.promises.readFile(filePath);
    if (!buffer.length || buffer.length > MAX_FILE_SIZE) {
        throw new Error("Dung lượng CV lưu trữ không hợp lệ.");
    }

    return buffer;
}

// Xóa file local an toàn
function xoaFileLocal(duongDan) {
    if (!duongDan || laUrlBlob(duongDan)) return;

    const filePath = path.resolve(process.cwd(), duongDan);
    const root = path.resolve(thuMucUpload);

    if (filePath.startsWith(root + path.sep) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

// Xóa CV ở Blob hoặc local
async function xoaFileCV(duongDan) {
    if (!duongDan) return;

    try {
        if (laUrlBlob(duongDan)) {
            const url = new URL(duongDan);
            if (url.protocol !== "https:" || !/(^|\.)blob\.vercel-storage\.com$/i.test(url.hostname)) {
                throw new Error("URL Blob không hợp lệ.");
            }
            await del(duongDan);
            return;
        }

        xoaFileLocal(duongDan);
    } catch (error) {
        console.error("Lỗi xóa file CV:", error.message);
    }
}