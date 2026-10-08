const express = require("express");
const db = require("../database/db");
const { kiemTraDangNhap, kiemTraVaiTro } = require("../middleware/auth");

const router = express.Router();
const TRANG_THAI_DOT_TUYEN = new Set(["nhap", "dang_tuyen", "tam_dung", "ket_thuc"]);

function laNgayHopLe(value) {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function layCotBang(tableName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  return rows.map((row) => row.Field);
}

function normalizeDotTuyen(row) {
  if (!row) return null;

  const ten = row.ten_dot ?? row.ten ?? "";

  return {
    ...row,
    ten,
    ten_dot: ten,
    nguoi_tao_ten: row.nguoi_tao_ten || row.ho_ten || "",
  };
}

function layNguoiTaoField(columns) {
  return columns.includes("nguoi_tao_id") ? "nguoi_tao_id" : "nguoi_tao";
}

function layTenNguoiTaoField(columns) {
  return columns.includes("nguoi_tao") ? "nguoi_tao" : "nguoi_tao_id";
}

function layNgayCapNhatField(columns) {
  if (columns.includes("ngay_cap_nhat")) return "ngay_cap_nhat";
  if (columns.includes("ngay_sua")) return "ngay_sua";
  return "ngay_tao";
}

async function dongDotQuaHan() {
  await db.query(
    `UPDATE dot_tuyen
     SET trang_thai = 'ket_thuc'
     WHERE trang_thai IN ('dang_tuyen', 'tam_dung')
       AND ngay_ket_thuc IS NOT NULL
       AND ngay_ket_thuc <= CURDATE()`,
  );
}

router.get(
  "/",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      await dongDotQuaHan();
      const columns = await layCotBang("dot_tuyen");
      const tenField = columns.includes("ten") ? "ten" : "ten_dot";
      const nguoiTaoField = layNguoiTaoField(columns);
      const tenNguoiTaoField = layTenNguoiTaoField(columns);
      const ngayCapNhatField = layNgayCapNhatField(columns);
      const cotPhanTichAI = await layCotBang("phan_tich_ai");
      const cotDiemPhanTich = ["diem_phu_hop", "diem"].find((column) =>
        cotPhanTichAI.includes(column),
      );
      const cotUngVienPhanTich = cotPhanTichAI.includes("ung_vien_id")
        ? "ung_vien_id"
        : null;
      const truyVanUngVienHopTieuChi = cotDiemPhanTich && cotUngVienPhanTich
        ? `(SELECT COUNT(DISTINCT uv.id)
           FROM ung_vien uv
           INNER JOIN phan_tich_ai pa
             ON pa.${cotUngVienPhanTich} = uv.id AND pa.${cotDiemPhanTich} >= 80
           INNER JOIN jd jd_match ON jd_match.id = pa.jd_id AND jd_match.dot_tuyen_id = dt.id
           WHERE uv.dot_tuyen_id = dt.id) AS so_ung_vien_hop_tieu_chi`
        : "0 AS so_ung_vien_hop_tieu_chi";
      const ketQua = `
        SELECT
          dt.id,
          dt.${tenField} AS ten_dot,
          dt.${tenField} AS ten,
          dt.mo_ta,
          dt.trang_thai,
          dt.${tenNguoiTaoField} AS nguoi_tao,
          dt.${nguoiTaoField} AS nguoi_tao_id,
          dt.ngay_bat_dau,
          dt.ngay_ket_thuc,
          dt.ngay_tao,
          dt.${ngayCapNhatField} AS ngay_cap_nhat,
          nd.ho_ten AS nguoi_tao_ten,
          (SELECT COUNT(*) FROM ung_vien uv WHERE uv.dot_tuyen_id = dt.id) AS so_ung_vien,
          ${truyVanUngVienHopTieuChi},
          (SELECT GROUP_CONCAT(DISTINCT NULLIF(TRIM(uv.nguon), '') ORDER BY uv.nguon SEPARATOR ', ')
           FROM ung_vien uv WHERE uv.dot_tuyen_id = dt.id AND NULLIF(TRIM(uv.nguon), '') IS NOT NULL) AS kenh_nhan_cv
        FROM dot_tuyen dt
        LEFT JOIN nguoi_dung nd ON nd.id = dt.${tenNguoiTaoField}
        ORDER BY dt.ngay_tao DESC, dt.id DESC
      `;
      const [rows] = await db.query(ketQua);
      res.json({ success: true, data: rows.map(normalizeDotTuyen) });
    } catch (error) {
      console.error("GET /api/dot-tuyen:", error);
      res.status(500).json({ message: "Không lấy được danh sách đợt tuyển dụng" });
    }
  },
);

router.get(
  "/:id",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      await dongDotQuaHan();
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID đợt tuyển dụng không hợp lệ" });
      }

      const columns = await layCotBang("dot_tuyen");
      const tenField = columns.includes("ten") ? "ten" : "ten_dot";
      const nguoiTaoField = layNguoiTaoField(columns);
      const tenNguoiTaoField = layTenNguoiTaoField(columns);
      const ngayCapNhatField = layNgayCapNhatField(columns);
      const [rows] = await db.query(
        `
        SELECT
          dt.id,
          dt.${tenField} AS ten_dot,
          dt.${tenField} AS ten,
          dt.mo_ta,
          dt.trang_thai,
          dt.${tenNguoiTaoField} AS nguoi_tao,
          dt.${nguoiTaoField} AS nguoi_tao_id,
          dt.ngay_bat_dau,
          dt.ngay_ket_thuc,
          dt.ngay_tao,
          dt.${ngayCapNhatField} AS ngay_cap_nhat,
          nd.ho_ten AS nguoi_tao_ten
        FROM dot_tuyen dt
        LEFT JOIN nguoi_dung nd ON nd.id = dt.${tenNguoiTaoField}
        WHERE dt.id = ?
        LIMIT 1
        `,
        [id],
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Không tìm thấy đợt tuyển dụng" });
      }

      res.json({ success: true, data: normalizeDotTuyen(rows[0]) });
    } catch (error) {
      console.error("GET /api/dot-tuyen/:id:", error);
      res.status(500).json({ message: "Không lấy được thông tin đợt tuyển dụng" });
    }
  },
);

