const token = localStorage.getItem("token");
const nguoiDungJSON = localStorage.getItem("nguoi_dung");

if (!token || !nguoiDungJSON) {
  window.location.href = "/login/login.html";
}

let nguoiDung;

try {
  nguoiDung = JSON.parse(nguoiDungJSON);
} catch (error) {
  localStorage.removeItem("token");
  localStorage.removeItem("nguoi_dung");

  window.location.href = "/login/login.html";
}

if (!nguoiDung) {
  localStorage.removeItem("token");
  localStorage.removeItem("nguoi_dung");

  window.location.href = "/login/login.html";
}

/* DOM */

const tenNguoiDung = document.getElementById("tenNguoiDung");

const vaiTro = document.getElementById("vaiTro");

const xinChao = document.getElementById("xinChao");

const moTaVaiTro = document.getElementById("moTaVaiTro");

const avatar = document.getElementById("avatar");

const menuNguoiDung = document.getElementById("menuNguoiDung");

const taiKhoan = document.getElementById("taiKhoan");

const menuTaiKhoan = document.getElementById("menuTaiKhoan");
const locThoiGianUngVien = document.getElementById("locThoiGianUngVien");
const khoaThongBaoDaXem = `thong_bao_da_xem_${nguoiDung.id || nguoiDung.email}`;
const khoaLichSuHoiAI = `lich_su_chat_ai_${nguoiDung.id || nguoiDung.email}`;
let thongBaoHienTai = [];
let lichSuHoiAI = docLichSuHoiAI();

/* Hiển thị tài khoản */

tenNguoiDung.textContent = nguoiDung.ho_ten;

avatar.textContent = nguoiDung.ho_ten.charAt(0).toUpperCase();

vaiTro.textContent = layTenVaiTro(nguoiDung.vai_tro);

xinChao.textContent = "Xin chào, " + nguoiDung.ho_ten;

moTaVaiTro.textContent = layMoTaVaiTro(nguoiDung.vai_tro);

/* Ẩn quản lý người dùng */

if (nguoiDung.vai_tro !== "admin") {
  menuNguoiDung.style.display = "none";
}

if (!["admin", "manager"].includes(nguoiDung.vai_tro)) {
  document.getElementById("btnTaoDotTuyen").style.display = "none";
}

/* Dropdown tài khoản */

document.getElementById("tenMenuTaiKhoan").textContent = nguoiDung.ho_ten;

document.getElementById("emailMenuTaiKhoan").textContent = nguoiDung.email;

taiKhoan.addEventListener("click", function (event) {
  event.stopPropagation();

  menuTaiKhoan.classList.toggle("hien");
});

document.addEventListener("click", function () {
  menuTaiKhoan.classList.remove("hien");
});

menuTaiKhoan.addEventListener("click", function (event) {
  event.stopPropagation();
});

/* Vai trò */

function layTenVaiTro(vaiTro) {
  const danhSach = {
    admin: "Quản trị viên",

    manager: "Quản lý",

    hr: "Nhân sự",

    interviewer: "Người phỏng vấn",

    viewer: "Người xem",
  };

  return danhSach[vaiTro] || vaiTro;
}

function layMoTaVaiTro(vaiTro) {
  const danhSach = {
    admin: "Bạn có toàn quyền quản lý hệ thống và người dùng.",

    manager: "Bạn có quyền quản lý tuyển dụng và đưa ra quyết định tuyển dụng.",

    hr: "Bạn có quyền quản lý ứng viên, CV và quá trình tuyển dụng.",

    interviewer: "Bạn có quyền quản lý lịch phỏng vấn và đánh giá ứng viên.",

    viewer: "Bạn có quyền xem các thông tin được cấp phép.",
  };

  return danhSach[vaiTro] || "Chào mừng bạn quay trở lại hệ thống.";
}

/* Dashboard */

