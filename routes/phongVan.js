const express = require("express");

const db = require("../database/db");
const {
  kiemTraDangNhap,
  kiemTraVaiTro,
} = require("../middleware/auth");
const {
  guiThuMoiPhongVan,
} = require("../services/emailPhongVan");

const router = express.Router();

const vaiTroQuanLy = ["admin", "manager", "hr"];
const trangThaiHopLe = [
  "da_len_lich",
  "da_xac_nhan",
  "da_phong_van",
  "huy",
];

let khoiTaoSchemaPromise = null;
let cotPhongVan = null;

function chuanHoaVaiTro(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .trim();
}

function laVaiTroPhongVan(value) {
  const role = chuanHoaVaiTro(value);
  return [
    "interviewer",
    "interview",
    "nguoi_phong_van",
    "nguoiphongvan",
    "phong_van",
    "phongvan",
  ].includes(role) || role.includes("interviewer");
}

// Admin và quản lý cũng có thể được chọn tham gia một buổi phỏng vấn.
function laVaiTroDuocPhanCong(value) {
  const role = chuanHoaVaiTro(value);
  return laVaiTroPhongVan(role) || [
    "admin", "administrator", "quan_tri_vien", "quantrivien",
    "manager", "quan_ly", "quanly", "team_leader", "leader",
  ].includes(role);
}

function laTaiKhoanHoatDong(value) {
  const status = chuanHoaVaiTro(value || "hoat_dong");
  return ["hoat_dong", "dang_hoat_dong", "active", "1", "true"].includes(status);
}

function layTenCot(danhSachCot, cacLuaChon) {
  return cacLuaChon.find((cot) => danhSachCot.has(cot)) || null;
}

async function khoiTaoSchemaPhongVan() {
  if (khoiTaoSchemaPromise) {
    return khoiTaoSchemaPromise;
  }

  khoiTaoSchemaPromise = (async function() {
    const [columns] = await db.query("SHOW COLUMNS FROM phong_van");
    const names = new Set(columns.map((column) => column.Field));

    // Tên cột thời gian có thể khác nhau giữa các phiên bản database.
    let cotThoiGian = layTenCot(names, [
      "bat_dau",
      "thoi_gian",
      "thoi_gian_bat_dau",
      "thoi_gian_phong_van",
      "ngay_gio_phong_van",
      "ngay_phong_van",
      "thoi_diem",
      "scheduled_at",
      "start_time",
    ]);

    // Nếu database dùng tên cột khác, tìm cột DATETIME/TIMESTAMP phù hợp.
    if (!cotThoiGian) {
      const cotNgayGio = columns.find((column) => {
        const ten = String(column.Field || "").toLowerCase();
        const kieu = String(column.Type || "").toLowerCase();
        return ten !== "ngay_tao"
          && ten !== "created_at"
          && /datetime|timestamp/.test(kieu)
          && /bat_dau|thoi_gian|phong_van|lich|ngay|start|time/.test(ten);
      });
      cotThoiGian = cotNgayGio?.Field || null;
    }

    const cotNguoiPhongVan = layTenCot(names, [
      "nguoi_phong_van",
      "nguoi_phong_van_id",
      "nguoi_phong_van_chinh",
      "nguoi_phong_van_chinh_id",
      "nguoi_phu_trach",
      "interviewer_id",
      "interviewer_user_id",
      "interview_user_id",
    ]) || columns.find((column) => /interviewer|nguoi.*phong.*van|nguoi.*phu.*trach/i.test(String(column.Field || "")))?.Field || null;
    const cotNguoiTao = layTenCot(names, [
      "nguoi_tao",
      "nguoi_tao_id",
      "nguoi_lap",
      "nguoi_lap_id",
      "created_by",
      "created_by_id",
      "hr_id",
    ]) || columns.find((column) => /nguoi.*tao|nguoi.*lap|created.*by|hr_id/i.test(String(column.Field || "")))?.Field || null;

    // Danh sách lịch chỉ cần cột thời gian. Các cột người tạo/người
    // phỏng vấn được kiểm tra riêng ở API tạo/sửa lịch để không chặn GET.
    if (!cotThoiGian) {
      const danhSachCot = columns.map((column) => `${column.Field} (${column.Type})`).join(", ");
      throw new Error(
        `Không tìm thấy cột thời gian trong bảng phong_van. Các cột hiện có: ${danhSachCot || "không có"}`,
      );
    }

    await db.query(`
            CREATE TABLE IF NOT EXISTS nguoi_phong_van (
                id INT NOT NULL AUTO_INCREMENT,
                nguoi_dung_id INT NOT NULL,
                so_dien_thoai VARCHAR(30) NULL,
                bo_phan VARCHAR(150) NULL,
                chuc_danh VARCHAR(150) NULL,
                ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_nguoi_phong_van_nguoi_dung (nguoi_dung_id),
                CONSTRAINT fk_nguoi_phong_van_nguoi_dung FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

    const cacCotCanThem = [
      ["vong_phong_van", "VARCHAR(100) NOT NULL DEFAULT 'Vòng 1'"],
      ["email_trang_thai", "VARCHAR(30) NOT NULL DEFAULT 'chua_gui'"],
      ["email_loi", "TEXT NULL"],
      ["email_da_gui_luc", "DATETIME NULL"],
    ];

    for (const [tenCot, dinhDang] of cacCotCanThem) {
      if (!names.has(tenCot)) {
        await db.query(
          `ALTER TABLE phong_van ADD COLUMN ${tenCot} ${dinhDang}`,
        );
        names.add(tenCot);
      }
    }

    await db.query(`
            CREATE TABLE IF NOT EXISTS phong_van_nguoi_tham_gia (
                phong_van_id INT NOT NULL,
                nguoi_dung_id INT NOT NULL,
                ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (phong_van_id, nguoi_dung_id),
                KEY idx_pv_tham_gia_nguoi_dung (nguoi_dung_id),
                CONSTRAINT fk_pv_tham_gia_lich
                    FOREIGN KEY (phong_van_id) REFERENCES phong_van(id)
                    ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_pv_tham_gia_nguoi_dung
                    FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id)
                    ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

    cotPhongVan = {
      names,
      cotThoiGian,
      cotKetThuc: names.has("ket_thuc") ? "ket_thuc" : null,
      cotNguoiPhongVan,
      cotNguoiTao,
      cotDotTuyen: names.has("dot_tuyen_id") ? "dot_tuyen_id" : null,
      cotVong: names.has("vong_phong_van") ? "vong_phong_van" : null,
    };

    return cotPhongVan;
  })().catch((error) => {
    khoiTaoSchemaPromise = null;
    throw error;
  });

  return khoiTaoSchemaPromise;
}

function chuanHoaDanhSachId(value) {
  const values = Array.isArray(value) ? value : [value];

  return [...new Set(
    values
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0),
  )];
}

