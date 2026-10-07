const express = require("express");
const db = require("../database/db");
const {
  kiemTraDangNhap,
  kiemTraVaiTro,
} = require("../middleware/auth");

const {
  goiYTieuChi,
  taoNoiDungJD,
  lamSachTieuChi,
} = require("../services/ai");

const router = express.Router();

function layNguoiDung(req) {
  return req.nguoiDung || req.user || req.nguoi_dung || {};
}

function layNguoiDungId(req) {
  const nguoiDung = layNguoiDung(req);

  return (
    nguoiDung.id ||
    nguoiDung.nguoi_dung_id ||
    nguoiDung.userId ||
    null
  );
}

// GET /api/jd - Lấy danh sách JD
router.get(
  "/",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      const [rows] = await db.query(`
        SELECT
          jd.id,
          jd.dot_tuyen_id,
          jd.tieu_de,
          jd.mo_ta,
          jd.yeu_cau,
          jd.quyen_loi,
          jd.trang_thai,
          jd.nguoi_duyet,
          jd.nguoi_duyet_id,
          jd.ngay_duyet,
          jd.tieu_chi,
          jd.ngay_tao,
          jd.ngay_cap_nhat,

          dt.ten_dot AS ten_dot_tuyen,

          nd.ho_ten AS nguoi_duyet_ten,
          nd.ho_ten AS ten_nguoi_duyet

        FROM jd

        LEFT JOIN dot_tuyen dt
          ON jd.dot_tuyen_id = dt.id

        LEFT JOIN nguoi_dung nd
          ON jd.nguoi_duyet_id = nd.id

        ORDER BY jd.id ASC
      `);

      res.json(rows);
    } catch (error) {
      console.error("GET /api/jd:", error);

      res.status(500).json({
        message: "Không lấy được danh sách JD",
      });
    }
  },
);

