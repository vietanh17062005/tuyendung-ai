const token = localStorage.getItem("token");
const nguoiDung = JSON.parse(localStorage.getItem("nguoiDung"));

if (!token || !nguoiDung) {
    window.location.href = "login.html";
}

document.getElementById("xinChao").textContent =
    "Xin chào, " + nguoiDung.ho_ten;

document.getElementById("vaiTro").textContent =
    "Vai trò: " + nguoiDung.vai_tro;

async function layDuLieuDashboard() {
    try {
        const response = await fetch("http://localhost:3000/api/dashboard", {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.log(data.message);
            return;
        }

        document.getElementById("soDotTuyen").textContent =
            data.so_dot_tuyen;

        document.getElementById("soUngVien").textContent =
            data.so_ung_vien;

        document.getElementById("soPhongVan").textContent =
            data.so_phong_van;

        document.getElementById("soDaTuyen").textContent =
            data.so_da_tuyen;

    } catch (error) {
        console.error(error);
    }
}

layDuLieuDashboard();

document.getElementById("btnDangXuat").addEventListener("click", function () {
    localStorage.removeItem("token");
    localStorage.removeItem("nguoiDung");

    window.location.href = "login.html";
});