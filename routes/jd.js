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
  return req.nguoiDung || {};
}

function layNguoiDungId(req) {
  return layNguoiDung(req).id || null;
}

function kiemTraTieuChi(tieuChi) {
  const danhSach = lamSachTieuChi(tieuChi);

  if (!danhSach.length) {
    return {
      hopLe: true,
      danhSach: [],
      tong: 0,
    };
  }

  for (const item of danhSach) {
    if (
      item.trong_so < 0 ||
      item.trong_so > 100
    ) {
      return {
        hopLe: false,
        message:
          `Trọng số của tiêu chí "${item.ten}" phải từ 0 đến 100%`,
      };
    }
  }

  const tong = danhSach.reduce(function (sum, item) {
    return sum + item.trong_so;
  }, 0);

  if (tong > 100) {
    return {
      hopLe: false,
      message:
        `Tổng trọng số là ${tong}%, không được vượt quá 100%`,
    };
  }

  return {
    hopLe: true,
    danhSach,
    tong,
  };
}

function layTieuChiJSON(tieuChi) {
  const ketQua = kiemTraTieuChi(tieuChi);

  if (!ketQua.hopLe) {
    return ketQua;
  }

  return {
    ...ketQua,
    json: JSON.stringify(
      ketQua.danhSach,
    ),
  };
}

function traLoiLoiAI(res, error, thongDiep) {
  if (error.status) {
    return res.status(error.status).json({
      message: error.message,
    });
  }

  console.error(thongDiep, error);

  return res.status(500).json({
    message: thongDiep,
  });
}

// GET danh sách JD
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

      rows.forEach(function (row) {
        if (typeof row.tieu_chi === "string") {
          try {
            row.tieu_chi = JSON.parse(row.tieu_chi);
          } catch (error) {
            row.tieu_chi = [];
          }
        }
      });

      res.json(rows);
    } catch (error) {
      console.error("GET /api/jd:", error);

      res.status(500).json({
        message: "Không lấy được danh sách JD",
      });
    }
  },
);

// GET chi tiết JD
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

      if (!rows.length) {
        return res.status(404).json({
          message: "Không tìm thấy JD",
        });
      }

      const row = rows[0];

      if (typeof row.tieu_chi === "string") {
        try {
          row.tieu_chi = JSON.parse(row.tieu_chi);
        } catch (error) {
          row.tieu_chi = [];
        }
      }

      res.json(row);
    } catch (error) {
      console.error("GET /api/jd/:id:", error);

      res.status(500).json({
        message: "Không lấy được thông tin JD",
      });
    }
  },
);

// POST JD độc lập
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

      const kiemTra = layTieuChiJSON(tieu_chi);

      if (!kiemTra.hopLe) {
        return res.status(400).json({
          message: kiemTra.message,
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

      if (!dotTuyen.length) {
        return res.status(400).json({
          message: "Đợt tuyển dụng không tồn tại",
        });
      }

      const [result] = await db.query(
        `
        INSERT INTO jd
        (
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
          kiemTra.json,
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
    `
    SELECT *
    FROM dot_tuyen
    WHERE id = ?
    LIMIT 1
    `,
    [id],
  );

  return rows[0] || null;
}

// AI gợi ý tiêu chí
router.post(
  "/goi-y-tieu-chi",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const dotTuyenId = Number(
        req.body.dot_tuyen_id,
      );

      if (
        !Number.isInteger(dotTuyenId) ||
        dotTuyenId <= 0
      ) {
        return res.status(400).json({
          message:
            "Vui lòng chọn đợt tuyển dụng",
        });
      }

      const dotTuyen =
        await layDotTuyenTheoId(dotTuyenId);

      if (!dotTuyen) {
        return res.status(404).json({
          message:
            "Đợt tuyển dụng không tồn tại",
        });
      }

      const tieuChi = await goiYTieuChi(
        dotTuyen,
        req.body.ghi_chu,
      );

      res.json({
        tieu_chi: tieuChi,
      });
    } catch (error) {
      traLoiLoiAI(
        res,
        error,
        "Không gợi ý được tiêu chí",
      );
    }
  },
);

// AI tạo JD từ đợt tuyển dụng
router.post(
  "/tao-tu-dot-tuyen",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const dotTuyenId = Number(
        req.body.dot_tuyen_id,
      );

      if (
        !Number.isInteger(dotTuyenId) ||
        dotTuyenId <= 0
      ) {
        return res.status(400).json({
          message:
            "Vui lòng chọn đợt tuyển dụng",
        });
      }

      const tieuChi =
        lamSachTieuChi(
          req.body.tieu_chi,
        );

      const kiemTra =
        layTieuChiJSON(tieuChi);

      if (!kiemTra.hopLe) {
        return res.status(400).json({
          message: kiemTra.message,
        });
      }

      if (!tieuChi.length) {
        return res.status(400).json({
          message:
            "Vui lòng giữ ít nhất một tiêu chí",
        });
      }

      const dotTuyen =
        await layDotTuyenTheoId(dotTuyenId);

      if (!dotTuyen) {
        return res.status(404).json({
          message:
            "Đợt tuyển dụng không tồn tại",
        });
      }

      const noiDung =
        await taoNoiDungJD(
          dotTuyen,
          tieuChi,
          req.body.ghi_chu,
        );

      const [result] = await db.query(
        `
        INSERT INTO jd
        (
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
        message:
          "Đã tạo JD nháp từ đợt tuyển dụng",
        id: result.insertId,
      });
    } catch (error) {
      traLoiLoiAI(
        res,
        error,
        "Không tạo được JD",
      );
    }
  },
);

