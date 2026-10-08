require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { Type } = require("@google/genai");
const { goiAI } = require("./services/ai");

const db = require("./database/db");

const authRoutes = require("./routes/auth");
const dotTuyenRoutes = require("./routes/dotTuyen");
const jdRoutes = require("./routes/jd");
const ungVienRoutes = require("./routes/ungVien");
const taiKhoanRoutes = require("./routes/taiKhoan");
const cvRoutes = require("./routes/cv");

const {
  kiemTraDangNhap,
  kiemTraVaiTro,
} = require("./middleware/auth");

const app = express();

async function khoiTaoBangLichSuJD() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS jd_lich_su_ai (
      id INT NOT NULL AUTO_INCREMENT,
      jd_id INT NOT NULL,
      y_tuong TEXT NULL,
      hoi_dap JSON NULL,
      ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_jd_lich_su_ai_jd_id (jd_id),
      CONSTRAINT fk_jd_lich_su_ai_jd
        FOREIGN KEY (jd_id) REFERENCES jd (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

khoiTaoBangLichSuJD().catch(function (error) {
  console.error("Khởi tạo bảng lịch sử JD AI thất bại:", error);
});

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

function layThongBaoLoi(error) {
  return (
    error?.message ||
    error?.response?.data?.error?.message ||
    "Không thể kết nối Gemini AI"
  );
}

async function goiConfiguredAI(options) {
  const jsonMode = options.config?.responseMimeType === "application/json";
  const response = await goiAI(
    jsonMode
      ? "Bạn là trợ lý AI chuyên nghiệp cho tuyển dụng. Tuân thủ chính xác định dạng JSON được yêu cầu."
      : "Bạn là trợ lý AI chuyên nghiệp cho tuyển dụng. Trả lời ngắn gọn, rõ ràng và đúng ngữ cảnh.",
    String(options.contents || ""),
    8192,
    { jsonMode },
  );
  return { text: response.text, provider: response.provider };
}

function lamSachTieuChi(danhSach) {
  if (!Array.isArray(danhSach)) {
    return [];
  }

  return danhSach
    .map(function (item) {
      return {
        ten:
          typeof item?.ten === "string"
            ? item.ten.trim()
            : "",
        mo_ta:
          typeof item?.mo_ta === "string"
            ? item.mo_ta.trim()
            : "",
        trong_so: Math.max(
          0,
          Math.min(
            100,
            Number(item?.trong_so) || 0,
          ),
        ),
      };
    })
    .filter(function (item) {
      return item.ten;
    });
}

function chuanHoaTongTrongSo(danhSach) {
  if (!danhSach.length) {
    return [];
  }

  let tong = danhSach.reduce(function (sum, item) {
    return sum + item.trong_so;
  }, 0);

  if (tong === 100) {
    return danhSach;
  }

  if (tong <= 0) {
    const moi = Math.floor(100 / danhSach.length);
    const conLai = 100 - moi * danhSach.length;

    return danhSach.map(function (item, index) {
      return {
        ...item,
        trong_so: moi + (index < conLai ? 1 : 0),
      };
    });
  }

  const ketQua = danhSach.map(function (item) {
    return {
      ...item,
      trong_so: Math.floor(
        (item.trong_so / tong) * 100,
      ),
    };
  });

  let tongMoi = ketQua.reduce(function (sum, item) {
    return sum + item.trong_so;
  }, 0);

  let index = 0;

  while (tongMoi < 100) {
    ketQua[index % ketQua.length].trong_so += 1;
    tongMoi += 1;
    index += 1;
  }

  index = 0;

  while (tongMoi > 100) {
    const viTri = index % ketQua.length;

    if (ketQua[viTri].trong_so > 0) {
      ketQua[viTri].trong_so -= 1;
      tongMoi -= 1;
    }

    index += 1;
  }

  return ketQua;
}

app.get("/", function (req, res) {
  res.sendFile(
    path.join(__dirname, "public", "login", "login.html"),
  );
});

app.get("/api/test-db", async function (req, res) {
  try {
    const [rows] = await db.query(
      "SELECT 1 AS ket_noi",
    );

    res.json({
      message: "Ket noi MySQL thanh cong",
      data: rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Ket noi MySQL that bai",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/dot-tuyen", dotTuyenRoutes);
app.use("/api/jd", jdRoutes);
app.use("/api/ung-vien", ungVienRoutes);
app.use("/api/tai-khoan", taiKhoanRoutes);
app.use("/api/cv", cvRoutes);

app.post(
  "/api/ai/generate-jd",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const {
        ten_dot,
        mo_ta_dot,
        tieu_de,
        mo_ta,
        yeu_cau,
        quyen_loi,
        ghi_chu,
      } = req.body || {};

      const thongTin = `
THÔNG TIN ĐỢT TUYỂN DỤNG:
- Tên đợt tuyển dụng: ${ten_dot || "Chưa cung cấp"}
- Mô tả đợt tuyển dụng: ${mo_ta_dot || "Chưa cung cấp"}

THÔNG TIN JD HIỆN TẠI:
- Tiêu đề: ${tieu_de || "Chưa cung cấp"}
- Mô tả công việc: ${mo_ta || "Chưa cung cấp"}
- Yêu cầu: ${yeu_cau || "Chưa cung cấp"}
- Quyền lợi: ${quyen_loi || "Chưa cung cấp"}

GHI CHÚ:
${ghi_chu || "Không có"}
`;

      const prompt = `
Bạn là chuyên gia tuyển dụng và xây dựng Job Description tại Việt Nam.

Hãy xây dựng hoặc cải thiện JD dựa trên thông tin người dùng cung cấp.

${thongTin}

YÊU CẦU:
1. Nếu người dùng đã nhập nội dung thì ưu tiên giữ đúng ý và cải thiện cách trình bày.
2. Nếu nội dung còn thiếu thì đề xuất nội dung phù hợp với vị trí tuyển dụng.
3. Viết toàn bộ bằng tiếng Việt.
4. Nội dung phải chuyên nghiệp, thực tế và có thể sử dụng trong tuyển dụng.
5. Không tự bịa tên công ty, địa chỉ, mức lương hoặc thông tin không được cung cấp.
6. Không đưa tuổi, giới tính, ngoại hình, quê quán hoặc các yếu tố phân biệt đối xử vào tiêu chí tuyển dụng.
7. Tạo từ 3 đến 6 tiêu chí đánh giá.
8. Tổng trọng số của tất cả tiêu chí phải đúng 100%.
9. Trọng số phải là số nguyên từ 0 đến 100.
10. Các tiêu chí phải liên quan trực tiếp đến vị trí tuyển dụng.
11. Người dùng sẽ được phép sửa toàn bộ kết quả AI.

Mỗi tiêu chí gồm:
- ten
- mo_ta
- trong_so

Chỉ trả về JSON theo schema được cung cấp.
`;

      const response = await goiConfiguredAI({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tieu_de: {
                type: Type.STRING,
              },
              mo_ta: {
                type: Type.STRING,
              },
              yeu_cau: {
                type: Type.STRING,
              },
              quyen_loi: {
                type: Type.STRING,
              },
              tieu_chi: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ten: {
                      type: Type.STRING,
                    },
                    mo_ta: {
                      type: Type.STRING,
                    },
                    trong_so: {
                      type: Type.INTEGER,
                    },
                  },
                  required: [
                    "ten",
                    "mo_ta",
                    "trong_so",
                  ],
                },
              },
            },
            required: [
              "tieu_de",
              "mo_ta",
              "yeu_cau",
              "quyen_loi",
              "tieu_chi",
            ],
          },
        },
      });

      let ketQua;

      try {
        const text =
          typeof response?.text === "string"
            ? response.text
            : "";

        ketQua = JSON.parse(text);
      } catch (error) {
        console.error(
          "Gemini trả về JSON không hợp lệ:",
          response?.text,
        );

        return res.status(500).json({
          message:
            "AI trả về dữ liệu không đúng định dạng",
        });
      }

      ketQua.tieu_de =
        typeof ketQua.tieu_de === "string"
          ? ketQua.tieu_de.trim()
          : String(tieu_de || "").trim();

      ketQua.mo_ta =
        typeof ketQua.mo_ta === "string"
          ? ketQua.mo_ta.trim()
          : "";

      ketQua.yeu_cau =
        typeof ketQua.yeu_cau === "string"
          ? ketQua.yeu_cau.trim()
          : "";

      ketQua.quyen_loi =
        typeof ketQua.quyen_loi === "string"
          ? ketQua.quyen_loi.trim()
          : "";

      ketQua.tieu_chi = chuanHoaTongTrongSo(
        lamSachTieuChi(ketQua.tieu_chi),
      );

      const tong = ketQua.tieu_chi.reduce(
        function (sum, item) {
          return sum + item.trong_so;
        },
        0,
      );

      if (
        ketQua.tieu_chi.length > 0 &&
        tong !== 100
      ) {
        return res.status(500).json({
          message:
            "AI không tạo được tiêu chí có tổng trọng số bằng 100%",
        });
      }

      res.json({
        success: true,
        data: ketQua,
      });
    } catch (error) {
      console.error(
        "Lỗi tạo JD bằng Gemini:",
        error,
      );

      res.status(500).json({
        message:
          `Không thể sử dụng AI: ${layThongBaoLoi(error)}`,
      });
    }
  },
);

