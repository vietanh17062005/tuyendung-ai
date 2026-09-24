const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../database/db");

const {
    kiemTraDangNhap,
    kiemTraVaiTro
} = require("../middleware/auth");

const router = express.Router();

const thuMucUpload = path.join(__dirname, "../uploads/cv");

if (!fs.existsSync(thuMucUpload)) {
    fs.mkdirSync(thuMucUpload, {
        recursive: true
    });
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, thuMucUpload);
    },

    filename: function(req, file, cb) {
        const tenGoc = path
            .basename(file.originalname)
            .replace(/[^a-zA-Z0-9._-]/g, "_");

        const tenFile =
            Date.now() + "_" + tenGoc;

        cb(null, tenFile);
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: function(req, file, cb) {
        const duoiFile =
            path.extname(file.originalname).toLowerCase();

        const danhSachDuocPhep = [
            ".pdf",
            ".doc",
            ".docx",
            ".jpg",
            ".jpeg",
            ".png"
        ];

        if (!danhSachDuocPhep.includes(duoiFile)) {
            return cb(
                new Error(
                    "Chỉ cho phép PDF, DOC, DOCX, JPG, JPEG, PNG"
                )
            );
        }

        cb(null, true);
    }
});

// Lấy danh sách ứng viên
router.get(
    "/",
    kiemTraDangNhap,
    async function(req, res) {
        try {
            const { dot_tuyen_id } = req.query;

            let sql = `
                SELECT
                    uv.*,
                    dt.ten AS ten_dot_tuyen,
                    cv.id AS cv_id,
                    cv.ten_file,
                    cv.loai_file,
                    cv.kich_thuoc,
                    cv.ngay_tai
                FROM ung_vien AS uv
                JOIN dot_tuyen AS dt
                    ON uv.dot_tuyen_id = dt.id
                LEFT JOIN cv
                    ON cv.ung_vien_id = uv.id
            `;

            const params = [];

            if (dot_tuyen_id) {
                sql += `
                    WHERE uv.dot_tuyen_id = ?
                `;

                params.push(dot_tuyen_id);
            }

            sql += `
                ORDER BY uv.id DESC
            `;

            const [rows] = await db.query(
                sql,
                params
            );

            res.json(rows);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Không lấy được danh sách ứng viên"
            });
        }
    }
);

// Lấy chi tiết ứng viên
router.get(
    "/:id",
    kiemTraDangNhap,
    async function(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT
                    uv.*,
                    dt.ten AS ten_dot_tuyen
                FROM ung_vien AS uv
                JOIN dot_tuyen AS dt
                    ON uv.dot_tuyen_id = dt.id
                WHERE uv.id = ?
            `, [req.params.id]);

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy ứng viên"
                });
            }

            const [cv] = await db.query(`
                SELECT *
                FROM cv
                WHERE ung_vien_id = ?
                ORDER BY id DESC
            `, [req.params.id]);

            res.json({
                ung_vien: rows[0],
                cv: cv
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Không lấy được ứng viên"
            });
        }
    }
);

// Thêm ứng viên
router.post(
    "/",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function(req, res) {
        try {
            const {
                dot_tuyen_id,
                ho_ten,
                email,
                sdt,
                nguon,
                ghi_chu
            } = req.body;

            if (!dot_tuyen_id || !ho_ten) {
                return res.status(400).json({
                    message:
                        "Vui lòng nhập đợt tuyển dụng và họ tên"
                });
            }

            if (email) {
                const [trungEmail] = await db.query(`
                    SELECT id
                    FROM ung_vien
                    WHERE dot_tuyen_id = ?
                    AND email = ?
                `, [
                    dot_tuyen_id,
                    email
                ]);

                if (trungEmail.length > 0) {
                    return res.status(400).json({
                        message:
                            "Ứng viên có email này đã tồn tại trong đợt tuyển dụng"
                    });
                }
            }

            const [result] = await db.query(`
                INSERT INTO ung_vien (
                    dot_tuyen_id,
                    ho_ten,
                    email,
                    sdt,
                    nguon,
                    trang_thai,
                    ghi_chu
                )
                VALUES (?, ?, ?, ?, ?, 'moi', ?)
            `, [
                dot_tuyen_id,
                ho_ten,
                email || null,
                sdt || null,
                nguon || null,
                ghi_chu || null
            ]);

            res.status(201).json({
                message: "Thêm ứng viên thành công",
                id: result.insertId
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Thêm ứng viên thất bại"
            });
        }
    }
);

// Sửa ứng viên
router.put(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function(req, res) {
        try {
            const {
                dot_tuyen_id,
                ho_ten,
                email,
                sdt,
                nguon,
                trang_thai,
                ghi_chu
            } = req.body;

            const [result] = await db.query(`
                UPDATE ung_vien
                SET
                    dot_tuyen_id = ?,
                    ho_ten = ?,
                    email = ?,
                    sdt = ?,
                    nguon = ?,
                    trang_thai = ?,
                    ghi_chu = ?,
                    ngay_sua = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                dot_tuyen_id,
                ho_ten,
                email || null,
                sdt || null,
                nguon || null,
                trang_thai || "moi",
                ghi_chu || null,
                req.params.id
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy ứng viên"
                });
            }

            res.json({
                message: "Cập nhật ứng viên thành công"
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Cập nhật ứng viên thất bại"
            });
        }
    }
);