router.post(
  "/",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const ten = String(req.body?.ten ?? req.body?.ten_dot ?? "").trim();
      if (!ten) {
        return res.status(400).json({ message: "Vui lòng nhập tên đợt tuyển dụng" });
      }
      const trangThai = String(req.body?.trang_thai || "nhap");
      const ngayBatDau = req.body?.ngay_bat_dau || null;
      const ngayKetThuc = req.body?.ngay_ket_thuc || null;
      if (!TRANG_THAI_DOT_TUYEN.has(trangThai)) {
        return res.status(400).json({ message: "Trạng thái đợt tuyển dụng không hợp lệ" });
      }
      if (!laNgayHopLe(ngayBatDau) || !laNgayHopLe(ngayKetThuc) ||
          (ngayBatDau && ngayKetThuc && ngayKetThuc < ngayBatDau)) {
        return res.status(400).json({ message: "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ" });
      }

      const columns = await layCotBang("dot_tuyen");
      const tenField = columns.includes("ten") ? "ten" : "ten_dot";
      const nguoiTaoFields = columns.filter((column) =>
        ["nguoi_tao", "nguoi_tao_id"].includes(column)
      );
      const nguoiTaoValue = req.nguoiDung?.id ?? null;

      if (!nguoiTaoValue) {
        return res.status(400).json({ message: "Không xác định được người tạo đợt tuyển dụng" });
      }

      const insertColumns = [
        tenField,
        "mo_ta",
        "trang_thai",
        ...nguoiTaoFields,
        "ngay_bat_dau",
        "ngay_ket_thuc",
      ];
      const insertValues = [
        ten,
        req.body?.mo_ta || null,
        trangThai,
        ...nguoiTaoFields.map(() => nguoiTaoValue),
        ngayBatDau,
        ngayKetThuc,
      ];
      const placeholders = insertColumns.map(() => "?").join(", ");
      const [result] = await db.query(
        `INSERT INTO dot_tuyen (${insertColumns.join(", ")}) VALUES (${placeholders})`,
        insertValues,
      );

      res.status(201).json({ success: true, message: "Thêm đợt tuyển dụng thành công", data: { id: result.insertId } });
    } catch (error) {
      console.error("POST /api/dot-tuyen:", error);
      res.status(500).json({ message: "Không thêm được đợt tuyển dụng" });
    }
  },
);

router.put(
  "/:id",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID đợt tuyển dụng không hợp lệ" });
      }

      const ten = String(req.body?.ten ?? req.body?.ten_dot ?? "").trim();
      if (!ten) {
        return res.status(400).json({ message: "Vui lòng nhập tên đợt tuyển dụng" });
      }
      const trangThai = String(req.body?.trang_thai || "nhap");
      const ngayBatDau = req.body?.ngay_bat_dau || null;
      const ngayKetThuc = req.body?.ngay_ket_thuc || null;
      if (!TRANG_THAI_DOT_TUYEN.has(trangThai)) {
        return res.status(400).json({ message: "Trạng thái đợt tuyển dụng không hợp lệ" });
      }
      if (!laNgayHopLe(ngayBatDau) || !laNgayHopLe(ngayKetThuc) ||
          (ngayBatDau && ngayKetThuc && ngayKetThuc < ngayBatDau)) {
        return res.status(400).json({ message: "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ" });
      }

      const columns = await layCotBang("dot_tuyen");
      const tenField = columns.includes("ten") ? "ten" : "ten_dot";
      await db.query(
        `
        UPDATE dot_tuyen
        SET
          ${tenField} = ?,
          mo_ta = ?,
          trang_thai = ?,
          ngay_bat_dau = ?,
          ngay_ket_thuc = ?
        WHERE id = ?
        `,
        [
          ten,
          req.body?.mo_ta || null,
          trangThai,
          ngayBatDau,
          ngayKetThuc,
          id,
        ],
      );

      res.json({ success: true, message: "Cập nhật đợt tuyển dụng thành công" });
    } catch (error) {
      console.error("PUT /api/dot-tuyen/:id:", error);
      res.status(500).json({ message: "Không cập nhật được đợt tuyển dụng" });
    }
  },
);

router.delete(
  "/:id",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID đợt tuyển dụng không hợp lệ" });
      }

      await db.query("DELETE FROM jd WHERE dot_tuyen_id = ?", [id]);
      await db.query("DELETE FROM dot_tuyen WHERE id = ?", [id]);
      res.json({ success: true, message: "Xóa đợt tuyển dụng thành công" });
    } catch (error) {
      console.error("DELETE /api/dot-tuyen/:id:", error);
      res.status(500).json({ message: "Không xóa được đợt tuyển dụng" });
    }
  },
);

module.exports = router;