async function layDuLieuDashboard() {
  try {
    const thamSo = new URLSearchParams({ period: locThoiGianUngVien.value });
    const response = await fetch(`/api/dashboard?${thamSo}`, {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (response.status === 401) {
      dangXuat();

      return;
    }

    const data = await response.json();

    if (!response.ok) {
      console.error(data.message);

      return;
    }

    document.getElementById("soDotDangTuyen").textContent = dinhDangSo(data.so_dot_dang_tuyen);
    document.getElementById("soUngVien").textContent = dinhDangSo(data.so_ung_vien);
    document.getElementById("soPhongVan").textContent = dinhDangSo(data.so_phong_van);
    document.getElementById("soDaTuyen").textContent = dinhDangSo(data.so_da_tuyen);
    document.getElementById("nhanKhoangThoiGian").textContent =
      locThoiGianUngVien.selectedOptions[0].textContent === "Tất cả"
        ? "Tất cả thời gian"
        : locThoiGianUngVien.selectedOptions[0].textContent;

    const tongUngVien = Number(data.so_ung_vien) || 0;
    const tongDaTuyen = Number(data.so_da_tuyen) || 0;
    document.getElementById("tyLeTuyen").textContent = `${
      tongUngVien ? Math.round((tongDaTuyen / tongUngVien) * 100) : 0
    }%`;

    hienThiPheuTuyenDung(data);
    hienThiPhongVanSapToi(data.phong_van_sap_toi || []);
    hienThiUngVienMoi(data.ung_vien_moi || []);
    hienThiThongBao(data.thong_bao || []);
  } catch (error) {
    console.error(error);
    hienThiLoiDashboard();
  }
}

locThoiGianUngVien.addEventListener("change", layDuLieuDashboard);
setInterval(layDuLieuDashboard, 60 * 1000);

function dinhDangSo(value) {
  return (Number(value) || 0).toLocaleString("vi-VN");
}

function taoTrangThaiUngVienMap(data) {
  return Object.fromEntries(
    (data.ung_vien_theo_trang_thai || []).map((item) => [
      String(item.trang_thai || "").toLowerCase(),
      Number(item.so_luong) || 0,
    ]),
  );
}

function hienThiPheuTuyenDung(data) {
  const container = document.getElementById("pheuTuyenDung");
  const trangThai = taoTrangThaiUngVienMap(data);
  const tongUngVien = Number(data.so_ung_vien) || 0;
  const cacBuoc = [
    { ten: "Đã tiếp nhận", trangThai: null, mau: "dam" },
    {
      ten: "Đã sàng lọc",
      trangThai: ["da_phan_tich", "da_chon", "da_lien_he", "da_xep_lich", "da_phong_van", "offer", "da_tuyen"],
      mau: "dam",
    },
    { ten: "Đã phỏng vấn", trangThai: ["da_phong_van", "offer", "da_tuyen"], mau: "vua" },
    { ten: "Đã gửi đề nghị", trangThai: ["offer", "da_tuyen"], mau: "nhat" },
    { ten: "Đã tuyển", trangThai: ["da_tuyen"], mau: "sang" },
  ];
  let buocTruoc = tongUngVien;

  container.replaceChildren();
  if (tongUngVien === 0) {
    container.appendChild(taoThongBaoTrong("Chưa có dữ liệu ứng viên để hiển thị."));
    return;
  }

  cacBuoc.forEach((buoc, index) => {
    const soLuong = buoc.trangThai
      ? buoc.trangThai.reduce((tong, trangThaiUngVien) => tong + (trangThai[trangThaiUngVien] || 0), 0)
      : tongUngVien;
    const tiLe = index === 0 ? 100 : buocTruoc ? Math.round((soLuong / buocTruoc) * 100) : 0;
    const hang = document.createElement("div");
    const ten = document.createElement("span");
    const thanh = document.createElement("div");
    const giaTri = document.createElement("strong");
    const phanTram = document.createElement("span");
    const doRong = Math.max(8, Math.round((soLuong / tongUngVien) * 100));

    hang.className = "pheu-hang";
    ten.className = "pheu-ten";
    ten.textContent = buoc.ten;
    thanh.className = `pheu-thanh pheu-thanh-${buoc.mau}`;
    thanh.style.width = `${doRong}%`;
    thanh.textContent = dinhDangSo(soLuong);
    giaTri.className = "pheu-so";
    giaTri.textContent = dinhDangSo(soLuong);
    phanTram.className = "pheu-ti-le";
    phanTram.textContent = index === 0 ? "tổng số" : `${tiLe}% chuyển đổi`;
    hang.append(ten, thanh, giaTri, phanTram);
    container.appendChild(hang);
    buocTruoc = soLuong;
  });
}

function hienThiPhongVanSapToi(dsPhongVan) {
  const container = document.getElementById("danhSachPhongVan");
  container.replaceChildren();
  if (!dsPhongVan.length) {
    container.appendChild(taoThongBaoTrong("Hiện chưa có lịch phỏng vấn sắp tới."));
    return;
  }

  dsPhongVan.forEach((lich) => {
    const hang = document.createElement("article");
    const avatarUngVien = document.createElement("span");
    const thongTin = document.createElement("div");
    const ten = document.createElement("strong");
    const thoiGian = document.createElement("span");
    const hinhThuc = document.createElement("span");
    const ngay = new Date(lich.bat_dau);
    const ngayGio = Number.isNaN(ngay.getTime())
      ? "Chưa xác định thời gian"
      : `${ngay.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · ${ngay.toLocaleDateString("vi-VN")}`;

    hang.className = "phong-van-item";
    avatarUngVien.className = "avatar-ung-vien";
    avatarUngVien.textContent = layChuVietTat(lich.ten_ung_vien);
    thongTin.className = "phong-van-thong-tin";
    ten.textContent = lich.ten_ung_vien || "Ứng viên";
    thoiGian.textContent = `${ngayGio}${lich.ten_nguoi_phong_van ? ` · ${lich.ten_nguoi_phong_van}` : ""}`;
    hinhThuc.className = "nhan-hinh-thuc";
    hinhThuc.textContent = layTenHinhThuc(lich.hinh_thuc);
    thongTin.append(ten, thoiGian);
    hang.append(avatarUngVien, thongTin, hinhThuc);
    container.appendChild(hang);
  });
}

function hienThiUngVienMoi(dsUngVien) {
  const container = document.getElementById("danhSachUngVienMoi");
  container.replaceChildren();
  if (!dsUngVien.length) {
    container.appendChild(taoThongBaoTrong("Chưa có hồ sơ ứng viên mới."));
    return;
  }

  dsUngVien.forEach((ungVien) => {
    const the = document.createElement("article");
    const avatarUngVien = document.createElement("span");
    const thongTin = document.createElement("div");
    const ten = document.createElement("strong");
    const trangThai = document.createElement("span");
    const ngayTao = document.createElement("span");
    const ngay = new Date(ungVien.ngay_tao);

    the.className = "ung-vien-moi-item";
    avatarUngVien.className = "avatar-ung-vien";
    avatarUngVien.textContent = layChuVietTat(ungVien.ho_ten);
    thongTin.className = "ung-vien-moi-thong-tin";
    ten.textContent = ungVien.ho_ten || "Ứng viên";
    trangThai.className = `nhan-trang-thai trang-thai-${String(ungVien.trang_thai || "moi").toLowerCase()}`;
    trangThai.textContent = layTenTrangThaiUngVien(ungVien.trang_thai);
    ngayTao.className = "ung-vien-moi-ngay";
    ngayTao.textContent = Number.isNaN(ngay.getTime()) ? "" : ngay.toLocaleDateString("vi-VN");
    thongTin.append(ten, trangThai);
    the.append(avatarUngVien, thongTin, ngayTao);
    container.appendChild(the);
  });
}

function layChuVietTat(ten) {
  return String(ten || "?")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((tu) => tu.charAt(0).toLocaleUpperCase("vi-VN"))
    .join("");
}

function layTenTrangThaiUngVien(trangThai) {
  const tenTrangThai = {
    moi: "Mới tiếp nhận",
    da_phan_tich: "Đã phân tích",
    da_chon: "Đã chọn",
    da_lien_he: "Đã liên hệ",
    da_xep_lich: "Đã xếp lịch",
    da_phong_van: "Đã phỏng vấn",
    offer: "Đã gửi đề nghị",
    da_tuyen: "Đã tuyển",
    tu_choi: "Không phù hợp",
    talent_pool: "Nguồn tiềm năng",
  };
  return tenTrangThai[String(trangThai || "").toLowerCase()] || "Chưa cập nhật";
}

function layTenHinhThuc(hinhThuc) {
  const tenHinhThuc = {
    online: "Trực tuyến",
    onsite: "Tại văn phòng",
    offline: "Trực tiếp",
    remote: "Từ xa",
    hybrid: "Kết hợp",
  };
  return tenHinhThuc[String(hinhThuc || "").toLowerCase()] || hinhThuc || "Đã lên lịch";
}

function taoThongBaoTrong(noiDung) {
  const thongBao = document.createElement("p");
  thongBao.className = "trang-thai-trong";
  thongBao.textContent = noiDung;
  return thongBao;
}

function hienThiLoiDashboard() {
  document.getElementById("pheuTuyenDung").replaceChildren(
    taoThongBaoTrong("Không thể tải dữ liệu phễu tuyển dụng."),
  );
  document.getElementById("danhSachPhongVan").replaceChildren(
    taoThongBaoTrong("Không thể tải lịch phỏng vấn."),
  );
  document.getElementById("danhSachUngVienMoi").replaceChildren(
    taoThongBaoTrong("Không thể tải danh sách ứng viên."),
  );
}

function locDanhSachTongQuan(tuKhoa) {
  const tuKhoaChuanHoa = tuKhoa.trim().toLocaleLowerCase("vi");
  document.querySelectorAll(".phong-van-item").forEach((item) => {
    item.hidden = Boolean(tuKhoaChuanHoa) && !item.textContent.toLocaleLowerCase("vi").includes(tuKhoaChuanHoa);
  });
  document.querySelectorAll(".ung-vien-moi-item").forEach((item) => {
    item.hidden = Boolean(tuKhoaChuanHoa) && !item.textContent.toLocaleLowerCase("vi").includes(tuKhoaChuanHoa);
  });
}

document.getElementById("timKiemTongQuan").addEventListener("input", (event) => {
  locDanhSachTongQuan(event.target.value);
});

function hienThiThongBao(danhSach) {
  thongBaoHienTai = danhSach;
  const daXem = new Set(layThongBaoDaXem());
  const chuaXem = danhSach.filter((thongBao) => !daXem.has(maThongBao(thongBao)));
  const huyHieu = document.getElementById("soThongBao");
  const container = document.getElementById("danhSachThongBao");
  huyHieu.textContent = chuaXem.length > 9 ? "9+" : String(chuaXem.length);
  huyHieu.hidden = chuaXem.length === 0;
  container.replaceChildren();

  if (!danhSach.length) {
    container.appendChild(taoThongBaoTrong("Chưa có cập nhật ứng viên gần đây."));
    return;
  }

  danhSach.forEach((thongBao) => {
    const hang = document.createElement("article");
    const tieuDe = document.createElement("strong");
    const thoiGian = document.createElement("span");
    const ngay = new Date(String(thongBao.thoi_gian || "").replace(" ", "T"));
    hang.className = "thong-bao-item";
    tieuDe.textContent = thongBao.loai === "updated"
      ? `${thongBao.ho_ten || "Ứng viên"} có hồ sơ vừa được cập nhật`
      : `${thongBao.ho_ten || "Ứng viên"} vừa được thêm`;
    thoiGian.textContent = Number.isNaN(ngay.getTime())
      ? ""
      : ngay.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
    hang.append(tieuDe, thoiGian);
    container.appendChild(hang);
  });
}

function maThongBao(thongBao) {
  return `${thongBao.id}:${thongBao.loai}:${thongBao.thoi_gian}`;
}

function layThongBaoDaXem() {
  try {
    const daXem = JSON.parse(localStorage.getItem(khoaThongBaoDaXem) || "[]");
    return Array.isArray(daXem) ? daXem : [];
  } catch (error) {
    console.error("Không thể đọc trạng thái thông báo đã xem:", error);
    return [];
  }
}

const btnThongBao = document.getElementById("btnThongBao");
const bangThongBao = document.getElementById("bangThongBao");
btnThongBao.addEventListener("click", function (event) {
  event.stopPropagation();
  const dangMo = bangThongBao.hidden;
  bangThongBao.hidden = !dangMo;
  btnThongBao.setAttribute("aria-expanded", String(dangMo));

  if (dangMo) {
    const daXem = new Set(layThongBaoDaXem());
    thongBaoHienTai.forEach((thongBao) => daXem.add(maThongBao(thongBao)));
    localStorage.setItem(khoaThongBaoDaXem, JSON.stringify([...daXem].slice(-100)));
    hienThiThongBao(thongBaoHienTai);
  }
});

bangThongBao.addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", () => {
  bangThongBao.hidden = true;
  btnThongBao.setAttribute("aria-expanded", "false");
});

