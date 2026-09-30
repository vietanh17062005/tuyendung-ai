const express = require("express");
const db = require("../database/db");

const {
    kiemTraDangNhap,
    kiemTraVaiTro
} = require("../middleware/auth");

const router = express.Router();


// Lấy danh sách JD
router.get("/", kiemTraDangNhap, async function (req, res) {
    try {
        const [rows] = await db.query(`
            SELECT
                jd.*,
                dt.ten AS ten_dot_tuyen,
                nd.ho_ten AS ten_nguoi_duyet
            FROM jd
            INNER JOIN dot_tuyen AS dt
                ON jd.dot_tuyen_id = dt.id
            LEFT JOIN nguoi_dung AS nd
                ON jd.nguoi_duyet = nd.id
            ORDER BY jd.id DESC
        `);

        res.json(rows);

    } catch (error) {
        console.error("GET /api/jd:", error);

        res.status(500).json({
            message: "Không lấy được danh sách JD",
            error: error.message
        });
    }
});


// Lấy chi tiết JD
router.get("/:id", kiemTraDangNhap, async function (req, res) {
    try {
        const [rows] = await db.query(`
            SELECT
                jd.*,
                dt.ten AS ten_dot_tuyen,
                nd.ho_ten AS ten_nguoi_duyet
            FROM jd
            INNER JOIN dot_tuyen AS dt
                ON jd.dot_tuyen_id = dt.id
            LEFT JOIN nguoi_dung AS nd
                ON jd.nguoi_duyet = nd.id
            WHERE jd.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy JD"
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error("GET /api/jd/:id:", error);

        res.status(500).json({
            message: "Không lấy được JD",
            error: error.message
        });
    }
});


// Tạo JD
router.post(
    "/",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function (req, res) {
        try {
            const {
                dot_tuyen_id,
                tieu_de,
                mo_ta,
                yeu_cau,
                quyen_loi,
                tieu_chi
            } = req.body;

            if (!dot_tuyen_id || !tieu_de || !tieu_de.trim()) {
                return res.status(400).json({
                    message: "Vui lòng nhập đợt tuyển dụng và tiêu đề JD"
                });
            }

            const [dotTuyen] = await db.query(
                "SELECT id FROM dot_tuyen WHERE id = ?",
                [dot_tuyen_id]
            );

            if (dotTuyen.length === 0) {
                return res.status(400).json({
                    message: "Đợt tuyển dụng không tồn tại"
                });
            }

            const [result] = await db.query(`
                INSERT INTO jd
                (
                    dot_tuyen_id,
                    tieu_de,
                    mo_ta,
                    yeu_cau,
                    quyen_loi,
                    tieu_chi,
                    trang_thai
                )
                VALUES (?, ?, ?, ?, ?, ?, 'nhap')
            `, [
                dot_tuyen_id,
                tieu_de.trim(),
                mo_ta || null,
                yeu_cau || null,
                quyen_loi || null,
                tieu_chi
                    ? JSON.stringify(tieu_chi)
                    : null
            ]);

            res.status(201).json({
                message: "Tạo JD thành công",
                id: result.insertId
            });

        } catch (error) {
            console.error("POST /api/jd:", error);

            res.status(500).json({
                message: "Tạo JD thất bại",
                error: error.message
            });
        }
    }
);


// Sửa JD
router.put(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function (req, res) {
        try {
            const {
                dot_tuyen_id,
                tieu_de,
                mo_ta,
                yeu_cau,
                quyen_loi,
                tieu_chi
            } = req.body;

            if (!dot_tuyen_id || !tieu_de || !tieu_de.trim()) {
                return res.status(400).json({
                    message: "Vui lòng nhập đầy đủ thông tin JD"
                });
            }

            const [jd] = await db.query(
                "SELECT trang_thai FROM jd WHERE id = ?",
                [req.params.id]
            );

            if (jd.length === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy JD"
                });
            }

            if (jd[0].trang_thai === "da_duyet") {
                return res.status(400).json({
                    message: "JD đã được duyệt, không thể chỉnh sửa"
                });
            }

            const [dotTuyen] = await db.query(
                "SELECT id FROM dot_tuyen WHERE id = ?",
                [dot_tuyen_id]
            );

            if (dotTuyen.length === 0) {
                return res.status(400).json({
                    message: "Đợt tuyển dụng không tồn tại"
                });
            }

            await db.query(`
                UPDATE jd
                SET
                    dot_tuyen_id = ?,
                    tieu_de = ?,
                    mo_ta = ?,
                    yeu_cau = ?,
                    quyen_loi = ?,
                    tieu_chi = ?,
                    ngay_sua = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                dot_tuyen_id,
                tieu_de.trim(),
                mo_ta || null,
                yeu_cau || null,
                quyen_loi || null,
                tieu_chi
                    ? JSON.stringify(tieu_chi)
                    : null,
                req.params.id
            ]);

            res.json({
                message: "Cập nhật JD thành công"
            });

        } catch (error) {
            console.error("PUT /api/jd/:id:", error);

            res.status(500).json({
                message: "Cập nhật JD thất bại",
                error: error.message
            });
        }
    }
);