// Upload CV
router.post(
    "/:id/cv",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    function(req, res) {

        upload.single("cv")(req, res, async function(error) {

            if (error) {
                return res.status(400).json({
                    message: error.message
                });
            }

            try {
                if (!req.file) {
                    return res.status(400).json({
                        message: "Vui lòng chọn file CV"
                    });
                }

                const [ungVien] = await db.query(
                    "SELECT id FROM ung_vien WHERE id = ?",
                    [req.params.id]
                );

                if (ungVien.length === 0) {
                    fs.unlinkSync(req.file.path);

                    return res.status(404).json({
                        message: "Không tìm thấy ứng viên"
                    });
                }

                const duoiFile =
                    path.extname(
                        req.file.originalname
                    ).toLowerCase();

                const [cvCu] = await db.query(`
                    SELECT id
                    FROM cv
                    WHERE ung_vien_id = ?
                    AND ten_file = ?
                `, [
                    req.params.id,
                    req.file.originalname
                ]);

                if (cvCu.length > 0) {
                    fs.unlinkSync(req.file.path);

                    return res.status(400).json({
                        message:
                            "CV này đã được tải lên trước đó"
                    });
                }

                await db.query(`
                    INSERT INTO cv (
                        ung_vien_id,
                        ten_file,
                        duong_dan,
                        loai_file,
                        kich_thuoc,
                        nguoi_tai
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    req.params.id,
                    req.file.originalname,
                    req.file.filename,
                    duoiFile,
                    req.file.size,
                    req.nguoiDung.id
                ]);

                res.json({
                    message: "Upload CV thành công"
                });

            } catch (error) {
                console.error(error);

                if (
                    req.file &&
                    fs.existsSync(req.file.path)
                ) {
                    fs.unlinkSync(req.file.path);
                }

                res.status(500).json({
                    message: "Upload CV thất bại"
                });
            }
        });
    }
);

// Tải CV
router.get(
    "/:id/cv/:cvId",
    kiemTraDangNhap,
    async function(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT *
                FROM cv
                WHERE id = ?
                AND ung_vien_id = ?
            `, [
                req.params.cvId,
                req.params.id
            ]);

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy CV"
                });
            }

            const cv = rows[0];

            const duongDan = path.join(
                thuMucUpload,
                cv.duong_dan
            );

            if (!fs.existsSync(duongDan)) {
                return res.status(404).json({
                    message: "File CV không tồn tại"
                });
            }

            res.download(
                duongDan,
                cv.ten_file
            );

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Không tải được CV"
            });
        }
    }
);

// Xóa CV
router.delete(
    "/:id/cv/:cvId",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT *
                FROM cv
                WHERE id = ?
                AND ung_vien_id = ?
            `, [
                req.params.cvId,
                req.params.id
            ]);

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy CV"
                });
            }

            const cv = rows[0];

            const duongDan = path.join(
                thuMucUpload,
                cv.duong_dan
            );

            if (fs.existsSync(duongDan)) {
                fs.unlinkSync(duongDan);
            }

            await db.query(
                "DELETE FROM cv WHERE id = ?",
                [req.params.cvId]
            );

            res.json({
                message: "Xóa CV thành công"
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Xóa CV thất bại"
            });
        }
    }
);

// Xóa ứng viên
router.delete(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager"),
    async function(req, res) {
        try {
            const [cv] = await db.query(`
                SELECT duong_dan
                FROM cv
                WHERE ung_vien_id = ?
            `, [req.params.id]);

            for (const file of cv) {
                const duongDan = path.join(
                    thuMucUpload,
                    file.duong_dan
                );

                if (fs.existsSync(duongDan)) {
                    fs.unlinkSync(duongDan);
                }
            }

            const [result] = await db.query(
                "DELETE FROM ung_vien WHERE id = ?",
                [req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy ứng viên"
                });
            }

            res.json({
                message: "Xóa ứng viên thành công"
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Xóa ứng viên thất bại"
            });
        }
    }
);

module.exports = router;