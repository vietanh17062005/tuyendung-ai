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
                jd.id,
                jd.dot_tuyen_id,
                jd.tieu_de,
                jd.mo_ta,
                jd.yeu_cau,
                jd.quyen_loi,
                jd.trang_thai,
                jd.nguoi_duyet_id,
                jd.ngay_duyet,
                jd.tieu_chi,
                jd.ngay_tao,
                jd.ngay_cap_nhat,
                dt.ten_dot AS ten_dot_tuyen,
                nd.ho_ten AS ten_nguoi_duyet
            FROM jd
            INNER JOIN dot_tuyen AS dt
                ON jd.dot_tuyen_id = dt.id
            LEFT JOIN nguoi_dung AS nd
                ON jd.nguoi_duyet_id = nd.id
            ORDER BY jd.id ASC
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

router.get("/:id", kiemTraDangNhap, async function (req, res) {
    try {
        const [rows] = await db.query(`
            SELECT
                jd.id,
                jd.dot_tuyen_id,
                jd.tieu_de,
                jd.mo_ta,
                jd.yeu_cau,
                jd.quyen_loi,
                jd.trang_thai,
                jd.nguoi_duyet_id,
                jd.ngay_duyet,
                jd.tieu_chi,
                jd.ngay_tao,
                jd.ngay_cap_nhat,
                dt.ten_dot AS ten_dot_tuyen,
                nd.ho_ten AS ten_nguoi_duyet
            FROM jd
            INNER JOIN dot_tuyen AS dt
                ON jd.dot_tuyen_id = dt.id
            LEFT JOIN nguoi_dung AS nd
                ON jd.nguoi_duyet_id = nd.id
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
                trang_thai,
                tieu_chi
            } = req.body;

            if (!dot_tuyen_id || !tieu_de) {
                return res.status(400).json({
                    message: "Vui lòng nhập đầy đủ thông tin JD"
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
                    trang_thai,
                    tieu_chi
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                dot_tuyen_id,
                tieu_de,
                mo_ta || null,
                yeu_cau || null,
                quyen_loi || null,
                trang_thai || "nhap",
                tieu_chi ? JSON.stringify(tieu_chi) : null
            ]);

            res.status(201).json({
                message: "Tạo JD thành công",
                id: result.insertId
            });
        } catch (error) {
            console.error("POST /api/jd:", error);

            res.status(500).json({
                message: "Không tạo được JD",
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
                dot_tuyen_id,
                tieu_de,
                mo_ta,
                yeu_cau,
                quyen_loi,
                trang_thai,
                tieu_chi
            } = req.body;

            if (!dot_tuyen_id || !tieu_de) {
                return res.status(400).json({
                    message: "Vui lòng nhập đầy đủ thông tin JD"
                });
            }

            const [result] = await db.query(`
                UPDATE jd
                SET
                    dot_tuyen_id = ?,
                    tieu_de = ?,
                    mo_ta = ?,
                    yeu_cau = ?,
                    quyen_loi = ?,
                    trang_thai = ?,
                    tieu_chi = ?
                WHERE id = ?
            `, [
                dot_tuyen_id,
                tieu_de,
                mo_ta || null,
                yeu_cau || null,
                quyen_loi || null,
                trang_thai || "nhap",
                tieu_chi ? JSON.stringify(tieu_chi) : null,
                req.params.id
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy JD"
                });
            }

            res.json({
                message: "Cập nhật JD thành công"
            });
        } catch (error) {
            console.error("PUT /api/jd/:id:", error);

            res.status(500).json({
                message: "Không cập nhật được JD",
                error: error.message
            });
        }
    }
);

/*
 * GUI DUYET JD
 * nhap -> cho_duyet
 */
router.put(
    "/:id/gui-duyet",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager", "hr"),
    async function (req, res) {
        try {
            const [result] = await db.query(`
                UPDATE jd
                SET trang_thai = 'cho_duyet'
                WHERE id = ?
                AND trang_thai = 'nhap'
            `, [req.params.id]);

            if (result.affectedRows === 0) {
                const [rows] = await db.query(
                    "SELECT id, trang_thai FROM jd WHERE id = ?",
                    [req.params.id]
                );

                if (rows.length === 0) {
                    return res.status(404).json({
                        message: "Không tìm thấy JD"
                    });
                }

                return res.status(400).json({
                    message: "JD không ở trạng thái Nháp"
                });
            }

            res.json({
                message: "Gửi duyệt JD thành công"
            });
        } catch (error) {
            console.error("PUT /api/jd/:id/gui-duyet:", error);

            res.status(500).json({
                message: "Không gửi duyệt được JD",
                error: error.message
            });
        }
    }
);

/*
 * DUYET JD
 * cho_duyet -> da_duyet
 */
router.put(
    "/:id/duyet",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager"),
    async function (req, res) {
        try {
            const [result] = await db.query(`
                UPDATE jd
                SET
                    trang_thai = 'da_duyet',
                    nguoi_duyet_id = ?,
                    ngay_duyet = NOW()
                WHERE id = ?
                AND trang_thai = 'cho_duyet'
            `, [
                req.nguoiDung.id,
                req.params.id
            ]);

            if (result.affectedRows === 0) {
                const [rows] = await db.query(
                    "SELECT id, trang_thai FROM jd WHERE id = ?",
                    [req.params.id]
                );

                if (rows.length === 0) {
                    return res.status(404).json({
                        message: "Không tìm thấy JD"
                    });
                }

                return res.status(400).json({
                    message: "JD chưa được gửi duyệt"
                });
            }

            res.json({
                message: "Duyệt JD thành công"
            });
        } catch (error) {
            console.error("PUT /api/jd/:id/duyet:", error);

            res.status(500).json({
                message: "Không duyệt được JD",
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
                "DELETE FROM jd WHERE id = ?",
                [req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Không tìm thấy JD"
                });
            }

            res.json({
                message: "Xóa JD thành công"
            });
        } catch (error) {
            console.error("DELETE /api/jd/:id:", error);

            res.status(500).json({
                message: "Không xóa được JD",
                error: error.message
            });
        }
    }
);

module.exports = router;