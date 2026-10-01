const express = require("express");
const db = require("../database/db");

const { kiemTraDangNhap } = require("../middleware/auth");

const router = express.Router();

// Lấy thông tin tài khoản
router.get("/", kiemTraDangNhap, async function (req, res) {
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
      [req.nguoiDung.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy tài khoản",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("GET /api/tai-khoan:", error);

    res.status(500).json({
      message: "Không lấy được thông tin tài khoản",
      error: error.message,
    });
  }
});

// Cập nhật thông tin tài khoản
router.put("/", kiemTraDangNhap, async function (req, res) {
  try {
    const { ho_ten, email } = req.body;

    if (!ho_ten || !ho_ten.trim() || !email || !email.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ thông tin",
      });
    }

    const emailMoi = email.trim();
    const hoTenMoi = ho_ten.trim();

    const [emailTrung] = await db.query(
      `
                SELECT id
                FROM nguoi_dung
                WHERE email = ?
                AND id <> ?
            `,
      [emailMoi, req.nguoiDung.id],
    );

    if (emailTrung.length > 0) {
      return res.status(400).json({
        message: "Email đã được sử dụng",
      });
    }

    await db.query(
      `
                UPDATE nguoi_dung
                SET
                    ho_ten = ?,
                    email = ?,
                    ngay_sua = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
      [hoTenMoi, emailMoi, req.nguoiDung.id],
    );

    res.json({
      message: "Cập nhật thông tin thành công",
    });
  } catch (error) {
    console.error("PUT /api/tai-khoan:", error);

    res.status(500).json({
      message: "Không cập nhật được thông tin",
      error: error.message,
    });
  }
});

// Đổi mật khẩu
router.put("/mat-khau", kiemTraDangNhap, async function (req, res) {
  try {
    const { mat_khau_cu, mat_khau_moi } = req.body;

    if (!mat_khau_cu || !mat_khau_moi) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ mật khẩu",
      });
    }

    if (mat_khau_moi.length < 6) {
      return res.status(400).json({
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    const [rows] = await db.query(
      `
                SELECT mat_khau
                FROM nguoi_dung
                WHERE id = ?
            `,
      [req.nguoiDung.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy tài khoản",
      });
    }

    if (rows[0].mat_khau !== mat_khau_cu) {
      return res.status(400).json({
        message: "Mật khẩu cũ không đúng",
      });
    }

    await db.query(
      `
                UPDATE nguoi_dung
                SET
                    mat_khau = ?,
                    ngay_sua = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
      [mat_khau_moi, req.nguoiDung.id],
    );

    res.json({
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error("PUT /api/tai-khoan/mat-khau:", error);

    res.status(500).json({
      message: "Không đổi được mật khẩu",
      error: error.message,
    });
  }
});

module.exports = router;