/* Chatbot AI */

const modalHoiAI = document.getElementById("modalHoiAI");
const formHoiAI = document.getElementById("formHoiAI");
const tinNhanHoiAI = document.getElementById("chatbotTinNhan");
const loiHoiAI = document.getElementById("loiHoiAI");

function docLichSuHoiAI() {
  try {
    const lichSu = JSON.parse(localStorage.getItem(khoaLichSuHoiAI) || "[]");
    if (
      !Array.isArray(lichSu) ||
      lichSu.some((tinNhan) =>
        !["user", "assistant"].includes(tinNhan?.role) ||
        typeof tinNhan?.text !== "string"
      )
    ) {
      throw new Error("Lịch sử chatbot đã lưu không đúng định dạng.");
    }
    return lichSu;
  } catch (error) {
    console.error("Không thể khôi phục lịch sử chatbot:", error);
    return [];
  }
}

function luuLichSuHoiAI() {
  try {
    localStorage.setItem(khoaLichSuHoiAI, JSON.stringify(lichSuHoiAI));
  } catch (error) {
    console.error("Không thể lưu lịch sử chatbot:", error);
    loiHoiAI.textContent = "Không lưu được lịch sử chat trên trình duyệt này.";
  }
}

function hienThiLichSuHoiAI() {
  if (!lichSuHoiAI.length) return;
  tinNhanHoiAI.replaceChildren();
  lichSuHoiAI.forEach((tinNhan) => {
    hienThiTinNhanHoiAI(tinNhan.text, tinNhan.role === "user" ? "nguoi-dung" : "ai");
  });
}