// PUT sửa JD
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
          message:
            "Vui lòng chọn đợt tuyển dụng",
        });
      }

      if (
        typeof tieu_de !== "string" ||
        !tieu_de.trim()
      ) {
        return res.status(400).json({
          message:
            "Vui lòng nhập tiêu đề JD",
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

      if (!jd.length) {
        return res.status(404).json({
          message: "Không tìm thấy JD",
        });
      }

      if (
        layNguoiDung(req).vai_tro === "hr" &&
        !["nhap", "tu_choi"].includes(
          jd[0].trang_thai,
        )
      ) {
        return res.status(403).json({
          message:
            "HR chỉ được sửa JD ở trạng thái Nháp hoặc Từ chối",
        });
      }

      if (jd[0].trang_thai === "huy") {
        return res.status(400).json({
          message:
            "JD đã hủy nên không thể sửa",
        });
      }

      const kiemTra =
        layTieuChiJSON(tieu_chi);

      if (!kiemTra.hopLe) {
        return res.status(400).json({
          message: kiemTra.message,
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

      if (!dotTuyen.length) {
        return res.status(400).json({
          message:
            "Đợt tuyển dụng không tồn tại",
        });
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
          kiemTra.json,
          id,
        ],
      );

      res.json({
        message:
          "Cập nhật JD thành công",
      });
    } catch (error) {
      console.error(
        "PUT /api/jd/:id:",
        error,
      );

      res.status(500).json({
        message:
          "Không cập nhật được JD",
      });
    }
  },
);

// Gửi duyệt
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

      if (!jd.length) {
        return res.status(404).json({
          message:
            "Không tìm thấy JD",
        });
      }

      if (
        !["nhap", "tu_choi"].includes(
          jd[0].trang_thai,
        )
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
        message:
          "Đã gửi JD để duyệt",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Không thể gửi JD để duyệt",
      });
    }
  },
);

// Duyệt
router.put(
  "/:id/duyet",
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

      if (!jd.length) {
        return res.status(404).json({
          message:
            "Không tìm thấy JD",
        });
      }

      if (
        jd[0].trang_thai !== "cho_duyet"
      ) {
        return res.status(400).json({
          message:
            "Chỉ JD đang chờ duyệt mới được duyệt",
        });
      }

      const nguoiDungId =
        layNguoiDungId(req);

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
        message:
          "Duyệt JD thành công",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Không thể duyệt JD",
      });
    }
  },
);

// Từ chối
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

      if (!jd.length) {
        return res.status(404).json({
          message:
            "Không tìm thấy JD",
        });
      }

      if (
        jd[0].trang_thai !== "cho_duyet"
      ) {
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
        message:
          "Đã từ chối JD",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Không thể từ chối JD",
      });
    }
  },
);

// Hủy
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

      if (!jd.length) {
        return res.status(404).json({
          message:
            "Không tìm thấy JD",
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
          message:
            "JD không thể hủy ở trạng thái hiện tại",
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
        message:
          "Đã hủy JD",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Không thể hủy JD",
      });
    }
  },
);

// Xóa JD
router.delete(
  "/:id",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager"),
  async function (req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message:
            "ID JD không hợp lệ",
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

      if (!jd.length) {
        return res.status(404).json({
          message:
            "Không tìm thấy JD",
        });
      }

      if (
        !["nhap", "tu_choi", "huy"].includes(
          jd[0].trang_thai,
        )
      ) {
        return res.status(400).json({
          message:
            "Chỉ JD Nháp, Từ chối hoặc Đã hủy mới được xóa",
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
        message:
          "Xóa JD thành công",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Không thể xóa JD",
      });
    }
  },
);

module.exports = router;