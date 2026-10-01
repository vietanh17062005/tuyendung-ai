const express = require("express");
const db = require("../database/db");

const {
  kiemTraDangNhap,
  kiemTraVaiTro,
} = require("../middleware/auth");

const router = express.Router();

function laNgayHopLe(ngay) {
  if (
    typeof ngay !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(ngay)
  ) {
    return false;
  }

  const parsed = new Date(`${ngay}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === ngay
  );
}

function loiKhoangNgay(ngayBatDau, ngayKetThuc) {
  if (!laNgayHopLe(ngayBatDau)) {
    return "Ngày bắt đầu không hợp lệ";
  }

  if (!laNgayHopLe(ngayKetThuc)) {
    return "Ngày kết thúc không hợp lệ";
  }

  if (ngayKetThuc < ngayBatDau) {
    return "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu";
  }

  return null;
}

function layDuLieuBody(req) {
  const {
    ten_dot,
    ten,
    mo_ta,
    trang_thai,
    ngay_bat_dau,
    ngay_ket_thuc,
  } = req.body || {};

  return {
    tenDot:
      typeof ten_dot === "string"
        ? ten_dot.trim()
        : typeof ten === "string"
          ? ten.trim()
          : "",

    moTa:
      typeof mo_ta === "string"
        ? mo_ta.trim()
        : "",

    trangThai:
      typeof trang_thai === "string" && trang_thai.trim()
        ? trang_thai.trim()
        : "nhap",

    ngayBatDau:
      typeof ngay_bat_dau === "string"
        ? ngay_bat_dau.trim()
        : "",

    ngayKetThuc:
      typeof ngay_ket_thuc === "string"
        ? ngay_ket_thuc.trim()
        : "",
  };
}

function kiemTraTrangThai(trangThai) {
  return [
    "nhap",
    "dang_tuyen",
    "tam_dung",
    "ket_thuc",
  ].includes(trangThai);
}

/*
 * GET danh sách đợt tuyển dụng
 */
router.get(
  "/",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      const [rows] = await db.query(`
        SELECT
          d.id,
          d.ten_dot,
          d.ten_dot AS ten,
          d.mo_ta,
          d.trang_thai,
          d.nguoi_tao_id,
          DATE_FORMAT(
            d.ngay_bat_dau,
            '%Y-%m-%d'
          ) AS ngay_bat_dau,
          DATE_FORMAT(
            d.ngay_ket_thuc,
            '%Y-%m-%d'
          ) AS ngay_ket_thuc,
          d.ngay_tao,
          d.ngay_cap_nhat,
          n.ho_ten AS nguoi_tao_ten
        FROM dot_tuyen AS d
        LEFT JOIN nguoi_dung AS n
          ON d.nguoi_tao_id = n.id
        ORDER BY d.id ASC
      `);

      res.json(rows);
    } catch (error) {
      console.error(
        "GET /api/dot-tuyen:",
        error,
      );

      res.status(500).json({
        message:
          "Không lấy được danh sách đợt tuyển dụng",
        error: error.message,
      });
    }
  },
);

/*
 * GET chi tiết một đợt tuyển dụng
 */
router.get(
  "/:id",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      const [rows] = await db.query(
        `
          SELECT
            d.id,
            d.ten_dot,
            d.ten_dot AS ten,
            d.mo_ta,
            d.trang_thai,
            d.nguoi_tao_id,
            DATE_FORMAT(
              d.ngay_bat_dau,
              '%Y-%m-%d'
            ) AS ngay_bat_dau,
            DATE_FORMAT(
              d.ngay_ket_thuc,
              '%Y-%m-%d'
            ) AS ngay_ket_thuc,
            d.ngay_tao,
            d.ngay_cap_nhat,
            n.ho_ten AS nguoi_tao_ten
          FROM dot_tuyen AS d
          LEFT JOIN nguoi_dung AS n
            ON d.nguoi_tao_id = n.id
          WHERE d.id = ?
        `,
        [req.params.id],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message:
            "Không tìm thấy đợt tuyển dụng",
        });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error(
        "GET /api/dot-tuyen/:id:",
        error,
      );

      res.status(500).json({
        message:
          "Không lấy được thông tin đợt tuyển dụng",
        error: error.message,
      });
    }
  },
);

/*
 * POST thêm đợt tuyển dụng
 * Chỉ admin và manager
 */
router.post(
  "/",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const duLieu = layDuLieuBody(req);

      if (!duLieu.tenDot) {
        return res.status(400).json({
          message:
            "Vui lòng nhập tên đợt tuyển dụng",
        });
      }

      if (!kiemTraTrangThai(duLieu.trangThai)) {
        return res.status(400).json({
          message:
            "Trạng thái đợt tuyển dụng không hợp lệ",
        });
      }

      const loiNgay = loiKhoangNgay(
        duLieu.ngayBatDau,
        duLieu.ngayKetThuc,
      );

      if (loiNgay) {
        return res.status(400).json({
          message: loiNgay,
        });
      }

      const nguoiTaoId = req.nguoiDung.id;

      const [result] = await db.query(
        `
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
        `,
        [
          duLieu.tenDot,
          duLieu.moTa || null,
          nguoiTaoId,
          duLieu.trangThai,
          duLieu.ngayBatDau,
          duLieu.ngayKetThuc,
        ],
      );

      res.status(201).json({
        message:
          "Tạo đợt tuyển dụng thành công",
        id: result.insertId,
      });
    } catch (error) {
      console.error(
        "POST /api/dot-tuyen:",
        error,
      );

      res.status(500).json({
        message:
          "Không tạo được đợt tuyển dụng",
        error: error.message,
      });
    }
  },
);

/*
 * PUT sửa đợt tuyển dụng
 * Chỉ admin và manager
 */
router.put(
  "/:id",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const duLieu = layDuLieuBody(req);

      if (!duLieu.tenDot) {
        return res.status(400).json({
          message:
            "Vui lòng nhập tên đợt tuyển dụng",
        });
      }

      if (!kiemTraTrangThai(duLieu.trangThai)) {
        return res.status(400).json({
          message:
            "Trạng thái đợt tuyển dụng không hợp lệ",
        });
      }

      const loiNgay = loiKhoangNgay(
        duLieu.ngayBatDau,
        duLieu.ngayKetThuc,
      );

      if (loiNgay) {
        return res.status(400).json({
          message: loiNgay,
        });
      }

      const [result] = await db.query(
        `
          UPDATE dot_tuyen
          SET
            ten_dot = ?,
            mo_ta = ?,
            trang_thai = ?,
            ngay_bat_dau = ?,
            ngay_ket_thuc = ?
          WHERE id = ?
        `,
        [
          duLieu.tenDot,
          duLieu.moTa || null,
          duLieu.trangThai,
          duLieu.ngayBatDau,
          duLieu.ngayKetThuc,
          req.params.id,
        ],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message:
            "Không tìm thấy đợt tuyển dụng",
        });
      }

      res.json({
        message:
          "Cập nhật đợt tuyển dụng thành công",
      });
    } catch (error) {
      console.error(
        "PUT /api/dot-tuyen/:id:",
        error,
      );

      res.status(500).json({
        message:
          "Không cập nhật được đợt tuyển dụng",
        error: error.message,
      });
    }
  },
);

/*
 * DELETE xóa đợt tuyển dụng
 * Chỉ admin và manager
 */
router.delete(
  "/:id",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const [result] = await db.query(
        "DELETE FROM dot_tuyen WHERE id = ?",
        [req.params.id],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message:
            "Không tìm thấy đợt tuyển dụng",
        });
      }

      res.json({
        message:
          "Xóa đợt tuyển dụng thành công",
      });
    } catch (error) {
      console.error(
        "DELETE /api/dot-tuyen/:id:",
        error,
      );

      res.status(500).json({
        message:
          "Không xóa được đợt tuyển dụng",
        error: error.message,
      });
    }
  },
);

module.exports = router;