function xoaLichSuHoiAI() {
  lichSuHoiAI = [];
  localStorage.removeItem(khoaLichSuHoiAI);
}

document.getElementById("btnHoiAI").addEventListener("click", () => {
  modalHoiAI.classList.add("hien");
  hienThiLichSuHoiAI();
  document.getElementById("noiDungHoiAI").focus();
});

document.getElementById("btnDongHoiAI").addEventListener("click", () => {
  modalHoiAI.classList.remove("hien");
});

modalHoiAI.addEventListener("click", (event) => {
  if (event.target === modalHoiAI) modalHoiAI.classList.remove("hien");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    modalHoiAI.classList.remove("hien");
    bangThongBao.hidden = true;
    btnThongBao.setAttribute("aria-expanded", "false");
  }
});

formHoiAI.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("noiDungHoiAI");
  const cauHoi = input.value.trim();
  const nutGui = document.getElementById("btnGuiHoiAI");
  if (!cauHoi) return;

  lichSuHoiAI.push({ role: "user", text: cauHoi });
  luuLichSuHoiAI();
  hienThiTinNhanHoiAI(cauHoi, "nguoi-dung");
  input.value = "";
  loiHoiAI.textContent = "";
  nutGui.disabled = true;

  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ messages: lichSuHoiAI.slice(-10) }),
    });
    const noiDung = await response.text();
    let data;
    try {
      data = JSON.parse(noiDung);
    } catch (error) {
      if (/^\s*<!doctype html|^\s*<html/i.test(noiDung)) {
        throw new Error("Máy chủ chưa nhận phiên bản có API Hỏi AI. Hãy khởi động lại máy chủ hoặc triển khai lại bản mới nhất.");
      }
      throw new Error("Máy chủ trả về dữ liệu không hợp lệ khi hỏi AI.");
    }
    if (response.status === 401) {
      dangXuat();
      return;
    }
    if (!response.ok) throw new Error(data.message || "Không thể gửi câu hỏi đến AI.");

    lichSuHoiAI.push({ role: "assistant", text: data.reply });
    luuLichSuHoiAI();
    hienThiTinNhanHoiAI(data.reply, "ai");
  } catch (error) {
    console.error(error);
    loiHoiAI.textContent = error.message || "Không thể kết nối đến AI.";
  } finally {
    nutGui.disabled = false;
    input.focus();
  }
});

