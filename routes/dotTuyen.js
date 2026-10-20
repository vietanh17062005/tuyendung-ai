const express = require("express");
const db = require("../database/db");
const { kiemTraDangNhap, kiemTraVaiTro } = require("../middleware/auth");

const router = express.Router();
const TRANG_THAI_DOT_TUYEN = new Set(["dang_tuyen", "ket_thuc"]);

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
     WHERE trang_thai <> 'ket_thuc'
       AND ngay_ket_thuc IS NOT NULL
       AND DATE(ngay_ket_thuc) < DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR))`,
  );
}

router.get(
  "/",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      try { await dongDotQuaHan(); } catch (closeError) { console.warn("Không cập nhật được trạng thái đợt quá hạn:", closeError.message); }
      // Danh sách không phụ thuộc vào việc cập nhật trạng thái quá hạn.
      // Một lỗi UPDATE không được phép làm cả trang danh sách trắng.
      const columns = await layCotBang("dot_tuyen");
      const tenField = columns.includes("ten") ? "ten" : columns.includes("ten_dot") ? "ten_dot" : null;
      if (!tenField) throw new Error("Bảng dot_tuyen thiếu cột ten hoặc ten_dot.");

      const nguoiTaoField = layNguoiTaoField(columns);
      const tenNguoiTaoField = layTenNguoiTaoField(columns);
      const ngayCapNhatField = layNgayCapNhatField(columns);
      const cot = (name, alias = name, table = "dt") =>
        columns.includes(name) ? `${table}.\`${name}\` AS \`${alias}\`` : `NULL AS \`${alias}\``;

      let cotNguoiDung = [];
      try { cotNguoiDung = await layCotBang("nguoi_dung"); } catch (_) {}
      const cotNguoiTaoTen = cotNguoiDung.includes("ho_ten")
        ? `nd.ho_ten AS nguoi_tao_ten`
        : "NULL AS nguoi_tao_ten";
      const joinNguoiTao = cotNguoiDung.includes("id") && columns.includes(tenNguoiTaoField)
        ? `LEFT JOIN nguoi_dung nd ON nd.id = dt.${tenNguoiTaoField}`
        : "";

      let cotPhanTichAI = [];
      try { cotPhanTichAI = await layCotBang("phan_tich_ai"); } catch (_) {}
      let cotJD = [];
      try { cotJD = await layCotBang("jd"); } catch (_) {}
      const cotDiemPhanTich = ["diem_phu_hop", "diem"].find((column) => cotPhanTichAI.includes(column));
      const cotUngVienPhanTich = cotPhanTichAI.includes("ung_vien_id") ? "ung_vien_id" : null;
      const coBangUngVien = await layCotBang("ung_vien");
      const coBangJD = cotJD.includes("id") && cotJD.includes("dot_tuyen_id");
      const cotJDPhanTich = cotPhanTichAI.includes("jd_id");
      const truyVanUngVienHopTieuChi = cotDiemPhanTich && cotUngVienPhanTich && cotJDPhanTich && coBangJD && coBangUngVien.includes("dot_tuyen_id")
        ? `(SELECT COUNT(DISTINCT uv.id)
           FROM ung_vien uv
           INNER JOIN phan_tich_ai pa ON pa.${cotUngVienPhanTich} = uv.id AND pa.${cotDiemPhanTich} >= 80
           INNER JOIN jd jd_match ON jd_match.id = pa.jd_id AND jd_match.dot_tuyen_id = dt.id
           WHERE uv.dot_tuyen_id = dt.id) AS so_ung_vien_hop_tieu_chi`
        : "0 AS so_ung_vien_hop_tieu_chi";
      const demUngVien = coBangUngVien.includes("dot_tuyen_id")
        ? "(SELECT COUNT(*) FROM ung_vien uv WHERE uv.dot_tuyen_id = dt.id) AS so_ung_vien"
        : "0 AS so_ung_vien";
      const kenhNhanCV = coBangUngVien.includes("dot_tuyen_id") && coBangUngVien.includes("nguon")
        ? "(SELECT GROUP_CONCAT(DISTINCT NULLIF(TRIM(uv.nguon), '') ORDER BY uv.nguon SEPARATOR ', ') FROM ung_vien uv WHERE uv.dot_tuyen_id = dt.id AND NULLIF(TRIM(uv.nguon), '') IS NOT NULL) AS kenh_nhan_cv"
        : "NULL AS kenh_nhan_cv";

      const [rows] = await db.query(`
        SELECT
          dt.id,
          dt.\`${tenField}\` AS ten_dot,
          dt.\`${tenField}\` AS ten,
          ${cot("mo_ta")},
          ${cot("trang_thai")},
          ${columns.includes(tenNguoiTaoField) ? `dt.\`${tenNguoiTaoField}\` AS nguoi_tao` : "NULL AS nguoi_tao"},
          ${columns.includes(nguoiTaoField) ? `dt.\`${nguoiTaoField}\` AS nguoi_tao_id` : "NULL AS nguoi_tao_id"},
          DATE_FORMAT(dt.ngay_bat_dau, '%Y-%m-%d') AS ngay_bat_dau,
          DATE_FORMAT(dt.ngay_ket_thuc, '%Y-%m-%d') AS ngay_ket_thuc,
          ${cot("ngay_tao")},
          ${columns.includes(ngayCapNhatField) ? `dt.\`${ngayCapNhatField}\` AS ngay_cap_nhat` : "NULL AS ngay_cap_nhat"},
          ${cotNguoiTaoTen},
          ${demUngVien},
          ${truyVanUngVienHopTieuChi},
          ${kenhNhanCV}
        FROM dot_tuyen dt
        ${joinNguoiTao}
        ORDER BY ${columns.includes("ngay_tao") ? "dt.ngay_tao DESC," : ""} dt.id DESC
      `);
      res.json({ success: true, data: rows.map(normalizeDotTuyen) });
    } catch (error) {
      console.error("GET /api/dot-tuyen:", error);
      res.status(500).json({ message: error.message || "Không lấy được danh sách đợt tuyển dụng" });
    }
  },
);

router.get(
  "/:id",
  kiemTraDangNhap,
  async function (req, res) {
    try {
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
          DATE_FORMAT(dt.ngay_bat_dau, '%Y-%m-%d') AS ngay_bat_dau,
          DATE_FORMAT(dt.ngay_ket_thuc, '%Y-%m-%d') AS ngay_ket_thuc,
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
      const moTaNhap = String(req.body?.mo_ta || "").trim();
      let ten = String(req.body?.ten ?? req.body?.ten_dot ?? "").trim();
      if (!ten && moTaNhap) {
        const viTri = moTaNhap.replace(/\s+/g, " ").replace(/^(tuyển dụng|tuyển|cần tuyển|tìm kiếm)\s+/i, "").split(/[.!?;]/)[0].trim();
        ten = `Tuyển dụng ${viTri.slice(0, 70)}`;
      }
      if (!ten || !moTaNhap) {
        return res.status(400).json({ message: "Vui lòng nhập mô tả vị trí cần tuyển" });
      }
      let trangThai = String(req.body?.trang_thai || "dang_tuyen");
      const ngayBatDau = req.body?.ngay_bat_dau || null;
      const ngayKetThuc = req.body?.ngay_ket_thuc || null;
      if (!TRANG_THAI_DOT_TUYEN.has(trangThai)) {
        return res.status(400).json({ message: "Trạng thái đợt tuyển dụng không hợp lệ" });
      }
      if (!laNgayHopLe(ngayBatDau) || !laNgayHopLe(ngayKetThuc) ||
          (ngayBatDau && ngayKetThuc && ngayKetThuc < ngayBatDau)) {
        return res.status(400).json({ message: "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ" });
      }
      if (ngayKetThuc) {
        const [[todayRow]] = await db.query("SELECT DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR), '%Y-%m-%d') AS today");
        trangThai = ngayKetThuc < todayRow.today ? "ket_thuc" : "dang_tuyen";
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
        moTaNhap || null,
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

      res.status(201).json({ success: true, message: "Tạo đợt tuyển dụng thành công.", data: { id: result.insertId } });
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
      let trangThai = String(req.body?.trang_thai || "dang_tuyen");
      const ngayBatDau = req.body?.ngay_bat_dau || null;
      const ngayKetThuc = req.body?.ngay_ket_thuc || null;
      if (!TRANG_THAI_DOT_TUYEN.has(trangThai)) {
        return res.status(400).json({ message: "Trạng thái đợt tuyển dụng không hợp lệ" });
      }
      if (!laNgayHopLe(ngayBatDau) || !laNgayHopLe(ngayKetThuc) ||
          (ngayBatDau && ngayKetThuc && ngayKetThuc < ngayBatDau)) {
        return res.status(400).json({ message: "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ" });
      }
      if (req.body?.force_trang_thai !== true && ngayKetThuc) {
        const [[todayRow]] = await db.query("SELECT DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR), '%Y-%m-%d') AS today");
        trangThai = ngayKetThuc < todayRow.today ? "ket_thuc" : "dang_tuyen";
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

      res.json({ success: true, message: "Cập nhật đợt tuyển dụng thành công." });
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
      res.json({ success: true, message: "Xóa đợt tuyển dụng thành công." });
    } catch (error) {
      console.error("DELETE /api/dot-tuyen/:id:", error);
      res.status(500).json({ message: "Không xóa được đợt tuyển dụng" });
    }
  },
);

module.exports = router;
