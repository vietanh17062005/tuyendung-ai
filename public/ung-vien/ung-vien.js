const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login/login.html";
}

const nguoiDung = JSON.parse(
    localStorage.getItem("nguoiDung") || "{}"
);

const danhSachUngVien =
    document.getElementById("danhSachUngVien");

const dotTuyenId =
    document.getElementById("dotTuyenId");

const locDotTuyen =
    document.getElementById("locDotTuyen");

const modal =
    document.getElementById("modal");

const modalCV =
    document.getElementById("modalCV");

const thongBao =
    document.getElementById("thongBao");

let ungVienDangUpload = null;


// Lấy đợt tuyển dụng
async function layDotTuyen() {
    try {
        const response = await fetch(
            "/api/dot-tuyen",
            {
                headers: {
                    Authorization:
                        "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Không lấy được đợt tuyển dụng"
            );
        }

        dotTuyenId.innerHTML = `
            <option value="">
                -- Chọn đợt tuyển dụng --
            </option>
        `;

        locDotTuyen.innerHTML = `
            <option value="">
                Tất cả đợt tuyển dụng
            </option>
        `;

        data.forEach(function (dotTuyen) {

            const option1 =
                document.createElement("option");

            option1.value = dotTuyen.id;
            option1.textContent = dotTuyen.ten;

            dotTuyenId.appendChild(option1);


            const option2 =
                document.createElement("option");

            option2.value = dotTuyen.id;
            option2.textContent = dotTuyen.ten;

            locDotTuyen.appendChild(option2);
        });

    } catch (error) {
        console.error(error);

        hienThongBao(
            error.message,
            "loi"
        );
    }
}


// Lấy ứng viên
async function layUngVien() {

    try {

        let url = "/api/ung-vien";

        if (locDotTuyen.value) {
            url +=
                "?dot_tuyen_id=" +
                encodeURIComponent(
                    locDotTuyen.value
                );
        }

        const response = await fetch(
            url,
            {
                headers: {
                    Authorization:
                        "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Không lấy được ứng viên"
            );
        }

        danhSachUngVien.innerHTML = "";

        if (data.length === 0) {

            danhSachUngVien.innerHTML = `
                <tr>
                    <td colspan="8">
                        Chưa có ứng viên
                    </td>
                </tr>
            `;

            return;
        }

        data.forEach(function (uv) {

            const tr =
                document.createElement("tr");

            let cvHTML = "-";

            if (uv.cv_id) {
                cvHTML = `
                    <span class="cv-name">
                        ${escapeHTML(
                    uv.ten_file
                )}
                    </span>
                `;
            }

            let nutXoa = "";

            if (
                nguoiDung.vai_tro === "admin" ||
                nguoiDung.vai_tro === "manager"
            ) {
                nutXoa = `
                    <button
                        class="btn-xoa"
                        onclick="xoaUngVien(${uv.id})"
                    >
                        Xóa
                    </button>
                `;
            }

            tr.innerHTML = `
                <td>${uv.id}</td>

                <td>
                    <strong>
                        ${escapeHTML(uv.ho_ten)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(uv.email || "-")}
                </td>

                <td>
                    ${escapeHTML(uv.sdt || "-")}
                </td>

                <td>
                    ${escapeHTML(
                uv.ten_dot_tuyen
            )}
                </td>

                <td>
                    ${cvHTML}
                </td>

                <td>
                    <span class="badge ${uv.trang_thai}">
                        ${layTenTrangThai(
                uv.trang_thai
            )}
                    </span>
                </td>

                <td class="action">

                    <button
                        class="btn-sua"
                        onclick="suaUngVien(${uv.id})"
                    >
                        Sửa
                    </button>

                    <button
                        class="btn-cv"
                        onclick="moUploadCV(
                            ${uv.id},
                            '${escapeAttribute(
                uv.ho_ten
            )}'
                        )"
                    >
                        CV
                    </button>

                    <button
                        class="btn-xem"
                        onclick="xemUngVien(${uv.id})"
                    >
                        Xem
                    </button>

                    ${nutXoa}

                </td>
            `;

            danhSachUngVien.appendChild(tr);
        });

    } catch (error) {

        console.error(error);

        hienThongBao(
            error.message,
            "loi"
        );
    }
}


// Mở form thêm
document
    .getElementById("btnThem")
    .addEventListener(
        "click",
        function () {

            document
                .getElementById("formUngVien")
                .reset();

            document
                .getElementById("ungVienId")
                .value = "";

            document
                .getElementById("tieuDeModal")
                .textContent =
                "Thêm ứng viên";

            modal.classList.add("show");
        }
    );


// Đóng form
document
    .getElementById("btnDong")
    .addEventListener(
        "click",
        dongModal
    );

document
    .getElementById("btnHuy")
    .addEventListener(
        "click",
        dongModal
    );

function dongModal() {
    modal.classList.remove("show");
}


// Lưu ứng viên
document
    .getElementById("formUngVien")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const id =
                document.getElementById(
                    "ungVienId"
                ).value;

            const duLieu = {

                dot_tuyen_id:
                    Number(
                        dotTuyenId.value
                    ),

                ho_ten:
                    document.getElementById(
                        "hoTen"
                    ).value.trim(),

                email:
                    document.getElementById(
                        "email"
                    ).value.trim(),

                sdt:
                    document.getElementById(
                        "sdt"
                    ).value.trim(),

                nguon:
                    document.getElementById(
                        "nguon"
                    ).value,

                ghi_chu:
                    document.getElementById(
                        "ghiChu"
                    ).value.trim()
            };

            try {

                let url =
                    "/api/ung-vien";

                let method = "POST";

                if (id) {
                    url =
                        "/api/ung-vien/" +
                        id;

                    method = "PUT";
                }

                const response =
                    await fetch(
                        url,
                        {
                            method: method,

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    "Bearer " +
                                    token
                            },

                            body:
                                JSON.stringify(
                                    duLieu
                                )
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    hienThongBao(
                        data.message,
                        "loi"
                    );

                    return;
                }

                dongModal();

                hienThongBao(
                    data.message,
                    "thanh-cong"
                );

                layUngVien();

            } catch (error) {

                console.error(error);

                hienThongBao(
                    "Không kết nối được máy chủ",
                    "loi"
                );
            }
        }
    );