function hienThiTinNhanHoiAI(noiDung, loai) {
  const tinNhan = document.createElement("p");
  tinNhan.className = `chatbot-tin-nhan-${loai}`;
  tinNhan.textContent = noiDung;
  tinNhanHoiAI.appendChild(tinNhan);
  tinNhanHoiAI.scrollTop = tinNhanHoiAI.scrollHeight;
}

/* Thông tin tài khoản */

document
  .getElementById("btnThongTin")
  .addEventListener("click", async function () {
    menuTaiKhoan.classList.remove("hien");

    await moModalThongTin();
  });

async function moModalThongTin() {
  try {
    const response = await fetch("/api/tai-khoan", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (response.status === 401) {
      dangXuat();

      return;
    }

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Không lấy được thông tin tài khoản.");

      return;
    }

    document.getElementById("taiKhoanHoTen").value = data.ho_ten;

    document.getElementById("taiKhoanEmail").value = data.email;

    document.getElementById("taiKhoanVaiTro").value = layTenVaiTro(
      data.vai_tro,
    );

    document.getElementById("modalThongTin").classList.add("hien");
  } catch (error) {
    console.error(error);

    alert("Không thể kết nối đến máy chủ.");
  }
}

/* Đóng thông tin */

document
  .getElementById("btnDongThongTin")
  .addEventListener("click", function () {
    document.getElementById("modalThongTin").classList.remove("hien");
  });

