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
                d.nguoi_tao,
                d.ngay_bat_dau,
                d.ngay_ket_thuc,
                d.ngay_tao,
                n.ho_ten AS ten_nguoi_tao
            FROM dot_tuyen d
            LEFT JOIN nguoi_dung n ON d.nguoi_tao = n.id
            ORDER BY d.id DESC
        `);

        res.json(rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Khong lay duoc danh sach dot tuyen"
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
                ngay_ket_thuc
            } = req.body;

            if (!ten) {
                return res.status(400).json({
                    message: "Vui long nhap ten dot tuyen"
                });
            }

            const [result] = await db.query(
                `INSERT INTO dot_tuyen
                (ten, mo_ta, trang_thai, nguoi_tao, ngay_bat_dau, ngay_ket_thuc)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    [
                        ten,
                        mo_ta || null,
                        req.body.trang_thai || "nhap",
                        req.nguoiDung.id,
                        ngay_bat_dau || null,
                        ngay_ket_thuc || null
                    ]
                ]
            );

            res.json({
                message: "Them dot tuyen thanh cong",
                id: result.insertId
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Them dot tuyen that bai"
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
            const { id } = req.params;

            const {
                ten,
                mo_ta,
                trang_thai,
                ngay_bat_dau,
                ngay_ket_thuc
            } = req.body;

            const [result] = await db.query(
                `UPDATE dot_tuyen
                SET ten = ?,
                    mo_ta = ?,
                    trang_thai = ?,
                    ngay_bat_dau = ?,
                    ngay_ket_thuc = ?
                WHERE id = ?`,
                [
                    ten,
                    mo_ta || null,
                    trang_thai,
                    ngay_bat_dau || null,
                    ngay_ket_thuc || null,
                    id
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Khong tim thay dot tuyen"
                });
            }

            res.json({
                message: "Cap nhat dot tuyen thanh cong"
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Cap nhat dot tuyen that bai"
            });
        }
    }
);


router.delete(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager"),
    async function (req, res) {
        try {
            const { id } = req.params;

            const [result] = await db.query(
                "DELETE FROM dot_tuyen WHERE id = ?",
                [id]
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
            console.error(error);

            res.status(500).json({
                message: "Xoa dot tuyen that bai"
            });
        }
    }
);


module.exports = router;