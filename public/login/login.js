const formDangNhap = document.getElementById("formDangNhap");

const email = document.getElementById("email");
const matKhau = document.getElementById("matKhau");

const btnHienMatKhau = document.getElementById("btnHienMatKhau");

const thongBao = document.getElementById("thongBao");

const btnDangNhap = document.getElementById("btnDangNhap");

const textDangNhap = document.getElementById("textDangNhap");

const loading = document.getElementById("loading");

function hienThiLoi(noiDung) {
  thongBao.textContent = noiDung;
  thongBao.classList.add("hien");
}

function xoaLoi() {
  thongBao.textContent = "";
  thongBao.classList.remove("hien");
}

function batLoading() {
  btnDangNhap.disabled = true;

  textDangNhap.style.display = "none";
  loading.style.display = "block";
}

function tatLoading() {
  btnDangNhap.disabled = false;

  textDangNhap.style.display = "inline";
  loading.style.display = "none";
}

/* Hiện / ẩn mật khẩu */

btnHienMatKhau.addEventListener("click", function () {
  if (matKhau.type === "password") {
    matKhau.type = "text";

    btnHienMatKhau.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
  } else {
    matKhau.type = "password";

    btnHienMatKhau.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M3 3l18 18"></path>
                <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83"></path>
                <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 8 10 8a18.3 18.3 0 0 1-3.12 4.34"></path>
                <path d="M6.61 6.61C3.86 8.38 2 12 2 12s3.5 8 10 8c1.54 0 2.89-.37 4.06-.94"></path>
            </svg>
        `;
  }
});

/* Xóa thông báo lỗi khi nhập */

email.addEventListener("input", function () {
  xoaLoi();
});

matKhau.addEventListener("input", function () {
  xoaLoi();
});

/* Đăng nhập */

formDangNhap.addEventListener("submit", async function (event) {
  event.preventDefault();

  xoaLoi();

  const emailValue = email.value.trim();

  const matKhauValue = matKhau.value.trim();

  if (!emailValue || !matKhauValue) {
    hienThiLoi("Vui lòng nhập đầy đủ email và mật khẩu.");

    return;
  }

  batLoading();

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        email: emailValue,
        mat_khau: matKhauValue,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      hienThiLoi(data.message || "Đăng nhập thất bại.");

      tatLoading();

      return;
    }

    /* Lưu token */

    localStorage.setItem("token", data.token);

    /* Lưu người dùng */

    localStorage.setItem("nguoi_dung", JSON.stringify(data.nguoi_dung));

    /* Chuyển Dashboard */

    window.location.href = "/dashboard/dashboard.html";
  } catch (error) {
    console.error(error);

    hienThiLoi("Không thể kết nối đến máy chủ. Vui lòng kiểm tra Node.js.");

    tatLoading();
  }
});
