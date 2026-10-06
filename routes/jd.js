const express = require("express");
const router = express.Router();

const db = require("../database/db");

const {
  kiemTraDangNhap,
  kiemTraVaiTro,
} = require("../middleware/auth");

const auth = kiemTraDangNhap;
const chiQuanLy = kiemTraVaiTro("admin", "manager");

/* Chuẩn hóa dữ liệu */
function chuanHoaText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text === "" ? null : text;
}

function chuanHoaTieuChi(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return JSON.stringify(value);
}

/* =========================================================
   GET /api/jd
   Lấy danh sách JD
========================================================= */
router.get("/", auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        jd.id,
        jd.dot_tuyen_id,
        jd.tieu_de,
        jd.mo_ta,
        jd.yeu_cau,
        jd.quyen_loi,
        jd.tieu_chi,
        jd.trang_thai,
        jd.nguoi_duyet_id,
        jd.ngay_tao,
        jd.ngay_duyet,
        jd.ngay_cap_nhat,
        dt.ten_dot AS ten_dot_tuyen,
        nd.ho_ten AS ten_nguoi_duyet
      FROM jd
      LEFT JOIN dot_tuyen dt
        ON jd.dot_tuyen_id = dt.id
      LEFT JOIN nguoi_dung nd
        ON jd.nguoi_duyet_id = nd.id
      ORDER BY jd.id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Lỗi lấy danh sách JD:", error);

    res.status(500).json({
      message: "Không thể lấy danh sách JD",
    });
  }
});

/* =========================================================
   GET /api/jd/:id
   Lấy chi tiết JD
========================================================= */
router.get("/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID JD không hợp lệ",
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        jd.id,
        jd.dot_tuyen_id,
        jd.tieu_de,
        jd.mo_ta,
        jd.yeu_cau,
        jd.quyen_loi,
        jd.tieu_chi,
        jd.trang_thai,
        jd.nguoi_duyet_id,
        jd.ngay_tao,
        jd.ngay_duyet,
        jd.ngay_cap_nhat,
        dt.ten_dot AS ten_dot_tuyen,
        nd.ho_ten AS ten_nguoi_duyet
      FROM jd
      LEFT JOIN dot_tuyen dt
        ON jd.dot_tuyen_id = dt.id
      LEFT JOIN nguoi_dung nd
        ON jd.nguoi_duyet_id = nd.id
      WHERE jd.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy JD",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Lỗi lấy chi tiết JD:", error);

    res.status(500).json({
      message: "Không thể lấy thông tin JD",
    });
  }
});

