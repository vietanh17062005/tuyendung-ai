const express = require("express");
const db = require("../database/db");
const { kiemTraDangNhap, kiemTraVaiTro } = require("../middleware/auth");
const { taoCauHoi, soanJD } = require("../services/ai");

const router = express.Router();

const JD_TEMPLATES = [
  { id: "backend", ten: "Backend Engineer", mo_ta: "Tuyển backend developer cho API, hệ thống, tích hợp dữ liệu" },
  { id: "frontend", ten: "Frontend Engineer", mo_ta: "Tuyển frontend developer cho UI, trải nghiệm người dùng" },
  { id: "fullstack", ten: "Fullstack Engineer", mo_ta: "Tuyển fullstack developer cho cả frontend và backend" },
  { id: "qa", ten: "QA Engineer", mo_ta: "Tuyển QA engineer cho kiểm thử chức năng và automation" },
  { id: "data", ten: "Data Analyst", mo_ta: "Tuyển data analyst cho phân tích dữ liệu và dashboard" },
];
const JD_METADATA_COLUMNS = {
  bo_phan: "VARCHAR(100) NULL",
  dia_diem: "VARCHAR(200) NULL",
  loai_hinh: "VARCHAR(50) NULL",
  muc_luong: "VARCHAR(150) NULL",
  han_nhan_ho_so: "DATE NULL",
  ky_nang: "TEXT NULL",
};
let metadataReady;

async function layCotBang(tableName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  return rows.map((row) => row.Field);
}

function layNgayCapNhatJD(columns) {
  return columns.includes("ngay_cap_nhat") ? "ngay_cap_nhat" : "ngay_sua";
}

async function damBaoCotMetadataJD() {
  if (!metadataReady) {
    metadataReady = (async function () {
      const columns = new Set(await layCotBang("jd"));
      for (const [name, definition] of Object.entries(JD_METADATA_COLUMNS)) {
        if (!columns.has(name)) {
          await db.query(`ALTER TABLE jd ADD COLUMN ${name} ${definition}`);
        }
      }
    })().catch(function (error) {
      metadataReady = null;
      throw error;
    });
  }
  await metadataReady;
}

