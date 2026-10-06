document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token"); // Lấy token đăng nhập

    if (!token) {
        window.location.href = "/login/login.html";
        return;
    }

    const oTimKiem = document.getElementById("oTimKiem");
    const locUngVien = document.getElementById("locUngVien");
    const locBanChinh = document.getElementById("locBanChinh");
    const btnTaiCV = document.getElementById("btnTaiCV");
    const danhSachCV = document.getElementById("danhSachCV");
    const tongSo = document.getElementById("tongSo");
    const thongBao = document.getElementById("thongBao");

    const modalCV = document.getElementById("modalCV");
    const btnDongCV = document.getElementById("btnDongCV");
    const btnHuyCV = document.getElementById("btnHuyCV");
    const formCV = document.getElementById("formCV");

    const ungVienId = document.getElementById("ungVienId");
    const fileCV = document.getElementById("fileCV");
    const laBanChinh = document.getElementById("laBanChinh");

    const modalChiTiet = document.getElementById("modalChiTiet");
    const btnDongChiTiet = document.getElementById("btnDongChiTiet");
    const btnDongChiTietCuoi = document.getElementById("btnDongChiTietCuoi");
    const metaCV = document.getElementById("metaCV");
    const noiDungChiTiet = document.getElementById("noiDungChiTiet");

    const modalXacNhan = document.getElementById("modalXacNhan");
    const btnHuyXacNhan = document.getElementById("btnHuyXacNhan");
    const btnXacNhan = document.getElementById("btnXacNhan");
    const tieuDeXacNhan = document.getElementById("tieuDeXacNhan");
    const noiDungXacNhan = document.getElementById("noiDungXacNhan");

    let danhSach = [];
    let danhSachUngVien = [];
    let cvCanXoa = null;

    const nguoiDung = JSON.parse(localStorage.getItem("nguoi_dung") || "{}");
    const vaiTro = nguoiDung.vai_tro || "";

    const coQuyenQuanLyCVChinh = ["admin", "manager", "hr"].includes(vaiTro);
    const coQuyenXoaCV = ["admin", "manager"].includes(vaiTro);

    function hienThongBao(message, type = "error") {
        if (!thongBao) return;

        thongBao.textContent = message;
        thongBao.className = type === "success"
            ? "thong-bao-cv thanh-cong"
            : "thong-bao-cv hien";

        setTimeout(function () {
            thongBao.className = "";
            thongBao.textContent = "";
        }, 4000);
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return "";

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function dinhDangKichThuoc(bytes) {
        const size = Number(bytes || 0);

        if (size < 1024) {
            return `${size} B`;
        }

        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        }

        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }

    function dinhDangNgay(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }

    function layTenUngVien(cv) {
        return (
            cv.ho_ten ||
            cv.ten_ung_vien ||
            cv.ung_vien?.ho_ten ||
            cv.tenUngVien ||
            "-"
        );
    }

    function layEmailUngVien(cv) {
        return (
            cv.email ||
            cv.email_ung_vien ||
            cv.ung_vien?.email ||
            ""
        );
    }

    function layTenFile(cv) {
        return cv.ten_file || cv.tenFile || "CV";
    }

    function layLaBanChinh(cv) {
        return Number(cv.la_ban_chinh) === 1;
    }

    async function taiDanhSachUngVien() {
        try {
            const response = await fetch("/api/ung-vien", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("nguoi_dung");
                window.location.href = "/login/login.html";
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Không tải được danh sách ứng viên"
                );
            }

            if (Array.isArray(data)) {
                danhSachUngVien = data;
            } else if (Array.isArray(data.data)) {
                danhSachUngVien = data.data;
            } else if (Array.isArray(data.ung_vien)) {
                danhSachUngVien = data.ung_vien;
            } else if (Array.isArray(data.danhSach)) {
                danhSachUngVien = data.danhSach;
            } else {
                danhSachUngVien = [];
            }

            if (locUngVien) {
                const giaTriCu = locUngVien.value;

                locUngVien.innerHTML = `
                    <option value="">Tất cả ứng viên</option>
                `;

                danhSachUngVien.forEach(function (item) {
                    const option = document.createElement("option");

                    option.value = item.id;
                    option.textContent =
                        item.ho_ten ||
                        item.ten ||
                        `Ứng viên #${item.id}`;

                    locUngVien.appendChild(option);
                });

                const tonTai = danhSachUngVien.some(function (item) {
                    return String(item.id) === String(giaTriCu);
                });

                if (tonTai) {
                    locUngVien.value = giaTriCu;
                }
            }

            if (ungVienId) {
                const giaTriCu = ungVienId.value;

                ungVienId.innerHTML = `
                    <option value="">-- Chọn ứng viên --</option>
                `;

                danhSachUngVien.forEach(function (item) {
                    const option = document.createElement("option");

                    option.value = item.id;
                    option.textContent =
                        item.ho_ten ||
                        item.ten ||
                        `Ứng viên #${item.id}`;

                    ungVienId.appendChild(option);
                });

                const tonTai = danhSachUngVien.some(function (item) {
                    return String(item.id) === String(giaTriCu);
                });

                if (tonTai) {
                    ungVienId.value = giaTriCu;
                }
            }
        } catch (error) {
            console.error("Lỗi tải danh sách ứng viên:", error);

            if (locUngVien) {
                locUngVien.innerHTML = `
                    <option value="">Tất cả ứng viên</option>
                `;
            }

            if (ungVienId) {
                ungVienId.innerHTML = `
                    <option value="">-- Chọn ứng viên --</option>
                `;
            }

            hienThongBao(
                error.message || "Không tải được danh sách ứng viên"
            );
        }
    }

    async function taiDanhSachCV() {
        if (!danhSachCV) return;

        danhSachCV.innerHTML = `
            <tr>
                <td colspan="8" class="cv-loading">
                    Đang tải danh sách CV...
                </td>
            </tr>
        `;

        try {
            const response = await fetch("/api/cv", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("nguoi_dung");
                window.location.href = "/login/login.html";
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Không tải được danh sách CV"
                );
            }

            if (Array.isArray(data)) {
                danhSach = data;
            } else if (Array.isArray(data.data)) {
                danhSach = data.data;
            } else if (Array.isArray(data.cv)) {
                danhSach = data.cv;
            } else if (Array.isArray(data.danhSach)) {
                danhSach = data.danhSach;
            } else {
                danhSach = [];
            }

            hienThiDanhSach();
        } catch (error) {
            console.error("Lỗi tải danh sách CV:", error);

            danhSachCV.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-cv">
                        <div class="empty-cv-icon">⚠</div>
                        <div class="empty-cv-title">
                            Không tải được danh sách CV
                        </div>
                        <div class="empty-cv-text">
                            ${escapeHtml(error.message)}
                        </div>
                    </td>
                </tr>
            `;

            if (tongSo) {
                tongSo.textContent = "0 CV";
            }
        }
    }

    function hienThiDanhSach() {
        const tuKhoa = (oTimKiem?.value || "").trim().toLowerCase();
        const ungVienFilter = locUngVien?.value || "";
        const banChinhFilter = locBanChinh?.value || "";

        const danhSachLoc = danhSach.filter(function (cv) {
            const tenFile = layTenFile(cv).toLowerCase();
            const tenUngVien = layTenUngVien(cv).toLowerCase();

            const idUngVien = String(
                cv.ung_vien_id ||
                cv.ungVienId ||
                cv.ung_vien?.id ||
                ""
            );

            const matchTuKhoa =
                !tuKhoa ||
                tenFile.includes(tuKhoa) ||
                tenUngVien.includes(tuKhoa);

            const matchUngVien =
                !ungVienFilter ||
                idUngVien === String(ungVienFilter);

            const laChinh = layLaBanChinh(cv);

            const matchBanChinh =
                !banChinhFilter ||
                (banChinhFilter === "1" && laChinh) ||
                (banChinhFilter === "0" && !laChinh);

            return matchTuKhoa && matchUngVien && matchBanChinh;
        });

        if (tongSo) {
            tongSo.textContent = `${danhSachLoc.length} CV`;
        }

        if (!danhSachLoc.length) {
            danhSachCV.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-cv">
                        <div class="empty-cv-icon">📄</div>
                        <div class="empty-cv-title">
                            Chưa có CV
                        </div>
                        <div class="empty-cv-text">
                            Chưa có CV nào phù hợp với điều kiện tìm kiếm.
                        </div>
                    </td>
                </tr>
            `;

            return;
        }

        danhSachCV.innerHTML = danhSachLoc.map(function (cv, index) {
            const laChinh = layLaBanChinh(cv);
            const tenFile = layTenFile(cv);
            const tenUngVien = layTenUngVien(cv);
            const email = layEmailUngVien(cv);

            const id =
                cv.id ||
                cv.cv_id;

            let thaoTac = `
                <button
                    type="button"
                    class="btn-xem"
                    data-action="xem"
                    data-id="${id}"
                >
                    Xem
                </button>

                <button
                    type="button"
                    class="btn-tai-xuong"
                    data-action="tai-xuong"
                    data-id="${id}"
                >
                    Tải xuống
                </button>
            `;

            if (coQuyenQuanLyCVChinh && !laChinh) {
                thaoTac += `
                    <button
                        type="button"
                        class="btn-ban-chinh"
                        data-action="ban-chinh"
                        data-id="${id}"
                    >
                        Đặt làm CV chính
                    </button>
                `;
            }

            if (coQuyenXoaCV) {
                thaoTac += `
                    <button
                        type="button"
                        class="btn-xoa"
                        data-action="xoa"
                        data-id="${id}"
                    >
                        Xóa
                    </button>
                `;
            }

            return `
                <tr>
                    <td>${index + 1}</td>

                    <td>
                        <div class="cv-ung-vien">
                            <strong>${escapeHtml(tenUngVien)}</strong>
                            <span>${escapeHtml(email)}</span>
                        </div>
                    </td>

                    <td>
                        <div class="cv-file-name">
                            <div class="cv-file-icon">📄</div>

                            <div class="cv-file-info">
                                <div
                                    class="cv-file-title"
                                    title="${escapeHtml(tenFile)}"
                                >
                                    ${escapeHtml(tenFile)}
                                </div>

                                <div class="cv-file-type">
                                    ${escapeHtml(cv.loai_file || "-")}
                                </div>
                            </div>
                        </div>
                    </td>

                    <td>
                        ${escapeHtml(cv.loai_file || "-")}
                    </td>

                    <td class="cv-kich-thuoc">
                        ${dinhDangKichThuoc(cv.kich_thuoc)}
                    </td>

                    <td>
                        ${laChinh
                    ? `<span class="badge-ban-chinh">✓ CV chính</span>`
                    : `<span class="badge-cv-phu">CV phụ</span>`
                }
                    </td>

                    <td class="cv-ngay">
                        ${dinhDangNgay(cv.ngay_tai_len)}
                    </td>

                    <td>
                        <div class="cv-actions">
                            ${thaoTac}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function moModalCV() {
        if (!modalCV) return;

        formCV?.reset();

        modalCV.classList.add("show");
    }

    function dongModalCV() {
        if (!modalCV) return;

        modalCV.classList.remove("show");
    }

    async function taiCV() {
        if (!formCV || !fileCV || !ungVienId) return;

        const ungVien = ungVienId.value;
        const file = fileCV.files[0];

        if (!ungVien) {
            hienThongBao("Vui lòng chọn ứng viên");
            return;
        }

        if (!file) {
            hienThongBao("Vui lòng chọn tệp CV");
            return;
        }

        const tenFile = file.name.toLowerCase();

        const duoiChoPhep = [
            ".pdf",
            ".doc",
            ".docx",
            ".jpg",
            ".jpeg",
            ".png",
        ];

        const hopLe = duoiChoPhep.some(function (duoi) {
            return tenFile.endsWith(duoi);
        });

        if (!hopLe) {
            hienThongBao(
                "Chỉ cho phép PDF, DOC, DOCX, JPG, JPEG hoặc PNG"
            );
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            hienThongBao("Kích thước CV không được vượt quá 10 MB");
            return;
        }

        const formData = new FormData();

        formData.append("ung_vien_id", ungVien);
        formData.append("file", file);
        formData.append(
            "la_ban_chinh",
            laBanChinh?.checked ? "1" : "0"
        );

        const btnSubmit = formCV.querySelector(
            'button[type="submit"]'
        );

        try {
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = "Đang tải...";
            }

            const response = await fetch("/api/cv/upload", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("nguoi_dung");
                window.location.href = "/login/login.html";
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message || "Tải CV thất bại"
                );
            }

            dongModalCV();

            hienThongBao(
                "Tải CV thành công",
                "success"
            );

            await taiDanhSachCV();
        } catch (error) {
            console.error("Lỗi tải CV:", error);

            hienThongBao(
                error.message || "Không thể tải CV"
            );
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Tải CV";
            }
        }
    }

    async function xemCV(id) {
        try {
            const response = await fetch(`/api/cv/${id}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Không lấy được thông tin CV"
                );
            }

            const cv = data.data || data.cv || data;

            metaCV.textContent =
                `${layTenFile(cv)} • ${dinhDangNgay(cv.ngay_tai_len)}`;

            noiDungChiTiet.innerHTML = `
                <div class="cv-info-grid">
                    <div class="cv-info-label">Ứng viên</div>
                    <div class="cv-info-value">
                        ${escapeHtml(layTenUngVien(cv))}
                    </div>

                    <div class="cv-info-label">Email</div>
                    <div class="cv-info-value">
                        ${escapeHtml(layEmailUngVien(cv) || "-")}
                    </div>

                    <div class="cv-info-label">Tên file</div>
                    <div class="cv-info-value">
                        ${escapeHtml(layTenFile(cv))}
                    </div>

                    <div class="cv-info-label">Loại file</div>
                    <div class="cv-info-value">
                        ${escapeHtml(cv.loai_file || "-")}
                    </div>

                    <div class="cv-info-label">Kích thước</div>
                    <div class="cv-info-value">
                        ${dinhDangKichThuoc(cv.kich_thuoc)}
                    </div>

                    <div class="cv-info-label">Trạng thái</div>
                    <div class="cv-info-value">
                        ${layLaBanChinh(cv)
                    ? `<span class="badge-ban-chinh">✓ CV chính</span>`
                    : `<span class="badge-cv-phu">CV phụ</span>`
                }
                    </div>

                    <div class="cv-info-label">Ngày tải lên</div>
                    <div class="cv-info-value">
                        ${dinhDangNgay(cv.ngay_tai_len)}
                    </div>
                </div>
            `;

            modalChiTiet?.classList.add("show");
        } catch (error) {
            console.error(error);

            hienThongBao(
                error.message || "Không thể xem CV"
            );
        }
    }

    function dongModalChiTiet() {
        modalChiTiet?.classList.remove("show");
    }

    async function taiXuongCV(id) {
        try {
            const response = await fetch(
                `/api/cv/${id}/tai-xuong`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                let message = "Không thể tải xuống CV";

                try {
                    const data = await response.json();
                    message = data.message || message;
                } catch (error) { }

                throw new Error(message);
            }

            const blob = await response.blob();

            const cv = danhSach.find(function (item) {
                return String(item.id) === String(id);
            });

            const tenFile = cv
                ? layTenFile(cv)
                : `CV-${id}`;

            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = tenFile;

            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);

            hienThongBao(
                error.message || "Không thể tải xuống CV"
            );
        }
    }

    async function datLamCVChinh(id) {
        try {
            const response = await fetch(
                `/api/cv/${id}/dat-ban-chinh`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Không thể đặt CV chính"
                );
            }

            hienThongBao(
                "Đã đặt CV làm bản chính",
                "success"
            );

            await taiDanhSachCV();
        } catch (error) {
            console.error(error);

            hienThongBao(
                error.message || "Không thể đặt CV chính"
            );
        }
    }

    function moXacNhanXoa(id) {
        const cv = danhSach.find(function (item) {
            return String(item.id) === String(id);
        });

        if (!cv) return;

        cvCanXoa = id;

        tieuDeXacNhan.textContent = "Xóa CV";

        noiDungXacNhan.textContent =
            `Bạn có chắc muốn xóa CV "${layTenFile(cv)}" không?`;

        modalXacNhan?.classList.add("show");
    }

    function dongXacNhanXoa() {
        cvCanXoa = null;
        modalXacNhan?.classList.remove("show");
    }

    async function xoaCV() {
        if (!cvCanXoa) return;

        const id = cvCanXoa;

        try {
            btnXacNhan.disabled = true;
            btnXacNhan.textContent = "Đang xóa...";

            const response = await fetch(
                `/api/cv/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Không thể xóa CV"
                );
            }

            dongXacNhanXoa();

            hienThongBao(
                "Xóa CV thành công",
                "success"
            );

            await taiDanhSachCV();
        } catch (error) {
            console.error(error);

            hienThongBao(
                error.message || "Không thể xóa CV"
            );
        } finally {
            btnXacNhan.disabled = false;
            btnXacNhan.textContent = "Xóa CV";
        }
    }

    if (btnTaiCV) {
        btnTaiCV.addEventListener("click", function (event) {
            event.preventDefault();
            moModalCV();
        });
    }

    if (btnDongCV) {
        btnDongCV.addEventListener("click", dongModalCV);
    }

    if (btnHuyCV) {
        btnHuyCV.addEventListener("click", dongModalCV);
    }

    if (formCV) {
        formCV.addEventListener("submit", function (event) {
            event.preventDefault();
            taiCV();
        });
    }

    if (oTimKiem) {
        oTimKiem.addEventListener("input", hienThiDanhSach);
    }

    if (locUngVien) {
        locUngVien.addEventListener("change", hienThiDanhSach);
    }

    if (locBanChinh) {
        locBanChinh.addEventListener("change", hienThiDanhSach);
    }

    if (danhSachCV) {
        danhSachCV.addEventListener("click", function (event) {
            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;

            if (!id) return;

            if (action === "xem") {
                xemCV(id);
            }

            if (action === "tai-xuong") {
                taiXuongCV(id);
            }

            if (action === "ban-chinh") {
                datLamCVChinh(id);
            }

            if (action === "xoa") {
                moXacNhanXoa(id);
            }
        });
    }

    if (btnDongChiTiet) {
        btnDongChiTiet.addEventListener(
            "click",
            dongModalChiTiet
        );
    }

    if (btnDongChiTietCuoi) {
        btnDongChiTietCuoi.addEventListener(
            "click",
            dongModalChiTiet
        );
    }

    if (btnHuyXacNhan) {
        btnHuyXacNhan.addEventListener(
            "click",
            dongXacNhanXoa
        );
    }

    if (btnXacNhan) {
        btnXacNhan.addEventListener(
            "click",
            xoaCV
        );
    }

    if (modalCV) {
        modalCV.addEventListener("click", function (event) {
            if (event.target === modalCV) {
                dongModalCV();
            }
        });
    }

    if (modalChiTiet) {
        modalChiTiet.addEventListener("click", function (event) {
            if (event.target === modalChiTiet) {
                dongModalChiTiet();
            }
        });
    }

    if (modalXacNhan) {
        modalXacNhan.addEventListener("click", function (event) {
            if (event.target === modalXacNhan) {
                dongXacNhanXoa();
            }
        });
    }

    async function khoiTao() {
        await taiDanhSachUngVien();
        await taiDanhSachCV();
    }

    khoiTao();
});