/* =========================================================
   POST /api/jd
   Tạo JD mới
========================================================= */
router.post("/", auth, chiQuanLy, async (req, res) => {
  try {
    const dotTuyenId = Number(req.body.dot_tuyen_id);
    const tieuDe = chuanHoaText(req.body.tieu_de);
    const moTa = chuanHoaText(req.body.mo_ta);
    const yeuCau = chuanHoaText(req.body.yeu_cau);
    const quyenLoi = chuanHoaText(req.body.quyen_loi);
    const tieuChi = chuanHoaTieuChi(req.body.tieu_chi);

    if (!Number.isInteger(dotTuyenId) || dotTuyenId <= 0) {
      return res.status(400).json({
        message: "Vui lòng chọn đợt tuyển dụng",
      });
    }

    if (!tieuDe) {
      return res.status(400).json({
        message: "Vui lòng nhập tiêu đề JD",
      });
    }

    /* Kiểm tra đợt tuyển dụng */
    const [dotTuyenRows] = await db.query(
      `
      SELECT
        id,
        trang_thai
      FROM dot_tuyen
      WHERE id = ?
      LIMIT 1
      `,
      [dotTuyenId]
    );

    if (dotTuyenRows.length === 0) {
      return res.status(400).json({
        message: "Đợt tuyển dụng không tồn tại",
      });
    }

    /* Không cho tạo JD ở đợt đã tạm dừng/kết thúc */
    const trangThaiDotTuyen = String(
      dotTuyenRows[0].trang_thai || ""
    ).toLowerCase();

    const dotTuyenKhongHoatDong = [
      "tam_dung",
      "ket_thuc",
      "da_dong",
      "dong",
      "closed",
    ].includes(trangThaiDotTuyen);

    if (dotTuyenKhongHoatDong) {
      return res.status(400).json({
        message: "Đợt tuyển dụng đã tạm dừng hoặc kết thúc, không thể tạo JD",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO jd (
        dot_tuyen_id,
        tieu_de,
        mo_ta,
        yeu_cau,
        quyen_loi,
        tieu_chi,
        trang_thai,
        ngay_tao,
        ngay_cap_nhat
      )
      VALUES (?, ?, ?, ?, ?, ?, 'nhap', NOW(), NOW())
      `,
      [
        dotTuyenId,
        tieuDe,
        moTa,
        yeuCau,
        quyenLoi,
        tieuChi,
      ]
    );

    res.status(201).json({
      message: "Tạo JD thành công",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Lỗi tạo JD:", error);

    res.status(500).json({
      message: "Không thể tạo JD",
      error: error.message,
    });
  }
});

/* =========================================================
   PUT /api/jd/:id
   Cập nhật JD

   Không cho sửa JD đã hủy
========================================================= */
router.put("/:id", auth, chiQuanLy, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const dotTuyenId = Number(req.body.dot_tuyen_id);
    const tieuDe = chuanHoaText(req.body.tieu_de);
    const moTa = chuanHoaText(req.body.mo_ta);
    const yeuCau = chuanHoaText(req.body.yeu_cau);
    const quyenLoi = chuanHoaText(req.body.quyen_loi);
    const tieuChi = chuanHoaTieuChi(req.body.tieu_chi);

    console.log("========== CẬP NHẬT JD ==========");
    console.log("ID:", id);
    console.log("dot_tuyen_id:", dotTuyenId);
    console.log("tieu_de:", tieuDe);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID JD không hợp lệ",
      });
    }

    if (!Number.isInteger(dotTuyenId) || dotTuyenId <= 0) {
      return res.status(400).json({
        message: "Vui lòng chọn đợt tuyển dụng",
      });
    }

    if (!tieuDe) {
      return res.status(400).json({
        message: "Vui lòng nhập tiêu đề JD",
      });
    }

    /* Tìm JD */
    const [jdRows] = await db.query(
      `
      SELECT
        id,
        dot_tuyen_id,
        trang_thai
      FROM jd
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (jdRows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy JD",
      });
    }

    const jdHienTai = jdRows[0];

    /* Không cho sửa JD đã hủy */
    if (jdHienTai.trang_thai === "huy") {
      return res.status(400).json({
        message: "JD đã hủy không thể chỉnh sửa",
      });
    }

    /* Kiểm tra đợt tuyển dụng */
    const [dotTuyenRows] = await db.query(
      `
      SELECT
        id,
        trang_thai
      FROM dot_tuyen
      WHERE id = ?
      LIMIT 1
      `,
      [dotTuyenId]
    );

    if (dotTuyenRows.length === 0) {
      return res.status(400).json({
        message: "Đợt tuyển dụng không tồn tại",
      });
    }

    /*
      Nếu chọn sang đợt tuyển dụng khác thì không được
      chuyển sang đợt đã tạm dừng/kết thúc.

      Nếu JD đang thuộc đợt cũ đã tạm dừng/kết thúc
      thì vẫn cho giữ nguyên đợt đó khi chỉnh sửa.
    */
    const dangDoiDotTuyen =
      Number(jdHienTai.dot_tuyen_id) !== dotTuyenId;

    const trangThaiDotTuyen = String(
      dotTuyenRows[0].trang_thai || ""
    ).toLowerCase();

    const dotTuyenKhongHoatDong = [
      "tam_dung",
      "ket_thuc",
      "da_dong",
      "dong",
      "closed",
    ].includes(trangThaiDotTuyen);

    if (dangDoiDotTuyen && dotTuyenKhongHoatDong) {
      return res.status(400).json({
        message:
          "Không thể chuyển JD sang đợt tuyển dụng đã tạm dừng hoặc kết thúc",
      });
    }

    /* Cập nhật JD */
    const [result] = await db.query(
      `
      UPDATE jd
      SET
        dot_tuyen_id = ?,
        tieu_de = ?,
        mo_ta = ?,
        yeu_cau = ?,
        quyen_loi = ?,
        tieu_chi = ?,
        ngay_cap_nhat = NOW()
      WHERE id = ?
      `,
      [
        dotTuyenId,
        tieuDe,
        moTa,
        yeuCau,
        quyenLoi,
        tieuChi,
        id,
      ]
    );

    console.log("Kết quả UPDATE:", result);

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: "Không có dữ liệu nào được cập nhật",
      });
    }

    console.log("Cập nhật JD thành công");

    res.json({
      message: "Cập nhật JD thành công",
    });
  } catch (error) {
    console.error("========== LỖI CẬP NHẬT JD ==========");
    console.error(error);

    res.status(500).json({
      message: "Không thể cập nhật JD",
      error: error.message,
    });
  }
});

