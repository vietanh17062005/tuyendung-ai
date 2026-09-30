require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./database/db");

const authRoutes = require("./routes/auth");
const dotTuyenRoutes = require("./routes/dotTuyen");
const jdRoutes = require("./routes/jd");
const ungVienRoutes = require("./routes/ungVien");
const taiKhoanRoutes = require("./routes/taiKhoan");

const {
    kiemTraDangNhap,
    kiemTraVaiTro
} = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "public", "login", "login.html"));
});

app.get("/api/test-db", async function (req, res) {
    try {
        const [rows] = await db.query(
            "SELECT 1 AS ket_noi"
        );

        res.json({
            message: "Ket noi MySQL thanh cong",
            data: rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Ket noi MySQL that bai"
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/dot-tuyen", dotTuyenRoutes);
app.use("/api/jd", jdRoutes);
app.use("/api/ung-vien", ungVienRoutes);
app.use("/api/tai-khoan", taiKhoanRoutes);

app.get(
    "/api/dashboard",
    kiemTraDangNhap,
    async function (req, res) {
        try {
            const [dotTuyen] = await db.query(
                "SELECT COUNT(*) AS so_luong FROM dot_tuyen"
            );

            const [ungVien] = await db.query(
                "SELECT COUNT(*) AS so_luong FROM ung_vien"
            );

            const [phongVan] = await db.query(
                "SELECT COUNT(*) AS so_luong FROM phong_van"
            );

            const [daTuyen] = await db.query(
                `
                SELECT COUNT(*) AS so_luong
                FROM quyet_dinh
                WHERE ket_qua = 'hired'
                `
            );

            res.json({
                so_dot_tuyen: dotTuyen[0].so_luong,
                so_ung_vien: ungVien[0].so_luong,
                so_phong_van: phongVan[0].so_luong,
                so_da_tuyen: daTuyen[0].so_luong
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Khong lay duoc du lieu Dashboard"
            });
        }
    }
);

app.get(
    "/api/test-login",
    kiemTraDangNhap,
    function (req, res) {
        res.json({
            message: "Ban da dang nhap",
            nguoi_dung: req.nguoiDung
        });
    }
);

app.get(
    "/api/test-manager",
    kiemTraDangNhap,
    kiemTraVaiTro("manager"),
    function (req, res) {
        res.json({
            message: "Ban co quyen Manager"
        });
    }
);

app.use(function (error, req, res, next) {
    console.error(error);

    res.status(500).json({
        message: "Loi may chu"
    });
});

if (process.env.NODE_ENV !== "production") {
    app.listen(
        process.env.PORT || 3000,
        function () {
            console.log(
                `Server dang chay tai http://localhost:${process.env.PORT || 3000}`
            );
        }
    );
}

module.exports = app;