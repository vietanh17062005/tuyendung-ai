const express = require("express");
const db = require("../database/db");

const {
    kiemTraDangNhap,
    kiemTraVaiTro
} = require("../middleware/auth");

const router = express.Router();

router.get("/", kiemTraDangNhap, async function (req, res) {
    try {
        const [rows] = await db.query(`
            SELECT
                d.id,
                d.ten,
                d.mo_ta,
                d.trang_thai,
                d.nguoi_tao AS nguoi_tao_id,
                DATE_FORMAT(d.ngay_bat_dau, '%Y-%m-%d') AS ngay_bat_dau,
                DATE_FORMAT(d.ngay_ket_thuc, '%Y-%m-%d') AS ngay_ket_thuc,
                d.ngay_tao,
                d.ngay_sua AS ngay_cap_nhat,
                n.ho_ten AS nguoi_tao_ten
            FROM dot_tuyen AS d
            LEFT JOIN nguoi_dung AS n
                ON d.nguoi_tao = n.id
            ORDER BY d.id ASC
        `);

        res.json(rows);
    } catch (error) {
        console.error("GET /api/dot-tuyen:", error);

        res.status(500).json({
            message: "Không lấy được danh sách đợt tuyển",
            error: error.message
        });
    }
});

router.get("/:id", kiemTraDangNhap, async function (req, res) {
    try {
        const [rows] = await db.query(`
            SELECT
                d.id,
                d.ten,
                d.mo_ta,
                d.trang_thai,
                d.nguoi_tao AS nguoi_tao_id,
                DATE_FORMAT(d.ngay_bat_dau, '%Y-%m-%d') AS ngay_bat_dau,
                DATE_FORMAT(d.ngay_ket_thuc, '%Y-%m-%d') AS ngay_ket_thuc,
                d.ngay_tao,
                d.ngay_sua AS ngay_cap_nhat,
                n.ho_ten AS nguoi_tao_ten
            FROM dot_tuyen AS d
            LEFT JOIN nguoi_dung AS n
                ON d.nguoi_tao = n.id
            WHERE d.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy đợt tuyển"
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("GET /api/dot-tuyen/:id:", error);

        res.status(500).json({
            message: "Không lấy được đợt tuyển",
            error: error.message
        });
    }
});

router.post(
    "/",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function (req, res) {
        try {
            const {
                ten,
                mo_ta,
                ngay_bat_dau,
                ngay_ket_thuc,
                trang_thai
            } = req.body;

            if (!ten) {
                return res.status(400).json({
                    message: "Vui lòng nhập tên đợt tuyển"
                });
            }

            const nguoiTaoId = req.nguoiDung.id;

            const [result] = await db.query(`
                INSERT INTO dot_tuyen
                (
                    ten,
                    mo_ta,
                    nguoi_tao,
                    trang_thai,
                    ngay_bat_dau,
                    ngay_ket_thuc
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                ten,
                mo_ta || null,
                nguoiTaoId,
                trang_thai || "nhap",
                ngay_bat_dau || null,
                ngay_ket_thuc || null
            ]);

            res.status(201).json({
                message: "Tạo đợt tuyển thành công",
                id: result.insertId
            });
        } catch (error) {
            console.error("POST /api/dot-tuyen:", error);

            res.status(500).json({
                message: "Không tạo được đợt tuyển",
                error: error.message
            });
        }
    }
);

router.put(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function (req, res) {
        try {
            const {
                ten,
                mo_ta,
                ngay_bat_dau,
                ngay_ket_thuc,
                trang_thai
            } = req.body;

            if (!ten) {
                return res.status(400).json({
                    message: "Vui lòng nhập tên đợt tuyển"
                });
            }

            const [result] = await db.query(`
                UPDATE dot_tuyen
                SET
                    ten = ?,
                    mo_ta = ?,
                    trang_thai = ?,
                    ngay_bat_dau = ?,
                    ngay_ket_thuc = ?
                WHERE id = ?
            `, [
                ten,
                mo_ta || null,
                trang_thai || "nhap",
                ngay_bat_dau || null,
                ngay_ket_thuc || null,
                req.params.id
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy đợt tuyển"
                });
            }

            res.json({
                message: "Cập nhật đợt tuyển thành công"
            });
        } catch (error) {
            console.error("PUT /api/dot-tuyen/:id:", error);

            res.status(500).json({
                message: "Không cập nhật được đợt tuyển",
                error: error.message
            });
        }
    }
);

router.delete(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function (req, res) {
        try {
            const [result] = await db.query(
                "DELETE FROM dot_tuyen WHERE id = ?",
                [req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy đợt tuyển"
                });
            }

            res.json({
                message: "Xóa đợt tuyển thành công"
            });
        } catch (error) {
            console.error("DELETE /api/dot-tuyen/:id:", error);

            res.status(500).json({
                message: "Không xóa được đợt tuyển",
                error: error.message
            });
        }
    }
);

module.exports = router;