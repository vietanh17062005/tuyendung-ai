const express = require("express");
const router = express.Router();
const db = require("../database/db");
const {
  kiemTraDangNhap,
  kiemTraVaiTro,
} = require("../middleware/auth");

// Lấy danh sách quyết định tuyển dụng
router.get(
  "/",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async (req, res) => {
    try {
      const { ung_vien_id, dot_tuyen_id } = req.query;

      let sql = `
        SELECT
          qd.*,
          uv.ho_ten AS ten_ung_vien,
          uv.email AS email_ung_vien,
          nd.ho_ten AS ten_nguoi_quyet_dinh
        FROM quyet_dinh qd
        JOIN ung_vien uv ON uv.id = qd.ung_vien_id
        JOIN nguoi_dung nd ON nd.id = qd.nguoi_quyet_dinh_id
        WHERE 1 = 1
      `;

      const params = [];

      if (ung_vien_id) {
        sql += " AND qd.ung_vien_id = ?";
        params.push(ung_vien_id);
      }

      if (dot_tuyen_id) {
        sql += " AND qd.dot_tuyen_id = ?";
        params.push(dot_tuyen_id);
      }

      sql += " ORDER BY qd.ngay_quyet_dinh DESC";

      const [rows] = await db.execute(sql, params);
      res.json(rows);
    } catch (error) {
      console.error("Lỗi lấy quyết định:", error);
      res.status(500).json({
        message: "Không thể lấy danh sách quyết định tuyển dụng.",
      });
    }
  }
);

// Tạo quyết định tuyển dụng
router.post(
  "/",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async (req, res) => {
    try {
      const {
        ung_vien_id,
        dot_tuyen_id,
        ket_qua,
        muc_luong,
        ghi_chu,
      } = req.body;

      if (!ung_vien_id || !dot_tuyen_id) {
        return res.status(400).json({
          message: "Vui lòng chọn ứng viên và đợt tuyển dụng.",
        });
      }

      if (!["hired", "rejected", "offer"].includes(ket_qua)) {
        return res.status(400).json({
          message: "Kết quả phải là hired, rejected hoặc offer.",
        });
      }

      let mucLuong = null;

      if (muc_luong !== undefined && muc_luong !== null && muc_luong !== "") {
        mucLuong = Number(muc_luong);

        if (!Number.isFinite(mucLuong) || mucLuong < 0) {
          return res.status(400).json({
            message: "Mức lương phải là số không âm.",
          });
        }
      }

      const [candidates] = await db.execute(
        `SELECT id, ho_ten, email, dot_tuyen_id
         FROM ung_vien
         WHERE id = ?`,
        [ung_vien_id]
      );

      if (candidates.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy ứng viên.",
        });
      }

      if (
        Number(candidates[0].dot_tuyen_id) !== Number(dot_tuyen_id)
      ) {
        return res.status(400).json({
          message: "Ứng viên không thuộc đợt tuyển dụng đã chọn.",
        });
      }

      const [result] = await db.execute(
        `INSERT INTO quyet_dinh (
          ung_vien_id,
          dot_tuyen_id,
          nguoi_quyet_dinh_id,
          ket_qua,
          muc_luong,
          ghi_chu
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          ung_vien_id,
          dot_tuyen_id,
          req.nguoiDung.id,
          ket_qua,
          mucLuong,
          ghi_chu || null,
        ]
      );

      const trangThaiUngVien = {
        hired: "da_tuyen",
        rejected: "tu_choi",
        offer: "offer",
      }[ket_qua];

      await db.execute(
        `UPDATE ung_vien
         SET trang_thai = ?
         WHERE id = ?`,
        [trangThaiUngVien, ung_vien_id]
      );

      // Thông báo cho bộ phận HR biết đã có quyết định mới.
      const [hrUsers] = await db.execute(
        `SELECT id
         FROM nguoi_dung
         WHERE vai_tro = 'hr' AND trang_thai = 'hoat_dong'`
      );

      const tieuDe = "Quyết định tuyển dụng mới";
      const noiDung =
        `Ứng viên ${candidates[0].ho_ten} có quyết định mới: ${ket_qua}.`;

      for (const user of hrUsers) {
        await db.execute(
          `INSERT INTO thong_bao (
            nguoi_dung_id,
            tieu_de,
            noi_dung,
            loai
          ) VALUES (?, ?, ?, ?)`,
          [user.id, tieuDe, noiDung, "quyet_dinh"]
        );
      }

      res.status(201).json({
        message: "Tạo quyết định tuyển dụng thành công.",
        id: result.insertId,
        trang_thai_ung_vien: trangThaiUngVien,
      });
    } catch (error) {
      console.error("Lỗi tạo quyết định:", error);
      res.status(500).json({
        message: "Không thể tạo quyết định tuyển dụng.",
      });
    }
  }
);

module.exports = router;
