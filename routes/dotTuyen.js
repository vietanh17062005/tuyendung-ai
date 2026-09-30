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
                d.ten_dot AS ten,
                d.mo_ta,
                d.trang_thai,
                d.nguoi_tao_id,
                DATE_FORMAT(d.ngay_bat_dau, '%Y-%m-%d') AS ngay_bat_dau,
                DATE_FORMAT(d.ngay_ket_thuc, '%Y-%m-%d') AS ngay_ket_thuc,
                d.ngay_tao,
                d.ngay_cap_nhat,
                n.ho_ten AS nguoi_tao_ten
            FROM dot_tuyen AS d
            LEFT JOIN nguoi_dung AS n
                ON d.nguoi_tao_id = n.id
            ORDER BY d.id DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error("GET /api/dot-tuyen:", error);

        res.status(500).json({
            message: "Khong lay duoc danh sach dot tuyen",
            error: error.message
        });
    }
});

router.get("/:id", kiemTraDangNhap, async function (req, res) {
    try {
        const [rows] = await db.query(`
            SELECT
                d.id,
                d.ten_dot AS ten,
                d.mo_ta,
                d.trang_thai,
                d.nguoi_tao_id,
                DATE_FORMAT(d.ngay_bat_dau, '%Y-%m-%d') AS ngay_bat_dau,
                DATE_FORMAT(d.ngay_ket_thuc, '%Y-%m-%d') AS ngay_ket_thuc,
                d.ngay_tao,
                d.ngay_cap_nhat,
                n.ho_ten AS nguoi_tao_ten
            FROM dot_tuyen AS d
            LEFT JOIN nguoi_dung AS n
                ON d.nguoi_tao_id = n.id
            WHERE d.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Khong tim thay dot tuyen"
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("GET /api/dot-tuyen/:id:", error);

        res.status(500).json({
            message: "Khong lay duoc dot tuyen",
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
                    message: "Vui long nhap ten dot tuyen"
                });
            }

            const nguoiTaoId = req.nguoiDung.id;

            const [result] = await db.query(`
                INSERT INTO dot_tuyen
                (
                    ten_dot,
                    mo_ta,
                    nguoi_tao_id,
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
                message: "Tao dot tuyen thanh cong",
                id: result.insertId
            });
        } catch (error) {
            console.error("POST /api/dot-tuyen:", error);

            res.status(500).json({
                message: "Khong tao duoc dot tuyen",
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
                    message: "Vui long nhap ten dot tuyen"
                });
            }

            const [result] = await db.query(`
                UPDATE dot_tuyen
                SET
                    ten_dot = ?,
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
                    message: "Khong tim thay dot tuyen"
                });
            }

            res.json({
                message: "Cap nhat dot tuyen thanh cong"
            });
        } catch (error) {
            console.error("PUT /api/dot-tuyen/:id:", error);

            res.status(500).json({
                message: "Khong cap nhat duoc dot tuyen",
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
                    message: "Khong tim thay dot tuyen"
                });
            }

            res.json({
                message: "Xoa dot tuyen thanh cong"
            });
        } catch (error) {
            console.error("DELETE /api/dot-tuyen/:id:", error);

            res.status(500).json({
                message: "Khong xoa duoc dot tuyen",
                error: error.message
            });
        }
    }
);

module.exports = router;