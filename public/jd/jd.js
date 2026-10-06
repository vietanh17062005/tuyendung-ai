const token = localStorage.getItem("token");

let nguoiDung = null;

try {
  nguoiDung = JSON.parse(
    localStorage.getItem("nguoi_dung") || "null"
  );
} catch (error) {
  nguoiDung = null;
}

if (!token || !nguoiDung) {
  window.location.href = "/login/login.html";
}

document.addEventListener("DOMContentLoaded", function () {
  // =========================
  // DOM
  // =========================

  const tenNguoiDung = document.getElementById("tenNguoiDung");
  const vaiTro = document.getElementById("vaiTro");
  const avatar = document.getElementById("avatar");

  const menuNguoiDung = document.getElementById("menuNguoiDung");
  const taiKhoan = document.getElementById("taiKhoan");
  const menuTaiKhoan = document.getElementById("menuTaiKhoan");
  const tenMenuTaiKhoan = document.getElementById("tenMenuTaiKhoan");
  const emailMenuTaiKhoan = document.getElementById("emailMenuTaiKhoan");

  const danhSachJD = document.getElementById("danhSachJD");
  const tongSo = document.getElementById("tongSo");

  const oTimKiem = document.getElementById("oTimKiem");
  const locTrangThai = document.getElementById("locTrangThai");

  const btnThem = document.getElementById("btnThem");

  const modal = document.getElementById("modal");
  const btnDong = document.getElementById("btnDong");
  const btnHuy = document.getElementById("btnHuy");

  const formJD = document.getElementById("formJD");

  const jdId = document.getElementById("jdId");
  const dotTuyenId = document.getElementById("dotTuyenId");
  const tieuDe = document.getElementById("tieuDe");
  const moTa = document.getElementById("moTa");
  const yeuCau = document.getElementById("yeuCau");
  const quyenLoi = document.getElementById("quyenLoi");
  const tieuChi = document.getElementById("tieuChi");

  const tieuDeModal = document.getElementById("tieuDeModal");
  const cotThaoTac = document.getElementById("cotThaoTac");

  // Modal Xem JD
  const modalXem = document.getElementById("modalXem");
  const btnDongXem = document.getElementById("btnDongXem");
  const btnDongXemCuoi = document.getElementById("btnDongXemCuoi");

  const xemTieuDe = document.getElementById("xemTieuDe");
  const xemTrangThai = document.getElementById("xemTrangThai");
  const xemDotTuyen = document.getElementById("xemDotTuyen");
  const xemNguoiDuyet = document.getElementById("xemNguoiDuyet");
  const xemNgayTao = document.getElementById("xemNgayTao");
  const xemMoTa = document.getElementById("xemMoTa");
  const xemYeuCau = document.getElementById("xemYeuCau");
  const xemQuyenLoi = document.getElementById("xemQuyenLoi");
  const xemTieuChi = document.getElementById("xemTieuChi");

  // Modal xác nhận
  const modalXacNhan = document.getElementById("modalXacNhan");
  const noiDungXacNhan = document.getElementById("noiDungXacNhan");
  const btnXacNhan = document.getElementById("btnXacNhan");
  const btnHuyXacNhan = document.getElementById("btnHuyXacNhan");

  let hanhDongChoXacNhan = null;
  let danhSachGoc = [];

  // =========================
  // QUYỀN
  // =========================

  const vaiTroNguoiDung = nguoiDung?.vai_tro || "";

  const coQuyenQuanLy = [
    "admin",
    "manager"
  ].includes(vaiTroNguoiDung);

  const coQuyenDuyet = [
    "admin",
    "manager"
  ].includes(vaiTroNguoiDung);

  // =========================
  // THÔNG TIN NGƯỜI DÙNG
  // =========================

  if (tenNguoiDung) {
    tenNguoiDung.textContent =
      nguoiDung?.ho_ten ||
      nguoiDung?.ten_dang_nhap ||
      "Người dùng";
  }

  if (vaiTro) {
    vaiTro.textContent =
      nguoiDung?.vai_tro || "";
  }

  if (tenMenuTaiKhoan) {
    tenMenuTaiKhoan.textContent =
      nguoiDung?.ho_ten ||
      nguoiDung?.ten_dang_nhap ||
      "Người dùng";
  }

  if (emailMenuTaiKhoan) {
    emailMenuTaiKhoan.textContent =
      nguoiDung?.email || "";
  }

  if (avatar) {
    const ten =
      nguoiDung?.ho_ten ||
      nguoiDung?.ten_dang_nhap ||
      "U";

    avatar.textContent =
      ten.charAt(0).toUpperCase();
  }

  // =========================
  // MENU TÀI KHOẢN
  // =========================

  if (taiKhoan && menuTaiKhoan) {
    taiKhoan.addEventListener(
      "click",
      function (event) {
        event.stopPropagation();

        menuTaiKhoan.classList.toggle("hien");
      }
    );

    document.addEventListener(
      "click",
      function () {
        menuTaiKhoan.classList.remove("hien");
      }
    );

    menuTaiKhoan.addEventListener(
      "click",
      function (event) {
        event.stopPropagation();
      }
    );
  }

  // =========================
  // HEADER API
  // =========================

  function headersJson() {
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    };
  }

  function headersAuth() {
    return {
      Authorization: "Bearer " + token
    };
  }

  // =========================
  // THÔNG BÁO
  // =========================

  function hienThongBao(message) {
    alert(message);
  }

  // =========================
  // ĐỌC JSON
  // =========================

  async function docJSON(response) {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return {
        message: text
      };
    }
  }

  // =========================
  // ĐĂNG XUẤT KHI TOKEN HẾT HẠN
  // =========================

  function xuLyHetPhien() {
    localStorage.removeItem("token");
    localStorage.removeItem("nguoi_dung");

    window.location.href = "/login/login.html";
  }

  // =========================
  // CHUẨN HÓA TIÊU CHÍ
  // =========================

  function chuanHoaTieuChi(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    if (typeof value === "string") {
      const text = value.trim();

      return text === "" ? null : text;
    }

    return JSON.stringify(value);
  }

  // =========================
  // TRẠNG THÁI
  // =========================

  function layTenTrangThai(trangThai) {
    const danhSach = {
      nhap: "Nháp",
      cho_duyet: "Chờ duyệt",
      da_duyet: "Đã duyệt",
      tu_choi: "Từ chối",
      huy: "Đã hủy"
    };

    return danhSach[trangThai] || trangThai || "-";
  }

  function layClassTrangThai(trangThai) {
    const danhSach = {
      nhap: "nhap",
      cho_duyet: "cho_duyet",
      da_duyet: "da_duyet",
      tu_choi: "tu_choi",
      huy: "huy"
    };

    return danhSach[trangThai] || "";
  }

  // =========================
  // FORMAT NGÀY
  // =========================

  function dinhDangNgay(value) {
    if (!value) {
      return "-";
    }

    const ngay = new Date(value);

    if (isNaN(ngay.getTime())) {
      return "-";
    }

    return ngay.toLocaleDateString(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );
  }

  // =========================
  // ESCAPE HTML
  // =========================

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // =========================
  // ĐỢT TUYỂN DỤNG
  // =========================

  async function layDotTuyen(dotTuyenDangChon = "") {
    if (!dotTuyenId) {
      return;
    }

    try {
      const response = await fetch(
        "/api/dot-tuyen",
        {
          headers: headersAuth()
        }
      );

      const data = await docJSON(response);

      if (response.status === 401) {
        xuLyHetPhien();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Không thể tải danh sách đợt tuyển dụng."
        );
      }

      let danhSach = [];

      if (Array.isArray(data)) {
        danhSach = data;
      } else if (Array.isArray(data.data)) {
        danhSach = data.data;
      } else if (Array.isArray(data.danhSach)) {
        danhSach = data.danhSach;
      }

      const trangThaiKhongHoatDong = [
        "tam_dung",
        "ket_thuc",
        "da_dong",
        "dong",
        "closed"
      ];

      danhSach.sort(function (a, b) {
        const aKhongHoatDong =
          trangThaiKhongHoatDong.includes(
            a.trang_thai
          );

        const bKhongHoatDong =
          trangThaiKhongHoatDong.includes(
            b.trang_thai
          );

        if (
          aKhongHoatDong &&
          !bKhongHoatDong
        ) {
          return 1;
        }

        if (
          !aKhongHoatDong &&
          bKhongHoatDong
        ) {
          return -1;
        }

        return String(
          a.ten_dot || ""
        ).localeCompare(
          String(b.ten_dot || ""),
          "vi"
        );
      });

      dotTuyenId.innerHTML =
        '<option value="">-- Chọn đợt tuyển dụng --</option>';

      danhSach.forEach(function (dotTuyen) {
        const option =
          document.createElement("option");

        const trangThai =
          dotTuyen.trang_thai || "";

        const khoa =
          trangThaiKhongHoatDong.includes(
            trangThai
          );

        let nhanTrangThai = "";

        if (trangThai === "tam_dung") {
          nhanTrangThai = " (Tạm dừng)";
        } else if (
          [
            "ket_thuc",
            "da_dong",
            "dong",
            "closed"
          ].includes(trangThai)
        ) {
          nhanTrangThai = " (Đã kết thúc)";
        }

        option.value =
          String(dotTuyen.id);

        option.textContent =
          (dotTuyen.ten_dot ||
            "Không có tên") +
          nhanTrangThai;

        option.disabled =
          khoa &&
          String(dotTuyen.id) !==
            String(dotTuyenDangChon);

        if (
          String(dotTuyen.id) ===
          String(dotTuyenDangChon)
        ) {
          option.selected = true;
        }

        if (khoa) {
          option.style.color = "#999";
        }

        dotTuyenId.appendChild(option);
      });

      if (dotTuyenDangChon !== "") {
        dotTuyenId.value =
          String(dotTuyenDangChon);
      }

    } catch (error) {
      console.error(
        "Lỗi tải đợt tuyển dụng:",
        error
      );

      hienThongBao(
        error.message ||
        "Không thể tải danh sách đợt tuyển dụng."
      );
    }
  }

  // =========================
  // TẢI DANH SÁCH JD
  // =========================

  async function taiDanhSachJD() {
    try {
      const response = await fetch(
        "/api/jd",
        {
          headers: headersAuth()
        }
      );

      const data = await docJSON(response);

      if (response.status === 401) {
        xuLyHetPhien();
        return [];
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Không thể tải danh sách JD."
        );
      }

      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data.data)) {
        return data.data;
      }

      if (Array.isArray(data.danhSach)) {
        return data.danhSach;
      }

      return [];

    } catch (error) {
      console.error(
        "Lỗi tải danh sách JD:",
        error
      );

      hienThongBao(
        error.message ||
        "Không thể tải danh sách JD."
      );

      return [];
    }
  }

  // =========================
  // HIỂN THỊ DANH SÁCH JD
  // =========================

  function renderDanhSachJD(danhSach) {
    if (!danhSachJD) {
      return;
    }

    const tuKhoa =
      oTimKiem?.value
        ?.trim()
        .toLowerCase() || "";

    const trangThaiLoc =
      locTrangThai?.value || "";

    const ketQua =
      danhSach.filter(function (jd) {
        const phuHopTuKhoa =
          !tuKhoa ||
          String(jd.tieu_de || "")
            .toLowerCase()
            .includes(tuKhoa) ||
          String(jd.ten_dot_tuyen || "")
            .toLowerCase()
            .includes(tuKhoa);

        const phuHopTrangThai =
          !trangThaiLoc ||
          jd.trang_thai === trangThaiLoc;

        return (
          phuHopTuKhoa &&
          phuHopTrangThai
        );
      });

    if (tongSo) {
      tongSo.textContent =
        ketQua.length + " JD";
    }

    if (ketQua.length === 0) {
      danhSachJD.innerHTML = `
        <tr>
          <td
            colspan="${coQuyenQuanLy ? 7 : 6}"
            style="text-align: center;"
          >
            Chưa có JD nào.
          </td>
        </tr>
      `;

      return;
    }

    danhSachJD.innerHTML =
      ketQua
        .map(function (jd, index) {
          return taoDongJD(
            jd,
            index + 1
          );
        })
        .join("");
  }

  // =========================
  // TẠO DÒNG JD
  // =========================

  function taoDongJD(jd, stt) {
    const trangThai =
      jd.trang_thai || "nhap";

    let thaoTac = `
      <button
        type="button"
        class="btn-xem"
        data-action="xem"
        data-id="${escapeHTML(jd.id)}"
      >
        Xem
      </button>
    `;

    if (coQuyenQuanLy) {

      if (trangThai === "nhap") {
        thaoTac += `
          <button
            type="button"
            class="btn-sua"
            data-action="sua"
            data-id="${escapeHTML(jd.id)}"
          >
            Sửa
          </button>

          <button
            type="button"
            class="btn-gui-duyet"
            data-action="gui-duyet"
            data-id="${escapeHTML(jd.id)}"
          >
            Gửi duyệt
          </button>

          <button
            type="button"
            class="btn-huy"
            data-action="huy"
            data-id="${escapeHTML(jd.id)}"
          >
            Hủy
          </button>

          <button
            type="button"
            class="btn-xoa"
            data-action="xoa"
            data-id="${escapeHTML(jd.id)}"
          >
            Xóa
          </button>
        `;
      }

      else if (trangThai === "cho_duyet") {
        thaoTac += `
          <button
            type="button"
            class="btn-sua"
            data-action="sua"
            data-id="${escapeHTML(jd.id)}"
          >
            Sửa
          </button>

          <button
            type="button"
            class="btn-duyet"
            data-action="duyet"
            data-id="${escapeHTML(jd.id)}"
          >
            Duyệt
          </button>

          <button
            type="button"
            class="btn-tu-choi"
            data-action="tu-choi"
            data-id="${escapeHTML(jd.id)}"
          >
            Từ chối
          </button>

          <button
            type="button"
            class="btn-huy"
            data-action="huy"
            data-id="${escapeHTML(jd.id)}"
          >
            Hủy
          </button>
        `;
      }

      else if (trangThai === "da_duyet") {
        thaoTac += `
          <button
            type="button"
            class="btn-sua"
            data-action="sua"
            data-id="${escapeHTML(jd.id)}"
          >
            Sửa
          </button>

          <button
            type="button"
            class="btn-tu-choi"
            data-action="tu-choi"
            data-id="${escapeHTML(jd.id)}"
          >
            Từ chối
          </button>

          <button
            type="button"
            class="btn-huy"
            data-action="huy"
            data-id="${escapeHTML(jd.id)}"
          >
            Hủy
          </button>
        `;
      }

      else if (trangThai === "tu_choi") {
        thaoTac += `
          <button
            type="button"
            class="btn-sua"
            data-action="sua"
            data-id="${escapeHTML(jd.id)}"
          >
            Sửa
          </button>

          <button
            type="button"
            class="btn-gui-duyet"
            data-action="gui-duyet"
            data-id="${escapeHTML(jd.id)}"
          >
            Gửi duyệt
          </button>

          <button
            type="button"
            class="btn-huy"
            data-action="huy"
            data-id="${escapeHTML(jd.id)}"
          >
            Hủy
          </button>

          <button
            type="button"
            class="btn-xoa"
            data-action="xoa"
            data-id="${escapeHTML(jd.id)}"
          >
            Xóa
          </button>
        `;
      }

      else if (trangThai === "huy") {
        thaoTac += `
          <button
            type="button"
            class="btn-xoa"
            data-action="xoa"
            data-id="${escapeHTML(jd.id)}"
          >
            Xóa
          </button>
        `;
      }
    }

    return `
      <tr>
        <td>${stt}</td>

        <td>
          ${escapeHTML(
            jd.tieu_de || "-"
          )}
        </td>

        <td>
          ${escapeHTML(
            jd.ten_dot_tuyen || "-"
          )}
        </td>

        <td>
          <span
            class="trang-thai ${layClassTrangThai(
              trangThai
            )}"
          >
            ${layTenTrangThai(
              trangThai
            )}
          </span>
        </td>

        <td>
          ${escapeHTML(
            jd.ten_nguoi_duyet || "-"
          )}
        </td>

        <td>
          ${dinhDangNgay(
            jd.ngay_tao
          )}
        </td>

        ${
          coQuyenQuanLy
            ? `<td class="action">${thaoTac}</td>`
            : ""
        }
      </tr>
    `;
  }

  // =========================
  // MỞ MODAL THÊM JD
  // =========================

  if (btnThem) {
    btnThem.addEventListener(
      "click",
      async function () {
        if (!coQuyenQuanLy) {
          return;
        }

        if (formJD) {
          formJD.reset();
        }

        if (jdId) {
          jdId.value = "";
        }

        if (tieuDeModal) {
          tieuDeModal.textContent =
            "Tạo JD";
        }

        await layDotTuyen("");

        if (modal) {
          modal.classList.add("hien");
        }
      }
    );
  }

  // =========================
  // ĐÓNG MODAL TẠO / SỬA
  // =========================

  function dongModalJD() {
    if (modal) {
      modal.classList.remove("hien");
    }

    if (formJD) {
      formJD.reset();
    }

    if (jdId) {
      jdId.value = "";
    }
  }

  if (btnDong) {
    btnDong.addEventListener(
      "click",
      function (event) {
        event.preventDefault();

        dongModalJD();
      }
    );
  }

  if (btnHuy) {
    btnHuy.addEventListener(
      "click",
      function (event) {
        event.preventDefault();

        dongModalJD();
      }
    );
  }

  // =========================
  // SỬA JD
  // =========================

  async function suaJD(id) {
    if (!coQuyenQuanLy) {
      return;
    }

    try {
      const response = await fetch(
        `/api/jd/${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers: headersAuth()
        }
      );

      const data =
        await docJSON(response);

      if (response.status === 401) {
        xuLyHetPhien();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Không thể lấy thông tin JD."
        );
      }

      const jd =
        data.data ||
        data.jd ||
        data;

      if (!jd || !jd.id) {
        throw new Error(
          "Dữ liệu JD không hợp lệ."
        );
      }

      await layDotTuyen(
        jd.dot_tuyen_id || ""
      );

      if (jdId) {
        jdId.value =
          String(jd.id);
      }

      if (dotTuyenId) {
        dotTuyenId.value =
          String(
            jd.dot_tuyen_id || ""
          );
      }

      if (tieuDe) {
        tieuDe.value =
          jd.tieu_de || "";
      }

      if (moTa) {
        moTa.value =
          jd.mo_ta || "";
      }

      if (yeuCau) {
        yeuCau.value =
          jd.yeu_cau || "";
      }

      if (quyenLoi) {
        quyenLoi.value =
          jd.quyen_loi || "";
      }

      if (tieuChi) {
        if (
          jd.tieu_chi !== null &&
          jd.tieu_chi !== undefined
        ) {
          if (
            typeof jd.tieu_chi ===
            "object"
          ) {
            tieuChi.value =
              JSON.stringify(
                jd.tieu_chi,
                null,
                2
              );
          } else {
            tieuChi.value =
              jd.tieu_chi;
          }
        } else {
          tieuChi.value = "";
        }
      }

      if (tieuDeModal) {
        tieuDeModal.textContent =
          "Sửa JD";
      }

      if (modal) {
        modal.classList.add("hien");
      }

    } catch (error) {
      console.error(
        "Lỗi sửa JD:",
        error
      );

      hienThongBao(
        error.message ||
        "Không thể lấy thông tin JD."
      );
    }
  }

  // =========================
  // LƯU / CẬP NHẬT JD
  // =========================

  if (formJD) {
    formJD.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        if (!coQuyenQuanLy) {
          return;
        }

        const id =
          jdId?.value?.trim() || "";

        const dotId =
          dotTuyenId?.value?.trim() || "";

        const tieuDeValue =
          tieuDe?.value?.trim() || "";

        if (!dotId) {
          hienThongBao(
            "Vui lòng chọn đợt tuyển dụng."
          );

          dotTuyenId?.focus();
          return;
        }

        if (!tieuDeValue) {
          hienThongBao(
            "Vui lòng nhập tiêu đề JD."
          );

          tieuDe?.focus();
          return;
        }

        const payload = {
          dot_tuyen_id: Number(dotId),
          tieu_de: tieuDeValue,
          mo_ta:
            moTa?.value?.trim() || "",
          yeu_cau:
            yeuCau?.value?.trim() || "",
          quyen_loi:
            quyenLoi?.value?.trim() || "",
          tieu_chi:
            chuanHoaTieuChi(
              tieuChi?.value
            )
        };

        const url = id
          ? `/api/jd/${encodeURIComponent(id)}`
          : "/api/jd";

        const method = id
          ? "PUT"
          : "POST";

        try {
          const response =
            await fetch(
              url,
              {
                method: method,
                headers:
                  headersJson(),
                body:
                  JSON.stringify(
                    payload
                  )
              }
            );

          const data =
            await docJSON(
              response
            );

          if (response.status === 401) {
            xuLyHetPhien();
            return;
          }

          if (response.status === 403) {
            hienThongBao(
              data.message ||
              "Bạn không có quyền cập nhật JD."
            );

            return;
          }

          if (!response.ok) {
            throw new Error(
              data.message ||
              data.error ||
              "Không thể cập nhật JD."
            );
          }

          hienThongBao(
            id
              ? "Cập nhật JD thành công."
              : "Thêm JD thành công."
          );

          dongModalJD();

          danhSachGoc =
            await taiDanhSachJD();

          renderDanhSachJD(
            danhSachGoc
          );

        } catch (error) {
          console.error(
            "Lỗi lưu JD:",
            error
          );

          hienThongBao(
            error.message ||
            "Không thể kết nối máy chủ."
          );
        }
      }
    );
  }

  // =========================
  // XEM JD
  // =========================

  async function xemJD(id) {
    try {
      const response = await fetch(
        `/api/jd/${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers: headersAuth()
        }
      );

      const data =
        await docJSON(response);

      if (response.status === 401) {
        xuLyHetPhien();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Không thể lấy thông tin JD."
        );
      }

      const jd =
        data.data ||
        data.jd ||
        data;

      if (!jd) {
        throw new Error(
          "Không tìm thấy dữ liệu JD."
        );
      }

      // Tiêu đề
      if (xemTieuDe) {
        xemTieuDe.textContent =
          jd.tieu_de || "-";
      }

      // Đợt tuyển dụng
      if (xemDotTuyen) {
        xemDotTuyen.textContent =
          jd.ten_dot_tuyen || "-";
      }

      // Trạng thái
      if (xemTrangThai) {
        xemTrangThai.textContent =
          layTenTrangThai(
            jd.trang_thai
          );

        xemTrangThai.className =
          "trang-thai " +
          layClassTrangThai(
            jd.trang_thai
          );
      }

      // Người duyệt
      if (xemNguoiDuyet) {
        xemNguoiDuyet.textContent =
          jd.ten_nguoi_duyet || "-";
      }

      // Ngày tạo
      if (xemNgayTao) {
        xemNgayTao.textContent =
          dinhDangNgay(
            jd.ngay_tao
          );
      }

      // Mô tả
      if (xemMoTa) {
        xemMoTa.textContent =
          jd.mo_ta ||
          "Không có thông tin";
      }

      // Yêu cầu
      if (xemYeuCau) {
        xemYeuCau.textContent =
          jd.yeu_cau ||
          "Không có thông tin";
      }

      // Quyền lợi
      if (xemQuyenLoi) {
        xemQuyenLoi.textContent =
          jd.quyen_loi ||
          "Không có thông tin";
      }

      // Tiêu chí
      if (xemTieuChi) {
        if (
          jd.tieu_chi === null ||
          jd.tieu_chi === undefined ||
          jd.tieu_chi === ""
        ) {
          xemTieuChi.textContent =
            "Không có thông tin";
        } else if (
          typeof jd.tieu_chi ===
          "object"
        ) {
          xemTieuChi.textContent =
            JSON.stringify(
              jd.tieu_chi,
              null,
              2
            );
        } else {
          xemTieuChi.textContent =
            jd.tieu_chi;
        }
      }

      // Mở modal
      if (modalXem) {
        modalXem.classList.add("hien");
      }

    } catch (error) {
      console.error(
        "Lỗi xem JD:",
        error
      );

      hienThongBao(
        error.message ||
        "Không thể xem thông tin JD."
      );
    }
  }

  // =========================
  // ĐÓNG MODAL XEM JD
  // =========================

  function dongModalXem() {
    if (modalXem) {
      modalXem.classList.remove("hien");
    }
  }

  if (btnDongXem) {
    btnDongXem.addEventListener(
      "click",
      function (event) {
        event.preventDefault();
        event.stopPropagation();

        dongModalXem();
      }
    );
  }

  if (btnDongXemCuoi) {
    btnDongXemCuoi.addEventListener(
      "click",
      function (event) {
        event.preventDefault();
        event.stopPropagation();

        dongModalXem();
      }
    );
  }

  // =========================
  // XÁC NHẬN
  // =========================

  function moXacNhan(
    message,
    callback
  ) {
    if (
      !modalXacNhan ||
      !btnXacNhan
    ) {
      if (confirm(message)) {
        callback();
      }

      return;
    }

    if (noiDungXacNhan) {
      noiDungXacNhan.textContent =
        message;
    }

    hanhDongChoXacNhan =
      callback;

    modalXacNhan.classList.add(
      "hien"
    );
  }

  function dongXacNhan() {
    if (modalXacNhan) {
      modalXacNhan.classList.remove(
        "hien"
      );
    }

    hanhDongChoXacNhan =
      null;
  }

  if (btnHuyXacNhan) {
    btnHuyXacNhan.addEventListener(
      "click",
      function (event) {
        event.preventDefault();

        dongXacNhan();
      }
    );
  }

  if (btnXacNhan) {
    btnXacNhan.addEventListener(
      "click",
      async function (event) {
        event.preventDefault();

        const callback =
          hanhDongChoXacNhan;

        dongXacNhan();

        if (callback) {
          await callback();
        }
      }
    );
  }

  // =========================
  // THAY ĐỔI TRẠNG THÁI
  // =========================

  async function thayDoiTrangThai(
    id,
    action,
    message
  ) {
    if (!coQuyenDuyet) {
      return;
    }

    moXacNhan(
      message,
      async function () {
        try {
          const response =
            await fetch(
              `/api/jd/${encodeURIComponent(
                id
              )}/${action}`,
              {
                method: "PUT",
                headers:
                  headersJson()
              }
            );

          const data =
            await docJSON(
              response
            );

          if (response.status === 401) {
            xuLyHetPhien();
            return;
          }

          if (!response.ok) {
            throw new Error(
              data.message ||
              data.error ||
              "Không thể thực hiện thao tác."
            );
          }

          hienThongBao(
            data.message ||
            "Thao tác thành công."
          );

          danhSachGoc =
            await taiDanhSachJD();

          renderDanhSachJD(
            danhSachGoc
          );

        } catch (error) {
          console.error(
            "Lỗi thao tác JD:",
            error
          );

          hienThongBao(
            error.message ||
            "Không thể kết nối máy chủ."
          );
        }
      }
    );
  }

  // =========================
  // XÓA JD
  // =========================

  async function xoaJD(id) {
    if (!coQuyenQuanLy) {
      return;
    }

    moXacNhan(
      "Bạn có chắc chắn muốn xóa JD này không?",
      async function () {
        try {
          const response =
            await fetch(
              `/api/jd/${encodeURIComponent(
                id
              )}`,
              {
                method: "DELETE",
                headers:
                  headersJson()
              }
            );

          const data =
            await docJSON(
              response
            );

          if (response.status === 401) {
            xuLyHetPhien();
            return;
          }

          if (!response.ok) {
            throw new Error(
              data.message ||
              data.error ||
              "Không thể xóa JD."
            );
          }

          hienThongBao(
            data.message ||
            "Xóa JD thành công."
          );

          danhSachGoc =
            await taiDanhSachJD();

          renderDanhSachJD(
            danhSachGoc
          );

        } catch (error) {
          console.error(
            "Lỗi xóa JD:",
            error
          );

          hienThongBao(
            error.message ||
            "Không thể kết nối máy chủ."
          );
        }
      }
    );
  }

  // =========================
  // CLICK NÚT TRONG BẢNG
  // =========================

  if (danhSachJD) {
    danhSachJD.addEventListener(
      "click",
      async function (event) {
        const button =
          event.target.closest(
            "button[data-action]"
          );

        if (!button) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action =
          button.getAttribute(
            "data-action"
          );

        const id =
          button.getAttribute(
            "data-id"
          );

        if (!action || !id) {
          console.error(
            "Thiếu action hoặc id:",
            {
              action,
              id
            }
          );

          return;
        }

        if (action === "xem") {
          await xemJD(id);
          return;
        }

        if (action === "sua") {
          await suaJD(id);
          return;
        }

        if (action === "gui-duyet") {
          await thayDoiTrangThai(
            id,
            "gui-duyet",
            "Bạn có muốn gửi JD này để duyệt không?"
          );

          return;
        }

        if (action === "duyet") {
          await thayDoiTrangThai(
            id,
            "duyet",
            "Bạn có chắc chắn muốn duyệt JD này không?"
          );

          return;
        }

        if (action === "tu-choi") {
          await thayDoiTrangThai(
            id,
            "tu-choi",
            "Bạn có chắc chắn muốn từ chối JD này không?"
          );

          return;
        }

        if (action === "huy") {
          await thayDoiTrangThai(
            id,
            "huy",
            "Bạn có chắc chắn muốn hủy JD này không?"
          );

          return;
        }

        if (action === "xoa") {
          await xoaJD(id);
        }
      }
    );
  }

  // =========================
  // TÌM KIẾM
  // =========================

  if (oTimKiem) {
    oTimKiem.addEventListener(
      "input",
      function () {
        renderDanhSachJD(
          danhSachGoc
        );
      }
    );
  }

  // =========================
  // LỌC TRẠNG THÁI
  // =========================

  if (locTrangThai) {
    locTrangThai.addEventListener(
      "change",
      function () {
        renderDanhSachJD(
          danhSachGoc
        );
      }
    );
  }

  // =========================
  // KHỞI TẠO
  // =========================

  async function khoiTao() {
    await layDotTuyen("");

    danhSachGoc =
      await taiDanhSachJD();

    renderDanhSachJD(
      danhSachGoc
    );
  }

  khoiTao();
});