// Sửa ứng viên
async function suaUngVien(id) {

    try {

        const response =
            await fetch(
                "/api/ung-vien/" + id,
                {
                    headers: {
                        Authorization:
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            hienThongBao(
                data.message,
                "loi"
            );

            return;
        }

        const uv = data.ung_vien;

        document.getElementById(
            "ungVienId"
        ).value = uv.id;

        dotTuyenId.value =
            uv.dot_tuyen_id;

        document.getElementById(
            "hoTen"
        ).value = uv.ho_ten || "";

        document.getElementById(
            "email"
        ).value = uv.email || "";

        document.getElementById(
            "sdt"
        ).value = uv.sdt || "";

        document.getElementById(
            "nguon"
        ).value = uv.nguon || "";

        document.getElementById(
            "ghiChu"
        ).value = uv.ghi_chu || "";

        document.getElementById(
            "tieuDeModal"
        ).textContent =
            "Sửa ứng viên";

        modal.classList.add("show");

    } catch (error) {

        console.error(error);

        hienThongBao(
            "Không lấy được ứng viên",
            "loi"
        );
    }
}


// Upload CV
function moUploadCV(id, hoTen) {

    ungVienDangUpload = id;

    document.getElementById(
        "tenUngVienCV"
    ).textContent =
        "Ứng viên: " + hoTen;

    document.getElementById(
        "formCV"
    ).reset();

    modalCV.classList.add("show");
}


// Đóng modal CV
document
    .getElementById("btnDongCV")
    .addEventListener(
        "click",
        dongModalCV
    );

document
    .getElementById("btnHuyCV")
    .addEventListener(
        "click",
        dongModalCV
    );

function dongModalCV() {
    modalCV.classList.remove("show");
    ungVienDangUpload = null;
}


// Upload
document
    .getElementById("formCV")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (!ungVienDangUpload) {
                return;
            }

            const file =
                document.getElementById(
                    "fileCV"
                ).files[0];

            if (!file) {
                hienThongBao(
                    "Vui lòng chọn CV",
                    "loi"
                );

                return;
            }

            const formData =
                new FormData();

            formData.append(
                "cv",
                file
            );

            try {

                const response =
                    await fetch(
                        "/api/ung-vien/" +
                        ungVienDangUpload +
                        "/cv",
                        {
                            method: "POST",

                            headers: {
                                Authorization:
                                    "Bearer " +
                                    token
                            },

                            body: formData
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    hienThongBao(
                        data.message,
                        "loi"
                    );

                    return;
                }

                dongModalCV();

                hienThongBao(
                    data.message,
                    "thanh-cong"
                );

                layUngVien();

            } catch (error) {

                console.error(error);

                hienThongBao(
                    "Upload CV thất bại",
                    "loi"
                );
            }
        }
    );


// Xem chi tiết
async function xemUngVien(id) {

    try {

        const response =
            await fetch(
                "/api/ung-vien/" + id,
                {
                    headers: {
                        Authorization:
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            hienThongBao(
                data.message,
                "loi"
            );

            return;
        }

        let noiDung =
            "Ứng viên: " +
            data.ung_vien.ho_ten;

        if (data.cv.length > 0) {

            noiDung +=
                "\nCV: " +
                data.cv
                    .map(function (cv) {
                        return cv.ten_file;
                    })
                    .join(", ");
        } else {

            noiDung +=
                "\nCV: Chưa có";
        }

        hienThongBao(
            noiDung,
            "thanh-cong"
        );

    } catch (error) {

        console.error(error);

        hienThongBao(
            "Không lấy được thông tin",
            "loi"
        );
    }
}


// Xóa ứng viên
async function xoaUngVien(id) {

    const xacNhan =
        window.confirm(
            "Bạn có chắc muốn xóa ứng viên này?"
        );

    if (!xacNhan) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/ung-vien/" + id,
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            "Bearer " +
                            token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            hienThongBao(
                data.message,
                "loi"
            );

            return;
        }

        hienThongBao(
            data.message,
            "thanh-cong"
        );

        layUngVien();

    } catch (error) {

        console.error(error);

        hienThongBao(
            "Xóa ứng viên thất bại",
            "loi"
        );
    }
}


// Lọc
locDotTuyen.addEventListener(
    "change",
    layUngVien
);


// Tên trạng thái
function layTenTrangThai(trangThai) {

    const danhSach = {

        moi: "Mới",

        da_phan_tich:
            "Đã phân tích",

        da_chon:
            "Đã chọn",

        da_lien_he:
            "Đã liên hệ",

        da_len_lich_pv:
            "Đã lên lịch PV",

        da_phong_van:
            "Đã phỏng vấn",

        offer:
            "Offer",

        da_tuyen:
            "Đã tuyển",

        tu_choi:
            "Từ chối"
    };

    return (
        danhSach[trangThai] ||
        trangThai
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

    setTimeout(
        function () {
            thongBao.innerHTML = "";
        },
        4000
    );
}


// Chống HTML
function escapeHTML(text) {

    if (
        text === null ||
        text === undefined
    ) {
        return "";
    }

    return String(text)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeAttribute(text) {

    return String(text || "")
        .replace(
            /'/g,
            "\\'"
        );
}


// Khởi động
layDotTuyen();
layUngVien();