/* =========================================================
   PUT /api/jd/:id/gui-duyet

   Nháp       -> Chờ duyệt
   Từ chối    -> Chờ duyệt
========================================================= */
router.put("/:id/gui-duyet", auth, chiQuanLy, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.query(
      `
      SELECT id, trang_thai
      FROM jd
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy JD",
      });
    }

    if (!["nhap", "tu_choi"].includes(rows[0].trang_thai)) {
      return res.status(400).json({
        message: "JD đang ở trạng thái này không thể gửi duyệt.",
      });
    }

    await db.query(
      `
      UPDATE jd
      SET
        trang_thai = 'cho_duyet',
        nguoi_duyet_id = NULL,
        ngay_duyet = NULL,
        ngay_cap_nhat = NOW()
      WHERE id = ?
      `,
      [id]
    );

    res.json({
      message: "Gửi JD để duyệt thành công",
    });
  } catch (error) {
    console.error("Lỗi gửi duyệt JD:", error);

    res.status(500).json({
      message: "Không thể gửi JD để duyệt",
    });
  }
});

/* =========================================================
   PUT /api/jd/:id/duyet

   Chờ duyệt -> Đã duyệt
========================================================= */
router.put("/:id/duyet", auth, chiQuanLy, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.query(
      `
      SELECT id, trang_thai
      FROM jd
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy JD",
      });
    }

    if (rows[0].trang_thai !== "cho_duyet") {
      return res.status(400).json({
        message: "Chỉ JD đang chờ duyệt mới được duyệt",
      });
    }

    await db.query(
      `
      UPDATE jd
      SET
        trang_thai = 'da_duyet',
        nguoi_duyet_id = ?,
        ngay_duyet = NOW(),
        ngay_cap_nhat = NOW()
      WHERE id = ?
      `,
      [req.nguoiDung.id, id]
    );

    res.json({
      message: "Duyệt JD thành công",
    });
  } catch (error) {
    console.error("Lỗi duyệt JD:", error);

    res.status(500).json({
      message: "Không thể duyệt JD",
    });
  }
});

/* =========================================================
   PUT /api/jd/:id/tu-choi

   Chờ duyệt -> Từ chối
   Đã duyệt  -> Từ chối
========================================================= */
router.put("/:id/tu-choi", auth, chiQuanLy, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.query(
      `
      SELECT id, trang_thai
      FROM jd
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy JD",
      });
    }

    if (!["cho_duyet", "da_duyet"].includes(rows[0].trang_thai)) {
      return res.status(400).json({
        message: "JD ở trạng thái này không thể từ chối",
      });
    }

    await db.query(
      `
      UPDATE jd
      SET
        trang_thai = 'tu_choi',
        nguoi_duyet_id = ?,
        ngay_duyet = NULL,
        ngay_cap_nhat = NOW()
      WHERE id = ?
      `,
      [req.nguoiDung.id, id]
    );

    res.json({
      message: "Từ chối JD thành công",
    });
  } catch (error) {
    console.error("Lỗi từ chối JD:", error);

    res.status(500).json({
      message: "Không thể từ chối JD",
    });
  }
});

/* =========================================================
   PUT /api/jd/:id/huy

   Nháp       -> Đã hủy
   Chờ duyệt  -> Đã hủy
   Đã duyệt   -> Đã hủy
   Từ chối    -> Đã hủy
========================================================= */
router.put("/:id/huy", auth, chiQuanLy, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.query(
      `
      SELECT id, trang_thai
      FROM jd
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy JD",
      });
    }

    if (
      !["nhap", "cho_duyet", "da_duyet", "tu_choi"].includes(
        rows[0].trang_thai
      )
    ) {
      return res.status(400).json({
        message: "JD này không thể hủy",
      });
    }

    await db.query(
      `
      UPDATE jd
      SET
        trang_thai = 'huy',
        ngay_cap_nhat = NOW()
      WHERE id = ?
      `,
      [id]
    );

    res.json({
      message: "Hủy JD thành công",
    });
  } catch (error) {
    console.error("Lỗi hủy JD:", error);

    res.status(500).json({
      message: "Không thể hủy JD",
    });
  }
});

/* =========================================================
   DELETE /api/jd/:id

   Nháp
   Từ chối
   Đã hủy
========================================================= */
router.delete("/:id", auth, chiQuanLy, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.query(
      `
      SELECT id, trang_thai
      FROM jd
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy JD",
      });
    }

    if (!["nhap", "tu_choi", "huy"].includes(rows[0].trang_thai)) {
      return res.status(400).json({
        message: "JD đang ở trạng thái này không thể xóa",
      });
    }

    await db.query(
      `
      DELETE FROM jd
      WHERE id = ?
      `,
      [id]
    );

    res.json({
      message: "Xóa JD thành công",
    });
  } catch (error) {
    console.error("Lỗi xóa JD:", error);

    res.status(500).json({
      message: "Không thể xóa JD",
    });
  }
});

module.exports = router;