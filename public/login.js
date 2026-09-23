const formDangNhap = document.getElementById("formDangNhap");
const thongBao = document.getElementById("thongBao");

formDangNhap.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const matKhau = document.getElementById("matKhau").value;

    try {
        const response = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                mat_khau: matKhau
            })
        });

        const data = await response.json();

        if (!response.ok) {
            thongBao.textContent = data.message;
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem(
            "nguoiDung",
            JSON.stringify(data.nguoi_dung)
        );

        thongBao.textContent = "Đăng nhập thành công";

        setTimeout(function () {
            window.location.href = "dashboard.html";
        }, 500);

    } catch (error) {
        console.error(error);
        thongBao.textContent = "Không kết nối được server";
    }
});