function parseTieuChi(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

function normalizeJD(row) {
  if (!row) return null;
  return {
    ...row,
    ten_dot_tuyen: row.ten_dot_tuyen || row.ten_dot || row.ten || "",
    ten_nguoi_duyet: row.ten_nguoi_duyet || row.nguoi_duyet_ten || "",
    tieu_chi: parseTieuChi(row.tieu_chi),
  };
}

async function layDotTuyenTheoId(id) {
  const [rows] = await db.query("SELECT * FROM dot_tuyen WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

function layNguoiDung(req) {
  return req.nguoiDung || req.user || req.nguoi_dung || {};
}

function layNguoiDungId(req) {
  return (
    layNguoiDung(req).id ||
    layNguoiDung(req).nguoi_dung_id ||
    layNguoiDung(req).userId ||
    null
  );
}

router.get(
  "/templates",
  kiemTraDangNhap,
  async function (req, res) {
    res.json({ success: true, data: JD_TEMPLATES });
  },
);

router.get(
  "/",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      await damBaoCotMetadataJD();
      const columns = await layCotBang("jd");
      const nguoiDuyetField = columns.includes("nguoi_duyet_id") ? "nguoi_duyet_id" : "nguoi_duyet";
      const ngayCapNhatField = layNgayCapNhatJD(columns);
      const dotColumns = await layCotBang("dot_tuyen");
      const dotTenField = dotColumns.includes("ten") ? "ten" : "ten_dot";

      const [rows] = await db.query(`
        SELECT
          jd.id,
          jd.dot_tuyen_id,
          jd.tieu_de,
          jd.mo_ta,
          jd.yeu_cau,
          jd.quyen_loi,
          jd.trang_thai,
          jd.${nguoiDuyetField} AS nguoi_duyet,
          jd.ngay_duyet,
          jd.tieu_chi,
          jd.bo_phan,
          jd.dia_diem,
          jd.loai_hinh,
          jd.muc_luong,
          jd.han_nhan_ho_so,
          jd.ky_nang,
          jd.ngay_tao,
          jd.${ngayCapNhatField} AS ngay_cap_nhat,
          dt.${dotTenField} AS ten_dot_tuyen,
          nd.ho_ten AS ten_nguoi_duyet
        FROM jd
        LEFT JOIN dot_tuyen dt ON dt.id = jd.dot_tuyen_id
        LEFT JOIN nguoi_dung nd ON nd.id = jd.${nguoiDuyetField}
        ORDER BY jd.id DESC
      `);

      res.json({ success: true, data: rows.map(normalizeJD) });
    } catch (error) {
      console.error("GET /api/jd:", error);
      res.status(500).json({ message: "Không lấy được danh sách JD" });
    }
  },
);

router.get(
  "/:id",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      await damBaoCotMetadataJD();
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID JD không hợp lệ" });
      }

      const columns = await layCotBang("jd");
      const nguoiDuyetField = columns.includes("nguoi_duyet_id") ? "nguoi_duyet_id" : "nguoi_duyet";
      const ngayCapNhatField = layNgayCapNhatJD(columns);
      const dotColumns = await layCotBang("dot_tuyen");
      const dotTenField = dotColumns.includes("ten") ? "ten" : "ten_dot";

      const [rows] = await db.query(
        `
        SELECT
          jd.id,
          jd.dot_tuyen_id,
          jd.tieu_de,
          jd.mo_ta,
          jd.yeu_cau,
          jd.quyen_loi,
          jd.trang_thai,
          jd.${nguoiDuyetField} AS nguoi_duyet,
          jd.ngay_duyet,
          jd.tieu_chi,
          jd.bo_phan,
          jd.dia_diem,
          jd.loai_hinh,
          jd.muc_luong,
          jd.han_nhan_ho_so,
          jd.ky_nang,
          jd.ngay_tao,
          jd.${ngayCapNhatField} AS ngay_cap_nhat,
          dt.${dotTenField} AS ten_dot_tuyen,
          nd.ho_ten AS ten_nguoi_duyet
        FROM jd
        LEFT JOIN dot_tuyen dt ON dt.id = jd.dot_tuyen_id
        LEFT JOIN nguoi_dung nd ON nd.id = jd.${nguoiDuyetField}
        WHERE jd.id = ?
        LIMIT 1
        `,
        [id],
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Không tìm thấy JD" });
      }

      res.json({ success: true, data: normalizeJD(rows[0]) });
    } catch (error) {
      console.error("GET /api/jd/:id:", error);
      res.status(500).json({ message: "Không lấy được thông tin JD" });
    }
  },
);

router.get(
  "/:id/lich-su-ai",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID JD không hợp lệ" });
      }

      const [rows] = await db.query(
        "SELECT id, jd_id, y_tuong, hoi_dap, ngay_tao FROM jd_lich_su_ai WHERE jd_id = ? ORDER BY id DESC",
        [id],
      );

      res.json({
        success: true,
        data: rows.map((row) => ({ ...row, hoi_dap: row.hoi_dap ? JSON.parse(row.hoi_dap) : [] })),
      });
    } catch (error) {
      console.error("GET /api/jd/:id/lich-su-ai:", error);
      res.status(500).json({ message: "Không lấy được lịch sử AI của JD" });
    }
  },
);

