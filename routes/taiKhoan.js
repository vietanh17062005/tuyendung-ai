const express = require("express");

const db = require("../database/db");

const {
    kiemTraDangNhap
} = require("../middleware/auth");

const router = express.Router();


/* Lấy thông tin tài khoản */

router.get(
    "/",
    kiemTraDangNhap,
    async function (req, res) {

        try {

            const [rows] = await db.query(
                `
                SELECT
                    id,
                    ho_ten,
                    email,
                    vai_tro,
                    trang_thai,
                    ngay_tao
                FROM nguoi_dung
                WHERE id = ?
                `,
                [req.nguoiDung.id]
            );


            if (rows.length === 0) {

                return res.status(404).json({
                    message: "Khong tim thay tai khoan"
                });

            }


            res.json(rows[0]);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    "Khong lay duoc thong tin tai khoan"
            });

        }

    }
);


/* Cập nhật thông tin tài khoản */

router.put(
    "/",
    kiemTraDangNhap,
    async function (req, res) {

        try {

            const {
                ho_ten,
                email
            } = req.body;


            if (!ho_ten || !email) {

                return res.status(400).json({
                    message:
                        "Vui long nhap day du thong tin"
                });

            }


            const [emailTrung] =
                await db.query(
                    `
                    SELECT id
                    FROM nguoi_dung
                    WHERE email = ?
                    AND id <> ?
                    `,
                    [
                        email,
                        req.nguoiDung.id
                    ]
                );


            if (emailTrung.length > 0) {

                return res.status(400).json({
                    message:
                        "Email da duoc su dung"
                });

            }


            await db.query(
                `
                UPDATE nguoi_dung
                SET
                    ho_ten = ?,
                    email = ?,
                    ngay_sua = NOW()
                WHERE id = ?
                `,
                [
                    ho_ten,
                    email,
                    req.nguoiDung.id
                ]
            );


            res.json({
                message:
                    "Cap nhat thong tin thanh cong"
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    "Khong cap nhat duoc thong tin"
            });

        }

    }
);


/* Đổi mật khẩu */

router.put(
    "/mat-khau",
    kiemTraDangNhap,
    async function (req, res) {

        try {

            const {
                mat_khau_cu,
                mat_khau_moi
            } = req.body;


            if (
                !mat_khau_cu ||
                !mat_khau_moi
            ) {

                return res.status(400).json({
                    message:
                        "Vui long nhap day du mat khau"
                });

            }


            if (mat_khau_moi.length < 6) {

                return res.status(400).json({
                    message:
                        "Mat khau moi phai co it nhat 6 ky tu"
                });

            }


            const [rows] =
                await db.query(
                    `
                    SELECT mat_khau
                    FROM nguoi_dung
                    WHERE id = ?
                    `,
                    [req.nguoiDung.id]
                );


            if (rows.length === 0) {

                return res.status(404).json({
                    message:
                        "Khong tim thay tai khoan"
                });

            }


            if (
                rows[0].mat_khau !==
                mat_khau_cu
            ) {

                return res.status(400).json({
                    message:
                        "Mat khau cu khong dung"
                });

            }


            await db.query(
                `
                UPDATE nguoi_dung
                SET
                    mat_khau = ?,
                    ngay_sua = NOW()
                WHERE id = ?
                `,
                [
                    mat_khau_moi,
                    req.nguoiDung.id
                ]
            );


            res.json({
                message:
                    "Doi mat khau thanh cong"
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    "Khong doi duoc mat khau"
            });

        }

    }
);


module.exports = router;