function kiemTraVongPhongVan(vong) {
  return typeof vong === "string" && vong.trim().length > 0 && vong.trim().length <= 100;
}

function chuanHoaNgay(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

async function layChiTietLich(id) {
  const schema = await khoiTaoSchemaPhongVan();
  const cotDotTuyenSelect = schema.cotDotTuyen
    ? `pv.${schema.cotDotTuyen}`
    : "uv.dot_tuyen_id";
  const cotKetThucSelect = schema.cotKetThuc
    ? `pv.${schema.cotKetThuc}`
    : "NULL";

  const [rows] = await db.query(
    `
        SELECT
            pv.*,
            pv.${schema.cotThoiGian} AS thoi_gian,
            ${cotKetThucSelect} AS ket_thuc,
            ${cotDotTuyenSelect} AS dot_tuyen_id,
            uv.ho_ten AS ten_ung_vien,
            uv.email AS email_ung_vien,
            dt.${await layCotTenDotTuyen()} AS ten_dot_tuyen,
            pv_summary.ten_nguoi_phong_van,
            pv_summary.nguoi_phong_van_ids
        FROM phong_van pv
        INNER JOIN ung_vien uv ON uv.id = pv.ung_vien_id
        LEFT JOIN dot_tuyen dt ON dt.id = uv.dot_tuyen_id
        LEFT JOIN (
            SELECT
                pvt.phong_van_id,
                GROUP_CONCAT(DISTINCT nd.ho_ten ORDER BY nd.ho_ten SEPARATOR ', ') AS ten_nguoi_phong_van,
                GROUP_CONCAT(DISTINCT nd.id ORDER BY nd.id SEPARATOR ',') AS nguoi_phong_van_ids
            FROM phong_van_nguoi_tham_gia pvt
            INNER JOIN nguoi_dung nd ON nd.id = pvt.nguoi_dung_id
            GROUP BY pvt.phong_van_id
        ) pv_summary ON pv_summary.phong_van_id = pv.id
        WHERE pv.id = ?
        LIMIT 1
        `,
    [id],
  );

  return rows[0] || null;
}

let cotTenDotTuyenCache = null;
async function layCotTenDotTuyen() {
  if (cotTenDotTuyenCache) {
    return cotTenDotTuyenCache;
  }

  const [columns] = await db.query("SHOW COLUMNS FROM dot_tuyen");
  const names = new Set(columns.map((column) => column.Field));
  cotTenDotTuyenCache = layTenCot(names, ["ten", "ten_dot"]);

  if (!cotTenDotTuyenCache) {
    throw new Error("Không xác định được cột tên đợt tuyển dụng.");
  }

  return cotTenDotTuyenCache;
}

async function layThongTinNguoiPhongVan(ids) {
  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await db.query(
    `SELECT id, ho_ten, email, vai_tro, trang_thai
         FROM nguoi_dung
         WHERE id IN (${placeholders})`,
    ids,
  );

  if (rows.length !== ids.length) {
    throw new Error("Có người phỏng vấn không tồn tại.");
  }

  const khongHopLe = rows.find((row) =>
    !laVaiTroDuocPhanCong(row.vai_tro) || !laTaiKhoanHoatDong(row.trang_thai),
  );

  if (khongHopLe) {
    throw new Error(
      `Tài khoản ${khongHopLe.ho_ten || khongHopLe.email} không phải người phỏng vấn đang hoạt động.`,
    );
  }

  return rows;
}

async function capNhatTrangThaiEmail(id, trangThai, loi = null) {
  await db.query(
    `UPDATE phong_van
         SET email_trang_thai = ?, email_loi = ?,
             email_da_gui_luc = ${trangThai === "da_gui" ? "NOW()" : "email_da_gui_luc"}
         WHERE id = ?`,
    [trangThai, loi, id],
  );
}

async function guiLichVaCapNhatTrangThai(id) {
  const lich = await layChiTietLich(id);

  if (!lich) {
    throw new Error("Không tìm thấy lịch phỏng vấn.");
  }

  try {
    const schema = await khoiTaoSchemaPhongVan();
    const [attendees] = await db.query(
      `SELECT nd.id, nd.ho_ten, nd.email
             FROM phong_van_nguoi_tham_gia pvt
             INNER JOIN nguoi_dung nd ON nd.id = pvt.nguoi_dung_id
             WHERE pvt.phong_van_id = ?`,
      [id],
    );

    await guiThuMoiPhongVan({
      lich,
      nguoiPhongVan: attendees,
    });

    await capNhatTrangThaiEmail(id, "da_gui", null);
    return { email_trang_thai: "da_gui" };
  } catch (error) {
    await capNhatTrangThaiEmail(id, "that_bai", error.message || "Gửi email thất bại.");
    return {
      email_trang_thai: "that_bai",
      email_loi: error.message || "Gửi email thất bại.",
    };
  }
}

async function taoThongBao(nguoiDungId, tieuDe, noiDung, loai = "phong_van") {
  try {
    await db.query(
      `INSERT INTO thong_bao (nguoi_dung_id, tieu_de, noi_dung, loai)
             VALUES (?, ?, ?, ?)`,
      [nguoiDungId, tieuDe, noiDung, loai],
    );
  } catch (error) {
    console.error("Không tạo được thông báo phỏng vấn:", error.message);
  }
}

router.get("/nguoi-phong-van", kiemTraDangNhap, async function(req, res) {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS nguoi_phong_van (id INT NOT NULL AUTO_INCREMENT, nguoi_dung_id INT NOT NULL, so_dien_thoai VARCHAR(30) NULL, bo_phan VARCHAR(150) NULL, chuc_danh VARCHAR(150) NULL, ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uq_nguoi_phong_van_nguoi_dung (nguoi_dung_id), CONSTRAINT fk_nguoi_phong_van_nguoi_dung FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [columns] = await db.query("SHOW COLUMNS FROM nguoi_dung");
    const names = new Set(columns.map((column) => column.Field));
    const cotTen = ["ho_ten", "ten", "name"].find((name) => names.has(name));
    const cotEmail = ["email", "ten_dang_nhap", "username"].find((name) => names.has(name));

    if (!names.has("id") || !names.has("vai_tro")) {
      return res.status(500).json({
        message: "Bảng nguoi_dung thiếu cột id hoặc vai_tro.",
      });
    }

    const cotTrangThai = ["trang_thai", "status", "trangthai"].find((name) => names.has(name));
    const [rows] = await db.query(`
            SELECT
                nd.id,
                ${cotTen ? `nd.\`${cotTen}\`` : "CAST(nd.id AS CHAR)"} AS ho_ten,
                ${cotEmail ? `nd.\`${cotEmail}\`` : "NULL"} AS email,
                nd.vai_tro,
                ${cotTrangThai ? `nd.\`${cotTrangThai}\`` : "'hoat_dong'"} AS trang_thai,
                npv.so_dien_thoai, npv.bo_phan, npv.chuc_danh
            FROM nguoi_dung nd
            LEFT JOIN nguoi_phong_van npv ON npv.nguoi_dung_id = nd.id
            ORDER BY ${cotTen ? `nd.\`${cotTen}\`` : "nd.id"} ASC
        `);

    const interviewers = rows.filter((row) =>
      laVaiTroDuocPhanCong(row.vai_tro) && laTaiKhoanHoatDong(row.trang_thai),
    );

    res.json({ data: interviewers });
  } catch (error) {
    console.error("Lỗi lấy danh sách người tham gia phỏng vấn:", error);
    res.status(500).json({ message: error.message || "Không thể lấy danh sách người phỏng vấn." });
  }
});

router.post("/nguoi-phong-van", kiemTraDangNhap, kiemTraVaiTro(...vaiTroQuanLy), async function(req, res) {
  let connection;
  try {
    const hoTen = String(req.body?.ho_ten || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const matKhau = String(req.body?.mat_khau || "");
    const soDienThoai = String(req.body?.so_dien_thoai || "").trim();
    const boPhan = String(req.body?.bo_phan || "").trim();
    const chucDanh = String(req.body?.chuc_danh || "").trim();
    if (!hoTen || !email || !matKhau) return res.status(400).json({ message: "Vui lòng nhập họ tên, email và mật khẩu tài khoản." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Email không hợp lệ." });
    if (matKhau.length < 6) return res.status(400).json({ message: "Mật khẩu cần ít nhất 6 ký tự." });
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [existing] = await connection.query("SELECT id FROM nguoi_dung WHERE email = ? LIMIT 1", [email]);
    if (existing.length) { await connection.rollback(); return res.status(409).json({ message: "Email đã tồn tại trong bảng người dùng." }); }
    const [insertUser] = await connection.query("INSERT INTO nguoi_dung (ho_ten, email, mat_khau, vai_tro, trang_thai) VALUES (?, ?, ?, 'interviewer', 'hoat_dong')", [hoTen, email, matKhau]);
    await connection.query("INSERT INTO nguoi_phong_van (nguoi_dung_id, so_dien_thoai, bo_phan, chuc_danh) VALUES (?, ?, ?, ?)", [insertUser.insertId, soDienThoai || null, boPhan || null, chucDanh || null]);
    await connection.commit();
    res.status(201).json({ message: "Đã thêm người phỏng vấn.", data: { id: insertUser.insertId, ho_ten: hoTen, email, vai_tro: "interviewer", trang_thai: "hoat_dong", so_dien_thoai: soDienThoai, bo_phan: boPhan, chuc_danh: chucDanh } });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => { });
    console.error("Lỗi thêm người phỏng vấn:", error);
    res.status(500).json({ message: error.message || "Không thể thêm người phỏng vấn." });
  } finally { if (connection) connection.release(); }
});

router.get("/", kiemTraDangNhap, async function(req, res) {
  try {
    const schema = await khoiTaoSchemaPhongVan();
    const cotDotTuyenSelect = schema.cotDotTuyen
      ? `pv.${schema.cotDotTuyen}`
      : "uv.dot_tuyen_id";
    const cotTenDot = await layCotTenDotTuyen();
    const dieuKien = [];
    const thamSo = [];

    if (req.query.trang_thai) {
      dieuKien.push("pv.trang_thai = ?");
      thamSo.push(req.query.trang_thai);
    }

    if (req.query.tu_ngay) {
      dieuKien.push(`pv.${schema.cotThoiGian} >= ?`);
      thamSo.push(req.query.tu_ngay);
    }

    if (req.query.den_ngay) {
      dieuKien.push(`pv.${schema.cotThoiGian} <= ?`);
      thamSo.push(req.query.den_ngay);
    }

    if (laVaiTroPhongVan(req.nguoiDung?.vai_tro)) {
      dieuKien.push(`EXISTS (
                SELECT 1 FROM phong_van_nguoi_tham_gia pvt
                WHERE pvt.phong_van_id = pv.id AND pvt.nguoi_dung_id = ?
            )`);
      thamSo.push(Number(req.nguoiDung.id));
    }

    const where = dieuKien.length ? `WHERE ${dieuKien.join(" AND ")}` : "";
    const [rows] = await db.query(
      `
            SELECT
                pv.*,
                pv.${schema.cotThoiGian} AS thoi_gian,
                ${schema.cotKetThuc ? `pv.${schema.cotKetThuc}` : "NULL"} AS ket_thuc,
                ${cotDotTuyenSelect} AS dot_tuyen_id,
                uv.ho_ten AS ten_ung_vien,
                uv.email AS email_ung_vien,
                dt.${cotTenDot} AS ten_dot_tuyen,
                pv_summary.ten_nguoi_phong_van,
                pv_summary.nguoi_phong_van_ids
            FROM phong_van pv
            INNER JOIN ung_vien uv ON uv.id = pv.ung_vien_id
            LEFT JOIN dot_tuyen dt ON dt.id = uv.dot_tuyen_id
            LEFT JOIN (
                SELECT
                    pvt.phong_van_id,
                    GROUP_CONCAT(DISTINCT nd.ho_ten ORDER BY nd.ho_ten SEPARATOR ', ') AS ten_nguoi_phong_van,
                    GROUP_CONCAT(DISTINCT nd.id ORDER BY nd.id SEPARATOR ',') AS nguoi_phong_van_ids
                FROM phong_van_nguoi_tham_gia pvt
                INNER JOIN nguoi_dung nd ON nd.id = pvt.nguoi_dung_id
                GROUP BY pvt.phong_van_id
            ) pv_summary ON pv_summary.phong_van_id = pv.id
            ${where}
            ORDER BY pv.${schema.cotThoiGian} DESC
            `,
      thamSo,
    );

    res.json(rows);
  } catch (error) {
    console.error("Lỗi lấy danh sách lịch phỏng vấn:", error);
    res.status(500).json({ message: "Không thể lấy danh sách lịch phỏng vấn." });
  }
});

router.get("/:id", kiemTraDangNhap, async function(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID lịch phỏng vấn không hợp lệ." });
    }

    const lich = await layChiTietLich(id);
    if (!lich) {
      return res.status(404).json({ message: "Không tìm thấy lịch phỏng vấn." });
    }

    if (laVaiTroPhongVan(req.nguoiDung?.vai_tro)) {
      const [assigned] = await db.query(
        `SELECT 1 FROM phong_van_nguoi_tham_gia
                 WHERE phong_van_id = ? AND nguoi_dung_id = ? LIMIT 1`,
        [id, Number(req.nguoiDung.id)],
      );

      if (!assigned.length) {
        return res.status(403).json({ message: "Bạn không được phân công lịch phỏng vấn này." });
      }
    }

    res.json(lich);
  } catch (error) {
    console.error("Lỗi lấy chi tiết lịch phỏng vấn:", error);
    res.status(500).json({ message: "Không thể lấy chi tiết lịch phỏng vấn." });
  }
});

router.post("/", kiemTraDangNhap, kiemTraVaiTro(...vaiTroQuanLy), async function(req, res) {
  let connection;

  try {
    const schema = await khoiTaoSchemaPhongVan();
    const ungVienId = Number(req.body?.ung_vien_id);
    const dotTuyenId = Number(req.body?.dot_tuyen_id);
    const thoiGian = chuanHoaNgay(req.body?.thoi_gian || req.body?.bat_dau);
    const ketThuc = chuanHoaNgay(req.body?.ket_thuc);
    const hinhThuc = req.body?.hinh_thuc === "offline" ? "offline" : "online";
    const diaDiem = String(req.body?.dia_diem || "").trim() || null;
    const ghiChu = String(req.body?.ghi_chu || "").trim() || null;
    const vong = String(req.body?.vong_phong_van || "Vòng 1").trim();
    const interviewerIds = chuanHoaDanhSachId(
      req.body?.nguoi_phong_van_ids ?? req.body?.nguoi_phong_van_id ?? req.body?.nguoi_phong_van,
    );

    if (!Number.isInteger(ungVienId) || ungVienId <= 0 || !Number.isInteger(dotTuyenId) || dotTuyenId <= 0 || !thoiGian) {
      return res.status(400).json({ message: "Vui lòng chọn ứng viên, đợt tuyển dụng và thời gian phỏng vấn hợp lệ." });
    }

    if (thoiGian.getTime() < Date.now() - 60000) {
      return res.status(400).json({ message: "Thời gian phỏng vấn không được nằm trong quá khứ." });
    }

    if (ketThuc && ketThuc <= thoiGian) {
      return res.status(400).json({ message: "Thời gian kết thúc phải sau thời gian bắt đầu." });
    }

    if (!kiemTraVongPhongVan(vong)) {
      return res.status(400).json({ message: "Vòng phỏng vấn không hợp lệ." });
    }

    if (!interviewerIds.length) {
      return res.status(400).json({ message: "Vui lòng chọn ít nhất một người phỏng vấn." });
    }

    const [candidates] = await db.query(
      "SELECT id, ho_ten, email, dot_tuyen_id FROM ung_vien WHERE id = ? LIMIT 1",
      [ungVienId],
    );
    const candidate = candidates[0];

    if (!candidate) {
      return res.status(404).json({ message: "Không tìm thấy ứng viên." });
    }

    if (Number(candidate.dot_tuyen_id) !== dotTuyenId) {
      return res.status(400).json({ message: "Đợt tuyển dụng không khớp với đợt của ứng viên." });
    }

    const interviewers = await layThongTinNguoiPhongVan(interviewerIds);
    const cotTenDot = await layCotTenDotTuyen();
    const [campaigns] = await db.query(
      `SELECT id, ${cotTenDot} AS ten_dot FROM dot_tuyen WHERE id = ? LIMIT 1`,
      [dotTuyenId],
    );

    connection = await db.getConnection();
    await connection.beginTransaction();

    const insertData = {
      ung_vien_id: ungVienId,
      [schema.cotThoiGian]: thoiGian,
      hinh_thuc: hinhThuc,
      dia_diem: diaDiem,
      trang_thai: "da_len_lich",
      ghi_chu: ghiChu,
      vong_phong_van: vong,
    };
    // Một số database triển khai không lưu người tạo/người phỏng vấn trực tiếp
    // trong phong_van; danh sách người phỏng vấn được lưu ở bảng liên kết.
    if (schema.cotNguoiTao) insertData[schema.cotNguoiTao] = Number(req.nguoiDung.id);
    if (schema.cotNguoiPhongVan) insertData[schema.cotNguoiPhongVan] = interviewerIds[0];

    if (schema.cotKetThuc) {
      insertData[schema.cotKetThuc] = ketThuc;
    }

    if (schema.cotDotTuyen) {
      insertData[schema.cotDotTuyen] = dotTuyenId;
    }

    const fields = Object.keys(insertData).filter((field) => schema.names.has(field));
    const [insertResult] = await connection.query(
      `INSERT INTO phong_van (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`,
      fields.map((field) => insertData[field]),
    );

    const interviewId = insertResult.insertId;

    for (const interviewerId of interviewerIds) {
      await connection.query(
        `INSERT INTO phong_van_nguoi_tham_gia (phong_van_id, nguoi_dung_id)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE nguoi_dung_id = VALUES(nguoi_dung_id)`,
        [interviewId, interviewerId],
      );
    }

    const [candidateColumns] = await connection.query("SHOW COLUMNS FROM ung_vien");
    const candidateNames = new Set(candidateColumns.map((column) => column.Field));
    if (candidateNames.has("trang_thai")) {
      await connection.query(
        "UPDATE ung_vien SET trang_thai = 'da_xep_lich' WHERE id = ?",
        [ungVienId],
      );
    }

    await connection.commit();
    connection.release();
    connection = null;

    for (const interviewer of interviewers) {
      await taoThongBao(
        interviewer.id,
        "Lịch phỏng vấn mới",
        `Bạn được phân công phỏng vấn ${candidate.ho_ten} — ${vong} vào ${thoiGian.toLocaleString("vi-VN")}.`,
      );
    }

    let emailResult = {
      email_trang_thai: "chua_gui",
      message: "Đã lưu lịch phỏng vấn. bạn có thể gửi thư mời riêng khi sẵn sàng.",
    };

    if (req.body?.gui_email === true) {
      emailResult = await guiLichVaCapNhatTrangThai(interviewId);
    }

    res.status(201).json({
      message: emailResult.message || (emailResult.email_trang_thai === "da_gui"
        ? "Đã lưu lịch và gửi thư mời phỏng vấn."
        : "Đã lưu lịch phỏng vấn."),
      id: interviewId,
      vong_phong_van: vong,
      ...emailResult,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Lỗi rollback lịch phỏng vấn:", rollbackError);
      }
    }

    console.error("Lỗi tạo lịch phỏng vấn:", error);
    res.status(500).json({ message: error.message || "Không thể tạo lịch phỏng vấn." });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.put("/:id", kiemTraDangNhap, kiemTraVaiTro(...vaiTroQuanLy), async function(req, res) {
  let connection;

  try {
    const schema = await khoiTaoSchemaPhongVan();
    const id = Number(req.params.id);
    const old = await layChiTietLich(id);

    if (!Number.isInteger(id) || id <= 0 || !old) {
      return res.status(404).json({ message: "Không tìm thấy lịch phỏng vấn." });
    }

    const ungVienId = Number(req.body?.ung_vien_id ?? old.ung_vien_id);
    const dotTuyenId = Number(req.body?.dot_tuyen_id ?? old.dot_tuyen_id);
    const thoiGian = chuanHoaNgay(req.body?.thoi_gian || req.body?.bat_dau || old.thoi_gian);
    const ketThuc = chuanHoaNgay(req.body?.ket_thuc || old.ket_thuc);
    const hinhThuc = req.body?.hinh_thuc || old.hinh_thuc || "online";
    const diaDiem = req.body?.dia_diem === undefined ? old.dia_diem : String(req.body.dia_diem || "").trim() || null;
    const ghiChu = req.body?.ghi_chu === undefined ? old.ghi_chu : String(req.body.ghi_chu || "").trim() || null;
    const vong = String(req.body?.vong_phong_van ?? old.vong_phong_van ?? "Vòng 1").trim();
    const rawIds = req.body?.nguoi_phong_van_ids ?? req.body?.nguoi_phong_van_id ?? req.body?.nguoi_phong_van;
    const interviewerIds = rawIds === undefined
      ? chuanHoaDanhSachId(String(old.nguoi_phong_van_ids || old[schema.cotNguoiPhongVan] || "").split(","))
      : chuanHoaDanhSachId(rawIds);

    if (!thoiGian || !Number.isInteger(ungVienId) || ungVienId <= 0 || !Number.isInteger(dotTuyenId) || dotTuyenId <= 0) {
      return res.status(400).json({ message: "Thông tin lịch phỏng vấn không hợp lệ." });
    }

    if (ketThuc && ketThuc <= thoiGian) {
      return res.status(400).json({ message: "Thời gian kết thúc phải sau thời gian bắt đầu." });
    }

    if (!kiemTraVongPhongVan(vong) || !interviewerIds.length) {
      return res.status(400).json({ message: "Vui lòng chọn vòng phỏng vấn và ít nhất một người phỏng vấn." });
    }

    const [candidateRows] = await db.query(
      "SELECT id, ho_ten, email, dot_tuyen_id FROM ung_vien WHERE id = ? LIMIT 1",
      [ungVienId],
    );

    if (!candidateRows.length || Number(candidateRows[0].dot_tuyen_id) !== dotTuyenId) {
      return res.status(400).json({ message: "Ứng viên không tồn tại hoặc không thuộc đợt tuyển dụng đã chọn." });
    }

    const interviewers = await layThongTinNguoiPhongVan(interviewerIds);

    connection = await db.getConnection();
    await connection.beginTransaction();

    const updateData = {
      ung_vien_id: ungVienId,
      [schema.cotNguoiPhongVan]: interviewerIds[0],
      [schema.cotThoiGian]: thoiGian,
      hinh_thuc: hinhThuc,
      dia_diem: diaDiem,
      ghi_chu: ghiChu,
      vong_phong_van: vong,
      email_trang_thai: "chua_gui",
      email_loi: null,
    };

    if (schema.cotKetThuc) {
      updateData[schema.cotKetThuc] = ketThuc;
    }

    if (schema.cotDotTuyen) {
      updateData[schema.cotDotTuyen] = dotTuyenId;
    }

    const fields = Object.keys(updateData).filter((field) => schema.names.has(field));
    await connection.query(
      `UPDATE phong_van SET ${fields.map((field) => `${field} = ?`).join(", ")} WHERE id = ?`,
      [...fields.map((field) => updateData[field]), id],
    );

    await connection.query("DELETE FROM phong_van_nguoi_tham_gia WHERE phong_van_id = ?", [id]);
    for (const interviewerId of interviewerIds) {
      await connection.query(
        "INSERT INTO phong_van_nguoi_tham_gia (phong_van_id, nguoi_dung_id) VALUES (?, ?)",
        [id, interviewerId],
      );
    }

    await connection.commit();
    connection.release();
    connection = null;

    for (const interviewer of interviewers) {
      await taoThongBao(
        interviewer.id,
        "Lịch phỏng vấn đã cập nhật",
        `Lịch phỏng vấn ${candidateRows[0].ho_ten} — ${vong} đã được cập nhật.`,
      );
    }

    let emailResult = {
      email_trang_thai: "chua_gui",
      message: "Đã cập nhật lịch phỏng vấn. Chưa gửi thư mời.",
    };

    if (req.body?.gui_email === true) {
      emailResult = await guiLichVaCapNhatTrangThai(id);
    }

    res.json({
      message: emailResult.message || (emailResult.email_trang_thai === "da_gui"
        ? "Đã cập nhật lịch và gửi lại thư mời."
        : "Đã cập nhật lịch phỏng vấn."),
      ...emailResult,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Lỗi rollback cập nhật lịch:", rollbackError);
      }
    }

    console.error("Lỗi cập nhật lịch phỏng vấn:", error);
    res.status(500).json({ message: error.message || "Không thể cập nhật lịch phỏng vấn." });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post("/:id/gui-thu-moi", kiemTraDangNhap, kiemTraVaiTro(...vaiTroQuanLy), async function(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID lịch phỏng vấn không hợp lệ." });
    }

    const lich = await layChiTietLich(id);
    if (!lich) {
      return res.status(404).json({ message: "Không tìm thấy lịch phỏng vấn." });
    }

    const result = await guiLichVaCapNhatTrangThai(id);
    if (result.email_trang_thai !== "da_gui") {
      return res.status(502).json({
        message: result.email_loi || "Gửi thư mời chưa thành công. Kiểm tra cấu hình Gmail rồi thử lại.",
        ...result,
      });
    }

    res.json({ message: "Đã gửi lại thư mời và file lịch .ics.", ...result });
  } catch (error) {
    console.error("Lỗi gửi lại thư mời phỏng vấn:", error);
    res.status(500).json({ message: error.message || "Không thể gửi lại thư mời." });
  }
});

router.patch("/:id/trang-thai", kiemTraDangNhap, async function(req, res) {
  try {
    const id = Number(req.params.id);
    const trangThai = req.body?.trang_thai;

    if (!Number.isInteger(id) || id <= 0 || !trangThaiHopLe.includes(trangThai)) {
      return res.status(400).json({ message: "Trạng thái lịch phỏng vấn không hợp lệ." });
    }

    const [rows] = await db.query("SELECT id, ung_vien_id FROM phong_van WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Không tìm thấy lịch phỏng vấn." });
    }

    const user = req.nguoiDung || {};
    if (!vaiTroQuanLy.includes(user.vai_tro)) {
      if (!laVaiTroPhongVan(user.vai_tro) || trangThai === "huy") {
        return res.status(403).json({ message: "Bạn không có quyền cập nhật trạng thái lịch này." });
      }

      const [assigned] = await db.query(
        "SELECT 1 FROM phong_van_nguoi_tham_gia WHERE phong_van_id = ? AND nguoi_dung_id = ? LIMIT 1",
        [id, Number(user.id)],
      );

      if (!assigned.length) {
        return res.status(403).json({ message: "Bạn không được phân công lịch phỏng vấn này." });
      }
    }

    await db.query("UPDATE phong_van SET trang_thai = ? WHERE id = ?", [trangThai, id]);

    if (trangThai === "da_phong_van") {
      const [candidateColumns] = await db.query("SHOW COLUMNS FROM ung_vien");
      if (candidateColumns.some((column) => column.Field === "trang_thai")) {
        await db.query("UPDATE ung_vien SET trang_thai = 'da_phong_van' WHERE id = ?", [rows[0].ung_vien_id]);
      }
    }

    res.json({ message: "Đã cập nhật trạng thái lịch phỏng vấn.", trang_thai: trangThai });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái lịch phỏng vấn:", error);
    res.status(500).json({ message: "Không thể cập nhật trạng thái lịch phỏng vấn." });
  }
});

module.exports = router;
