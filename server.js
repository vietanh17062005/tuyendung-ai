require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenAI, Type } = require("@google/genai");

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

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
].filter(function (value, index, array) {
  return value && array.indexOf(value) === index;
});

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

function laLoiTamThoi(error) {
  const status = Number(
    error?.status ||
    error?.code ||
    error?.response?.status ||
    0,
  );

  const message = String(
    error?.message ||
    error?.response?.data?.error?.message ||
    "",
  ).toUpperCase();

  return (
    status === 429 ||
    status === 503 ||
    message.includes("UNAVAILABLE") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("TOO MANY REQUESTS") ||
    message.includes("HIGH DEMAND")
  );
}

function layThongBaoLoi(error) {
  return (
    error?.message ||
    error?.response?.data?.error?.message ||
    "Không thể kết nối Gemini AI"
  );
}

async function cho(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function goiGemini(options) {
  let loiCuoi = null;

  for (
    let viTriModel = 0;
    viTriModel < GEMINI_MODELS.length;
    viTriModel++
  ) {
    const model = GEMINI_MODELS[viTriModel];

    for (let lanThu = 1; lanThu <= 3; lanThu++) {
      try {
        console.log(
          `Đang gọi Gemini model ${model}, lần thử ${lanThu}/3`,
        );

        const response = await ai.models.generateContent({
          ...options,
          model,
        });

        console.log(
          `Gemini trả kết quả thành công bằng ${model}`,
        );

        return response;
      } catch (error) {
        loiCuoi = error;

        console.error(
          `Gemini ${model} lỗi lần ${lanThu}/3:`,
          layThongBaoLoi(error),
        );

        if (!laLoiTamThoi(error)) {
          throw error;
        }

        if (lanThu < 3) {
          const thoiGianCho = lanThu * 2000;

          console.log(
            `Chờ ${thoiGianCho}ms rồi thử lại ${model}`,
          );

          await cho(thoiGianCho);
        }
      }
    }

    if (viTriModel < GEMINI_MODELS.length - 1) {
      console.warn(
        `${model} vẫn không khả dụng. Chuyển sang ${GEMINI_MODELS[viTriModel + 1]}`,
      );
    }
  }

  throw loiCuoi;
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
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          message:
            "Chưa cấu hình GEMINI_API_KEY trên máy chủ",
        });
      }

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

      const response = await goiGemini({
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
  async function (req, res) {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          message:
            "Chưa cấu hình GEMINI_API_KEY trên máy chủ",
        });
      }

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

      const response = await goiGemini({
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

app.get(
  "/api/dashboard",
  kiemTraDangNhap,
  async function (req, res) {
    try {
      const [dotTuyen] = await db.query(
        "SELECT COUNT(*) AS so_luong FROM dot_tuyen",
      );

      const [ungVien] = await db.query(
        "SELECT COUNT(*) AS so_luong FROM ung_vien",
      );

      const [phongVan] = await db.query(
        "SELECT COUNT(*) AS so_luong FROM phong_van",
      );

      const [daTuyen] = await db.query(`
        SELECT COUNT(*) AS so_luong
        FROM quyet_dinh
        WHERE ket_qua = 'hired'
      `);

      res.json({
        so_dot_tuyen: dotTuyen[0].so_luong,
        so_ung_vien: ungVien[0].so_luong,
        so_phong_van: phongVan[0].so_luong,
        so_da_tuyen: daTuyen[0].so_luong,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Khong lay duoc du lieu Dashboard",
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