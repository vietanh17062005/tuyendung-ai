const token = localStorage.getItem("token");
const nguoiDungJSON = localStorage.getItem("nguoi_dung");

if (!token || !nguoiDungJSON) {
    window.location.href = "/login/login.html";
}

let nguoiDung = null;

try {
    nguoiDung = JSON.parse(nguoiDungJSON);
} catch (error) {
    localStorage.removeItem("token");
    localStorage.removeItem("nguoi_dung");

    window.location.href = "/login/login.html";
}


/* Chỉ Admin được vào */

if (!nguoiDung || nguoiDung.vai_tro !== "admin") {

    alert("Bạn không có quyền truy cập trang này.");

    window.location.href = "/dashboard/dashboard.html";
}


/* DOM */

const danhSachNguoiDung =
    document.getElementById("danhSachNguoiDung");

const khongCoDuLieu =
    document.getElementById("khongCoDuLieu");

const timKiem =
    document.getElementById("timKiem");

const modal =
    document.getElementById("modal");

const formNguoiDung =
    document.getElementById("formNguoiDung");

const tieuDeModal =
    document.getElementById("tieuDeModal");

const idNguoiDung =
    document.getElementById("idNguoiDung");

const hoTen =
    document.getElementById("hoTen");

const email =
    document.getElementById("email");

const matKhau =
    document.getElementById("matKhau");

const vaiTro =
    document.getElementById("vaiTro");

const trangThai =
    document.getElementById("trangThai");

const thongBao =
    document.getElementById("thongBao");


/* Hiển thị admin */

document.getElementById("tenAdmin").textContent =
    nguoiDung.ho_ten;

document.getElementById("avatar").textContent =
    nguoiDung.ho_ten.charAt(0).toUpperCase();


let danhSach = [];


/* Load */

async function layDanhSachNguoiDung() {

    try {

        const response = await fetch(
            "/api/nguoi-dung",
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );


        if (response.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("nguoi_dung");

            window.location.href = "/login/login.html";

            return;
        }


        if (response.status === 403) {

            window.location.href =
                "/dashboard/dashboard.html";

            return;
        }


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Không lấy được danh sách người dùng."
            );

            return;
        }


        danhSach = data;

        hienThiDanhSach();

    } catch (error) {

        console.error(error);

        alert(
            "Không thể kết nối đến máy chủ."
        );
    }
}


/* Hiển thị */

function hienThiDanhSach() {

    const tuKhoa =
        timKiem.value
            .trim()
            .toLowerCase();


    const ketQua =
        danhSach.filter(function (nguoi) {

            return (
                nguoi.ho_ten
                    .toLowerCase()
                    .includes(tuKhoa)
                ||
                nguoi.email
                    .toLowerCase()
                    .includes(tuKhoa)
            );

        });


    danhSachNguoiDung.innerHTML = "";


    if (ketQua.length === 0) {

        khongCoDuLieu.style.display =
            "block";

        return;
    }


    khongCoDuLieu.style.display =
        "none";


    ketQua.forEach(function (nguoi, index) {

        const tr =
            document.createElement("tr");


        const tenVaiTro =
            layTenVaiTro(nguoi.vai_tro);


        const badgeVaiTro =
            layClassVaiTro(nguoi.vai_tro);


        const dangHoatDong =
            nguoi.trang_thai === "hoat_dong";


        tr.innerHTML = `

            <td style="text-align:center;">
                ${index + 1}
            </td>

            <td>
                <div class="ten">
                    ${escapeHTML(nguoi.ho_ten)}
                </div>
            </td>

            <td>
                <div class="email">
                    ${escapeHTML(nguoi.email)}
                </div>
            </td>

            <td style="text-align:center;">

                <span class="badge ${badgeVaiTro}">
                    ${tenVaiTro}
                </span>

            </td>

            <td style="text-align:center;">

                <span class="badge ${dangHoatDong
                ? "badge-active"
                : "badge-locked"
            }">

                    ${dangHoatDong
                ? "Hoạt động"
                : "Bị khóa"
            }

                </span>

            </td>

            <td style="text-align:center;">

                <button
                    class="btn-sua"
                    onclick="suaNguoiDung(${nguoi.id})"
                >
                    Sửa
                </button>

                <button
                    class="btn-khoa ${dangHoatDong
                ? ""
                : "btn-mo"
            }"
                    onclick="doiTrangThai(
                        ${nguoi.id},
                        '${nguoi.trang_thai}'
                    )"
                >

                    ${dangHoatDong
                ? "Khóa"
                : "Mở khóa"
            }

                </button>

            </td>
        `;


        danhSachNguoiDung.appendChild(tr);

    });
}


