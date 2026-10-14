const nodemailer = require("nodemailer");

let transporter = null;

function layTransporter() {
    const email = String(process.env.GMAIL_USER || "").trim();
    const appPassword = String(process.env.GMAIL_APP_PASSWORD || "")
        .replace(/\s+/g, "");

    if (!email || !appPassword) {
        throw new Error(
            "Thiếu GMAIL_USER hoặc GMAIL_APP_PASSWORD trong file .env.",
        );
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: email,
                pass: appPassword,
            },
        });
    }

    return transporter;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character]);
}

function escapeIcs(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/\r?\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
}

function formatIcsDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error("Thời gian phỏng vấn không hợp lệ để tạo file lịch.");
    }

    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatDateTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Chưa xác định";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
}

function taoNoiDungIcs({ lich, nguoiPhongVan, emailNguoiGui }) {
    const batDau = new Date(lich.thoi_gian || lich.bat_dau);
    const ketThuc = lich.ket_thuc
        ? new Date(lich.ket_thuc)
        : new Date(batDau.getTime() + 45 * 60 * 1000);

    const now = formatIcsDate(new Date());
    const uid = `phong-van-${lich.id}@ai-recruitment-hub`;
    const attendees = [
        lich.email_ung_vien,
        ...nguoiPhongVan.map((person) => person.email),
    ]
        .filter(Boolean)
        .map((email) => `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${email}`);

    const description = [
        `Ứng viên: ${lich.ten_ung_vien || "Chưa có tên"}`,
        `Vòng phỏng vấn: ${lich.vong_phong_van || "Vòng 1"}`,
        `Hình thức: ${lich.hinh_thuc === "offline" ? "Trực tiếp" : "Trực tuyến"}`,
        `Địa điểm / đường dẫn: ${lich.dia_diem || "Sẽ được xác nhận"}`,
        `Người phỏng vấn: ${nguoiPhongVan.map((person) => person.ho_ten).filter(Boolean).join(", ") || "Chưa phân công"}`,
        `Ghi chú: ${lich.ghi_chu || "Không có"}`,
    ].join("\n");

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AI Recruitment Hub//Interview Schedule//VI",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatIcsDate(batDau)}`,
        `DTEND:${formatIcsDate(ketThuc)}`,
        `SUMMARY:${escapeIcs(`Phỏng vấn: ${lich.ten_ung_vien || "Ứng viên"} — ${lich.vong_phong_van || "Vòng 1"}`)}`,
        `DESCRIPTION:${escapeIcs(description)}`,
        `LOCATION:${escapeIcs(lich.dia_diem || "")}`,
        `ORGANIZER:mailto:${emailNguoiGui}`,
        ...attendees,
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        "DESCRIPTION:Nhắc lịch phỏng vấn sau 30 phút nữa",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ];

    return `${lines.join("\r\n")}\r\n`;
}