document
  .getElementById("btnHuyThongTin")
  .addEventListener("click", function () {
    document.getElementById("modalThongTin").classList.remove("hien");
  });

/* Lưu thông tin */

document
  .getElementById("formThongTin")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const hoTen = document.getElementById("taiKhoanHoTen").value.trim();

    const email = document.getElementById("taiKhoanEmail").value.trim();

    const thongBao = document.getElementById("thongBaoThongTin");

    thongBao.className = "thong-bao";

    thongBao.textContent = "";

    try {
      const response = await fetch("/api/tai-khoan", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",

          Authorization: "Bearer " + token,
        },

        body: JSON.stringify({
          ho_ten: hoTen,

          email: email,
        }),
      });

      if (response.status === 401) {
        dangXuat();

        return;
      }

      const data = await response.json();

      if (!response.ok) {
        thongBao.textContent = data.message;

        thongBao.classList.add("hien");

        return;
      }

      nguoiDung.ho_ten = hoTen;

      nguoiDung.email = email;

      localStorage.setItem("nguoi_dung", JSON.stringify(nguoiDung));

      tenNguoiDung.textContent = hoTen;

      avatar.textContent = hoTen.charAt(0).toUpperCase();

      document.getElementById("tenMenuTaiKhoan").textContent = hoTen;

      document.getElementById("emailMenuTaiKhoan").textContent = email;

      thongBao.textContent = "Cập nhật thông tin thành công.";

      thongBao.classList.add("hien", "thanh-cong");

      setTimeout(function () {
        document.getElementById("modalThongTin").classList.remove("hien");
      }, 700);
    } catch (error) {
      console.error(error);

      thongBao.textContent = "Không thể kết nối đến máy chủ.";

      thongBao.classList.add("hien");
    }
  });

