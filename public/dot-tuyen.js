const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

const danhSach = document.getElementById("danhSach");
const formKhung = document.getElementById("formKhung");
const thongBao = document.getElementById("thongBao");


function hienThiTrangThai(trangThai) {

    const tenTrangThai = {
        nhap: "Nháp",
        dang_tuyen: "Đang tuyển",
        dong: "Đã đóng"
    };

    return `
        <span class="trang-thai ${trangThai}">
            ${tenTrangThai[trangThai] || trangThai}
        </span>
    `;
}


function hienThiNgay(ngay) {

    if (!ngay) {
        return "";
    }

    const date = new Date(ngay);

    const ngaySo = String(date.getDate()).padStart(2, "0");
    const thang = String(date.getMonth() + 1).padStart(2, "0");
    const nam = date.getFullYear();

    return `${ngaySo}/${thang}/${nam}`;
}


async function layDanhSach() {

    try {

        const response = await fetch("/api/dot-tuyen", {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        const data = await response.json();

        if (!response.ok) {
            thongBao.textContent = data.message;
            return;
        }

        danhSach.innerHTML = "";

        if (data.length === 0) {

            danhSach.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;">
                        Chưa có đợt tuyển dụng nào
                    </td>
                </tr>
            `;

            return;
        }

        data.forEach(function (dot) {

            const dong = document.createElement("tr");

            dong.innerHTML = `
                <td>${dot.id}</td>

                <td>
                    <strong>${dot.ten}</strong>
                </td>

                <td>${dot.mo_ta || "-"}</td>

                <td>
                    ${hienThiTrangThai(dot.trang_thai)}
                </td>

                <td>
                    ${hienThiNgay(dot.ngay_bat_dau)}
                </td>

                <td>
                    ${hienThiNgay(dot.ngay_ket_thuc)}
                </td>

                <td>
                    ${dot.ten_nguoi_tao || "-"}
                </td>

                <td>
                    <button
                        class="btn-sua"
                        onclick="suaDot(${dot.id})"
                    >
                        Sửa
                    </button>

                    <button
                        class="btn-xoa"
                        onclick="xoaDot(${dot.id})"
                    >
                        Xóa
                    </button>
                </td>
            `;

            danhSach.appendChild(dong);
        });

    } catch (error) {

        console.error(error);

        thongBao.textContent =
            "Không kết nối được máy chủ";
    }
}


function moForm() {
    formKhung.classList.remove("an");
    formKhung.style.display = "flex";
}


function dongForm() {
    formKhung.style.display = "none";
}


function xoaDuLieuForm() {

    document.getElementById("id").value = "";
    document.getElementById("ten").value = "";
    document.getElementById("moTa").value = "";
    document.getElementById("ngayBatDau").value = "";
    document.getElementById("ngayKetThuc").value = "";
    document.getElementById("trangThai").value = "nhap";
}


document.getElementById("btnThem").addEventListener(
    "click",
    function () {

        document.getElementById("tieuDeForm").textContent =
            "Thêm đợt tuyển dụng";

        xoaDuLieuForm();

        moForm();
    }
);


document.getElementById("btnHuy").addEventListener(
    "click",
    dongForm
);


document.getElementById("btnHuy2").addEventListener(
    "click",
    dongForm
);


document.getElementById("btnLuu").addEventListener(
    "click",
    async function () {

        const id = document.getElementById("id").value;

        const duLieu = {
            ten: document.getElementById("ten").value.trim(),

            mo_ta:
                document.getElementById("moTa").value.trim(),

            ngay_bat_dau:
                document.getElementById("ngayBatDau").value || null,

            ngay_ket_thuc:
                document.getElementById("ngayKetThuc").value || null,

            trang_thai:
                document.getElementById("trangThai").value
        };


        if (!duLieu.ten) {

            thongBao.textContent =
                "Vui lòng nhập tên đợt tuyển dụng";

            return;
        }


        const url = id
            ? "/api/dot-tuyen/" + id
            : "/api/dot-tuyen";

        const method = id ? "PUT" : "POST";


        try {

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

                thongBao.textContent =
                    data.message;

                return;
            }


            dongForm();

            await layDanhSach();

            thongBao.textContent =
                data.message === "Them dot tuyen thanh cong"
                    ? "Thêm đợt tuyển dụng thành công"
                    : "Cập nhật đợt tuyển dụng thành công";


        } catch (error) {

            console.error(error);

            thongBao.textContent =
                "Không kết nối được máy chủ";
        }
    }
);


async function suaDot(id) {

    try {

        const response = await fetch(
            "/api/dot-tuyen",
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );


        const data = await response.json();


        const dot = data.find(function (item) {
            return item.id === id;
        });


        if (!dot) {
            return;
        }


        document.getElementById("tieuDeForm").textContent =
            "Sửa đợt tuyển dụng";


        document.getElementById("id").value =
            dot.id;

        document.getElementById("ten").value =
            dot.ten;

        document.getElementById("moTa").value =
            dot.mo_ta || "";

        document.getElementById("ngayBatDau").value =
            dot.ngay_bat_dau
                ? dot.ngay_bat_dau.substring(0, 10)
                : "";

        document.getElementById("ngayKetThuc").value =
            dot.ngay_ket_thuc
                ? dot.ngay_ket_thuc.substring(0, 10)
                : "";

        document.getElementById("trangThai").value =
            dot.trang_thai;


        moForm();

    } catch (error) {

        console.error(error);

        thongBao.textContent =
            "Không lấy được thông tin đợt tuyển dụng";
    }
}


async function xoaDot(id) {

    const xacNhan = confirm(
        "Bạn có chắc muốn xóa đợt tuyển dụng này?"
    );


    if (!xacNhan) {
        return;
    }


    try {

        const response = await fetch(
            "/api/dot-tuyen/" + id,
            {
                method: "DELETE",

                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );


        const data = await response.json();


        if (!response.ok) {

            thongBao.textContent =
                data.message;

            return;
        }


        thongBao.textContent =
            "Đã xóa đợt tuyển dụng";

        await layDanhSach();


    } catch (error) {

        console.error(error);

        thongBao.textContent =
            "Không kết nối được máy chủ";
    }
}


layDanhSach();