async function guiThuMoiPhongVan({ lich, nguoiPhongVan = [] }) {
    const transporter = layTransporter();
    const emailNguoiGui = String(process.env.GMAIL_USER || "").trim();
    const emailUngVien = String(lich.email_ung_vien || "").trim();

    if (!emailUngVien) {
        throw new Error("Ứng viên chưa có địa chỉ email, chưa thể gửi thư mời.");
    }

    const thoiGian = formatDateTime(lich.thoi_gian || lich.bat_dau);
    const vong = lich.vong_phong_van || "Vòng 1";
    const hinhThuc = lich.hinh_thuc === "offline" ? "Trực tiếp" : "Trực tuyến";
    const diaDiem = lich.dia_diem || "Sẽ được xác nhận qua email";
    const tenUngVien = lich.ten_ung_vien || "bạn";
    const tenNguoiPhongVan = nguoiPhongVan
        .map((person) => person.ho_ten)
        .filter(Boolean)
        .join(", ") || "Bộ phận tuyển dụng";
    const subject = `Thư mời phỏng vấn — ${tenUngVien} — ${vong}`;

    const plainText = [
        `Chào ${tenUngVien},`,
        "",
        "Cảm ơn bạn đã quan tâm đến cơ hội làm việc cùng chúng tôi.",
        "Chúng tôi trân trọng mời bạn tham gia buổi phỏng vấn với thông tin như sau:",
        "",
        `Vòng phỏng vấn: ${vong}`,
        `Thời gian: ${thoiGian}`,
        `Hình thức: ${hinhThuc}`,
        `Địa điểm / đường dẫn: ${diaDiem}`,
        `Người phỏng vấn: ${tenNguoiPhongVan}`,
        `Ghi chú: ${lich.ghi_chu || "Không có"}`,
        "",
        "Tệp lịch .ics được đính kèm để bạn thêm lịch vào Google Calendar, Outlook hoặc ứng dụng lịch tương thích.",
        "Lịch có nhắc trước 30 phút.",
        "",
        "Trân trọng,",
        "Bộ phận Tuyển dụng",
    ].join("\n");

    const html = `
        <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.7;max-width:680px;margin:0 auto">
            <h2 style="color:#1d4ed8;margin-bottom:20px">Thư mời phỏng vấn</h2>
            <p>Chào <strong>${escapeHtml(tenUngVien)}</strong>,</p>
            <p>Cảm ơn bạn đã quan tâm đến cơ hội làm việc cùng chúng tôi. Chúng tôi trân trọng mời bạn tham gia buổi phỏng vấn với thông tin sau:</p>
            <table style="border-collapse:collapse;width:100%;margin:20px 0">
                <tr><td style="padding:10px;border:1px solid #dbe3ef;width:170px;background:#f8fafc"><strong>Vòng phỏng vấn</strong></td><td style="padding:10px;border:1px solid #dbe3ef">${escapeHtml(vong)}</td></tr>
                <tr><td style="padding:10px;border:1px solid #dbe3ef;background:#f8fafc"><strong>Thời gian</strong></td><td style="padding:10px;border:1px solid #dbe3ef">${escapeHtml(thoiGian)}</td></tr>
                <tr><td style="padding:10px;border:1px solid #dbe3ef;background:#f8fafc"><strong>Hình thức</strong></td><td style="padding:10px;border:1px solid #dbe3ef">${escapeHtml(hinhThuc)}</td></tr>
                <tr><td style="padding:10px;border:1px solid #dbe3ef;background:#f8fafc"><strong>Địa điểm / đường dẫn</strong></td><td style="padding:10px;border:1px solid #dbe3ef">${escapeHtml(diaDiem)}</td></tr>
                <tr><td style="padding:10px;border:1px solid #dbe3ef;background:#f8fafc"><strong>Người phỏng vấn</strong></td><td style="padding:10px;border:1px solid #dbe3ef">${escapeHtml(tenNguoiPhongVan)}</td></tr>
            </table>
            <p>${escapeHtml(lich.ghi_chu || "")}</p>
            <p>Tệp lịch <strong>.ics</strong> được đính kèm để thêm vào Google Calendar, Outlook hoặc ứng dụng lịch tương thích. Lịch có nhắc trước 30 phút.</p>
            <p>Trân trọng,<br><strong>Bộ phận Tuyển dụng</strong></p>
        </div>
    `;

    const ics = taoNoiDungIcs({
        lich,
        nguoiPhongVan,
        emailNguoiGui,
    });

    const cc = [...new Set(
        nguoiPhongVan
            .map((person) => String(person.email || "").trim())
            .filter((email) => email && email !== emailUngVien && email !== emailNguoiGui),
    )];

    const result = await transporter.sendMail({
        from: `AI Recruitment Hub <${emailNguoiGui}>`,
        to: emailUngVien,
        cc: cc.length ? cc : undefined,
        subject,
        text: plainText,
        html,
        attachments: [
            {
                filename: `lich-phong-van-${lich.id}.ics`,
                content: ics,
                contentType: "text/calendar; method=REQUEST; charset=UTF-8",
            },
        ],
    });

    return {
        messageId: result.messageId,
    };
}

module.exports = {
    guiThuMoiPhongVan,
};
