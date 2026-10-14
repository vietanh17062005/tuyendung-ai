const express = require("express");
const router = express.Router();
const db = require("../database/db");
const { kiemTraDangNhap } = require("../middleware/auth");

// Lấy thông báo của người đang đăng nhập
router.get("/", kiemTraDangNhap, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT *
       FROM thong_bao
       WHERE nguoi_dung_id = ?
       ORDER BY ngay_tao DESC
       LIMIT 100`,
            [req.nguoiDung.id]
        );

        res.json(rows);
    } catch (error) {
        console.error("Lỗi lấy thông báo:", error);
        res.status(500).json({
            message: "Không thể lấy danh sách thông báo.",
        });
    }
});

// Đếm thông báo chưa đọc
router.get("/chua-doc/count", kiemTraDangNhap, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT COUNT(*) AS so_luong
       FROM thong_bao
       WHERE nguoi_dung_id = ? AND da_doc = 0`,
            [req.nguoiDung.id]
        );

        res.json({ so_luong: Number(rows[0].so_luong) });
    } catch (error) {
        console.error("Lỗi đếm thông báo:", error);
        res.status(500).json({
            message: "Không thể đếm thông báo chưa đọc.",
        });
    }
});

// Đánh dấu tất cả thông báo là đã đọc
router.patch("/doc-tat-ca", kiemTraDangNhap, async (req, res) => {
    try {
        const [result] = await db.execute(
            `UPDATE thong_bao
       SET da_doc = 1
       WHERE nguoi_dung_id = ? AND da_doc = 0`,
            [req.nguoiDung.id]
        );

        res.json({
            message: "Đã đánh dấu tất cả thông báo là đã đọc.",
            so_luong_cap_nhat: result.affectedRows,
        });
    } catch (error) {
        console.error("Lỗi cập nhật thông báo:", error);
        res.status(500).json({
            message: "Không thể cập nhật thông báo.",
        });
    }
});

// Đánh dấu một thông báo là đã đọc
router.patch("/:id/doc", kiemTraDangNhap, async (req, res) => {
    try {
        const [result] = await db.execute(
            `UPDATE thong_bao
       SET da_doc = 1
       WHERE id = ? AND nguoi_dung_id = ?`,
            [req.params.id, req.nguoiDung.id]
        );

        if (result.affectedRows === 0) {
            const [rows] = await db.execute(
                `SELECT id
         FROM thong_bao
         WHERE id = ? AND nguoi_dung_id = ?`,
                [req.params.id, req.nguoiDung.id]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy thông báo.",
                });
            }
        }

        res.json({ message: "Đã đánh dấu thông báo là đã đọc." });
    } catch (error) {
        console.error("Lỗi cập nhật thông báo:", error);
        res.status(500).json({
            message: "Không thể cập nhật thông báo.",
        });
    }
});

// Xóa thông báo của chính người đang đăng nhập
router.delete("/:id", kiemTraDangNhap, async (req, res) => {
    try {
        const [result] = await db.execute(
            `DELETE FROM thong_bao
       WHERE id = ? AND nguoi_dung_id = ?`,
            [req.params.id, req.nguoiDung.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Không tìm thấy thông báo.",
            });
        }

        res.json({ message: "Xóa thông báo thành công." });
    } catch (error) {
        console.error("Lỗi xóa thông báo:", error);
        res.status(500).json({
            message: "Không thể xóa thông báo.",
        });
    }
});

module.exports = router;