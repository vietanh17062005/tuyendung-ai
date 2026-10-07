const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { put, del } = require("@vercel/blob");

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

// =====================================================
// MULTER
// =====================================================

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

// =====================================================
// HÀM HỖ TRỢ
// =====================================================

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
        // CV được lưu trên Vercel Blob
        if (laUrlBlob(duongDan)) {
            await del(duongDan);
            return;
        }

        // CV được lưu local
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

// =====================================================
// LẤY DANH SÁCH CV
// =====================================================

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

// =====================================================
// UPLOAD CV
// =====================================================

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

            // Kiểm tra ứng viên
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

            if (
                ungVienRows.length === 0
            ) {
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

            // =================================================
            // LƯU FILE
            // =================================================

            const tenBlob = taoTenFile(tenFile);

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
            // Local -> uploads/cv
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
            error instanceof multer.MulterError
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

// =====================================================
// TẢI CV
// =====================================================

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

            // =================================================
            // VERCEL BLOB
            // =================================================

            if (laUrlBlob(cv.duong_dan)) {
                return res.redirect(
                    cv.duong_dan,
                );
            }

            // =================================================
            // FILE LOCAL
            // =================================================

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

// =====================================================
// CHI TIẾT CV
// =====================================================

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

// =====================================================
// ĐẶT CV BẢN CHÍNH
// =====================================================

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
                await connection.rollback();
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

// =====================================================
// XÓA CV
// =====================================================

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

            // Xóa file vật lý / Blob
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