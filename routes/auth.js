const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../database/db");

const router = express.Router();

router.post("/login", async function (req, res) {
    try {
        const { email, mat_khau } = req.body;

        if (!email || !mat_khau) {
            return res.status(400).json({
                message: "Vui long nhap email va mat khau"
            });
        }

        const [rows] = await db.query(
            "SELECT * FROM nguoi_dung WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Email hoac mat khau khong dung"
            });
        }

        const nguoiDung = rows[0];

        if (nguoiDung.mat_khau !== mat_khau) {
            return res.status(401).json({
                message: "Email hoac mat khau khong dung"
            });
        }

        if (nguoiDung.trang_thai !== "hoat_dong") {
            return res.status(403).json({
                message: "Tai khoan dang bi khoa"
            });
        }

        const token = jwt.sign(
            {
                id: nguoiDung.id,
                ho_ten: nguoiDung.ho_ten,
                email: nguoiDung.email,
                vai_tro: nguoiDung.vai_tro
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            message: "Dang nhap thanh cong",
            token: token,
            nguoi_dung: {
                id: nguoiDung.id,
                ho_ten: nguoiDung.ho_ten,
                email: nguoiDung.email,
                vai_tro: nguoiDung.vai_tro
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Loi may chu"
        });
    }
});

module.exports = router;