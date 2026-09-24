const express = require("express");
const db = require("../database/db");

const {
    kiemTraDangNhap,
    kiemTraVaiTro
} = require("../middleware/auth");

const router = express.Router();


// Danh sách người dùng
router.get(
    "/",
    kiemTraDangNhap,
    kiemTraVaiTro("admin"),
    async function (req, res) {

        try {

            const [rows] = await db.query(`
                SELECT
                    id,
                    ho_ten,
                    email,
                    vai_tro,
                    trang_thai,
                    ngay_tao,
                    ngay_sua
                FROM nguoi_dung
                ORDER BY id DESC
            `);

            res.json(rows);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Khong lay duoc danh sach nguoi dung"
            });
        }
    }
);


// Thêm người dùng
router.post(
    "/",
    kiemTraDangNhap,
    kiemTraVaiTro("admin"),
    async function (req, res) {

        try {

            const {
                ho_ten,
                email,
                mat_khau,
                vai_tro,
                trang_thai
            } = req.body;


            if (!ho_ten || !email || !mat_khau || !vai_tro) {

                return res.status(400).json({
                    message: "Vui long nhap day du thong tin"
                });
            }


            const vaiTroHopLe = [
                "admin",
                "manager",
                "hr",
                "interviewer",
                "viewer"
            ];


            if (!vaiTroHopLe.includes(vai_tro)) {

                return res.status(400).json({
                    message: "Vai tro khong hop le"
                });
            }


            const [tonTai] = await db.query(
                "SELECT id FROM nguoi_dung WHERE email = ?",
                [email]
            );


            if (tonTai.length > 0) {

                return res.status(400).json({
                    message: "Email da ton tai"
                });
            }


            await db.query(
                `
                INSERT INTO nguoi_dung
                (
                    ho_ten,
                    email,
                    mat_khau,
                    vai_tro,
                    trang_thai
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    ho_ten,
                    email,
                    mat_khau,
                    vai_tro,
                    trang_thai || "hoat_dong"
                ]
            );


            res.json({
                message: "Them nguoi dung thanh cong"
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Khong them duoc nguoi dung"
            });
        }
    }
);


// Sửa người dùng
router.put(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro("admin"),
    async function (req, res) {

        try {

            const id = req.params.id;

            const {
                ho_ten,
                email,
                mat_khau,
                vai_tro,
                trang_thai
            } = req.body;


            if (!ho_ten || !email || !vai_tro) {

                return res.status(400).json({
                    message: "Vui long nhap day du thong tin"
                });
            }


            const vaiTroHopLe = [
                "admin",
                "manager",
                "hr",
                "interviewer",
                "viewer"
            ];


            if (!vaiTroHopLe.includes(vai_tro)) {

                return res.status(400).json({
                    message: "Vai tro khong hop le"
                });
            }


            const [emailTrung] = await db.query(
                `
                SELECT id
                FROM nguoi_dung
                WHERE email = ?
                AND id <> ?
                `,
                [email, id]
            );


            if (emailTrung.length > 0) {

                return res.status(400).json({
                    message: "Email da duoc su dung"
                });
            }


            if (mat_khau && mat_khau.trim() !== "") {

                await db.query(
                    `
                    UPDATE nguoi_dung
                    SET
                        ho_ten = ?,
                        email = ?,
                        mat_khau = ?,
                        vai_tro = ?,
                        trang_thai = ?,
                        ngay_sua = NOW()
                    WHERE id = ?
                    `,
                    [
                        ho_ten,
                        email,
                        mat_khau,
                        vai_tro,
                        trang_thai || "hoat_dong",
                        id
                    ]
                );

            } else {

                await db.query(
                    `
                    UPDATE nguoi_dung
                    SET
                        ho_ten = ?,
                        email = ?,
                        vai_tro = ?,
                        trang_thai = ?,
                        ngay_sua = NOW()
                    WHERE id = ?
                    `,
                    [
                        ho_ten,
                        email,
                        vai_tro,
                        trang_thai || "hoat_dong",
                        id
                    ]
                );
            }


            res.json({
                message: "Cap nhat nguoi dung thanh cong"
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Khong cap nhat duoc nguoi dung"
            });
        }
    }
);


// Khóa / mở khóa
router.put(
    "/:id/trang-thai",
    kiemTraDangNhap,
    kiemTraVaiTro("admin"),
    async function (req, res) {

        try {

            const id = req.params.id;
            const { trang_thai } = req.body;


            if (
                trang_thai !== "hoat_dong" &&
                trang_thai !== "bi_khoa"
            ) {

                return res.status(400).json({
                    message: "Trang thai khong hop le"
                });
            }


            await db.query(
                `
                UPDATE nguoi_dung
                SET
                    trang_thai = ?,
                    ngay_sua = NOW()
                WHERE id = ?
                `,
                [
                    trang_thai,
                    id
                ]
            );


            res.json({
                message: "Cap nhat trang thai thanh cong"
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Khong cap nhat duoc trang thai"
            });
        }
    }
);


module.exports = router;