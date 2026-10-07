const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const model =
    process.env.GEMINI_MODEL || "gemini-3.5-flash";

const schemaJD = {
    type: "object",
    properties: {
        tieu_de: {
            type: "string",
        },
        mo_ta: {
            type: "string",
        },
        yeu_cau: {
            type: "string",
        },
        quyen_loi: {
            type: "string",
        },
        tieu_chi: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    ten: {
                        type: "string",
                    },
                    mo_ta: {
                        type: "string",
                    },
                    trong_so: {
                        type: "integer",
                        minimum: 0,
                        maximum: 100,
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
};

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
        return danhSach;
    }

    let tong = danhSach.reduce(function (sum, item) {
        return sum + item.trong_so;
    }, 0);

    if (tong === 100) {
        return danhSach;
    }

    if (tong <= 0) {
        const moi = Math.floor(100 / danhSach.length);
        let conLai = 100 - moi * danhSach.length;

        return danhSach.map(function (item, index) {
            const them = index < conLai ? 1 : 0;

            return {
                ...item,
                trong_so: moi + them,
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

async function goiYJD(duLieu) {
    if (!process.env.GEMINI_API_KEY) {
        const error = new Error(
            "Chưa cấu hình GEMINI_API_KEY",
        );

        error.status = 500;

        throw error;
    }

    const prompt = `
Bạn là chuyên gia tuyển dụng và xây dựng Job Description.

Hãy tạo một JD hoàn chỉnh bằng tiếng Việt dựa trên thông tin người dùng cung cấp.

THÔNG TIN ĐỢT TUYỂN DỤNG:
- Tên đợt: ${duLieu.ten_dot || "Chưa cung cấp"}
- Mô tả đợt: ${duLieu.mo_ta_dot || "Chưa cung cấp"}

THÔNG TIN JD NGƯỜI DÙNG ĐÃ NHẬP:
- Tiêu đề: ${duLieu.tieu_de || "Chưa cung cấp"}
- Mô tả công việc: ${duLieu.mo_ta || "Chưa cung cấp"}
- Yêu cầu: ${duLieu.yeu_cau || "Chưa cung cấp"}
- Quyền lợi: ${duLieu.quyen_loi || "Chưa cung cấp"}

GHI CHÚ THÊM:
${duLieu.ghi_chu || "Không có"}

YÊU CẦU:
1. Viết JD thực tế, chuyên nghiệp, dễ sử dụng trong tuyển dụng.
2. Nếu người dùng đã nhập nội dung thì ưu tiên giữ đúng ý người dùng.
3. Không tự bịa tên công ty, địa chỉ, mức lương hoặc thông tin không được cung cấp.
4. Tiêu chí đánh giá phải liên quan trực tiếp tới vị trí tuyển dụng.
5. Tạo từ 3 đến 6 tiêu chí.
6. Tổng trọng số các tiêu chí phải đúng 100%.
7. Trọng số phải là số nguyên từ 0 đến 100.
8. Nội dung phải bằng tiếng Việt.
9. Người dùng sẽ được phép sửa toàn bộ kết quả AI sau khi nhận.

Chỉ trả về JSON theo schema đã cung cấp.
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schemaJD,
            },
        });

        const text =
            typeof response.text === "string"
                ? response.text
                : "";

        if (!text) {
            const error = new Error(
                "Gemini không trả về dữ liệu",
            );

            error.status = 502;

            throw error;
        }

        const result = JSON.parse(text);

        result.tieu_de =
            typeof result.tieu_de === "string"
                ? result.tieu_de.trim()
                : duLieu.tieu_de || "";

        result.mo_ta =
            typeof result.mo_ta === "string"
                ? result.mo_ta.trim()
                : "";

        result.yeu_cau =
            typeof result.yeu_cau === "string"
                ? result.yeu_cau.trim()
                : "";

        result.quyen_loi =
            typeof result.quyen_loi === "string"
                ? result.quyen_loi.trim()
                : "";

        result.tieu_chi = chuanHoaTongTrongSo(
            lamSachTieuChi(result.tieu_chi),
        );

        return result;
    } catch (error) {
        console.error("Gemini error:", error);

        if (error.status) {
            throw error;
        }

        const loi = new Error(
            "Không thể kết nối hoặc xử lý kết quả từ Gemini",
        );

        loi.status = 502;

        throw loi;
    }
}

async function taoNoiDungJD(
    dotTuyen,
    tieuChi,
    ghiChu,
) {
    const ketQua = await goiYJD({
        ten_dot: dotTuyen?.ten_dot,
        mo_ta_dot: dotTuyen?.mo_ta,
        ghi_chu: ghiChu,
        tieu_de: "",
        mo_ta: "",
        yeu_cau: "",
        quyen_loi: "",
    });

    return {
        ...ketQua,
        tieu_chi: lamSachTieuChi(tieuChi),
    };
}

async function goiYTieuChi(
    dotTuyen,
    ghiChu,
) {
    const ketQua = await goiYJD({
        ten_dot: dotTuyen?.ten_dot,
        mo_ta_dot: dotTuyen?.mo_ta,
        ghi_chu: ghiChu,
    });

    return ketQua.tieu_chi;
}

module.exports = {
    goiYJD,
    goiYTieuChi,
    taoNoiDungJD,
    lamSachTieuChi,
};