app.post(
  "/api/ai/screen-cv",
  kiemTraDangNhap,
  kiemTraVaiTro("admin", "manager", "hr"),
  async function (req, res) {
    try {
      const {
        cvText,
        jobDescription,
      } = req.body || {};

      if (!cvText || !jobDescription) {
        return res.status(400).json({
          message:
            "Vui lòng cung cấp cả cvText và jobDescription",
        });
      }

      const prompt = `
Bạn là một Chuyên viên Tuyển dụng AI.

Hãy phân tích CV của ứng viên và JD sau đây.

--- JD ---
${jobDescription}

--- CV ---
${cvText}

YÊU CẦU:
1. Đánh giá mức độ phù hợp của ứng viên với JD.
2. matchPercentage là số nguyên từ 0 đến 100.
3. strengths là danh sách các điểm mạnh phù hợp với JD.
4. weaknesses là danh sách các điểm còn thiếu hoặc chưa phù hợp.
5. summary là nhận xét tổng quan ngắn gọn.
6. recommendation chỉ được chọn một trong:
   - "Nên phỏng vấn"
   - "Cần xem xét thêm"
   - "Không phù hợp"

Trả về đúng JSON theo schema được cung cấp.
`;

      const response = await goiConfiguredAI({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchPercentage: {
                type: Type.INTEGER,
              },
              strengths: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
              weaknesses: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
              summary: {
                type: Type.STRING,
              },
              recommendation: {
                type: Type.STRING,
              },
            },
            required: [
              "matchPercentage",
              "strengths",
              "weaknesses",
              "summary",
              "recommendation",
            ],
          },
        },
      });

      let result;

      try {
        const text =
          typeof response?.text === "string"
            ? response.text
            : "";

        result = JSON.parse(text);
      } catch (error) {
        console.error(
          "Gemini trả về JSON không hợp lệ:",
          response?.text,
        );

        return res.status(500).json({
          message:
            "AI trả về kết quả phân tích không đúng định dạng",
        });
      }

      result.matchPercentage = Math.min(
        100,
        Math.max(
          0,
          Number(result.matchPercentage) || 0,
        ),
      );

      if (!Array.isArray(result.strengths)) {
        result.strengths = [];
      }

      if (!Array.isArray(result.weaknesses)) {
        result.weaknesses = [];
      }

      if (typeof result.summary !== "string") {
        result.summary = "";
      }

      if (
        typeof result.recommendation !== "string"
      ) {
        result.recommendation =
          "Cần xem xét thêm";
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error(
        "Lỗi phân tích CV bằng Gemini:",
        error,
      );

      res.status(500).json({
        message:
          `Không thể sử dụng AI: ${layThongBaoLoi(error)}`,
      });
    }
  },
);