/* Đổi mật khẩu */

document.getElementById("btnDoiMatKhau").addEventListener("click", function () {
  menuTaiKhoan.classList.remove("hien");

  document.getElementById("formMatKhau").reset();

  document.getElementById("thongBaoMatKhau").className = "thong-bao";

  document.getElementById("modalMatKhau").classList.add("hien");
});

/* Đóng đổi mật khẩu */

document
  .getElementById("btnDongMatKhau")
  .addEventListener("click", function () {
    document.getElementById("modalMatKhau").classList.remove("hien");
  });

document.getElementById("btnHuyMatKhau").addEventListener("click", function () {
  document.getElementById("modalMatKhau").classList.remove("hien");
});

/* Lưu mật khẩu */

document
  .getElementById("formMatKhau")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const matKhauCu = document.getElementById("matKhauCu").value;

    const matKhauMoi = document.getElementById("matKhauMoi").value;

    const xacNhan = document.getElementById("xacNhanMatKhau").value;

    const thongBao = document.getElementById("thongBaoMatKhau");

    thongBao.className = "thong-bao";

    thongBao.textContent = "";

    if (matKhauMoi !== xacNhan) {
      thongBao.textContent = "Mật khẩu xác nhận không khớp.";

      thongBao.classList.add("hien");

      return;
    }

    if (matKhauMoi.length < 6) {
      thongBao.textContent = "Mật khẩu mới phải có ít nhất 6 ký tự.";

      thongBao.classList.add("hien");

      return;
    }

    try {
      const response = await fetch("/api/tai-khoan/mat-khau", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",

          Authorization: "Bearer " + token,
        },

        body: JSON.stringify({
          mat_khau_cu: matKhauCu,

          mat_khau_moi: matKhauMoi,
        }),
      });

      if (response.status === 401) {
        dangXuat();

        return;
      }

      const data = await response.json();

      if (!response.ok) {
        thongBao.textContent = data.message;

        thongBao.classList.add("hien");

        return;
      }

      thongBao.textContent = "Đổi mật khẩu thành công.";

      thongBao.classList.add("hien", "thanh-cong");

      setTimeout(function () {
        document.getElementById("modalMatKhau").classList.remove("hien");
      }, 700);
    } catch (error) {
      console.error(error);

      thongBao.textContent = "Không thể kết nối đến máy chủ.";

      thongBao.classList.add("hien");
    }
  });

/* Đăng xuất */

document.getElementById("btnDangXuat").addEventListener("click", function () {
  dangXuat();
});

function dangXuat() {
  xoaLichSuHoiAI();
  localStorage.removeItem("token");

  localStorage.removeItem("nguoi_dung");

  window.location.href = "/login/login.html";
}

/* Chạy */

layDuLieuDashboard();

const thaoTacTaiKhoan = new URLSearchParams(window.location.search).get(
  "account",
);
if (thaoTacTaiKhoan === "info") {
  document.getElementById("btnThongTin").click();
} else if (thaoTacTaiKhoan === "password") {
  document.getElementById("btnDoiMatKhau").click();
}
