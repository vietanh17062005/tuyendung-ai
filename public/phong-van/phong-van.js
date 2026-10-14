(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const token = localStorage.getItem("token");

    let interviews = [];
    let candidates = [];
    let campaigns = [];
    let interviewers = [];
    let user = {};
    let toastTimer;
    let activeActionMenu = null;

    const vaiTroQuanLy = ["admin", "manager", "hr"];

    const nhanTrangThai = {
        da_len_lich: "Đã lên lịch",
        da_xac_nhan: "Đã xác nhận",
        da_phong_van: "Đã phỏng vấn",
        huy: "Đã hủy",
        da_huy: "Đã hủy",
    };

    const lopTrangThai = {
        da_len_lich: "scheduled",
        da_xac_nhan: "confirmed",
        da_phong_van: "done",
        huy: "cancelled",
        da_huy: "cancelled",
    };

    const initials = (name) => String(name || "UV")
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part) => part[0] || "")
        .join("")
        .toLocaleUpperCase("vi");

    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character]);

    function layNgay(value) {
        if (!value) {
            return null;
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function dinhDangNgay(value) {
        const date = layNgay(value);

        return date
            ? new Intl.DateTimeFormat("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }).format(date)
            : "Chưa có thời gian";
    }

    function dinhDangGio(value) {
        const date = layNgay(value);

        return date
            ? new Intl.DateTimeFormat("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            }).format(date)
            : "--:--";
    }

    function ngayISOThanhDMY(value) {
        const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
    }

    function ngayDMYThanhISO(value) {
        const match = String(value || "").trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
        if (!match) return "";

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);
        const check = new Date(year, month - 1, day);
        if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
            return "";
        }
        return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function dinhDangInputNgay(value) {
        const date = layNgay(value);
        if (!date) return { ngay: "", gio: "" };

        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        const valueLocal = localDate.toISOString().slice(0, 16);
        return { ngay: ngayISOThanhDMY(valueLocal.slice(0, 10)), gio: valueLocal.slice(11, 16) };
    }

    function layGiaTriNgayGio(dateId, timeId) {
        const dateText = $(dateId).value.trim();
        const date = ngayDMYThanhISO(dateText);
        const time = $(timeId).value;
        if (!date || !time) return "";
        return `${date}T${time}`;
    }

    function ganGiaTriNgayGio(value, dateId, timeId) {
        const formatted = dinhDangInputNgay(value);
        $(dateId).value = formatted.ngay;
        $(timeId).value = formatted.gio;
        const picker = $(`${dateId}Picker`);
        if (picker) picker.value = ngayDMYThanhISO(formatted.ngay);
    }

    function ganSuKienDatePicker() {
        if (document.body.dataset.datePickerBound === "true") return;
        document.body.dataset.datePickerBound = "true";

        let calendar = null;
        let currentInput = null;
        let currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const pad = (value) => String(value).padStart(2, "0");

        function dongLich() {
            if (calendar) calendar.remove();
            calendar = null;
            currentInput = null;
        }

        function dinhDangNgay(date) {
            return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
        }

        function moLich(input) {
            if (!input) return;
            if (calendar && currentInput === input) {
                dongLich();
                return;
            }
            dongLich();
            currentInput = input;

            const iso = ngayDMYThanhISO(input.value);
            const selected = iso ? new Date(`${iso}T12:00:00`) : new Date();
            currentMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);

            calendar = document.createElement("div");
            calendar.className = "custom-date-calendar";
            Object.assign(calendar.style, {
                position: "fixed", zIndex: "100000", width: "280px", boxSizing: "border-box",
                padding: "14px", background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: "12px", boxShadow: "0 12px 35px rgba(15,23,42,.18)",
                color: "#1e293b", font: "14px Arial,sans-serif"
            });
            calendar.addEventListener("click", (event) => event.stopPropagation());
            document.body.appendChild(calendar);

            function render() {
                if (!calendar) return;
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const dayCount = new Date(year, month + 1, 0).getDate();
                const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
                const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
                const selectedISO = ngayDMYThanhISO(input.value);

                calendar.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                        <button type="button" data-action="prev" aria-label="Tháng trước" style="border:0;border-radius:6px;padding:6px 12px;background:#f1f5f9;cursor:pointer;font-size:18px">‹</button>
                        <strong>${monthNames[month]} ${year}</strong>
                        <button type="button" data-action="next" aria-label="Tháng sau" style="border:0;border-radius:6px;padding:6px 12px;background:#f1f5f9;cursor:pointer;font-size:18px">›</button>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center">
                        ${weekdays.map(day => `<span style="padding:6px 0;color:#64748b;font-size:12px">${day}</span>`).join("")}
                        ${Array.from({length:firstDay}, () => "<span></span>").join("")}
                        ${Array.from({length:dayCount}, (_, i) => {
                            const day = i + 1;
                            const value = `${year}-${pad(month + 1)}-${pad(day)}`;
                            const active = value === selectedISO;
                            return `<button type="button" data-day="${day}" style="border:0;border-radius:7px;padding:8px 0;cursor:pointer;background:${active ? "#4f46e5" : "#fff"};color:${active ? "#fff" : "#1e293b"}">${day}</button>`;
                        }).join("")}
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:12px">
                        <button type="button" data-action="today" style="border:0;background:none;color:#4f46e5;cursor:pointer">Hôm nay</button>
                        <button type="button" data-action="clear" style="border:0;background:none;color:#64748b;cursor:pointer">Xóa ngày</button>
                    </div>`;

                calendar.querySelector('[data-action="prev"]').addEventListener("click", (event) => {
                    event.preventDefault(); event.stopPropagation();
                    currentMonth = new Date(year, month - 1, 1);
                    render();
                });
                calendar.querySelector('[data-action="next"]').addEventListener("click", (event) => {
                    event.preventDefault(); event.stopPropagation();
                    currentMonth = new Date(year, month + 1, 1);
                    render();
                });
                calendar.querySelectorAll("[data-day]").forEach((button) => {
                    button.addEventListener("click", (event) => {
                        event.preventDefault(); event.stopPropagation();
                        input.value = `${pad(Number(button.dataset.day))}/${pad(month + 1)}/${year}`;
                        input.dispatchEvent(new Event("input", {bubbles:true}));
                        input.dispatchEvent(new Event("change", {bubbles:true}));
                        dongLich();
                    });
                });
                calendar.querySelector('[data-action="today"]').addEventListener("click", (event) => {
                    event.preventDefault(); event.stopPropagation();
                    input.value = dinhDangNgay(new Date());
                    input.dispatchEvent(new Event("input", {bubbles:true}));
                    input.dispatchEvent(new Event("change", {bubbles:true}));
                    dongLich();
                });
                calendar.querySelector('[data-action="clear"]').addEventListener("click", (event) => {
                    event.preventDefault(); event.stopPropagation();
                    input.value = "";
                    input.dispatchEvent(new Event("input", {bubbles:true}));
                    input.dispatchEvent(new Event("change", {bubbles:true}));
                    dongLich();
                });
            }

            render();
            const rect = input.getBoundingClientRect();
            const width = 280;
            const height = calendar.offsetHeight;
            calendar.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
            calendar.style.top = `${rect.bottom + height + 8 <= window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - height - 6)}px`;
        }

        // Event delegation: hoạt động kể cả khi nút nằm trong modal.
        document.addEventListener("click", (event) => {
            const button = event.target.closest("[data-picker]");
            if (button) {
                event.preventDefault();
                event.stopPropagation();
                const input = document.getElementById(button.dataset.picker);
                if (!input) {
                    console.error(`Không tìm thấy ô ngày: ${button.dataset.picker}`);
                    return;
                }
                moLich(input);
                return;
            }
            if (calendar && !calendar.contains(event.target)) dongLich();
        });

        ["interviewDate", "fromDate", "toDate"].forEach((id) => {
            const input = $(id);
            if (!input) return;
            input.addEventListener("blur", () => {
                if (!input.value.trim()) return;
                const iso = ngayDMYThanhISO(input.value);
                if (iso) input.value = ngayISOThanhDMY(iso);
            });
        });
        window.addEventListener("resize", dongLich);
        window.addEventListener("scroll", dongLich, true);
    }

    function hienToast(message, isError = false) {
        const toast = $("toast");

        toast.textContent = message;
        toast.className = `toast show${isError ? " error" : ""}`;

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 4500);
    }

    async function api(url, options = {}) {
        if (!token) {
            window.location.href = "/login/login.html";
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        const headers = {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (response.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "/login/login.html";
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        if (!response.ok) {
            throw new Error(
                data && typeof data === "object"
                    ? data.message || "Yêu cầu không thành công."
                    : "Máy chủ trả về lỗi.",
            );
        }

        return data;
    }

    function layMangDuLieu(data) {
        if (Array.isArray(data)) {
            return data;
        }

        return data?.data || data?.rows || data?.items || [];
    }

    function caiDatTaiKhoan() {
        try {
            user = JSON.parse(localStorage.getItem("nguoi_dung") || "{}");
        } catch {
            user = {};
        }

        const name = user.ho_ten || user.ten || user.name || user.email || "Tài khoản";
        const role = user.vai_tro || user.role || "";
        const nhanVaiTro = {
            admin: "Quản trị viên",
            manager: "Quản lý",
            hr: "Nhân sự",
            interviewer: "Người phỏng vấn",
            interview: "Người phỏng vấn",
            viewer: "Người xem",
        };

        $("userName").textContent = name;
        $("userRole").textContent = nhanVaiTro[role] || "Tài khoản";
        $("userAvatar").textContent = initials(name);
        $("todayLabel").textContent = new Intl.DateTimeFormat("vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
        }).format(new Date());

        if (!vaiTroQuanLy.includes(role)) {
            $("createBtn").hidden = true;
        }
    }

    function huyEmailMarkup(row) {
        if (row.email_trang_thai === "da_gui") {
            return '<small class="email-state sent">Đã gửi email</small>';
        }

        if (row.email_trang_thai === "that_bai") {
            return '<small class="email-state failed" title="Email gửi thất bại">Email chưa gửi</small>';
        }

        return '<small class="email-state pending">Chưa gửi email</small>';
    }

    function trangThaiMarkup(status) {
        const key = lopTrangThai[status] ? status : "da_len_lich";

        return `<span class="status-badge ${lopTrangThai[key]}">${esc(nhanTrangThai[status] || status || "Chưa xác định")}</span>`;
    }

    function thaoTacMarkup(row) {
        const id = Number(row.id);
        const role = String(user.vai_tro || user.role || "").toLowerCase();
        const danhSachId = String(row.nguoi_phong_van_ids || "")
            .split(",")
            .map(Number);
        const duocPhanCong = danhSachId.includes(Number(user.id))
            || Number(row.nguoi_phong_van_id || row.nguoi_phong_van) === Number(user.id);
        const coTheCapNhat = vaiTroQuanLy.includes(role)
            || (["interviewer", "interview"].includes(role) && duocPhanCong);
        const options = [];

        if (vaiTroQuanLy.includes(role)) {
            options.push(`<button data-action="edit" data-id="${id}">✎ &nbsp; Chỉnh sửa lịch</button>`);
            options.push(`<button data-action="send-invite" data-id="${id}">✉ &nbsp; Gửi lại thư mời</button>`);
        }

        if (coTheCapNhat && !["da_xac_nhan", "da_phong_van", "huy"].includes(row.trang_thai)) {
            options.push(`<button data-action="status" data-status="da_xac_nhan" data-id="${id}">✓ &nbsp; Xác nhận lịch</button>`);
        }

        if (coTheCapNhat && !["da_phong_van", "huy"].includes(row.trang_thai)) {
            options.push(`<button data-action="status" data-status="da_phong_van" data-id="${id}">◉ &nbsp; Đánh dấu đã phỏng vấn</button>`);
        }

        if (vaiTroQuanLy.includes(role) && !["huy", "da_phong_van"].includes(row.trang_thai)) {
            options.push(`<button class="danger" data-action="status" data-status="huy" data-id="${id}">× &nbsp; Hủy lịch</button>`);
        }

        if (!options.length) {
            return '<span style="color:#a0a9b8">—</span>';
        }

        return `
            <details class="action-menu">
                <summary class="more-button" aria-label="Thao tác" title="Thao tác">⋯</summary>
                <div class="action-options">${options.join("")}</div>
            </details>
        `;
    }

    function renderRows() {
        const keyword = $("searchInput").value.trim().toLocaleLowerCase("vi");
        const status = $("statusFilter").value;
        const fromDate = ngayDMYThanhISO($("fromDate").value);
        const toDate = ngayDMYThanhISO($("toDate").value);

        const rows = interviews.filter((row) => {
            const searchable = [
                row.ten_ung_vien,
                row.email_ung_vien,
                row.ten_dot_tuyen,
                row.ten_nguoi_phong_van,
                row.dia_diem,
                row.vong_phong_van,
            ].join(" ").toLocaleLowerCase("vi");

            const date = layNgay(row.thoi_gian || row.bat_dau);

            return (!keyword || searchable.includes(keyword))
                && (!status || row.trang_thai === status)
                && (!fromDate || (date && date >= new Date(`${fromDate}T00:00:00`)))
                && (!toDate || (date && date <= new Date(`${toDate}T23:59:59`)));
        });

        $("statTotal").textContent = interviews.length;
        $("statUpcoming").textContent = interviews.filter((row) =>
            ["da_len_lich", "da_xac_nhan"].includes(row.trang_thai)
            && layNgay(row.thoi_gian || row.bat_dau) >= new Date(),
        ).length;
        $("statDone").textContent = interviews.filter((row) => row.trang_thai === "da_phong_van").length;
        $("statCancelled").textContent = interviews.filter((row) => ["huy", "da_huy"].includes(row.trang_thai)).length;
        $("resultCount").textContent = `Hiển thị ${rows.length} / ${interviews.length} lịch phỏng vấn`;

        if (!rows.length) {
            $("interviewRows").innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <div class="empty-icon">▣</div>
                            <b>Chưa tìm thấy lịch phỏng vấn</b>
                            <p>Thử thay đổi bộ lọc hoặc tạo lịch phỏng vấn mới.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        $("interviewRows").innerHTML = rows.map((row, index) => {
            const type = row.hinh_thuc === "offline" ? "offline" : "online";
            const time = row.thoi_gian || row.bat_dau;
            const interviewerNames = row.ten_nguoi_phong_van || "Chưa phân công";

            return `
                <tr>
                    <td>
                        <div class="candidate-cell">
                            <div class="candidate-avatar c${(index % 4) + 1}">${esc(initials(row.ten_ung_vien))}</div>
                            <div>
                                <div class="candidate-name">${esc(row.ten_ung_vien || `Ứng viên #${row.ung_vien_id}`)}</div>
                                <div class="candidate-email">${esc(row.email_ung_vien || `Mã ứng viên: ${row.ung_vien_id}`)}</div>
                            </div>
                        </div>
                    </td>
                    <td><div class="campaign-name" title="${esc(row.ten_dot_tuyen)}">${esc(row.ten_dot_tuyen || `Đợt #${row.dot_tuyen_id}`)}</div></td>
                    <td>
                        <div class="time-main">${dinhDangNgay(time)}</div>
                        <div class="time-sub">${dinhDangGio(time)}${row.dia_diem ? ` · ${esc(row.dia_diem)}` : ""}</div>
                    </td>
                    <td><span class="round-pill">${esc(row.vong_phong_van || "Vòng 1")}</span></td>
                    <td><span class="type-pill ${type}"><span></span>${type === "online" ? "Trực tuyến" : "Trực tiếp"}</span></td>
                    <td>${esc(interviewerNames)}</td>
                    <td>${trangThaiMarkup(row.trang_thai)}<br>${huyEmailMarkup(row)}</td>
                    <td>${thaoTacMarkup(row)}</td>
                </tr>
            `;
        }).join("");
    }

    async function taiDanhSachLich() {
        $("interviewRows").innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="loading-state"><span class="spinner"></span>Đang tải lịch phỏng vấn…</div>
                </td>
            </tr>
        `;

        const params = new URLSearchParams();

        if ($("statusFilter").value) {
            params.set("trang_thai", $("statusFilter").value);
        }

        const fromDate = ngayDMYThanhISO($("fromDate").value);
        const toDate = ngayDMYThanhISO($("toDate").value);

        if (fromDate) params.set("tu_ngay", `${fromDate} 00:00:00`);
        if (toDate) params.set("den_ngay", `${toDate} 23:59:59`);

        try {
            interviews = layMangDuLieu(
                await api(`/api/phong-van${params.size ? `?${params}` : ""}`),
            );
            renderRows();
        } catch (error) {
            $("interviewRows").innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            Không thể tải dữ liệu: ${esc(error.message)}
                            <p>Kiểm tra kết nối máy chủ rồi thử làm mới.</p>
                        </div>
                    </td>
                </tr>
            `;
            hienToast(error.message, true);
        }
    }

    async function taiDanhSachLuaChon() {
        const results = await Promise.allSettled([
            api("/api/ung-vien"),
            api("/api/dot-tuyen"),
            api("/api/phong-van/nguoi-phong-van"),
        ]);

        candidates = results[0].status === "fulfilled" ? layMangDuLieu(results[0].value) : [];
        campaigns = results[1].status === "fulfilled" ? layMangDuLieu(results[1].value) : [];
        let accounts = results[2].status === "fulfilled" ? layMangDuLieu(results[2].value) : [];

        // Tương thích với máy chủ chưa có endpoint danh sách người phỏng vấn riêng.
        if (!accounts.length) {
            try {
                accounts = layMangDuLieu(await api("/api/tai-khoan"));
            } catch (error) {
                console.warn("Không tải được danh sách người phỏng vấn:", error.message);
            }
        }

        const chuanHoa = (value) => String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[\s-]+/g, "_")
            .trim();

        interviewers = accounts.filter((account) => {
            const role = chuanHoa(account.vai_tro || account.role);
            const status = chuanHoa(account.trang_thai ?? "hoat_dong");
            const vaiTroDuocChon = [
                "interviewer", "interview", "nguoi_phong_van", "nguoiphongvan", "phong_van", "phongvan",
                "admin", "administrator", "quan_tri_vien", "quantrivien",
                "manager", "quan_ly", "quanly", "team_leader", "leader"
            ];
            const dungVaiTro = vaiTroDuocChon.includes(role) || role.includes("interviewer");
            const dangHoatDong = ["hoat_dong", "dang_hoat_dong", "active", "1", "true"].includes(status);
            return dungVaiTro && dangHoatDong;
        });

        const nhanVaiTroNguoiThamGia = (account) => {
            const role = chuanHoa(account.vai_tro || account.role);
            if (["admin", "administrator", "quan_tri_vien", "quantrivien"].includes(role)) return "Quản trị viên";
            if (["manager", "quan_ly", "quanly", "team_leader", "leader"].includes(role)) return "Quản lý";
            return "Người phỏng vấn";
        };

        $("candidateId").innerHTML = `
            <option value="">Chọn ứng viên</option>
            ${candidates.map((candidate) => `
                <option value="${Number(candidate.id)}" data-campaign="${Number(candidate.dot_tuyen_id ?? candidate.id_dot_tuyen ?? candidate.dotTuyenId ?? candidate.campaign_id ?? candidate.dot_tuyen?.id ?? "") || ""}">
                    ${esc(candidate.ho_ten || `Ứng viên #${candidate.id}`)}${candidate.email ? ` — ${esc(candidate.email)}` : ""}
                </option>
            `).join("")}
        `;

        $("campaignId").innerHTML = `
            <option value="">Chọn ứng viên trước</option>
            ${campaigns.map((campaign) => `
                <option value="${Number(campaign.id)}">${esc(campaign.ten_dot || campaign.ten || `Đợt #${campaign.id}`)}</option>
            `).join("")}
        `;
        $("campaignId").disabled = true;

        $("interviewerId").innerHTML = interviewers.map((account) => `
            <option value="${Number(account.id)}">${esc(account.ho_ten || account.ten || account.email || `Tài khoản #${account.id}`)} — ${nhanVaiTroNguoiThamGia(account)}</option>
        `).join("");

        if (!candidates.length) {
            $("candidateId").innerHTML = '<option value="">Không tải được danh sách ứng viên</option>';
        }

        if (!campaigns.length) {
            $("campaignId").innerHTML = '<option value="">Không tải được danh sách đợt tuyển dụng</option>';
        }

        if (!interviewers.length) {
            $("interviewerId").innerHTML = '<option value="">Chưa có tài khoản quản trị viên, quản lý hoặc người phỏng vấn khả dụng</option>';
            console.warn("Không tìm thấy tài khoản quản trị viên, quản lý hoặc người phỏng vấn đang hoạt động. Kiểm tra vai_tro và trang_thai trong bảng nguoi_dung.");
        }
    }

    function dongBoDotTuyenTheoUngVien() {
        const candidateOption = $("candidateId").selectedOptions[0];
        const candidateCampaignId = candidateOption?.dataset.campaign || "";
        const campaignSelect = $("campaignId");
        const currentCampaignId = campaignSelect.value;

        campaignSelect.innerHTML = "";

        if (!candidateOption?.value) {
            campaignSelect.add(new Option("Chọn ứng viên trước", ""));
            campaigns.forEach((campaign) => {
                campaignSelect.add(new Option(
                    campaign.ten_dot || campaign.ten || `Đợt #${campaign.id}`,
                    String(campaign.id),
                ));
            });
            campaignSelect.value = "";
            campaignSelect.disabled = true;
            return;
        }

        if (!candidateCampaignId) {
            campaignSelect.add(new Option("Ứng viên chưa có đợt tuyển dụng", ""));
            campaignSelect.disabled = true;
            return;
        }

        const matchingCampaign = campaigns.find(
            (campaign) => Number(campaign.id) === Number(candidateCampaignId),
        );

        if (!matchingCampaign) {
            campaignSelect.add(new Option("Không tìm thấy đợt tuyển dụng của ứng viên", ""));
            campaignSelect.disabled = true;
            return;
        }

        campaignSelect.add(new Option(
            matchingCampaign.ten_dot || matchingCampaign.ten || `Đợt #${matchingCampaign.id}`,
            String(matchingCampaign.id),
        ));
        campaignSelect.value = String(matchingCampaign.id);
        campaignSelect.disabled = true;

        if (currentCampaignId && Number(currentCampaignId) !== Number(matchingCampaign.id)) {
            campaignSelect.value = String(matchingCampaign.id);
        }
    }

    function layNguoiPhongVanDaChon() {
        return [...$("interviewerId").selectedOptions]
            .map((option) => Number(option.value))
            .filter((id) => Number.isInteger(id) && id > 0);
    }

    function moModal(row = null, prefill = {}) {
        const role = user.vai_tro || user.role;

        if (!vaiTroQuanLy.includes(role)) {
            hienToast("Tài khoản không có quyền tạo hoặc sửa lịch.", true);
            return;
        }

        $("interviewForm").reset();
        $("interviewId").value = row?.id || "";
        $("formError").classList.remove("show");
        $("formError").textContent = "";
        $("modalTitle").textContent = row ? "Cập nhật lịch phỏng vấn" : "Tạo lịch phỏng vấn";
        $("saveBtn").textContent = row ? "Lưu thay đổi" : "Lưu lịch";
        $("saveAndSendBtn").textContent = row ? "Lưu thay đổi và gửi thư" : "Lưu và gửi thư";
        $("customRoundWrap").hidden = true;

        if (row) {
            $("candidateId").value = row.ung_vien_id;
            dongBoDotTuyenTheoUngVien();
            ganGiaTriNgayGio(row.thoi_gian || row.bat_dau, "interviewDate", "interviewClock");
            $("interviewType").value = row.hinh_thuc || "online";
            $("locationInput").value = row.dia_diem || "";
            $("notesInput").value = row.ghi_chu || "";

            const round = row.vong_phong_van || "Sơ loại";
            const roundOptions = [...$("interviewRound").options].map((option) => option.value);
            if (roundOptions.includes(round)) {
                $("interviewRound").value = round;
            } else {
                $("interviewRound").value = "Khác";
                $("customRoundWrap").hidden = false;
                $("customRound").value = round;
            }

            const assignedIds = String(row.nguoi_phong_van_ids || row.nguoi_phong_van_id || row.nguoi_phong_van || "")
                .split(",")
                .map((id) => id.trim());

            [...$("interviewerId").options].forEach((option) => {
                option.selected = assignedIds.includes(option.value);
            });
        } else {
            if (prefill.ung_vien_id) {
                $("candidateId").value = String(prefill.ung_vien_id);
            }

            if (prefill.dot_tuyen_id) {
                $("campaignId").value = String(prefill.dot_tuyen_id);
            }

            if (prefill.email) {
                const option = [...$("candidateId").options].find((item) => item.value === String(prefill.ung_vien_id));
                if (option && !option.textContent.includes(prefill.email)) {
                    option.textContent = `${option.textContent} — ${prefill.email}`;
                }
            }

            dongBoDotTuyenTheoUngVien();
        }

        $("interviewModal").classList.add("open");
        $("interviewModal").setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function dongModal() {
        $("interviewModal").classList.remove("open");
        $("interviewModal").setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    function hienLoiForm(message) {
        $("formError").textContent = message;
        $("formError").classList.add("show");
    }

    async function luuLichPhongVan(event, luuVaGuiThu = false) {
        if (event) {
            event.preventDefault();
        }

        if (!$("interviewForm").reportValidity()) {
            return;
        }

        const id = $("interviewId").value;
        const candidateId = Number($("candidateId").value);
        const campaignId = Number($("campaignId").value);
        const startTime = layGiaTriNgayGio("interviewDate", "interviewClock");
        const selectedRound = $("interviewRound").value;
        const customRound = $("customRound").value.trim();
        const round = selectedRound === "Khác" ? customRound : selectedRound;
        const interviewerIds = layNguoiPhongVanDaChon();
        const candidateOption = $("candidateId").selectedOptions[0];

        const payload = {
            gui_email: false,
            ung_vien_id: candidateId,
            dot_tuyen_id: campaignId,
            nguoi_phong_van_ids: interviewerIds,
            thoi_gian: startTime,
            vong_phong_van: round,
            hinh_thuc: $("interviewType").value,
            dia_diem: $("locationInput").value.trim() || null,
            ghi_chu: $("notesInput").value.trim() || null,
        };

        if (!candidateId || !campaignId || !startTime || !round || !interviewerIds.length) {
            hienLoiForm("Vui lòng chọn ứng viên, đợt tuyển dụng, thời gian, vòng và ít nhất một người phỏng vấn.");
            return;
        }

        if (candidateOption?.dataset.campaign && Number(candidateOption.dataset.campaign) !== campaignId) {
            hienLoiForm("Đợt tuyển dụng không khớp với đợt của ứng viên đã chọn.");
            return;
        }

        if (new Date(startTime).getTime() < Date.now() - 60000) {
            hienLoiForm("Thời gian phỏng vấn không được nằm trong quá khứ.");
            return;
        }

        const saveButton = $("saveBtn");
        saveButton.disabled = true;
        $("saveAndSendBtn").disabled = true;
        saveButton.textContent = luuVaGuiThu ? "Đang lưu lịch…" : "Đang lưu…";
        if (luuVaGuiThu) {
            $("saveAndSendBtn").textContent = "Đang gửi thư…";
        }

        try {
            const result = await api(
                id ? `/api/phong-van/${id}` : "/api/phong-van",
                {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(payload),
                },
            );

            const savedId = result.id || id;
            if (luuVaGuiThu && savedId) {
                try {
                    await api(`/api/phong-van/${savedId}/gui-thu-moi`, {
                        method: "POST",
                        body: JSON.stringify({}),
                    });
                    hienToast("Đã lưu lịch và gửi thư mời kèm file .ics.");
                } catch (emailError) {
                    hienToast(`Đã lưu lịch, nhưng gửi thư chưa thành công: ${emailError.message}. Có thể gửi lại trong danh sách.`, true);
                }
            } else {
                hienToast(result.message || "Đã lưu lịch phỏng vấn.");
            }

            dongModal();
            await taiDanhSachLich();
        } catch (error) {
            hienLoiForm(error.message || "Không thể lưu lịch phỏng vấn.");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = id ? "Lưu thay đổi" : "Lưu lịch";
            $("saveAndSendBtn").disabled = false;
            $("saveAndSendBtn").textContent = id ? "Lưu thay đổi và gửi thư" : "Lưu và gửi thư";
        }
    }

    async function capNhatTrangThai(id, status) {
        const label = nhanTrangThai[status] || status;

        if (status === "huy" && !window.confirm("Ông có chắc muốn hủy lịch phỏng vấn này không?")) {
            return;
        }

        try {
            const result = await api(`/api/phong-van/${id}/trang-thai`, {
                method: "PATCH",
                body: JSON.stringify({ trang_thai: status }),
            });

            hienToast(result.message || `Đã cập nhật: ${label}.`);
            await taiDanhSachLich();
        } catch (error) {
            hienToast(error.message, true);
        }
    }

    async function guiLaiThuMoi(id) {
        try {
            const result = await api(`/api/phong-van/${id}/gui-thu-moi`, {
                method: "POST",
                body: JSON.stringify({}),
            });

            hienToast(result.message || "Đã gửi lại thư mời.");
            await taiDanhSachLich();
        } catch (error) {
            hienToast(error.message || "Gửi thư mời thất bại.", true);
            await taiDanhSachLich();
        }
    }

    function dinhViMenuThaoTac() {
        if (!activeActionMenu) {
            return;
        }

        const { details, menu } = activeActionMenu;
        const trigger = details.querySelector("summary");

        if (!trigger?.isConnected || !menu.isConnected) {
            return;
        }

        const rect = trigger.getBoundingClientRect();
        menu.style.position = "fixed";
        menu.style.zIndex = "9999";
        menu.style.visibility = "hidden";
        menu.style.left = "0px";
        menu.style.top = "0px";

        const width = menu.offsetWidth || 190;
        const height = menu.offsetHeight || 150;
        const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
        const below = window.innerHeight - rect.bottom;
        const top = below >= height + 10 || rect.top < height + 12
            ? Math.min(window.innerHeight - height - 8, rect.bottom + 6)
            : Math.max(8, rect.top - height - 6);

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.visibility = "visible";
    }

    function khoiPhucMenuThaoTac(details = null) {
        if (!activeActionMenu || (details && activeActionMenu.details !== details)) {
            return;
        }

        const { details: owner, menu, placeholder } = activeActionMenu;

        if (placeholder?.parentNode) {
            placeholder.parentNode.insertBefore(menu, placeholder);
        }

        placeholder?.remove();
        menu.style.position = "";
        menu.style.zIndex = "";
        menu.style.left = "";
        menu.style.top = "";
        menu.style.visibility = "";
        delete menu.dataset.portal;
        owner.querySelector("summary")?.setAttribute("aria-expanded", "false");
        owner.removeAttribute("open");
        activeActionMenu = null;
    }

    function dongMenuThaoTac(except = null) {
        if (activeActionMenu && activeActionMenu.details !== except) {
            khoiPhucMenuThaoTac();
        }

        document.querySelectorAll("details.action-menu[open]").forEach((details) => {
            if (details !== except && (!activeActionMenu || details !== activeActionMenu.details)) {
                details.removeAttribute("open");
            }
        });
    }

    function ganSuKien() {
        ganSuKienDatePicker();
        $("createBtn").addEventListener("click", () => moModal());
        $("closeModal").addEventListener("click", dongModal);
        $("cancelModal").addEventListener("click", dongModal);
        $("interviewModal").addEventListener("click", (event) => {
            if (event.target === $("interviewModal")) {
                dongModal();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                dongModal();
            }
        });

        $("interviewForm").addEventListener("submit", (event) => luuLichPhongVan(event, false));
        $("saveAndSendBtn").addEventListener("click", (event) => luuLichPhongVan(event, true));
        $("candidateId").addEventListener("change", dongBoDotTuyenTheoUngVien);
        $("interviewRound").addEventListener("change", () => {
            const isCustom = $("interviewRound").value === "Khác";
            $("customRoundWrap").hidden = !isCustom;
            $("customRound").required = isCustom;
        });

        $("refreshBtn").addEventListener("click", async () => {
            await taiDanhSachLich();
            hienToast("Đã làm mới danh sách.");
        });

        ["searchInput", "statusFilter", "fromDate", "toDate"].forEach((id) => {
            $(id).addEventListener(id === "searchInput" ? "input" : "change", () => {
                if (id === "searchInput") {
                    renderRows();
                } else {
                    taiDanhSachLich();
                }
            });
        });

        $("clearFilters").addEventListener("click", () => {
            $("searchInput").value = "";
            $("statusFilter").value = "";
            $("fromDate").value = "";
            $("toDate").value = "";
            taiDanhSachLich();
        });

        document.addEventListener("toggle", (event) => {
            const details = event.target;

            if (!details.matches?.("details.action-menu")) {
                return;
            }

            if (details.open) {
                dongMenuThaoTac(details);

                const menu = details.querySelector(".action-options");
                if (!menu) {
                    return;
                }

                const placeholder = document.createComment("action-menu-placeholder");
                menu.parentNode.insertBefore(placeholder, menu);
                document.body.appendChild(menu);
                menu.dataset.portal = "true";
                activeActionMenu = { details, menu, placeholder };
                dinhViMenuThaoTac();
                details.querySelector("summary")?.setAttribute("aria-expanded", "true");
            } else {
                khoiPhucMenuThaoTac(details);
            }
        }, true);

        document.addEventListener("click", async (event) => {
            const button = event.target.closest("button[data-action]");

            if (button) {
                const id = Number(button.dataset.id);
                const action = button.dataset.action;
                const status = button.dataset.status;

                dongMenuThaoTac();

                if (action === "status") {
                    await capNhatTrangThai(id, status);
                }

                if (action === "edit") {
                    const row = interviews.find((item) => Number(item.id) === id);
                    if (row) {
                        moModal(row);
                    }
                }

                if (action === "send-invite") {
                    await guiLaiThuMoi(id);
                }

                return;
            }

            if (
                activeActionMenu
                && !activeActionMenu.menu.contains(event.target)
                && !activeActionMenu.details.contains(event.target)
            ) {
                dongMenuThaoTac();
            }
        });

        window.addEventListener("resize", dinhViMenuThaoTac);
        window.addEventListener("scroll", dinhViMenuThaoTac, true);

        const logoutButton = $("logoutBtn");
        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                localStorage.removeItem("token");
                localStorage.removeItem("nguoi_dung");
                window.location.href = "/login/login.html";
            });
        }
    }

    function layThongTinTuUrl() {
        const params = new URLSearchParams(window.location.search);

        return {
            ung_vien_id: params.get("ung_vien_id"),
            dot_tuyen_id: params.get("dot_tuyen_id"),
            ho_ten: params.get("ho_ten"),
            email: params.get("email"),
        };
    }

    async function khoiDong() {
        caiDatTaiKhoan();
        ganSuKien();

        if (!token) {
            window.location.href = "/login/login.html";
            return;
        }

        await Promise.all([
            taiDanhSachLuaChon(),
            taiDanhSachLich(),
        ]);

        const prefill = layThongTinTuUrl();

        if (prefill.ung_vien_id && vaiTroQuanLy.includes(user.vai_tro || user.role)) {
            moModal(null, prefill);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    document.addEventListener("DOMContentLoaded", khoiDong);
})();