// Gửi JD để duyệt
router.put(
    "/:id/gui-duyet",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function (req, res) {
        try {
            const [jd] = await db.query(
                "SELECT trang_thai FROM jd WHERE id = ?",
                [req.params.id]
            );

            if (jd.length === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy JD"
                });
            }

            if (jd[0].trang_thai === "da_duyet") {
                return res.status(400).json({
                    message: "JD đã được duyệt"
                });
            }

            await db.query(`
                UPDATE jd
                SET
                    trang_thai = 'cho_duyet',
                    ngay_sua = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [req.params.id]);

            res.json({
                message: "Đã gửi JD chờ duyệt"
            });

        } catch (error) {
            console.error("PUT /api/jd/:id/gui-duyet:", error);

            res.status(500).json({
                message: "Gửi duyệt JD thất bại",
                error: error.message
            });
        }
    }
);


// Duyệt JD
router.put(
    "/:id/duyet",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager"),
    async function (req, res) {
        try {
            const [jd] = await db.query(
                "SELECT trang_thai FROM jd WHERE id = ?",
                [req.params.id]
            );

            if (jd.length === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy JD"
                });
            }

            if (jd[0].trang_thai !== "cho_duyet") {
                return res.status(400).json({
                    message: "JD chưa ở trạng thái chờ duyệt"
                });
            }

            await db.query(`
                UPDATE jd
                SET
                    trang_thai = 'da_duyet',
                    nguoi_duyet = ?,
                    ngay_duyet = CURRENT_TIMESTAMP,
                    ngay_sua = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                req.nguoiDung.id,
                req.params.id
            ]);

            res.json({
                message: "Duyệt JD thành công"
            });

        } catch (error) {
            console.error("PUT /api/jd/:id/duyet:", error);

            res.status(500).json({
                message: "Duyệt JD thất bại",
                error: error.message
            });
        }
    }
);


// Xóa JD
router.delete(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager"),
    async function (req, res) {
        try {
            const [jd] = await db.query(
                "SELECT trang_thai FROM jd WHERE id = ?",
                [req.params.id]
            );

            if (jd.length === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy JD"
                });
            }

            if (jd[0].trang_thai === "da_duyet") {
                return res.status(400).json({
                    message: "JD đã duyệt không thể xóa"
                });
            }

            await db.query(
                "DELETE FROM jd WHERE id = ?",
                [req.params.id]
            );

            res.json({
                message: "Xóa JD thành công"
            });

        } catch (error) {
            console.error("DELETE /api/jd/:id:", error);

            res.status(500).json({
                message: "Xóa JD thất bại",
                error: error.message
            });
        }
    }
);


module.exports = router;