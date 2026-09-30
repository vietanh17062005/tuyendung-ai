const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login/login.html";
}

const danhSachJD = document.getElementById("danhSachJD");
const tongSo = document.getElementById("tongSo");
const oTimKiem = document.getElementById("oTimKiem");
const locTrangThai = document.getElementById("locTrangThai");
const modal = document.getElementById("modal");
const formJD = document.getElementById("formJD");
const dotTuyenId = document.getElementById("dotTuyenId");
const thongBao = document.getElementById("thongBao");

const modalXacNhan = document.getElementById("modalXacNhan");
const tieuDeXacNhan = document.getElementById("tieuDeXacNhan");
const noiDungXacNhan = document.getElementById("noiDungXacNhan");
const btnXacNhan = document.getElementById("btnXacNhan");
const btnHuyXacNhan = document.getElementById("btnHuyXacNhan");

const nguoiDung = JSON.parse(
    localStorage.getItem("nguoiDung") || "{}"
);

let hanhDongXacNhan = null;
let tatCaJD = [];

// Kiểm tra quyền duyệt
function coQuyenDuyet() {
    return (
        nguoiDung.vai_tro === "admin" ||
        nguoiDung.vai_tro === "manager"
    );
}

// Lấy danh sách đợt tuyển dụng
async function layDotTuyen() {
    try {
        const response = await fetch("/api/dot-tuyen", {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        if (!response.ok) {
            throw new Error("Không lấy được đợt tuyển dụng");
        }

        const data = await response.json();

        dotTuyenId.innerHTML = `
            <option value="">
                -- Chọn đợt tuyển dụng --
            </option>
        `;

        data.forEach(function (dotTuyen) {
            const option = document.createElement("option");

            option.value = dotTuyen.id;
            option.textContent = dotTuyen.ten;

            dotTuyenId.appendChild(option);
        });

    } catch (error) {
        console.error(error);

        hienThongBao(
            "Không lấy được danh sách đợt tuyển dụng",
            "loi"
        );
    }
}

function renderJD(data) {
    if (tongSo) {
        tongSo.textContent = `${data.length} JD`;
    }

    danhSachJD.innerHTML = "";

    if (data.length === 0) {
        danhSachJD.innerHTML = `
            <tr>
                <td colspan="7">
                    Không tìm thấy JD nào
                </td>
            </tr>
        `;

        return;
    }

    data.forEach(function (jd) {
        const tr = document.createElement("tr");

        let nutSua = "";

        if (jd.trang_thai !== "da_duyet") {
            nutSua = `
                <button
                    class="btn-sua"
                    onclick="suaJD(${jd.id})"
                >
                    Sửa
                </button>
            `;
        }

        let nutGuiDuyet = "";

        if (jd.trang_thai === "nhap") {
            nutGuiDuyet = `
                <button
                    class="btn-gui"
                    onclick="guiDuyetJD(${jd.id})"
                >
                    Gửi duyệt
                </button>
            `;
        }

        let nutDuyet = "";

        if (
            jd.trang_thai === "cho_duyet" &&
            coQuyenDuyet()
        ) {
            nutDuyet = `
                <button
                    class="btn-duyet"
                    onclick="duyetJD(${jd.id})"
                >
                    Duyệt
                </button>
            `;
        }

        let nutXoa = "";

        if (
            (
                nguoiDung.vai_tro === "admin" ||
                nguoiDung.vai_tro === "manager"
            ) &&
            jd.trang_thai !== "da_duyet"
        ) {
            nutXoa = `
                <button
                    class="btn-xoa"
                    onclick="xoaJD(${jd.id})"
                >
                    Xóa
                </button>
            `;
        }

        tr.innerHTML = `
            <td>${jd.id}</td>

            <td>
                <strong>${escapeHTML(jd.tieu_de)}</strong>
            </td>

            <td>
                ${escapeHTML(jd.ten_dot_tuyen)}
            </td>

            <td>
                <span class="badge ${jd.trang_thai}">
                    ${layTenTrangThai(jd.trang_thai)}
                </span>
            </td>

            <td>
                ${jd.ten_nguoi_duyet
                ? escapeHTML(jd.ten_nguoi_duyet)
                : "-"
            }
            </td>

            <td>
                ${formatNgay(jd.ngay_tao)}
            </td>

            <td class="action">
                ${nutSua}
                ${nutGuiDuyet}
                ${nutDuyet}
                ${nutXoa}
            </td>
        `;

        danhSachJD.appendChild(tr);
    });
}

function locDanhSachJD() {
    const tuKhoa = (oTimKiem?.value || "").trim().toLowerCase();
    const trangThaiLoc = (locTrangThai?.value || "").trim();

    const danhSachLoc = tatCaJD.filter(function (jd) {
        const tieuDe = (jd.tieu_de || "").toLowerCase();
        const dotTuyen = (jd.ten_dot_tuyen || "").toLowerCase();
        const trangThai = (jd.trang_thai || "").toLowerCase();

        const dungTuKhoa =
            !tuKhoa ||
            tieuDe.includes(tuKhoa) ||
            dotTuyen.includes(tuKhoa) ||
            trangThai.includes(tuKhoa);

        const dungTrangThai =
            !trangThaiLoc ||
            trangThai === trangThaiLoc;

        return dungTuKhoa && dungTrangThai;
    });

    renderJD(danhSachLoc);
}

if (oTimKiem) {
    oTimKiem.addEventListener("input", locDanhSachJD);
}

if (locTrangThai) {
    locTrangThai.addEventListener("change", locDanhSachJD);
}

// Lấy danh sách JD
async function layDanhSachJD() {
    try {
        const response = await fetch("/api/jd", {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        if (!response.ok) {
            throw new Error("Không lấy được JD");
        }

        const data = await response.json();
        tatCaJD = data || [];
        locDanhSachJD();

    } catch (error) {
        console.error(error);

        hienThongBao(
            "Không lấy được danh sách JD",
            "loi"
        );
    }
}

// Mở form tạo JD
document
    .getElementById("btnThem")
    .addEventListener("click", function () {

        formJD.reset();

        document.getElementById("jdId").value = "";

        document.getElementById(
            "tieuDeModal"
        ).textContent = "Tạo JD";

        modal.classList.add("show");
    });

// Đóng form
document
    .getElementById("btnDong")
    .addEventListener("click", dongForm);

document
    .getElementById("btnHuy")
    .addEventListener("click", dongForm);

function dongForm() {
    modal.classList.remove("show");
}

// Lưu JD
formJD.addEventListener("submit", async function (event) {

    event.preventDefault();

    const id = document.getElementById("jdId").value;

    const duLieu = {
        dot_tuyen_id: Number(dotTuyenId.value),

        tieu_de:
            document.getElementById("tieuDe").value.trim(),

        mo_ta:
            document.getElementById("moTa").value.trim(),

        yeu_cau:
            document.getElementById("yeuCau").value.trim(),

        quyen_loi:
            document.getElementById("quyenLoi").value.trim(),

        tieu_chi: {
            noi_dung:
                document.getElementById("tieuChi").value.trim()
        }
    };

    try {

        let url = "/api/jd";
        let method = "POST";

        if (id) {
            url = "/api/jd/" + id;
            method = "PUT";
        }

        const response = await fetch(url, {
            method: method,

            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },

            body: JSON.stringify(duLieu)
        });

        const data = await response.json();

        if (!response.ok) {
            hienThongBao(
                data.message || "Có lỗi xảy ra",
                "loi"
            );

            return;
        }

        dongForm();

        hienThongBao(
            data.message,
            "thanh-cong"
        );

        layDanhSachJD();

    } catch (error) {
        console.error(error);

        hienThongBao(
            "Không kết nối được máy chủ",
            "loi"
        );
    }
});

// Sửa JD
async function suaJD(id) {

    try {

        const response = await fetch(
            "/api/jd/" + id,
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const jd = await response.json();

        if (!response.ok) {
            hienThongBao(
                jd.message || "Không lấy được JD",
                "loi"
            );

            return;
        }

        document.getElementById("jdId").value = jd.id;

        dotTuyenId.value = jd.dot_tuyen_id;

        document.getElementById("tieuDe").value =
            jd.tieu_de || "";

        document.getElementById("moTa").value =
            jd.mo_ta || "";

        document.getElementById("yeuCau").value =
            jd.yeu_cau || "";

        document.getElementById("quyenLoi").value =
            jd.quyen_loi || "";

        // Lấy tiêu chí
        let tieuChi = jd.tieu_chi;

        if (typeof tieuChi === "string") {

            try {
                tieuChi = JSON.parse(tieuChi);
            } catch (error) {
                tieuChi = null;
            }
        }

        if (tieuChi && tieuChi.noi_dung) {

            document.getElementById("tieuChi").value =
                tieuChi.noi_dung;

        } else {

            document.getElementById("tieuChi").value = "";
        }

        document.getElementById(
            "tieuDeModal"
        ).textContent = "Sửa JD";

        modal.classList.add("show");

    } catch (error) {

        console.error(error);

        hienThongBao(
            "Không lấy được thông tin JD",
            "loi"
        );
    }
}

// Gửi duyệt
function guiDuyetJD(id) {

    moXacNhan(
        "Gửi JD chờ duyệt",
        "Bạn có chắc muốn gửi JD này để chờ duyệt?",
        async function () {

            try {

                const response = await fetch(
                    "/api/jd/" + id + "/gui-duyet",
                    {
                        method: "PUT",

                        headers: {
                            Authorization:
                                "Bearer " + token
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {

                    hienThongBao(
                        data.message || "Không gửi duyệt được JD",
                        "loi"
                    );

                    return;
                }

                hienThongBao(
                    data.message,
                    "thanh-cong"
                );

                await layDanhSachJD();

            } catch (error) {

                console.error(error);

                hienThongBao(
                    "Không kết nối được máy chủ",
                    "loi"
                );
            }
        }
    );
}

// Duyệt JD
function duyetJD(id) {

    if (!coQuyenDuyet()) {
        hienThongBao(
            "Bạn không có quyền duyệt JD",
            "loi"
        );

        return;
    }

    moXacNhan(
        "Duyệt JD",
        "Bạn có chắc muốn duyệt JD này?",
        async function () {

            try {

                const response = await fetch(
                    "/api/jd/" + id + "/duyet",
                    {
                        method: "PUT",

                        headers: {
                            Authorization:
                                "Bearer " + token
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {

                    hienThongBao(
                        data.message || "Không duyệt được JD",
                        "loi"
                    );

                    return;
                }

                hienThongBao(
                    data.message,
                    "thanh-cong"
                );

                await layDanhSachJD();

            } catch (error) {

                console.error(error);

                hienThongBao(
                    "Không kết nối được máy chủ",
                    "loi"
                );
            }
        }
    );
}

// Xóa JD
function xoaJD(id) {

    moXacNhan(
        "Xóa JD",
        "Bạn có chắc muốn xóa JD này?",
        async function () {

            try {

                const response = await fetch(
                    "/api/jd/" + id,
                    {
                        method: "DELETE",

                        headers: {
                            Authorization:
                                "Bearer " + token
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {

                    hienThongBao(
                        data.message || "Không xóa được JD",
                        "loi"
                    );

                    return;
                }

                hienThongBao(
                    data.message,
                    "thanh-cong"
                );

                await layDanhSachJD();

            } catch (error) {

                console.error(error);

                hienThongBao(
                    "Không kết nối được máy chủ",
                    "loi"
                );
            }
        }
    );
}

// Modal xác nhận
function moXacNhan(
    tieuDe,
    noiDung,
    hanhDong
) {

    tieuDeXacNhan.textContent = tieuDe;

    noiDungXacNhan.textContent = noiDung;

    hanhDongXacNhan = hanhDong;

    modalXacNhan.classList.add("show");
}

btnXacNhan.addEventListener(
    "click",
    async function () {

        if (hanhDongXacNhan) {

            const hanhDong = hanhDongXacNhan;

            dongXacNhan();

            await hanhDong();
        }
    }
);

btnHuyXacNhan.addEventListener(
    "click",
    dongXacNhan
);

function dongXacNhan() {

    modalXacNhan.classList.remove("show");

    hanhDongXacNhan = null;
}

// Tên trạng thái
function layTenTrangThai(trangThai) {

    if (trangThai === "nhap") {
        return "Nháp";
    }

    if (trangThai === "cho_duyet") {
        return "Chờ duyệt";
    }

    if (trangThai === "da_duyet") {
        return "Đã duyệt";
    }

    if (trangThai === "tu_choi") {
        return "Từ chối";
    }

    return trangThai;
}

// Format ngày
function formatNgay(ngay) {

    if (!ngay) {
        return "-";
    }

    return new Date(ngay).toLocaleDateString(
        "vi-VN"
    );
}

// Thông báo
function hienThongBao(
    noiDung,
    loai
) {

    thongBao.innerHTML = `
        <div class="thong-bao ${loai}">
            ${escapeHTML(noiDung)}
        </div>
    `;

    setTimeout(function () {
        thongBao.innerHTML = "";
    }, 3000);
}

// Chống chèn HTML
function escapeHTML(text) {

    if (
        text === null ||
        text === undefined
    ) {
        return "";
    }

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Khởi động
layDotTuyen();
layDanhSachJD();