// GET /api/jd/:id - Lấy chi tiết một JD
router.get(
  "/:id",
  kiemTraDangNhap,
  async function (req, res) {
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
          jd.trang_thai,
          jd.nguoi_duyet,
          jd.nguoi_duyet_id,
          jd.ngay_duyet,
          jd.tieu_chi,
          jd.ngay_tao,
          jd.ngay_cap_nhat,

          dt.ten_dot AS ten_dot_tuyen,

          nd.ho_ten AS nguoi_duyet_ten,
          nd.ho_ten AS ten_nguoi_duyet

        FROM jd

        LEFT JOIN dot_tuyen dt
          ON jd.dot_tuyen_id = dt.id

        LEFT JOIN nguoi_dung nd
          ON jd.nguoi_duyet_id = nd.id

        WHERE jd.id = ?
        LIMIT 1
        `,
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy JD",
        });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error("GET /api/jd/:id:", error);

      res.status(500).json({
        message: "Không lấy được thông tin JD",
      });
    }
  },
);

// POST /api/jd - Thêm JD
router.post(
  "/",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const {
        dot_tuyen_id,
        tieu_de,
        mo_ta,
        yeu_cau,
        quyen_loi,
        tieu_chi,
      } = req.body;

      if (!dot_tuyen_id) {
        return res.status(400).json({
          message: "Vui lòng chọn đợt tuyển dụng",
        });
      }

      if (
        typeof tieu_de !== "string" ||
        !tieu_de.trim()
      ) {
        return res.status(400).json({
          message: "Vui lòng nhập tiêu đề JD",
        });
      }

      const [dotTuyen] = await db.query(
        `
        SELECT id
        FROM dot_tuyen
        WHERE id = ?
        LIMIT 1
        `,
        [dot_tuyen_id],
      );

      if (dotTuyen.length === 0) {
        return res.status(400).json({
          message: "Đợt tuyển dụng không tồn tại",
        });
      }

      let tieuChiJson = null;

      if (tieu_chi !== undefined && tieu_chi !== null) {
        if (
          typeof tieu_chi === "object"
        ) {
          tieuChiJson = JSON.stringify(tieu_chi);
        } else {
          tieuChiJson = tieu_chi;
        }
      }

      const [result] = await db.query(
        `
        INSERT INTO jd (
          dot_tuyen_id,
          tieu_de,
          mo_ta,
          yeu_cau,
          quyen_loi,
          trang_thai,
          tieu_chi
        )
        VALUES (?, ?, ?, ?, ?, 'nhap', ?)
        `,
        [
          Number(dot_tuyen_id),
          tieu_de.trim(),
          mo_ta || null,
          yeu_cau || null,
          quyen_loi || null,
          tieuChiJson,
        ],
      );

      res.status(201).json({
        message: "Thêm JD thành công",
        id: result.insertId,
      });
    } catch (error) {
      console.error("POST /api/jd:", error);

      res.status(500).json({
        message: "Không thêm được JD",
      });
    }
  },
);

async function layDotTuyenTheoId(id) {
  const [rows] = await db.query(
    "SELECT * FROM dot_tuyen WHERE id = ? LIMIT 1",
    [id],
  );

  return rows[0] || null;
}

function traLoiLoiAI(res, error, thongDiep) {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(thongDiep, error);

  res.status(500).json({ message: thongDiep });
}

// POST /api/jd/goi-y-tieu-chi - AI gợi ý tiêu chí từ đợt tuyển dụng
router.post(
  "/goi-y-tieu-chi",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const dotTuyenId = Number(req.body.dot_tuyen_id);

      if (!Number.isInteger(dotTuyenId) || dotTuyenId <= 0) {
        return res.status(400).json({
          message: "Vui lòng chọn đợt tuyển dụng",
        });
      }

      const dotTuyen = await layDotTuyenTheoId(dotTuyenId);

      if (!dotTuyen) {
        return res.status(404).json({
          message: "Đợt tuyển dụng không tồn tại",
        });
      }

      const tieuChi = await goiYTieuChi(dotTuyen, req.body.ghi_chu);

      res.json({ tieu_chi: tieuChi });
    } catch (error) {
      traLoiLoiAI(res, error, "Không gợi ý được tiêu chí");
    }
  },
);

// POST /api/jd/tao-tu-dot-tuyen - AI soạn JD nháp từ tiêu chí đã chốt
router.post(
  "/tao-tu-dot-tuyen",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const dotTuyenId = Number(req.body.dot_tuyen_id);

      if (!Number.isInteger(dotTuyenId) || dotTuyenId <= 0) {
        return res.status(400).json({
          message: "Vui lòng chọn đợt tuyển dụng",
        });
      }

      const tieuChi = lamSachTieuChi(req.body.tieu_chi);

      if (tieuChi.length === 0) {
        return res.status(400).json({
          message: "Vui lòng giữ ít nhất một tiêu chí",
        });
      }

      const dotTuyen = await layDotTuyenTheoId(dotTuyenId);

      if (!dotTuyen) {
        return res.status(404).json({
          message: "Đợt tuyển dụng không tồn tại",
        });
      }

      const noiDung = await taoNoiDungJD(
        dotTuyen,
        tieuChi,
        req.body.ghi_chu,
      );

      const [result] = await db.query(
        `
        INSERT INTO jd (
          dot_tuyen_id,
          tieu_de,
          mo_ta,
          yeu_cau,
          quyen_loi,
          trang_thai,
          tieu_chi
        )
        VALUES (?, ?, ?, ?, ?, 'nhap', ?)
        `,
        [
          dotTuyenId,
          noiDung.tieu_de,
          noiDung.mo_ta || null,
          noiDung.yeu_cau || null,
          noiDung.quyen_loi || null,
          JSON.stringify(tieuChi),
        ],
      );

      res.status(201).json({
        message: "Đã tạo JD nháp từ đợt tuyển dụng",
        id: result.insertId,
      });
    } catch (error) {
      traLoiLoiAI(res, error, "Không tạo được JD");
    }
  },
);

// PUT /api/jd/:id - Sửa JD
router.put(
  "/:id",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "ID JD không hợp lệ",
        });
      }

      const {
        dot_tuyen_id,
        tieu_de,
        mo_ta,
        yeu_cau,
        quyen_loi,
        tieu_chi,
      } = req.body;

      if (!dot_tuyen_id) {
        return res.status(400).json({
          message: "Vui lòng chọn đợt tuyển dụng",
        });
      }

      if (
        typeof tieu_de !== "string" ||
        !tieu_de.trim()
      ) {
        return res.status(400).json({
          message: "Vui lòng nhập tiêu đề JD",
        });
      }

      const [jd] = await db.query(
        `
        SELECT id, trang_thai
        FROM jd
        WHERE id = ?
        LIMIT 1
        `,
        [id],
      );

      if (jd.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy JD",
        });
      }

      if (
        layNguoiDung(req).vai_tro === "hr" &&
        !["nhap", "tu_choi"].includes(jd[0].trang_thai)
      ) {
        return res.status(403).json({
          message: "HR chỉ được sửa JD ở trạng thái Nháp hoặc Từ chối",
        });
      }

      const [dotTuyen] = await db.query(
        `
        SELECT id
        FROM dot_tuyen
        WHERE id = ?
        LIMIT 1
        `,
        [dot_tuyen_id],
      );

      if (dotTuyen.length === 0) {
        return res.status(400).json({
          message: "Đợt tuyển dụng không tồn tại",
        });
      }

      let tieuChiJson = null;

      if (tieu_chi !== undefined && tieu_chi !== null) {
        if (
          typeof tieu_chi === "object"
        ) {
          tieuChiJson = JSON.stringify(tieu_chi);
        } else {
          tieuChiJson = tieu_chi;
        }
      }

      await db.query(
        `
        UPDATE jd
        SET
          dot_tuyen_id = ?,
          tieu_de = ?,
          mo_ta = ?,
          yeu_cau = ?,
          quyen_loi = ?,
          tieu_chi = ?
        WHERE id = ?
        `,
        [
          Number(dot_tuyen_id),
          tieu_de.trim(),
          mo_ta || null,
          yeu_cau || null,
          quyen_loi || null,
          tieuChiJson,
          id,
        ],
      );

      res.json({
        message: "Cập nhật JD thành công",
      });
    } catch (error) {
      console.error("PUT /api/jd/:id:", error);

      res.status(500).json({
        message: "Không cập nhật được JD",
      });
    }
  },
);

// PUT /api/jd/:id/gui-duyet - Gửi JD để duyệt (từ Nháp hoặc Từ chối -> Chờ duyệt)
router.put(
  "/:id/gui-duyet",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);

      const [jd] = await db.query(
        `
        SELECT id, trang_thai
        FROM jd
        WHERE id = ?
        LIMIT 1
        `,
        [id],
      );

      if (jd.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy JD",
        });
      }

      if (
        !["nhap", "tu_choi"].includes(jd[0].trang_thai)
      ) {
        return res.status(400).json({
          message:
            "Chỉ JD ở trạng thái Nháp hoặc Từ chối mới được gửi duyệt",
        });
      }

      await db.query(
        `
        UPDATE jd
        SET
          trang_thai = 'cho_duyet',
          nguoi_duyet = NULL,
          nguoi_duyet_id = NULL,
          ngay_duyet = NULL
        WHERE id = ?
        `,
        [id],
      );

      res.json({
        message: "Đã gửi JD để duyệt",
      });
    } catch (error) {
      console.error(
        "PUT /api/jd/:id/gui-duyet:",
        error,
      );

      res.status(500).json({
        message: "Không thể gửi JD để duyệt",
      });
    }
  },
);

// PUT /api/jd/:id/duyet - Duyệt JD
router.put(
  "/:id/duyet",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);
      const nguoiDungId = layNguoiDungId(req);

      const [jd] = await db.query(
        `
        SELECT id, trang_thai
        FROM jd
        WHERE id = ?
        LIMIT 1
        `,
        [id],
      );

      if (jd.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy JD",
        });
      }

      if (jd[0].trang_thai !== "cho_duyet") {
        return res.status(400).json({
          message:
            "Chỉ JD đang chờ duyệt mới được duyệt",
        });
      }

      await db.query(
        `
        UPDATE jd
        SET
          trang_thai = 'da_duyet',
          nguoi_duyet_id = ?,
          nguoi_duyet = ?,
          ngay_duyet = NOW()
        WHERE id = ?
        `,
        [
          nguoiDungId,
          nguoiDungId,
          id,
        ],
      );

      res.json({
        message: "Duyệt JD thành công",
      });
    } catch (error) {
      console.error(
        "PUT /api/jd/:id/duyet:",
        error,
      );

      res.status(500).json({
        message: "Không thể duyệt JD",
      });
    }
  },
);

// PUT /api/jd/:id/tu-choi - Từ chối JD
router.put(
  "/:id/tu-choi",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);

      const [jd] = await db.query(
        `
        SELECT id, trang_thai
        FROM jd
        WHERE id = ?
        LIMIT 1
        `,
        [id],
      );

      if (jd.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy JD",
        });
      }

      if (jd[0].trang_thai !== "cho_duyet") {
        return res.status(400).json({
          message:
            "Chỉ JD đang chờ duyệt mới được từ chối",
        });
      }

      await db.query(
        `
        UPDATE jd
        SET
          trang_thai = 'tu_choi'
        WHERE id = ?
        `,
        [id],
      );

      res.json({
        message: "Đã từ chối JD",
      });
    } catch (error) {
      console.error(
        "PUT /api/jd/:id/tu-choi:",
        error,
      );

      res.status(500).json({
        message: "Không thể từ chối JD",
      });
    }
  },
);

// PUT /api/jd/:id/huy - Hủy JD
router.put(
  "/:id/huy",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);

      const [jd] = await db.query(
        `
        SELECT id, trang_thai
        FROM jd
        WHERE id = ?
        LIMIT 1
        `,
        [id],
      );

      if (jd.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy JD",
        });
      }

      if (
        ![
          "nhap",
          "cho_duyet",
          "da_duyet",
          "tu_choi",
        ].includes(jd[0].trang_thai)
      ) {
        return res.status(400).json({
          message: "JD không thể hủy ở trạng thái hiện tại",
        });
      }

      await db.query(
        `
        UPDATE jd
        SET
          trang_thai = 'huy'
        WHERE id = ?
        `,
        [id],
      );

      res.json({
        message: "Đã hủy JD",
      });
    } catch (error) {
      console.error(
        "PUT /api/jd/:id/huy:",
        error,
      );

      res.status(500).json({
        message: "Không thể hủy JD",
      });
    }
  },
);

// DELETE /api/jd/:id - Xóa JD
router.delete(
  "/:id",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "ID JD không hợp lệ",
        });
      }

      const [jd] = await db.query(
        `
        SELECT id
        FROM jd
        WHERE id = ?
        LIMIT 1
        `,
        [id],
      );

      if (jd.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy JD",
        });
      }

      await db.query(
        `
        DELETE FROM jd
        WHERE id = ?
        `,
        [id],
      );

      res.json({
        message: "Xóa JD thành công",
      });
    } catch (error) {
      console.error(
        "DELETE /api/jd/:id:",
        error,
      );

      res.status(500).json({
        message: "Không thể xóa JD",
      });
    }
  },
);

module.exports = router;