router.post(
  "/",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      await damBaoCotMetadataJD();
      const dotTuyenId = Number(req.body?.dot_tuyen_id);
      const tieuDe = String(req.body?.tieu_de || "").trim();
      if (!Number.isInteger(dotTuyenId) || dotTuyenId <= 0) {
        return res.status(400).json({ message: "Vui lòng chọn đợt tuyển dụng" });
      }
      if (!tieuDe) {
        return res.status(400).json({ message: "Vui lòng nhập tiêu đề JD" });
      }

      const dotTuyen = await layDotTuyenTheoId(dotTuyenId);
      if (!dotTuyen) {
        return res.status(404).json({ message: "Đợt tuyển dụng không tồn tại" });
      }

      const insertData = {
        dot_tuyen_id: dotTuyenId,
        tieu_de: tieuDe,
        mo_ta: req.body?.mo_ta || null,
        yeu_cau: req.body?.yeu_cau || null,
        quyen_loi: req.body?.quyen_loi || null,
        tieu_chi: JSON.stringify(Array.isArray(req.body?.tieu_chi) ? req.body.tieu_chi : []),
        trang_thai: "nhap",
        bo_phan: String(req.body?.bo_phan || "").trim() || null,
        dia_diem: String(req.body?.dia_diem || "").trim() || null,
        loai_hinh: String(req.body?.loai_hinh || "").trim() || null,
        muc_luong: String(req.body?.muc_luong || "").trim() || null,
        han_nhan_ho_so: req.body?.han_nhan_ho_so || null,
        ky_nang: String(req.body?.ky_nang || "").trim() || null,
      };
      const insertColumns = Object.keys(insertData);
      const [result] = await db.query(
        `INSERT INTO jd (${insertColumns.join(", ")})
         VALUES (${insertColumns.map(() => "?").join(", ")})`,
        insertColumns.map((column) => insertData[column]),
      );

      res.status(201).json({ success: true, message: "Thêm JD thành công", data: { id: result.insertId } });
    } catch (error) {
      console.error("POST /api/jd:", error);
      res.status(500).json({ message: "Không thêm được JD" });
    }
  },
);

router.post(
  "/ai/cau-hoi",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const yTuong = String(req.body?.y_tuong || "").trim();
      if (!yTuong) {
        return res.status(400).json({ message: "Vui lòng nhập ý tưởng vị trí cần tuyển" });
      }

      const dotTuyen = req.body?.dot_tuyen_id ? await layDotTuyenTheoId(Number(req.body.dot_tuyen_id)) : null;
      const cauHoi = await taoCauHoi(dotTuyen || { ten: "", mo_ta: "" }, yTuong);

      if (req.body?.jd_id) {
        await db.query(
          `INSERT INTO jd_lich_su_ai (jd_id, y_tuong, hoi_dap) VALUES (?, ?, ?)`,
          [
            Number(req.body.jd_id),
            yTuong,
            JSON.stringify({ step: "clarify", cau_hoi, template: req.body?.template || null }),
          ],
        );
      }

      res.json({ success: true, data: { cau_hoi: cauHoi } });
    } catch (error) {
      console.error("POST /api/jd/ai/cau-hoi:", error);
      res.status(500).json({ message: "Không tạo được câu hỏi làm rõ từ AI" });
    }
  },
);

router.post(
  "/ai/soan",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const yTuong = String(req.body?.y_tuong || "").trim();
      const hoiDap = Array.isArray(req.body?.hoi_dap) ? req.body.hoi_dap : [];
      if (!yTuong) {
        return res.status(400).json({ message: "Vui lòng nhập ý tưởng vị trí cần tuyển" });
      }

      const dotTuyen = req.body?.dot_tuyen_id ? await layDotTuyenTheoId(Number(req.body.dot_tuyen_id)) : null;
      const jd = await soanJD(dotTuyen || { ten: "", mo_ta: "" }, yTuong, hoiDap, req.body?.ngon_ngu || "vi");

      res.json({ success: true, data: jd });
    } catch (error) {
      console.error("POST /api/jd/ai/soan:", error);
      res.status(500).json({ message: "Không soạn được JD từ AI" });
    }
  },
);