app.post(
  "/api/ai/chat",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      const messages = req.body?.messages;
      if (
        !Array.isArray(messages) ||
        messages.length === 0 ||
        messages.length > 10 ||
        messages[messages.length - 1]?.role !== "user"
      ) {
        return res.status(400).json({
          message: "Vui lòng gửi tối đa 10 tin nhắn và kết thúc bằng câu hỏi.",
        });
      }

      const vaiTro = req.nguoiDung?.vai_tro;
      const nguoiDungId = Number(req.nguoiDung?.id);
      if (!["admin", "manager", "hr", "interviewer", "viewer"].includes(vaiTro)) {
        return res.status(403).json({
          message: "Vai trò tài khoản không được phép sử dụng trợ lý tuyển dụng.",
        });
      }

      const chiXemUngVienDuocPhanCong = vaiTro === "interviewer";
      if (chiXemUngVienDuocPhanCong && (!Number.isInteger(nguoiDungId) || nguoiDungId <= 0)) {
        return res.status(403).json({
          message: "Không xác định được tài khoản phỏng vấn để giới hạn dữ liệu.",
        });
      }

      let cotNguoiPhongVan = null;
      if (chiXemUngVienDuocPhanCong) {
        const [phongVanColumns] = await db.query("SHOW COLUMNS FROM phong_van");
        const names = new Set(phongVanColumns.map((column) => column.Field));
        cotNguoiPhongVan = ["nguoi_phong_van_id", "nguoi_phong_van"]
          .find((column) => names.has(column));
        if (!cotNguoiPhongVan) {
          throw new Error("Không xác định được cột người phỏng vấn được phân công.");
        }
      }

      const dieuKienUngVien = chiXemUngVienDuocPhanCong
        ? `EXISTS (
            SELECT 1
            FROM phong_van pv
            WHERE pv.ung_vien_id = uv.id AND pv.${cotNguoiPhongVan} = ?
          )`
        : "1 = 1";
      const thamSoUngVien = chiXemUngVienDuocPhanCong ? [nguoiDungId] : [];
      const [tongUngVienRows] = await db.query(
        `SELECT COUNT(*) AS so_luong FROM ung_vien uv WHERE ${dieuKienUngVien}`,
        thamSoUngVien,
      );
      const [ungVienTheoTrangThai] = await db.query(
        `SELECT uv.trang_thai, COUNT(*) AS so_luong
         FROM ung_vien uv
         WHERE ${dieuKienUngVien}
         GROUP BY uv.trang_thai`,
        thamSoUngVien,
      );

      const cotDotTuyen = await db.query("SHOW COLUMNS FROM dot_tuyen");
      const cacCotDotTuyen = cotDotTuyen[0].map((cot) => cot.Field);
      const cotTenDotTuyen = cacCotDotTuyen.includes("ten") ? "ten" : "ten_dot";
      const cotNgaySuaDotTuyen = cacCotDotTuyen.includes("ngay_cap_nhat")
        ? "ngay_cap_nhat"
        : cacCotDotTuyen.includes("ngay_sua")
          ? "ngay_sua"
          : "ngay_tao";
      const cotJD = await db.query("SHOW COLUMNS FROM jd");
      const cacCotJD = cotJD[0].map((cot) => cot.Field);
      const cotNgaySuaJD = cacCotJD.includes("ngay_cap_nhat")
        ? "ngay_cap_nhat"
        : cacCotJD.includes("ngay_sua")
          ? "ngay_sua"
          : "ngay_tao";
      const dieuKienViTriDuocGiao = chiXemUngVienDuocPhanCong
        ? `AND dt.id IN (
            SELECT DISTINCT uv.dot_tuyen_id
            FROM phong_van pv
            INNER JOIN ung_vien uv ON uv.id = pv.ung_vien_id
            WHERE pv.${cotNguoiPhongVan} = ?
          )`
        : "";
      const thamSoViTri = chiXemUngVienDuocPhanCong ? [nguoiDungId] : [];

      const [viTriDangTuyen] = await db.query(
        `SELECT jd.tieu_de, jd.mo_ta, jd.yeu_cau, jd.tieu_chi,
                dt.${cotTenDotTuyen} AS ten_dot_tuyen,
                jd.trang_thai AS trang_thai_jd,
                jd.${cotNgaySuaJD} AS ngay_cap_nhat
         FROM jd
         INNER JOIN dot_tuyen dt ON dt.id = jd.dot_tuyen_id
         WHERE dt.trang_thai = 'dang_tuyen' AND jd.trang_thai = 'da_duyet'
           ${dieuKienViTriDuocGiao}
         ORDER BY jd.${cotNgaySuaJD} DESC
         LIMIT 12`,
        thamSoViTri,
      );
      const [dotTuyenDangMo] = await db.query(
        `SELECT dt.${cotTenDotTuyen} AS ten_dot_tuyen, COUNT(jd.id) AS so_vi_tri
         FROM dot_tuyen dt
         LEFT JOIN jd ON jd.dot_tuyen_id = dt.id AND jd.trang_thai = 'da_duyet'
         WHERE dt.trang_thai = 'dang_tuyen'
           ${dieuKienViTriDuocGiao}
         GROUP BY dt.id, dt.${cotTenDotTuyen}
         ORDER BY MAX(dt.${cotNgaySuaDotTuyen}) DESC
         LIMIT 12`,
        thamSoViTri,
      );
      const duLieuHeThong = {
        phamViUngVien:
          chiXemUngVienDuocPhanCong
            ? "Chỉ ứng viên có lịch phỏng vấn được giao cho interviewer đang đăng nhập."
            : "Tổng số liệu ứng viên trong hệ thống.",
        tongUngVien: Number(tongUngVienRows[0]?.so_luong) || 0,
        ungVienTheoTrangThai: ungVienTheoTrangThai.map((dong) => ({
          trangThai: dong.trang_thai,
          soLuong: Number(dong.so_luong) || 0,
        })),
        chienDichDangMo: dotTuyenDangMo,
        viTriDangTuyen: viTriDangTuyen.map((viTri) => ({
          chienDich: viTri.ten_dot_tuyen,
          tieuDe: String(viTri.tieu_de || "").slice(0, 300),
          moTa: String(viTri.mo_ta || "").slice(0, 800),
          yeuCau: String(viTri.yeu_cau || "").slice(0, 800),
          tieuChi:
            typeof viTri.tieu_chi === "string"
              ? viTri.tieu_chi.slice(0, 800)
              : JSON.stringify(viTri.tieu_chi || []).slice(0, 800),
        })),
      };

      const hopThoai = [];
      for (const message of messages) {
        const role = message?.role;
        const text = typeof message?.text === "string" ? message.text.trim() : "";
        if (!["user", "assistant"].includes(role) || !text || text.length > 2000) {
          return res.status(400).json({
            message: "Tin nhắn không hợp lệ hoặc vượt quá 2.000 ký tự.",
          });
        }
        hopThoai.push(`${role === "user" ? "Người dùng" : "Trợ lý"}: ${text}`);
      }

      const cauHoiCuoi = messages[messages.length - 1].text.trim();
      const cauHoiChuanHoa = cauHoiCuoi
        .toLocaleLowerCase("vi")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/đ/g, "d");
      const laCauHoiDemUngVien =
        /\b(bao nhieu|tong so|so luong|dem)\b/.test(cauHoiChuanHoa) &&
        /\b(ung vien|ho so)\b/.test(cauHoiChuanHoa);

      if (laCauHoiDemUngVien) {
        const dieuKienDem = [];
        const thamSoDem = [...thamSoUngVien];
        if (/\b(tuan nay|trong tuan|tuan)\b/.test(cauHoiChuanHoa)) {
          dieuKienDem.push(
            "uv.ngay_tao >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
          );
        } else if (/\b(thang nay|trong thang|thang)\b/.test(cauHoiChuanHoa)) {
          dieuKienDem.push("uv.ngay_tao >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
        }

        const trangThaiDem = [
          { tuKhoa: ["da tuyen", "trung tuyen"], giaTri: "da_tuyen", nhan: "đã tuyển" },
          { tuKhoa: ["offer", "da gui de nghi"], giaTri: "offer", nhan: "đã gửi đề nghị (Offer)" },
          { tuKhoa: ["da phong van", "phong van"], giaTri: "da_phong_van", nhan: "đã phỏng vấn" },
          { tuKhoa: ["da phan tich"], giaTri: "da_phan_tich", nhan: "đã phân tích" },
          { tuKhoa: ["da lien he"], giaTri: "da_lien_he", nhan: "đã liên hệ" },
          { tuKhoa: ["da xep lich"], giaTri: "da_xep_lich", nhan: "đã xếp lịch" },
          { tuKhoa: ["tu choi", "khong phu hop"], giaTri: "tu_choi", nhan: "bị từ chối/không phù hợp" },
          { tuKhoa: ["moi tiep nhan", "trang thai moi"], giaTri: "moi", nhan: "mới tiếp nhận" },
        ].find((trangThai) =>
          trangThai.tuKhoa.some((tuKhoa) => cauHoiChuanHoa.includes(tuKhoa)),
        );

        if (trangThaiDem) {
          dieuKienDem.push("uv.trang_thai = ?");
          thamSoDem.push(trangThaiDem.giaTri);
        }

        const [ketQuaDem] = await db.query(
          `SELECT COUNT(*) AS so_luong
           FROM ung_vien uv
           WHERE ${dieuKienUngVien}
             ${dieuKienDem.length ? `AND ${dieuKienDem.join(" AND ")}` : ""}`,
          thamSoDem,
        );
        const khoangThoiGian = dieuKienDem.some((dieuKien) => dieuKien.includes("WEEKDAY"))
          ? "trong tuần này"
          : dieuKienDem.some((dieuKien) => dieuKien.includes("DATE_FORMAT"))
            ? "trong tháng này"
            : "tính đến hiện tại";
        const nhanTrangThai = trangThaiDem ? ` ${trangThaiDem.nhan}` : "";
        const phamVi = chiXemUngVienDuocPhanCong
          ? "trong số ứng viên được phân công phỏng vấn cho bạn"
          : "trong hệ thống";

        return res.json({
          reply: `Theo dữ liệu hệ thống, có ${Number(ketQuaDem[0]?.so_luong) || 0} ứng viên${nhanTrangThai} ${phamVi} ${khoangThoiGian}.`,
        });
      }

      const response = await goiConfiguredAI({
        contents: `
Bạn là trợ lý AI hỗ trợ tuyển dụng tại Việt Nam.
Là trợ lý tuyển dụng cho doanh nghiệp. Trả lời bằng tiếng Việt tự nhiên, súc tích (thường 2-5 câu), đi thẳng vào câu hỏi.
Ưu tiên sự chính xác hơn việc cố trả lời: không bịa số liệu, vị trí tuyển, yêu cầu hoặc tiêu chí không có trong ngữ cảnh hệ thống. Nếu thiếu dữ liệu, nói rõ đang thiếu gì.
Với câu hỏi về số liệu ứng viên, trạng thái ứng viên, chiến dịch hoặc vị trí đang tuyển, chỉ dùng dữ liệu trong ngữ cảnh hệ thống; nếu dữ liệu không có thì nói không tìm thấy.
Khi được hỏi kỹ năng của người dùng phù hợp công việc nào, chỉ so sánh với các vị trí đang tuyển trong ngữ cảnh. Nêu tối đa 3 vị trí theo mức phù hợp, mỗi vị trí gồm lý do khớp và 1-2 kỹ năng còn thiếu nếu có. Không tự tạo điểm phần trăm hoặc vị trí không có trong danh sách.
Khi được hỏi tiêu chí tuyển dụng, dùng tiêu chí/yêu cầu đã lưu trong JD nếu có. Nếu người dùng muốn gợi ý thêm, ghi rõ đó là đề xuất của AI, không phải dữ liệu trong JD.
Nếu câu hỏi mơ hồ, hỏi lại một câu ngắn thay vì suy diễn. Không tiết lộ dữ liệu nhận dạng cá nhân ứng viên. Với Interviewer, chỉ dùng phạm vi đã được giới hạn ở ngữ cảnh.

NGỮ CẢNH HỆ THỐNG (dữ liệu hiện tại từ cơ sở dữ liệu):
${JSON.stringify(duLieuHeThong)}

HỘI THOẠI:
${hopThoai.join("\n")}

Trợ lý:
`,
        config: {
          temperature: 0.2,
        },
      });
      const reply = typeof response?.text === "string" ? response.text.trim() : "";
      if (!reply) {
        return res.status(502).json({
          message: "AI chưa trả về câu trả lời. Vui lòng thử lại.",
        });
      }

      res.json({ reply, provider: response.provider });
    } catch (error) {
      console.error("Lỗi chatbot AI:", error);
      res.status(500).json({
        message: `Không thể sử dụng AI: ${layThongBaoLoi(error)}`,
      });
    }
  },
);