/* Tên vai trò */

function layTenVaiTro(vaiTro) {

    const danhSachVaiTro = {

        admin: "Admin",

        manager: "Manager",

        hr: "HR",

        interviewer: "Interviewer",

        viewer: "Viewer"

    };


    return (
        danhSachVaiTro[vaiTro]
        || vaiTro
    );
}


/* Class vai trò */

function layClassVaiTro(vaiTro) {

    return "badge-" + vaiTro;
}


/* Mở modal thêm */

document
    .getElementById("btnThem")
    .addEventListener(
        "click",
        function () {

            tieuDeModal.textContent =
                "Thêm người dùng";

            formNguoiDung.reset();

            idNguoiDung.value = "";

            modal.classList.add("hien");

            xoaThongBao();

        }
    );


/* Đóng */

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

    modal.classList.remove("hien");

    formNguoiDung.reset();

    idNguoiDung.value = "";

    xoaThongBao();
}


/* Sửa */

window.suaNguoiDung =
    function (id) {

        const nguoi =
            danhSach.find(
                function (item) {
                    return item.id === id;
                }
            );


        if (!nguoi) {
            return;
        }


        tieuDeModal.textContent =
            "Chỉnh sửa người dùng";


        idNguoiDung.value =
            nguoi.id;

        hoTen.value =
            nguoi.ho_ten;

        email.value =
            nguoi.email;

        matKhau.value = "";

        vaiTro.value =
            nguoi.vai_tro;

        trangThai.value =
            nguoi.trang_thai;


        xoaThongBao();

        modal.classList.add("hien");
    };


/* Lưu */

formNguoiDung.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        xoaThongBao();


        const id =
            idNguoiDung.value;


        const duLieu = {

            ho_ten:
                hoTen.value.trim(),

            email:
                email.value.trim(),

            mat_khau:
                matKhau.value.trim(),

            vai_tro:
                vaiTro.value,

            trang_thai:
                trangThai.value

        };


        if (
            !duLieu.ho_ten ||
            !duLieu.email
        ) {

            hienThiThongBao(
                "Vui lòng nhập đầy đủ họ tên và email."
            );

            return;
        }


        if (!id && !duLieu.mat_khau) {

            hienThiThongBao(
                "Vui lòng nhập mật khẩu."
            );

            return;
        }


        try {

            let response;


            if (id) {

                response = await fetch(
                    "/api/nguoi-dung/" + id,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                "Bearer " + token
                        },

                        body:
                            JSON.stringify(duLieu)
                    }
                );

            } else {

                response = await fetch(
                    "/api/nguoi-dung",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                "Bearer " + token
                        },

                        body:
                            JSON.stringify(duLieu)
                    }
                );
            }


            const data =
                await response.json();


            if (!response.ok) {

                hienThiThongBao(
                    data.message ||
                    "Không thể lưu người dùng."
                );

                return;
            }


            dongModal();

            await layDanhSachNguoiDung();

        } catch (error) {

            console.error(error);

            hienThiThongBao(
                "Không thể kết nối đến máy chủ."
            );
        }

    }
);


/* Đổi trạng thái */

window.doiTrangThai =
    async function (id, trangThaiHienTai) {

        const trangThaiMoi =
            trangThaiHienTai === "hoat_dong"
                ? "bi_khoa"
                : "hoat_dong";


        try {

            const response =
                await fetch(
                    "/api/nguoi-dung/" +
                    id +
                    "/trang-thai",
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                "Bearer " + token
                        },

                        body:
                            JSON.stringify({
                                trang_thai:
                                    trangThaiMoi
                            })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                alert(
                    data.message ||
                    "Không thể cập nhật trạng thái."
                );

                return;
            }


            await layDanhSachNguoiDung();

        } catch (error) {

            console.error(error);

            alert(
                "Không thể kết nối đến máy chủ."
            );
        }

    };


/* Tìm kiếm */

timKiem.addEventListener(
    "input",
    hienThiDanhSach
);


/* Đăng xuất */

document
    .getElementById("btnDangXuat")
    .addEventListener(
        "click",
        function () {

            localStorage.removeItem("token");
            localStorage.removeItem("nguoi_dung");

            window.location.href =
                "/login/login.html";

        }
    );


/* Thông báo */

function hienThiThongBao(noiDung) {

    thongBao.textContent =
        noiDung;

    thongBao.classList.add("hien");
}


function xoaThongBao() {

    thongBao.textContent = "";

    thongBao.classList.remove("hien");
}


/* Escape HTML */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* Chạy */

layDanhSachNguoiDung();