router.post(
  "/ai/luu",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const jdId = Number(req.body?.jd_id);
      const yTuong = String(req.body?.y_tuong || "").trim();
      const hoiDap = Array.isArray(req.body?.hoi_dap) ? req.body.hoi_dap : [];

      if (!Number.isInteger(jdId) || jdId <= 0) {
        return res.status(400).json({ message: "ID JD không hợp lệ" });
      }

      const [jd] = await db.query("SELECT id FROM jd WHERE id = ? LIMIT 1", [jdId]);
      if (!jd.length) {
        return res.status(404).json({ message: "Không tìm thấy JD" });
      }

      const [result] = await db.query(
        `INSERT INTO jd_lich_su_ai (jd_id, y_tuong, hoi_dap) VALUES (?, ?, ?)`,
        [jdId, yTuong || null, JSON.stringify(hoiDap)],
      );

      res.status(201).json({ success: true, message: "Lưu lịch sử AI của JD thành công", data: { id: result.insertId } });
    } catch (error) {
      console.error("POST /api/jd/ai/luu:", error);
      res.status(500).json({ message: "Không lưu được lịch sử AI của JD" });
    }
  },
);

router.put(
  "/:id",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      await damBaoCotMetadataJD();
      const id = Number(req.params.id);
      const dotTuyenId = Number(req.body?.dot_tuyen_id);
      const tieuDe = String(req.body?.tieu_de || "").trim();

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID JD không hợp lệ" });
      }
      if (!Number.isInteger(dotTuyenId) || dotTuyenId <= 0) {
        return res.status(400).json({ message: "Vui lòng chọn đợt tuyển dụng" });
      }
      if (!tieuDe) {
        return res.status(400).json({ message: "Vui lòng nhập tiêu đề JD" });
      }

      const [jd] = await db.query("SELECT id, trang_thai FROM jd WHERE id = ? LIMIT 1", [id]);
      if (!jd.length) {
        return res.status(404).json({ message: "Không tìm thấy JD" });
      }
      if (layNguoiDung(req).vai_tro === "hr" && !["nhap", "tu_choi"].includes(jd[0].trang_thai)) {
        return res.status(403).json({ message: "HR chỉ được sửa JD ở trạng thái Nháp hoặc Từ chối" });
      }

      const updateData = {
        dot_tuyen_id: dotTuyenId,
        tieu_de: tieuDe,
        mo_ta: req.body?.mo_ta || null,
        yeu_cau: req.body?.yeu_cau || null,
        quyen_loi: req.body?.quyen_loi || null,
        tieu_chi: JSON.stringify(Array.isArray(req.body?.tieu_chi) ? req.body.tieu_chi : []),
        bo_phan: String(req.body?.bo_phan || "").trim() || null,
        dia_diem: String(req.body?.dia_diem || "").trim() || null,
        loai_hinh: String(req.body?.loai_hinh || "").trim() || null,
        muc_luong: String(req.body?.muc_luong || "").trim() || null,
        han_nhan_ho_so: req.body?.han_nhan_ho_so || null,
        ky_nang: String(req.body?.ky_nang || "").trim() || null,
      };
      const updateColumns = Object.keys(updateData);
      await db.query(
        `UPDATE jd SET ${updateColumns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
        [...updateColumns.map((column) => updateData[column]), id],
      );

      res.json({ success: true, message: "Cập nhật JD thành công" });
    } catch (error) {
      console.error("PUT /api/jd/:id:", error);
      res.status(500).json({ message: "Không cập nhật được JD" });
    }
  },
);

router.put(
  "/:id/gui-duyet",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);
      const [jd] = await db.query("SELECT id, trang_thai FROM jd WHERE id = ? LIMIT 1", [id]);
      if (!jd.length) {
        return res.status(404).json({ message: "Không tìm thấy JD" });
      }
      if (!["nhap", "tu_choi"].includes(jd[0].trang_thai)) {
        return res.status(400).json({ message: "Chỉ JD ở trạng thái Nháp hoặc Từ chối mới được gửi duyệt" });
      }

      await db.query("UPDATE jd SET trang_thai = 'cho_duyet', nguoi_duyet = NULL, ngay_duyet = NULL WHERE id = ?", [id]);
      res.json({ success: true, message: "Đã gửi JD để duyệt" });
    } catch (error) {
      console.error("PUT /api/jd/:id/gui-duyet:", error);
      res.status(500).json({ message: "Không thể gửi JD để duyệt" });
    }
  },
);

router.put(
  "/:id/duyet",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);
      const nguoiDungId = layNguoiDungId(req);
      const [jd] = await db.query("SELECT id, trang_thai FROM jd WHERE id = ? LIMIT 1", [id]);
      if (!jd.length) {
        return res.status(404).json({ message: "Không tìm thấy JD" });
      }
      if (jd[0].trang_thai !== "cho_duyet") {
        return res.status(400).json({ message: "Chỉ JD đang chờ duyệt mới được duyệt" });
      }

      await db.query("UPDATE jd SET trang_thai = 'da_duyet', nguoi_duyet = ?, ngay_duyet = NOW() WHERE id = ?", [nguoiDungId, id]);
      res.json({ success: true, message: "Duyệt JD thành công" });
    } catch (error) {
      console.error("PUT /api/jd/:id/duyet:", error);
      res.status(500).json({ message: "Không thể duyệt JD" });
    }
  },
);

router.put(
  "/:id/tu-choi",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);
      const [jd] = await db.query("SELECT id, trang_thai FROM jd WHERE id = ? LIMIT 1", [id]);
      if (!jd.length) {
        return res.status(404).json({ message: "Không tìm thấy JD" });
      }
      if (jd[0].trang_thai !== "cho_duyet") {
        return res.status(400).json({ message: "Chỉ JD đang chờ duyệt mới được từ chối" });
      }

      await db.query("UPDATE jd SET trang_thai = 'tu_choi' WHERE id = ?", [id]);
      res.json({ success: true, message: "Đã từ chối JD" });
    } catch (error) {
      console.error("PUT /api/jd/:id/tu-choi:", error);
      res.status(500).json({ message: "Không thể từ chối JD" });
    }
  },
);

router.put(
  "/:id/huy",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);
      const [jd] = await db.query("SELECT id, trang_thai FROM jd WHERE id = ? LIMIT 1", [id]);
      if (!jd.length) {
        return res.status(404).json({ message: "Không tìm thấy JD" });
      }
      if (!["nhap", "cho_duyet", "da_duyet", "tu_choi"].includes(jd[0].trang_thai)) {
        return res.status(400).json({ message: "JD không thể hủy ở trạng thái hiện tại" });
      }

      await db.query("UPDATE jd SET trang_thai = 'huy' WHERE id = ?", [id]);
      res.json({ success: true, message: "Đã hủy JD" });
    } catch (error) {
      console.error("PUT /api/jd/:id/huy:", error);
      res.status(500).json({ message: "Không thể hủy JD" });
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
        return res.status(400).json({ message: "ID JD không hợp lệ" });
      }

      const [jd] = await db.query("SELECT id, trang_thai FROM jd WHERE id = ? LIMIT 1", [id]);
      if (!jd.length) {
        return res.status(404).json({ message: "Không tìm thấy JD" });
      }
      if (!["nhap", "tu_choi", "huy"].includes(jd[0].trang_thai)) {
        return res.status(400).json({ message: "Chỉ JD Nháp, Từ chối hoặc Đã hủy mới được xóa" });
      }

      await db.query("DELETE FROM jd WHERE id = ?", [id]);
      res.json({ success: true, message: "Xóa JD thành công" });
    } catch (error) {
      console.error("DELETE /api/jd/:id:", error);
      res.status(500).json({ message: "Không thể xóa JD" });
    }
  },
);

module.exports = router;