app.get(
  "/api/dashboard",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      const khoangThoiGianUngVien = {
        all: "",
        week: " AND ngay_tao >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
        month: " AND ngay_tao >= DATE_FORMAT(CURDATE(), '%Y-%m-01')",
      };
      const kyHieuThoiGian = req.query.period || "all";
      if (!Object.hasOwn(khoangThoiGianUngVien, kyHieuThoiGian)) {
        return res.status(400).json({
          message: "Khoảng thời gian lọc ứng viên không hợp lệ.",
        });
      }
      const dieuKienNgayTao = khoangThoiGianUngVien[kyHieuThoiGian];

      const [dotTuyen] = await db.query(
        "SELECT COUNT(*) AS so_luong FROM dot_tuyen",
      );

      const [ungVien] = await db.query(
        `SELECT COUNT(*) AS so_luong FROM ung_vien WHERE 1 = 1${dieuKienNgayTao}`,
      );

      const [dotDangTuyen] = await db.query(
        "SELECT COUNT(*) AS so_luong FROM dot_tuyen WHERE trang_thai = 'dang_tuyen'",
      );

      const [cotPhongVan] = await db.query("SHOW COLUMNS FROM phong_van");
      const truongPhongVan = cotPhongVan.map((cot) => cot.Field);
      const truongThoiGianPV = truongPhongVan.includes("bat_dau")
        ? "bat_dau"
        : "thoi_gian";
      const truongNguoiPhongVan = truongPhongVan.includes("nguoi_phong_van")
        ? "nguoi_phong_van"
        : "nguoi_phong_van_id";

      const [phongVan] = await db.query(
        `SELECT COUNT(*) AS so_luong
         FROM phong_van
         WHERE ${truongThoiGianPV} >= NOW()
           AND trang_thai NOT IN ('huy', 'da_huy', 'cancelled')`,
      );

      const [daTuyen] = await db.query(`
        SELECT COUNT(*) AS so_luong
        FROM ung_vien
        WHERE trang_thai = 'da_tuyen'${dieuKienNgayTao}
      `);

      const [trangThaiUngVien] = await db.query(`
        SELECT trang_thai, COUNT(*) AS so_luong
        FROM ung_vien
        WHERE 1 = 1${dieuKienNgayTao}
        GROUP BY trang_thai
      `);

      const [phongVanSapToi] = await db.query(`
        SELECT pv.id, pv.${truongThoiGianPV} AS bat_dau, pv.hinh_thuc, pv.dia_diem,
               uv.ho_ten AS ten_ung_vien, nd.ho_ten AS ten_nguoi_phong_van
        FROM phong_van pv
        JOIN ung_vien uv ON uv.id = pv.ung_vien_id
        LEFT JOIN nguoi_dung nd ON nd.id = pv.${truongNguoiPhongVan}
        WHERE pv.${truongThoiGianPV} >= NOW()
          AND pv.trang_thai NOT IN ('huy', 'da_huy', 'cancelled')
        ORDER BY pv.${truongThoiGianPV} ASC
        LIMIT 5
      `);

      const [ungVienMoi] = await db.query(`
        SELECT id, ho_ten, trang_thai, ngay_tao
        FROM ung_vien
        WHERE 1 = 1${dieuKienNgayTao}
        ORDER BY ngay_tao DESC, id DESC
        LIMIT 4
      `);

      const [cotUngVien] = await db.query("SHOW COLUMNS FROM ung_vien");
      const truongNgaySua = cotUngVien.some((cot) => cot.Field === "ngay_cap_nhat")
        ? "ngay_cap_nhat"
        : cotUngVien.some((cot) => cot.Field === "ngay_sua")
          ? "ngay_sua"
          : null;
      const cotNgaySua = truongNgaySua ? `uv.${truongNgaySua}` : "uv.ngay_tao";
      const dieuKienNgaySua = truongNgaySua
        ? ` OR ${cotNgaySua} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
        : "";

      const [thongBao] = await db.query(`
        SELECT uv.id, uv.ho_ten,
               CASE
                 WHEN ${cotNgaySua} IS NOT NULL AND ${cotNgaySua} > uv.ngay_tao THEN 'updated'
                 ELSE 'added'
               END AS loai,
               GREATEST(uv.ngay_tao, COALESCE(${cotNgaySua}, uv.ngay_tao)) AS thoi_gian
        FROM ung_vien AS uv
        WHERE uv.ngay_tao >= DATE_SUB(NOW(), INTERVAL 7 DAY)${dieuKienNgaySua}
        ORDER BY thoi_gian DESC, id DESC
        LIMIT 8
      `);

      res.json({
        so_dot_tuyen: dotTuyen[0].so_luong,
        so_dot_dang_tuyen: dotDangTuyen[0].so_luong,
        so_ung_vien: ungVien[0].so_luong,
        so_phong_van: phongVan[0].so_luong,
        so_da_tuyen: daTuyen[0].so_luong,
        ung_vien_theo_trang_thai: trangThaiUngVien,
        phong_van_sap_toi: phongVanSapToi,
        ung_vien_moi: ungVienMoi,
        thong_bao: thongBao,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Không thể lấy dữ liệu tổng quan.",
      });
    }
  },
);

app.get(
  "/api/test-login",
  kiemTraDangNhap,
  function (req, res) {
    res.json({
      message: "Ban da dang nhap",
      nguoi_dung: req.nguoiDung,
    });
  },
);

app.get(
  "/api/test-manager",
  kiemTraDangNhap,
  kiemTraVaiTro("manager"),
  function (req, res) {
    res.json({
      message: "Ban co quyen Manager",
    });
  },
);

app.use("/api", function (req, res) {
  res.status(404).json({
    message: `Không tìm thấy API ${req.method} ${req.originalUrl}. Hãy kiểm tra phiên bản máy chủ đang chạy.`,
  });
});

app.use(function (error, req, res, next) {
  console.error(error);

  res.status(500).json({
    message: "Loi may chu",
  });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(
    process.env.PORT || 3000,
    function () {
      console.log(
        `Server dang chay tai http://localhost:${process.env.PORT || 3000}`,
      );
    },
  );
}

module.exports = app;