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
                jd.nguoi_duyet AS nguoi_duyet_id,
                jd.ngay_duyet,
                jd.tieu_chi,
                jd.ngay_tao,
                jd.ngay_sua AS ngay_cap_nhat,
                dt.ten_dot AS ten_dot_tuyen,
                nd.ho_ten AS ten_nguoi_duyet
            FROM jd
            INNER JOIN dot_tuyen AS dt
                ON jd.dot_tuyen_id = dt.id
            LEFT JOIN nguoi_dung AS nd
                ON jd.nguoi_duyet = nd.id
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
                jd.nguoi_duyet AS nguoi_duyet_id,
                jd.ngay_duyet,
                jd.tieu_chi,
                jd.ngay_tao,
                jd.ngay_sua AS ngay_cap_nhat,
                dt.ten_dot AS ten_dot_tuyen,
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
                "nhap",
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
                    tieu_chi = ?
                WHERE id = ?
                AND trang_thai IN ('nhap', 'tu_choi')
            `, [
                dot_tuyen_id,
                tieu_de,
                mo_ta || null,
                yeu_cau || null,
                quyen_loi || null,
                tieu_chi ? JSON.stringify(tieu_chi) : null,
                req.params.id
            ]);

            if (result.affectedRows === 0) {
                const [jdRows] = await db.query(
                    "SELECT trang_thai FROM jd WHERE id = ?",
                    [req.params.id]
                );

                if (jdRows.length === 0) {
                    return res.status(404).json({
                        message: "Không tìm thấy JD"
                    });
                }

                if (!["nhap", "tu_choi"].includes(jdRows[0].trang_thai)) {
                    return res.status(400).json({
                        message: "Chỉ có thể sửa JD ở trạng thái Nháp hoặc Từ chối"
                    });
                }
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
                AND trang_thai IN ('nhap', 'tu_choi')
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
                    message: "Chỉ có thể gửi duyệt JD ở trạng thái Nháp hoặc Từ chối"
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
                    nguoi_duyet = ?,
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

/*
 * TU CHOI JD
 * cho_duyet -> tu_choi
 */
router.put(
    "/:id/tu-choi",
    kiemTraDangNhap,
    kiemTraVaiTro("admin", "manager"),
    async function (req, res) {
        try {
            const [result] = await db.query(`
                UPDATE jd
                SET trang_thai = 'tu_choi'
                WHERE id = ?
                AND trang_thai = 'cho_duyet'
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
                    message: "Chỉ có thể từ chối JD đang chờ duyệt"
                });
            }

            res.json({
                message: "Từ chối JD thành công"
            });
        } catch (error) {
            console.error("PUT /api/jd/:id/tu-choi:", error);

            res.status(500).json({
                message: "Không từ chối được JD",
                error: error.message
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
            const [result] = await db.query(
                "DELETE FROM jd WHERE id = ? AND trang_thai <> 'da_duyet'",
                [req.params.id]
            );

            if (result.affectedRows === 0) {
                const [jdRows] = await db.query(
                    "SELECT trang_thai FROM jd WHERE id = ?",
                    [req.params.id]
                );

                if (jdRows.length === 0) {
                    return res.status(404).json({
                        message: "Không tìm thấy JD"
                    });
                }

                return res.status(400).json({
                    message: "Không thể xóa JD đã được duyệt"
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