const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { put, del } = require("@vercel/blob");
const yauzl = require("yauzl");
const db = require("../database/db");
const {
    kiemTraDangNhap,
    kiemTraVaiTro,
} = require("../middleware/auth");

const router = express.Router();

const dangChayTrenVercel =
    process.env.VERCEL === "1";

const thuMucUpload = path.join(
    process.cwd(),
    "uploads",
    "cv",
);

// MULTER

const storage = dangChayTrenVercel
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: function (req, file, cb) {
            if (!fs.existsSync(thuMucUpload)) {
                fs.mkdirSync(thuMucUpload, {
                    recursive: true,
                });
            }

            cb(null, thuMucUpload);
        },

        filename: function (req, file, cb) {
            const tenGoc = path
                .basename(file.originalname)
                .replace(
                    /[^a-zA-Z0-9._-]/g,
                    "_",
                );

            cb(
                null,
                `${Date.now()}_${tenGoc}`,
            );
        },
    });

const fileFilter = function (req, file, cb) {
    const duoiFile = path
        .extname(file.originalname)
        .toLowerCase();

    const duoiChoPhep = [
        ".pdf",
        ".doc",
        ".docx",
        ".jpg",
        ".jpeg",
        ".png",
    ];

    if (!duoiChoPhep.includes(duoiFile)) {
        return cb(
            new Error(
                "Chỉ cho phép file PDF, DOC, DOCX, JPG, JPEG, PNG",
            ),
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BATCH_SIZE = 50 * 1024 * 1024;
const MAX_BATCH_FILES = 20;
const MAX_MULTIPART_FILES = 10;
const DUOI_CV_CHO_PHEP = new Set([".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]);
const uploadBatch = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        const extension = path.extname(file.originalname).toLowerCase();
        if (extension !== ".zip" && !DUOI_CV_CHO_PHEP.has(extension)) {
            return cb(new Error("Chỉ cho phép file PDF, DOC, DOCX, JPG, JPEG, PNG hoặc ZIP"));
        }
        cb(null, true);
    },
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_MULTIPART_FILES,
    },
});

function docZip(buffer) {
    return new Promise(function (resolve, reject) {
        yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, function (error, zip) {
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

            zip.on("error", function () {
                thatBai("Không thể đọc nội dung file ZIP.");
            });
            zip.on("end", function () {
                if (daKetThuc) return;
                daKetThuc = true;
                resolve(files);
            });
            zip.on("entry", function (entry) {
                soEntry += 1;
                if (soEntry > 2000) {
                    thatBai("ZIP có quá nhiều mục, tối đa 2.000 mục.");
                    return;
                }
                if (/\/$/.test(entry.fileName)) {
                    zip.readEntry();
                    return;
                }

                const tenFile = path.basename(entry.fileName);
                const extension = path.extname(tenFile).toLowerCase();
                if (!DUOI_CV_CHO_PHEP.has(extension)) {
                    zip.readEntry();
                    return;
                }
                if (files.length >= MAX_BATCH_FILES || entry.uncompressedSize > MAX_FILE_SIZE) {
                    thatBai("ZIP vượt giới hạn 20 CV hoặc 10 MB cho mỗi CV.");
                    return;
                }
                if (tongKichThuoc + entry.uncompressedSize > MAX_BATCH_SIZE) {
                    thatBai("Tổng dung lượng CV giải nén không được vượt quá 50 MB.");
                    return;
                }

                zip.openReadStream(entry, function (streamError, stream) {
                    if (streamError) {
                        thatBai("Không thể đọc một CV trong file ZIP.");
                        return;
                    }
                    const chunks = [];
                    let kichThuoc = 0;
                    stream.on("data", function (chunk) {
                        kichThuoc += chunk.length;
                        if (kichThuoc > MAX_FILE_SIZE || tongKichThuoc + kichThuoc > MAX_BATCH_SIZE) {
                            stream.destroy(new Error("ZIP vượt giới hạn dung lượng cho phép."));
                            return;
                        }
                        chunks.push(chunk);
                    });
                    stream.on("error", function () {
                        thatBai("Một CV trong ZIP vượt giới hạn dung lượng hoặc không đọc được.");
                    });
                    stream.on("end", function () {
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
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);
    return ten || "Ứng viên từ CV tải lên";
}

function xoaFileLocal(duongDan) {
    if (!duongDan || laUrlBlob(duongDan)) return;
    const filePath = path.resolve(process.cwd(), duongDan);
    const uploadRoot = path.resolve(process.cwd(), "uploads", "cv");
    if (filePath.startsWith(uploadRoot + path.sep) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

// HÀM HỖ TRỢ

function layMimeType(loaiFile, tenFile) {
    if (loaiFile) {
        return loaiFile;
    }

    const duoiFile = path
        .extname(tenFile || "")
        .toLowerCase();

    const mimeTypes = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    };

    return (
        mimeTypes[duoiFile] ||
        "application/octet-stream"
    );
}

function layDuoiFile(tenFile) {
    if (!tenFile || !tenFile.includes(".")) {
        return "";
    }

    return tenFile
        .split(".")
        .pop()
        .toLowerCase();
}

function taoTenFile(tenFileGoc) {
    const tenGoc = path
        .basename(tenFileGoc || "CV")
        .replace(
            /[^a-zA-Z0-9._-]/g,
            "_",
        );

    return `${Date.now()}_${tenGoc}`;
}

function laUrlBlob(duongDan) {
    return (
        typeof duongDan === "string" &&
        /^https?:\/\//i.test(duongDan)
    );
}

async function xoaFileCV(duongDan) {
    if (!duongDan) {
        return;
    }

    try {
        if (laUrlBlob(duongDan)) {
            await del(duongDan);
            return;
        }

        const duongDanFile = path.resolve(
            process.cwd(),
            duongDan,
        );

        const thuMucGoc = path.resolve(
            process.cwd(),
            "uploads",
            "cv",
        );

        const duongDanChuan =
            path.normalize(duongDanFile);

        const thuMucChuan =
            path.normalize(thuMucGoc);

        if (
            duongDanChuan.startsWith(
                thuMucChuan + path.sep,
            ) &&
            fs.existsSync(duongDanFile)
        ) {
            fs.unlinkSync(duongDanFile);
        }
    } catch (error) {
        console.error(
            "Lỗi xóa file CV:",
            error,
        );
    }
}

// LẤY DANH SÁCH CV

router.get(
    "/",
    kiemTraDangNhap,
    async function (req, res) {
        try {
            const [rows] = await db.query(`
                SELECT
                    cv.id,
                    cv.ung_vien_id,
                    cv.ten_file,
                    cv.duong_dan,
                    cv.loai_file,
                    cv.kich_thuoc,
                    cv.noi_dung,
                    cv.la_ban_chinh,
                    cv.ngay_tai_len,
                    uv.ho_ten,
                    uv.email,
                    uv.so_dien_thoai,
                    uv.dot_tuyen_id,
                    dt.ten_dot AS ten_dot_tuyen
                FROM cv
                INNER JOIN ung_vien uv
                    ON uv.id = cv.ung_vien_id
                LEFT JOIN dot_tuyen dt
                    ON dt.id = uv.dot_tuyen_id
                ORDER BY
                    cv.ngay_tai_len DESC,
                    cv.id DESC
            `);

            res.json(rows);
        } catch (error) {
            console.error(
                "Lỗi lấy danh sách CV:",
                error,
            );

            res.status(500).json({
                message:
                    "Không lấy được danh sách CV",
            });
        }
    },
);

// UPLOAD CV

router.post(
    "/upload",
    kiemTraDangNhap,
    kiemTraVaiTro(
        "admin",
        "manager",
        "hr",
    ),
    upload.single("file"),
    async function (req, res) {
        let connection;
        let duongDanDaLuu = null;

        try {
            const ungVienId =
                Number(req.body.ung_vien_id);

            const laBanChinh =
                Number(req.body.la_ban_chinh) === 1
                    ? 1
                    : 0;

            if (!ungVienId) {
                return res.status(400).json({
                    message:
                        "Chưa chọn ứng viên",
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message:
                        "Chưa chọn file CV",
                });
            }

            const [ungVienRows] =
                await db.query(
                    `
                    SELECT id
                    FROM ung_vien
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [ungVienId],
                );

            if (ungVienRows.length === 0) {
                if (
                    !dangChayTrenVercel &&
                    req.file.path &&
                    fs.existsSync(req.file.path)
                ) {
                    fs.unlinkSync(
                        req.file.path,
                    );
                }

                return res.status(404).json({
                    message:
                        "Không tìm thấy ứng viên",
                });
            }

            const tenFile =
                req.file.originalname;

            const loaiFile =
                req.file.mimetype ||
                layMimeType(
                    null,
                    tenFile,
                );

            const kichThuoc =
                req.file.size;

            // Lưu file

            if (dangChayTrenVercel) {
                const tenBlob =
                    taoTenFile(tenFile);

                const blob = await put(
                    `cv/${tenBlob}`,
                    req.file.buffer,
                    {
                        access: "public",
                    },
                );

                duongDanDaLuu =
                    blob.url;
            } else {
                duongDanDaLuu =
                    path
                        .relative(
                            process.cwd(),
                            req.file.path,
                        )
                        .split(path.sep)
                        .join("/");
            }

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            // Nếu CV mới là bản chính

            if (laBanChinh === 1) {
                await connection.query(
                    `
                    UPDATE cv
                    SET la_ban_chinh = 0
                    WHERE ung_vien_id = ?
                    `,
                    [ungVienId],
                );
            }

            const [result] =
                await connection.query(
                    `
                    INSERT INTO cv (
                        ung_vien_id,
                        ten_file,
                        duong_dan,
                        loai_file,
                        kich_thuoc,
                        noi_dung,
                        la_ban_chinh,
                        ngay_tai_len
                    )
                    VALUES (
                        ?, ?, ?, ?, ?, NULL, ?, NOW()
                    )
                    `,
                    [
                        ungVienId,
                        tenFile,
                        duongDanDaLuu,
                        loaiFile,
                        kichThuoc,
                        laBanChinh,
                    ],
                );

            await connection.commit();

            res.status(201).json({
                message:
                    "Tải CV thành công",
                id: result.insertId,
                duong_dan:
                    duongDanDaLuu,
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Lỗi rollback:",
                        rollbackError,
                    );
                }
            }

            // Nếu upload Blob thành công nhưng DB lỗi

            if (
                duongDanDaLuu &&
                laUrlBlob(duongDanDaLuu)
            ) {
                await xoaFileCV(
                    duongDanDaLuu,
                );
            }

            // Nếu local upload thành công nhưng DB lỗi

            if (
                !dangChayTrenVercel &&
                req.file &&
                req.file.path
            ) {
                try {
                    if (
                        fs.existsSync(
                            req.file.path,
                        )
                    ) {
                        fs.unlinkSync(
                            req.file.path,
                        );
                    }
                } catch (fileError) {
                    console.error(
                        "Lỗi xóa file sau khi upload thất bại:",
                        fileError,
                    );
                }
            }

            console.error(
                "Lỗi upload CV:",
                error,
            );

            if (
                error instanceof
                multer.MulterError
            ) {
                if (
                    error.code ===
                    "LIMIT_FILE_SIZE"
                ) {
                    return res.status(400).json({
                        message:
                            "File CV không được vượt quá 10MB",
                    });
                }

                return res.status(400).json({
                    message:
                        "Upload file thất bại",
                });
            }

            if (
                error.message &&
                error.message.includes(
                    "Chỉ cho phép file",
                )
            ) {
                return res.status(400).json({
                    message:
                        error.message,
                });
            }

            res.status(500).json({
                message:
                    "Không thể lưu thông tin CV",
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },
);

router.post(
    "/upload-dot-tuyen",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function (req, res) {
        let connection;
        const duongDanDaLuu = [];
        let transactionStarted = false;

        try {
            await new Promise(function (resolve, reject) {
                uploadBatch.array("files", MAX_MULTIPART_FILES)(req, res, function (error) {
                    if (error) reject(error);
                    else resolve();
                });
            });

            const dotTuyenId = Number(req.body?.dot_tuyen_id);
            if (!Number.isInteger(dotTuyenId) || dotTuyenId <= 0) {
                return res.status(400).json({ message: "Đợt tuyển dụng không hợp lệ." });
            }
            if (!Array.isArray(req.files) || req.files.length === 0) {
                return res.status(400).json({ message: "Vui lòng chọn CV hoặc file ZIP." });
            }

            const [dotRows] = await db.query(
                "SELECT id FROM dot_tuyen WHERE id = ? LIMIT 1",
                [dotTuyenId],
            );
            if (!dotRows.length) {
                return res.status(404).json({ message: "Không tìm thấy đợt tuyển dụng." });
            }

            const cvFiles = [];
            let tongKichThuoc = 0;
            for (const file of req.files) {
                if (path.extname(file.originalname).toLowerCase() === ".zip") {
                    const extractedFiles = await docZip(file.buffer);
                    cvFiles.push(...extractedFiles);
                    tongKichThuoc += extractedFiles.reduce((total, item) => total + item.buffer.length, 0);
                } else {
                    cvFiles.push({
                        tenFile: path.basename(file.originalname),
                        buffer: file.buffer,
                    });
                    tongKichThuoc += file.size;
                }
                if (cvFiles.length > MAX_BATCH_FILES || tongKichThuoc > MAX_BATCH_SIZE) {
                    return res.status(400).json({
                        message: "Tối đa 20 CV và tổng dung lượng không quá 50 MB.",
                    });
                }
            }
            if (!cvFiles.length) {
                return res.status(400).json({
                    message: "Không tìm thấy CV PDF, DOC, DOCX hoặc ảnh hợp lệ trong file đã chọn.",
                });
            }

            const [candidateColumns] = await db.query("SHOW COLUMNS FROM ung_vien");
            const candidateColumnNames = candidateColumns.map((column) => column.Field);
            if (!candidateColumnNames.includes("dot_tuyen_id") || !candidateColumnNames.includes("ho_ten")) {
                throw new Error("Cấu trúc bảng ứng viên không hỗ trợ tải CV theo đợt.");
            }
            const [cvColumns] = await db.query("SHOW COLUMNS FROM cv");
            const cvColumnNames = cvColumns.map((column) => column.Field);
            const candidateInsert = {
                dot_tuyen_id: dotTuyenId,
                ho_ten: "",
                nguon: "Tải lên",
                trang_thai: "moi",
                ghi_chu: null,
            };
            const cvInsert = {
                ung_vien_id: 0,
                ten_file: "",
                duong_dan: "",
                loai_file: "",
                kich_thuoc: 0,
                nguoi_tai: Number(req.nguoiDung?.id),
                noi_dung: null,
                la_ban_chinh: 1,
                ngay_tai_len: new Date(),
                ngay_tai: new Date(),
            };

            connection = await db.getConnection();
            await connection.beginTransaction();
            transactionStarted = true;

            for (const file of cvFiles) {
                const candidateData = { ...candidateInsert, ho_ten: layTenUngVien(file.tenFile) };
                const candidateFields = Object.keys(candidateData).filter((field) =>
                    candidateColumnNames.includes(field),
                );
                const [candidateResult] = await connection.query(
                    `INSERT INTO ung_vien (${candidateFields.join(", ")})
                     VALUES (${candidateFields.map(() => "?").join(", ")})`,
                    candidateFields.map((field) => candidateData[field]),
                );

                const storedFileName = taoTenFile(file.tenFile);
                let storedPath;
                if (dangChayTrenVercel) {
                    const blob = await put(`cv/${storedFileName}`, file.buffer, { access: "public" });
                    storedPath = blob.url;
                } else {
                    if (!fs.existsSync(thuMucUpload)) fs.mkdirSync(thuMucUpload, { recursive: true });
                    const destination = path.join(thuMucUpload, storedFileName);
                    fs.writeFileSync(destination, file.buffer, { flag: "wx" });
                    storedPath = path.relative(process.cwd(), destination).split(path.sep).join("/");
                }
                duongDanDaLuu.push(storedPath);

                const cvData = {
                    ...cvInsert,
                    ung_vien_id: candidateResult.insertId,
                    ten_file: file.tenFile.slice(0, 255),
                    duong_dan: storedPath,
                    loai_file: layMimeType(null, file.tenFile),
                    kich_thuoc: file.buffer.length,
                };
                const cvFields = Object.keys(cvData).filter((field) => cvColumnNames.includes(field));
                await connection.query(
                    `INSERT INTO cv (${cvFields.join(", ")})
                     VALUES (${cvFields.map(() => "?").join(", ")})`,
                    cvFields.map((field) => cvData[field]),
                );
            }

            await connection.commit();
            transactionStarted = false;
            res.status(201).json({
                message: `Đã tải lên ${cvFiles.length} CV.`,
                count: cvFiles.length,
            });
        } catch (error) {
            if (transactionStarted && connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error("Lỗi rollback upload CV theo đợt:", rollbackError);
                }
            }
            for (const duongDan of duongDanDaLuu) {
                if (laUrlBlob(duongDan)) await xoaFileCV(duongDan);
                else xoaFileLocal(duongDan);
            }

            console.error("Lỗi upload CV theo đợt:", error);
            if (error instanceof multer.MulterError) {
                const message = error.code === "LIMIT_FILE_SIZE"
                    ? "Mỗi file tải lên không được vượt quá 10 MB."
                    : error.code === "LIMIT_FILE_COUNT"
                        ? `Tối đa ${MAX_MULTIPART_FILES} file mỗi lần tải.`
                        : "Upload file thất bại.";
                return res.status(400).json({ message });
            }
            if (error.message?.startsWith("Chỉ cho phép file")) {
                return res.status(400).json({ message: error.message });
            }
            if (error.message?.includes("ZIP") || error.message?.includes("CV trong ZIP")) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || "Không thể tải CV lên đợt tuyển dụng." });
        } finally {
            if (connection) connection.release();
        }
    },
);

// TẢI CV

router.get(
    "/:id/tai-xuong",
    kiemTraDangNhap,
    async function (req, res) {
        try {
            const id = Number(
                req.params.id,
            );

            if (!id) {
                return res.status(400).json({
                    message:
                        "ID CV không hợp lệ",
                });
            }

            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        ten_file,
                        duong_dan,
                        loai_file,
                        kich_thuoc
                    FROM cv
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [id],
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Không tìm thấy CV",
                });
            }

            const cv = rows[0];

            if (!cv.duong_dan) {
                return res.status(404).json({
                    message:
                        "CV chưa có file lưu trữ",
                });
            }

            // Vercel Blob

            if (laUrlBlob(cv.duong_dan)) {
                return res.redirect(
                    cv.duong_dan,
                );
            }

            // File local

            const duongDanFile =
                path.resolve(
                    process.cwd(),
                    cv.duong_dan,
                );

            const thuMucGoc =
                path.resolve(
                    process.cwd(),
                    "uploads",
                    "cv",
                );

            const duongDanChuan =
                path.normalize(
                    duongDanFile,
                );

            const thuMucChuan =
                path.normalize(
                    thuMucGoc,
                );

            if (
                duongDanChuan !==
                thuMucChuan &&
                !duongDanChuan.startsWith(
                    thuMucChuan +
                    path.sep,
                )
            ) {
                return res.status(403).json({
                    message:
                        "Đường dẫn file không hợp lệ",
                });
            }

            if (
                !fs.existsSync(
                    duongDanFile,
                )
            ) {
                return res.status(404).json({
                    message:
                        "Không tìm thấy file CV trên máy chủ",
                });
            }

            const tenFile =
                cv.ten_file ||
                "CV-ung-vien";

            const contentType =
                cv.loai_file ||
                layMimeType(
                    null,
                    tenFile,
                );

            res.setHeader(
                "Content-Type",
                contentType,
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename*=UTF-8''${encodeURIComponent(
                    tenFile,
                )}`,
            );

            if (cv.kich_thuoc) {
                res.setHeader(
                    "Content-Length",
                    String(
                        cv.kich_thuoc,
                    ),
                );
            }

            res.download(
                duongDanFile,
                tenFile,
                function (error) {
                    if (error) {
                        console.error(
                            "Lỗi gửi file CV:",
                            error,
                        );

                        if (
                            !res.headersSent
                        ) {
                            res.status(500).json({
                                message:
                                    "Không thể tải file CV",
                            });
                        }
                    }
                },
            );
        } catch (error) {
            console.error(
                "Lỗi tải CV:",
                error,
            );

            if (!res.headersSent) {
                res.status(500).json({
                    message:
                        "Không thể tải file CV",
                });
            }
        }
    },
);

// CHI TIẾT CV

router.get(
    "/:id",
    kiemTraDangNhap,
    async function (req, res) {
        try {
            const id = Number(
                req.params.id,
            );

            if (!id) {
                return res.status(400).json({
                    message:
                        "ID CV không hợp lệ",
                });
            }

            const [rows] =
                await db.query(
                    `
                    SELECT
                        cv.id,
                        cv.ung_vien_id,
                        cv.ten_file,
                        cv.duong_dan,
                        cv.loai_file,
                        cv.kich_thuoc,
                        cv.noi_dung,
                        cv.la_ban_chinh,
                        cv.ngay_tai_len,
                        uv.ho_ten,
                        uv.email,
                        uv.so_dien_thoai,
                        uv.dot_tuyen_id,
                        dt.ten_dot AS ten_dot_tuyen
                    FROM cv
                    INNER JOIN ung_vien uv
                        ON uv.id = cv.ung_vien_id
                    LEFT JOIN dot_tuyen dt
                        ON dt.id = uv.dot_tuyen_id
                    WHERE cv.id = ?
                    LIMIT 1
                    `,
                    [id],
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Không tìm thấy CV",
                });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error(
                "Lỗi lấy chi tiết CV:",
                error,
            );

            res.status(500).json({
                message:
                    "Không lấy được thông tin CV",
            });
        }
    },
);

// ĐẶT CV BẢN CHÍNH

router.put(
    "/:id/dat-ban-chinh",
    kiemTraDangNhap,
    kiemTraVaiTro(
        "admin",
        "manager",
        "hr",
    ),
    async function (req, res) {
        let connection;

        try {
            const id = Number(
                req.params.id,
            );

            if (!id) {
                return res.status(400).json({
                    message:
                        "ID CV không hợp lệ",
                });
            }

            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        ung_vien_id
                    FROM cv
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [id],
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Không tìm thấy CV",
                });
            }

            const ungVienId =
                rows[0].ung_vien_id;

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            await connection.query(
                `
                UPDATE cv
                SET la_ban_chinh = 0
                WHERE ung_vien_id = ?
                `,
                [ungVienId],
            );

            await connection.query(
                `
                UPDATE cv
                SET la_ban_chinh = 1
                WHERE id = ?
                `,
                [id],
            );

            await connection.commit();

            res.json({
                message:
                    "Đã đặt CV làm bản chính",
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Lỗi rollback:",
                        rollbackError,
                    );
                }
            }

            console.error(
                "Lỗi đặt CV bản chính:",
                error,
            );

            res.status(500).json({
                message:
                    "Không thể đặt CV làm bản chính",
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },
);

// XÓA CV

router.delete(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro(
        "admin",
        "manager",
    ),
    async function (req, res) {
        try {
            const id = Number(
                req.params.id,
            );

            if (!id) {
                return res.status(400).json({
                    message:
                        "ID CV không hợp lệ",
                });
            }

            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        duong_dan
                    FROM cv
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [id],
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Không tìm thấy CV",
                });
            }

            const duongDan =
                rows[0].duong_dan;

            await db.query(
                `
                DELETE FROM cv
                WHERE id = ?
                `,
                [id],
            );

            if (duongDan) {
                await xoaFileCV(
                    duongDan,
                );
            }

            res.json({
                message:
                    "Đã xóa CV",
            });
        } catch (error) {
            console.error(
                "Lỗi xóa CV:",
                error,
            );

            res.status(500).json({
                message:
                    "Không thể xóa CV",
            });
        }
    },
);

module.exports = router;