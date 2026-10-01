const crypto = require("crypto");
const dns = require("dns").promises;
const fs = require("fs");
const http = require("http");
const https = require("https");
const net = require("net");
const path = require("path");
const express = require("express");
const multer = require("multer");
const db = require("../database/db");

const {
    kiemTraDangNhap,
    kiemTraVaiTro
} = require("../middleware/auth");

const router = express.Router();

const thuMucCV = process.env.VERCEL
    ? path.join("/tmp", "tuyendung-ai", "cv")
    : path.join(__dirname, "..", "uploads", "cv");

const trangThaiDotTuyenKhoaUngVien = new Set([
    "tam_dung",
    "ket_thuc",
    "da_dong",
    "dong",
    "closed"
]);

const trangThaiHopLe = new Set([
    "moi",
    "da_phan_tich",
    "da_chon",
    "da_lien_he",
    "da_xep_lich",
    "da_phong_van",
    "offer",
    "da_tuyen",
    "tu_choi",
    "talent_pool"
]);

const duoiFileHopLe = new Set([
    ".pdf",
    ".doc",
    ".docx",
    ".jpg",
    ".jpeg",
    ".png"
]);

const kichThuocCVToiDa = 10 * 1024 * 1024;

function loiDuLieuLienHe(
    email,
    sdt,
    linkedin,
    github
) {
    const emailValue =
        String(email || "").trim();

    const phoneValue =
        String(sdt || "").trim();

    if (
        emailValue &&
        (
            emailValue.length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
                emailValue
            )
        )
    ) {
        return "Email không đúng định dạng";
    }

    if (
        phoneValue &&
        !/^0\d{9}$/.test(phoneValue)
    ) {
        return "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0";
    }

    for (
        const [label, value]
        of [
            ["LinkedIn", linkedin],
            ["GitHub", github]
        ]
    ) {
        const urlValue =
            String(value || "").trim();

        if (!urlValue) {
            continue;
        }

        try {
            const url =
                new URL(urlValue);

            if (
                !["http:", "https:"].includes(
                    url.protocol
                ) ||
                urlValue.length > 255
            ) {
                return `${label} phải là liên kết HTTP(S) hợp lệ`;
            }
        } catch (error) {
            return `${label} phải là liên kết HTTP(S) hợp lệ`;
        }
    }

    return null;
}

function dotTuyenKhoaTaoUngVien(
    trangThai
) {
    return trangThaiDotTuyenKhoaUngVien.has(
        String(trangThai || "").toLowerCase()
    );
}

function ipCongKhai(address) {
    const version =
        net.isIP(address);

    if (version === 4) {
        const octets =
            address.split(".").map(Number);

        const [a, b] = octets;

        return !(
            a === 0 ||
            a === 10 ||
            a === 127 ||
            a >= 224 ||
            (
                a === 100 &&
                b >= 64 &&
                b <= 127
            ) ||
            (
                a === 169 &&
                b === 254
            ) ||
            (
                a === 172 &&
                b >= 16 &&
                b <= 31
            ) ||
            (
                a === 192 &&
                (
                    b === 0 ||
                    b === 168
                )
            ) ||
            (
                a === 198 &&
                (
                    b === 18 ||
                    b === 19 ||
                    b === 51
                )
            ) ||
            (
                a === 203 &&
                b === 0 &&
                octets[2] === 113
            )
        );
    }

    if (version === 6) {
        const normalized =
            address
                .toLowerCase()
                .split("%")[0];

        if (
            normalized.startsWith("::ffff:") ||
            normalized.startsWith("64:ff9b:")
        ) {
            return false;
        }

        const first =
            Number.parseInt(
                normalized.split(":")[0],
                16
            );

        return (
            first >= 0x2000 &&
            first <= 0x3fff &&
            !normalized.startsWith(
                "2001:db8:"
            ) &&
            !normalized.startsWith(
                "2001:0:"
            ) &&
            !normalized.startsWith(
                "2002:"
            )
        );
    }

    return false;
}

async function phanGiaiHostPublic(url) {
    const host =
        url.hostname.replace(
            /^\[|\]$/g,
            ""
        );

    const defaultPort =
        url.protocol === "https:"
            ? "443"
            : "80";

    if (
        url.port &&
        url.port !== defaultPort
    ) {
        throw new Error(
            "Link CV chỉ hỗ trợ cổng HTTP/HTTPS mặc định"
        );
    }

    let addresses;

    if (net.isIP(host)) {
        addresses = [
            {
                address: host,
                family: net.isIP(host)
            }
        ];
    } else {
        if (
            host === "localhost" ||
            host.endsWith(".localhost") ||
            host.endsWith(".local")
        ) {
            throw new Error(
                "Link CV phải là địa chỉ Internet công khai"
            );
        }

        addresses =
            await dns.lookup(
                host,
                {
                    all: true,
                    verbatim: true
                }
            );
    }

    if (
        !addresses.length ||
        addresses.some(
            function (entry) {
                return !ipCongKhai(
                    entry.address
                );
            }
        )
    ) {
        throw new Error(
            "Link CV không được trỏ tới mạng nội bộ hoặc địa chỉ riêng"
        );
    }

    return (
        addresses.find(
            function (entry) {
                return entry.family === 4;
            }
        ) ||
        addresses[0]
    );
}

function taiNoiDungURL(
    url,
    address
) {
    return new Promise(
        function (resolve, reject) {
            const client =
                url.protocol === "https:"
                    ? https
                    : http;

            const host =
                url.hostname.replace(
                    /^\[|\]$/g,
                    ""
                );

            const request =
                client.request(
                    {
                        protocol:
                            url.protocol,

                        hostname:
                            host,

                        port:
                            url.port ||
                            undefined,

                        path:
                            url.pathname +
                            url.search,

                        method: "GET",

                        servername:
                            net.isIP(host)
                                ? undefined
                                : host,

                        lookup:
                            function (
                                hostname,
                                options,
                                callback
                            ) {
                                const answer = {
                                    address:
                                        address.address,
                                    family:
                                        address.family
                                };

                                if (
                                    options &&
                                    options.all
                                ) {
                                    callback(
                                        null,
                                        [answer]
                                    );
                                } else {
                                    callback(
                                        null,
                                        answer.address,
                                        answer.family
                                    );
                                }
                            },

                        headers: {
                            "User-Agent":
                                "RecruitmentHub-CV-Importer/1.0",
                            "Accept-Encoding":
                                "identity"
                        }
                    },

                    function (response) {
                        if (
                            response.statusCode >=
                                300 &&
                            response.statusCode <
                                400
                        ) {
                            const result = {
                                status:
                                    response.statusCode,
                                location:
                                    response.headers.location
                            };

                            response.resume();

                            resolve(result);

                            return;
                        }

                        const declaredSize =
                            Number(
                                response.headers[
                                    "content-length"
                                ] || 0
                            );

                        if (
                            declaredSize >
                            kichThuocCVToiDa
                        ) {
                            response.destroy();

                            reject(
                                new Error(
                                    "CV từ link không được vượt quá 10 MB"
                                )
                            );

                            return;
                        }

                        const chunks = [];
                        let size = 0;

                        response.on(
                            "data",
                            function (chunk) {
                                size +=
                                    chunk.length;

                                if (
                                    size >
                                    kichThuocCVToiDa
                                ) {
                                    response.destroy(
                                        new Error(
                                            "CV từ link không được vượt quá 10 MB"
                                        )
                                    );

                                    return;
                                }

                                chunks.push(
                                    chunk
                                );
                            }
                        );

                        response.on(
                            "end",
                            function () {
                                resolve({
                                    status:
                                        response.statusCode,

                                    headers:
                                        response.headers,

                                    buffer:
                                        Buffer.concat(
                                            chunks
                                        )
                                });
                            }
                        );

                        response.on(
                            "error",
                            reject
                        );
                    }
                );

            request.setTimeout(
                15000,
                function () {
                    request.destroy(
                        new Error(
                            "Quá thời gian tải CV từ link"
                        )
                    );
                }
            );

            request.on(
                "error",
                reject
            );

            request.end();
        }
    );
}

function tenFileTuPhanHoi(
    url,
    headers
) {
    const disposition =
        String(
            headers[
                "content-disposition"
            ] || ""
        );

    const encodedName =
        disposition.match(
            /filename\*\s*=\s*UTF-8''([^;]+)/i
        );

    const quotedName =
        disposition.match(
            /filename\s*=\s*"([^"]+)"/i
        );

    let fileName =
        encodedName
            ? decodeURIComponent(
                  encodedName[1].trim()
              )
            : quotedName
                ? quotedName[1]
                : path.basename(
                      decodeURIComponent(
                          url.pathname
                      )
                  );

    fileName = path
        .basename(
            fileName.replace(
                /\\/g,
                "/"
            )
        )
        .replace(
            /[\0\r\n]/g,
            ""
        )
        .trim();

    const mime =
        String(
            headers[
                "content-type"
            ] || ""
        )
            .split(";")[0]
            .toLowerCase();

    const extensionFromMime = {
        "application/pdf":
            ".pdf",

        "application/msword":
            ".doc",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            ".docx",

        "image/jpeg":
            ".jpg",

        "image/png":
            ".png"
    }[mime];

    let extension =
        path
            .extname(fileName)
            .toLowerCase();

    if (
        !duoiFileHopLe.has(extension) &&
        extensionFromMime
    ) {
        extension =
            extensionFromMime;

        fileName =
            path.basename(
                fileName,
                path.extname(
                    fileName
                )
            ) + extension;
    }

    if (
        !duoiFileHopLe.has(
            extension
        ) ||
        mime === "text/html"
    ) {
        throw new Error(
            "Link không trỏ tới CV PDF, DOC, DOCX, JPG hoặc PNG hợp lệ"
        );
    }

    if (
        !fileName ||
        fileName === extension
    ) {
        fileName =
            "CV" + extension;
    }

    return {
        fileName,
        extension
    };
}

function dungDinhDangFile(
    buffer,
    extension
) {
    if (extension === ".pdf") {
        return (
            buffer
                .subarray(0, 5)
                .toString() ===
            "%PDF-"
        );
    }

    if (
        extension === ".jpg" ||
        extension === ".jpeg"
    ) {
        return (
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff
        );
    }

    if (extension === ".png") {
        return buffer
            .subarray(0, 8)
            .equals(
                Buffer.from([
                    137,
                    80,
                    78,
                    71,
                    13,
                    10,
                    26,
                    10
                ])
            );
    }

    if (extension === ".doc") {
        return buffer
            .subarray(0, 8)
            .equals(
                Buffer.from([
                    0xd0,
                    0xcf,
                    0x11,
                    0xe0,
                    0xa1,
                    0xb1,
                    0x1a,
                    0xe1
                ])
            );
    }

    return (
        extension === ".docx" &&
        buffer
            .subarray(0, 4)
            .equals(
                Buffer.from([
                    0x50,
                    0x4b,
                    0x03,
                    0x04
                ])
            )
    );
}

async function layCVTuURL(
    rawUrl
) {
    let url;

    try {
        url =
            new URL(rawUrl);
    } catch (error) {
        throw new Error(
            "URL CV không hợp lệ"
        );
    }

    if (
        !["http:", "https:"].includes(
            url.protocol
        ) ||
        url.username ||
        url.password
    ) {
        throw new Error(
            "Chỉ chấp nhận URL HTTP(S) công khai"
        );
    }

    for (
        let redirect = 0;
        redirect <= 3;
        redirect += 1
    ) {
        const address =
            await phanGiaiHostPublic(
                url
            );

        const response =
            await taiNoiDungURL(
                url,
                address
            );

        if (
            response.status >= 300 &&
            response.status < 400
        ) {
            if (
                !response.location ||
                redirect === 3
            ) {
                throw new Error(
                    "Link CV chuyển hướng quá nhiều lần"
                );
            }

            url =
                new URL(
                    response.location,
                    url
                );

            if (
                !["http:", "https:"].includes(
                    url.protocol
                )
            ) {
                throw new Error(
                    "Link chuyển hướng không an toàn"
                );
            }

            continue;
        }

        if (
            response.status !== 200
        ) {
            throw new Error(
                `Không tải được CV từ link (HTTP ${response.status})`
            );
        }

        const file =
            tenFileTuPhanHoi(
                url,
                response.headers
            );

        if (
            !dungDinhDangFile(
                response.buffer,
                file.extension
            )
        ) {
            throw new Error(
                "Nội dung tải về không khớp định dạng CV"
            );
        }

        return {
            ...file,
            buffer:
                response.buffer,
            mime:
                response.headers[
                    "content-type"
                ] ||
                "application/octet-stream"
        };
    }

    throw new Error(
        "Không tải được CV từ link"
    );
}

fs.mkdirSync(
    thuMucCV,
    {
        recursive: true
    }
);

const upload =
    multer({
        defParamCharset: "utf8",

        storage:
            multer.diskStorage({
                destination:
                    thuMucCV,

                filename:
                    function (
                        req,
                        file,
                        callback
                    ) {
                        callback(
                            null,
                            crypto.randomUUID() +
                                path.extname(
                                    file.originalname
                                ).toLowerCase()
                        );
                    }
            }),

        limits: {
            fileSize:
                10 * 1024 * 1024
        },

        fileFilter:
            function (
                req,
                file,
                callback
            ) {
                if (
                    !duoiFileHopLe.has(
                        path
                            .extname(
                                file.originalname
                            )
                            .toLowerCase()
                    )
                ) {
                    return callback(
                        new Error(
                            "Chỉ nhận CV PDF, DOC, DOCX, JPG hoặc PNG"
                        )
                    );
                }

                callback(
                    null,
                    true
                );
            }
    });

function nhanUploadCV(
    req,
    res,
    next
) {
    upload.single("cv")(
        req,
        res,
        function (error) {
            if (error) {
                return res
                    .status(400)
                    .json({
                        message:
                            error.code ===
                            "LIMIT_FILE_SIZE"
                                ? "CV không được vượt quá 10 MB"
                                : error.message
                    });
            }

            next();
        }
    );
}

function duongDanFile(
    duongDan
) {
    const resolved =
        path.resolve(
            thuMucCV,
            duongDan || ""
        );

    if (
        !resolved.startsWith(
            thuMucCV +
                path.sep
        )
    ) {
        return null;
    }

    return resolved;
}


/* =========================
   DANH SÁCH ỨNG VIÊN
========================= */

router.get(
    "/",
    kiemTraDangNhap,
    async function (
        req,
        res
    ) {
        try {
            const dieuKien = [];
            const thamSo = [];

            if (
                req.query.dot_tuyen_id
            ) {
                dieuKien.push(
                    "uv.dot_tuyen_id = ?"
                );

                thamSo.push(
                    req.query
                        .dot_tuyen_id
                );
            }

            if (
                req.query.trang_thai &&
                trangThaiHopLe.has(
                    req.query.trang_thai
                )
            ) {
                dieuKien.push(
                    "uv.trang_thai = ?"
                );

                thamSo.push(
                    req.query
                        .trang_thai
                );
            }

            const where =
                dieuKien.length
                    ? "WHERE " +
                      dieuKien.join(
                          " AND "
                      )
                    : "";

            const [rows] =
                await db.query(
                    `
                        SELECT
                            uv.id,
                            uv.dot_tuyen_id,
                            uv.ho_ten,
                            uv.email,
                            uv.so_dien_thoai AS sdt,
                            uv.dia_chi,
                            uv.linkedin,
                            uv.github,
                            uv.trang_thai,
                            uv.nguon,
                            uv.ngay_tao,
                            uv.ngay_cap_nhat,
                            dt.ten_dot AS ten_dot_tuyen,

                            (
                                SELECT cv.id
                                FROM cv
                                WHERE cv.ung_vien_id = uv.id
                                ORDER BY
                                    cv.la_ban_chinh DESC,
                                    cv.ngay_tai_len DESC,
                                    cv.id DESC
                                LIMIT 1
                            ) AS cv_id,

                            (
                                SELECT cv.ten_file
                                FROM cv
                                WHERE cv.ung_vien_id = uv.id
                                ORDER BY
                                    cv.la_ban_chinh DESC,
                                    cv.ngay_tai_len DESC,
                                    cv.id DESC
                                LIMIT 1
                            ) AS ten_file

                        FROM ung_vien AS uv

                        INNER JOIN dot_tuyen AS dt
                            ON uv.dot_tuyen_id = dt.id

                        ${where}

                        ORDER BY uv.id DESC
                    `,
                    thamSo
                );

            res.json(rows);
        } catch (error) {
            console.error(
                "GET /api/ung-vien:",
                error
            );

            res.status(500).json({
                message:
                    "Không lấy được danh sách ứng viên"
            });
        }
    }
);


/* =========================
   CHI TIẾT ỨNG VIÊN
========================= */

router.get(
    "/:id",
    kiemTraDangNhap,
    async function (
        req,
        res
    ) {
        try {
            const [rows] =
                await db.query(
                    `
                        SELECT
                            uv.id,
                            uv.dot_tuyen_id,
                            uv.ho_ten,
                            uv.email,
                            uv.so_dien_thoai AS sdt,
                            uv.dia_chi,
                            uv.linkedin,
                            uv.github,
                            uv.trang_thai,
                            uv.nguon,
                            uv.ngay_tao,
                            uv.ngay_cap_nhat,
                            dt.ten_dot AS ten_dot_tuyen

                        FROM ung_vien AS uv

                        INNER JOIN dot_tuyen AS dt
                            ON uv.dot_tuyen_id = dt.id

                        WHERE uv.id = ?
                    `,
                    [req.params.id]
                );

            if (
                rows.length === 0
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Không tìm thấy ứng viên"
                    });
            }

            const [cv] =
                await db.query(
                    `
                        SELECT
                            id,
                            ten_file,
                            loai_file,
                            kich_thuoc,
                            la_ban_chinh,
                            ngay_tai_len

                        FROM cv

                        WHERE ung_vien_id = ?

                        ORDER BY
                            ngay_tai_len DESC,
                            id DESC
                    `,
                    [req.params.id]
                );

            res.json({
                ung_vien:
                    rows[0],

                cv:
                    cv.map(
                        function (file) {
                            return {
                                ...file,

                                url:
                                    `/api/ung-vien/${req.params.id}/cv/${file.id}`
                            };
                        }
                    )
            });
        } catch (error) {
            console.error(
                "GET /api/ung-vien/:id:",
                error
            );

            res.status(500).json({
                message:
                    "Không lấy được thông tin ứng viên"
            });
        }
    }
);


/* =========================
   THÊM ỨNG VIÊN
========================= */

router.post(
    "/",
    kiemTraDangNhap,
    kiemTraVaiTro(
        "admin",
        "manager",
        "hr"
    ),
    async function (
        req,
        res
    ) {
        try {
            const {
                dot_tuyen_id,
                ho_ten,
                email,
                sdt,
                dia_chi,
                linkedin,
                github,
                nguon
            } = req.body;

            if (
                !dot_tuyen_id ||
                typeof ho_ten !==
                    "string" ||
                !ho_ten.trim()
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Vui lòng chọn đợt tuyển và nhập họ tên"
                    });
            }

            const loiLienHe =
                loiDuLieuLienHe(
                    email,
                    sdt,
                    linkedin,
                    github
                );

            if (loiLienHe) {
                return res
                    .status(400)
                    .json({
                        message:
                            loiLienHe
                    });
            }

            const [dotTuyen] =
                await db.query(
                    `
                        SELECT trang_thai
                        FROM dot_tuyen
                        WHERE id = ?
                    `,
                    [dot_tuyen_id]
                );

            if (
                dotTuyen.length === 0
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Đợt tuyển dụng không tồn tại"
                    });
            }

            if (
                dotTuyenKhoaTaoUngVien(
                    dotTuyen[0]
                        .trang_thai
                )
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Không thể thêm ứng viên vào đợt tuyển dụng đã tạm dừng hoặc đóng"
                    });
            }

            const [result] =
                await db.query(
                    `
                        INSERT INTO ung_vien
                            (
                                dot_tuyen_id,
                                ho_ten,
                                email,
                                so_dien_thoai,
                                dia_chi,
                                linkedin,
                                github,
                                nguon
                            )

                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        dot_tuyen_id,
                        ho_ten.trim(),
                        String(
                            email || ""
                        ).trim() ||
                            null,
                        String(
                            sdt || ""
                        ).trim() ||
                            null,
                        dia_chi ||
                            null,
                        linkedin ||
                            null,
                        github ||
                            null,
                        nguon ||
                            null
                    ]
                );

            res
                .status(201)
                .json({
                    message:
                        "Thêm ứng viên thành công",
                    id:
                        result.insertId
                });
        } catch (error) {
            console.error(
                "POST /api/ung-vien:",
                error
            );

            res.status(500).json({
                message:
                    "Không thêm được ứng viên"
            });
        }
    }
);


/* =========================
   CẬP NHẬT ỨNG VIÊN
========================= */

router.put(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro(
        "admin",
        "manager",
        "hr"
    ),
    async function (
        req,
        res
    ) {
        try {
            const {
                dot_tuyen_id,
                ho_ten,
                email,
                sdt,
                dia_chi,
                linkedin,
                github,
                nguon,
                trang_thai
            } = req.body;

            if (
                !dot_tuyen_id ||
                typeof ho_ten !==
                    "string" ||
                !ho_ten.trim()
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Vui lòng chọn đợt tuyển và nhập họ tên"
                    });
            }

            const loiLienHe =
                loiDuLieuLienHe(
                    email,
                    sdt,
                    linkedin,
                    github
                );

            if (loiLienHe) {
                return res
                    .status(400)
                    .json({
                        message:
                            loiLienHe
                    });
            }

            if (
                trang_thai &&
                !trangThaiHopLe.has(
                    trang_thai
                )
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Trạng thái ứng viên không hợp lệ"
                    });
            }

            const [
                ungVienHienTai
            ] = await db.query(
                `
                    SELECT dot_tuyen_id
                    FROM ung_vien
                    WHERE id = ?
                `,
                [req.params.id]
            );

            if (
                ungVienHienTai.length ===
                0
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Không tìm thấy ứng viên"
                    });
            }

            const [dotTuyenMoi] =
                await db.query(
                    `
                        SELECT trang_thai
                        FROM dot_tuyen
                        WHERE id = ?
                    `,
                    [dot_tuyen_id]
                );

            if (
                dotTuyenMoi.length ===
                0
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Đợt tuyển dụng không tồn tại"
                    });
            }

            if (
                String(
                    ungVienHienTai[0]
                        .dot_tuyen_id
                ) !==
                    String(
                        dot_tuyen_id
                    ) &&
                dotTuyenKhoaTaoUngVien(
                    dotTuyenMoi[0]
                        .trang_thai
                )
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Không thể chuyển ứng viên sang đợt tuyển dụng đã tạm dừng hoặc đóng"
                    });
            }

            const [result] =
                await db.query(
                    `
                        UPDATE ung_vien

                        SET
                            dot_tuyen_id = ?,
                            ho_ten = ?,
                            email = ?,
                            so_dien_thoai = ?,
                            dia_chi = ?,
                            linkedin = ?,
                            github = ?,
                            nguon = ?,
                            trang_thai =
                                COALESCE(
                                    ?,
                                    trang_thai
                                )

                        WHERE id = ?
                    `,
                    [
                        dot_tuyen_id,
                        ho_ten.trim(),
                        String(
                            email || ""
                        ).trim() ||
                            null,
                        String(
                            sdt || ""
                        ).trim() ||
                            null,
                        dia_chi ||
                            null,
                        linkedin ||
                            null,
                        github ||
                            null,
                        nguon ||
                            null,
                        trang_thai ||
                            null,
                        req.params.id
                    ]
                );

            if (
                result.affectedRows ===
                0
            ) {
                const [rows] =
                    await db.query(
                        `
                            SELECT id
                            FROM ung_vien
                            WHERE id = ?
                        `,
                        [req.params.id]
                    );

                if (
                    rows.length === 0
                ) {
                    return res
                        .status(404)
                        .json({
                            message:
                                "Không tìm thấy ứng viên"
                        });
                }
            }

            res.json({
                message:
                    "Cập nhật ứng viên thành công"
            });
        } catch (error) {
            console.error(
                "PUT /api/ung-vien/:id:",
                error
            );

            res.status(500).json({
                message:
                    "Không cập nhật được ứng viên"
            });
        }
    }
);


/* =========================
   UPLOAD CV FILE
========================= */

router.post(
    "/:id/cv",
    kiemTraDangNhap,
    kiemTraVaiTro(
        "admin",
        "manager",
        "hr"
    ),
    nhanUploadCV,
    async function (
        req,
        res
    ) {
        if (!req.file) {
            return res
                .status(400)
                .json({
                    message:
                        "Vui lòng chọn tệp CV"
                });
        }

        const connection =
            await db.getConnection();

        try {
            await connection.beginTransaction();

            const [candidate] =
                await connection.query(
                    `
                        SELECT id
                        FROM ung_vien
                        WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (
                candidate.length ===
                0
            ) {
                await connection.rollback();

                fs.unlink(
                    duongDanFile(
                        req.file.filename
                    ),
                    function () {}
                );

                return res
                    .status(404)
                    .json({
                        message:
                            "Không tìm thấy ứng viên"
                    });
            }

            await connection.query(
                `
                    UPDATE cv
                    SET la_ban_chinh = 0
                    WHERE ung_vien_id = ?
                `,
                [req.params.id]
            );

            await connection.query(
                `
                    INSERT INTO cv
                        (
                            ung_vien_id,
                            ten_file,
                            duong_dan,
                            loai_file,
                            kich_thuoc,
                            la_ban_chinh
                        )

                    VALUES (?, ?, ?, ?, ?, 1)
                `,
                [
                    req.params.id,
                    path.basename(
                        req.file.originalname
                    ),
                    req.file.filename,
                    req.file.mimetype,
                    req.file.size
                ]
            );

            await connection.commit();

            res
                .status(201)
                .json({
                    message:
                        "Tải CV lên thành công"
                });
        } catch (error) {
            await connection.rollback();

            fs.unlink(
                duongDanFile(
                    req.file.filename
                ),
                function () {}
            );

            console.error(
                "POST /api/ung-vien/:id/cv:",
                error
            );

            res.status(500).json({
                message:
                    "Không tải được CV lên"
            });
        } finally {
            connection.release();
        }
    }
);


/* =========================
   UPLOAD CV TỪ URL
========================= */

router.post(
    "/:id/cv-url",
    kiemTraDangNhap,
    kiemTraVaiTro(
        "admin",
        "manager",
        "hr"
    ),
    async function (
        req,
        res
    ) {
        const urlValue =
            String(
                req.body.url || ""
            ).trim();

        if (!urlValue) {
            return res
                .status(400)
                .json({
                    message:
                        "Vui lòng nhập URL CV"
                });
        }

        let remoteFile;

        try {
            const [candidate] =
                await db.query(
                    `
                        SELECT id
                        FROM ung_vien
                        WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (
                candidate.length ===
                0
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Không tìm thấy ứng viên"
                    });
            }

            remoteFile =
                await layCVTuURL(
                    urlValue
                );
        } catch (error) {
            return res
                .status(400)
                .json({
                    message:
                        error.message ||
                        "Không tải được CV từ URL"
                });
        }

        const diskName =
            crypto.randomUUID() +
            remoteFile.extension;

        const filePath =
            duongDanFile(
                diskName
            );

        let connection;
        let transactionStarted =
            false;

        try {
            await fs.promises.writeFile(
                filePath,
                remoteFile.buffer,
                {
                    flag: "wx"
                }
            );

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            transactionStarted =
                true;

            const [candidate] =
                await connection.query(
                    `
                        SELECT id
                        FROM ung_vien
                        WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (
                candidate.length ===
                0
            ) {
                await connection.rollback();

                transactionStarted =
                    false;

                fs.unlink(
                    filePath,
                    function () {}
                );

                return res
                    .status(404)
                    .json({
                        message:
                            "Không tìm thấy ứng viên"
                    });
            }

            await connection.query(
                `
                    UPDATE cv
                    SET la_ban_chinh = 0
                    WHERE ung_vien_id = ?
                `,
                [req.params.id]
            );

            await connection.query(
                `
                    INSERT INTO cv
                        (
                            ung_vien_id,
                            ten_file,
                            duong_dan,
                            loai_file,
                            kich_thuoc,
                            la_ban_chinh
                        )

                    VALUES (?, ?, ?, ?, ?, 1)
                `,
                [
                    req.params.id,
                    remoteFile.fileName,
                    diskName,
                    remoteFile.mime,
                    remoteFile.buffer.length
                ]
            );

            await connection.commit();

            transactionStarted =
                false;

            res
                .status(201)
                .json({
                    message:
                        "Tải CV từ link thành công"
                });
        } catch (error) {
            if (
                connection &&
                transactionStarted
            ) {
                await connection.rollback();
            }

            fs.unlink(
                filePath,
                function () {}
            );

            console.error(
                "POST /api/ung-vien/:id/cv-url:",
                error
            );

            res.status(500).json({
                message:
                    "Không lưu được CV tải từ link"
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);


/* =========================
   TẢI CV
========================= */

router.get(
    "/:id/cv/:cvId",
    kiemTraDangNhap,
    async function (
        req,
        res
    ) {
        try {
            const [rows] =
                await db.query(
                    `
                        SELECT
                            ten_file,
                            duong_dan

                        FROM cv

                        WHERE
                            id = ?
                            AND ung_vien_id = ?
                    `,
                    [
                        req.params.cvId,
                        req.params.id
                    ]
                );

            if (
                rows.length === 0
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Không tìm thấy CV"
                    });
            }

            const filePath =
                duongDanFile(
                    rows[0]
                        .duong_dan
                );

            if (
                !filePath ||
                !fs.existsSync(
                    filePath
                )
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Tệp CV không còn tồn tại"
                    });
            }

            res.download(
                filePath,
                rows[0]
                    .ten_file
            );
        } catch (error) {
            console.error(
                "GET /api/ung-vien/:id/cv/:cvId:",
                error
            );

            res.status(500).json({
                message:
                    "Không tải được CV"
            });
        }
    }
);


/* =========================
   XÓA CV
========================= */

router.delete(
    "/:id/cv/:cvId",
    kiemTraDangNhap,
    kiemTraVaiTro(
        "admin",
        "manager",
        "hr"
    ),
    async function (
        req,
        res
    ) {
        let connection;
        let transactionStarted =
            false;

        try {
            connection =
                await db.getConnection();

            await connection.beginTransaction();

            transactionStarted =
                true;

            const [rows] =
                await connection.query(
                    `
                        SELECT
                            id,
                            duong_dan,
                            la_ban_chinh

                        FROM cv

                        WHERE
                            id = ?
                            AND ung_vien_id = ?
                    `,
                    [
                        req.params.cvId,
                        req.params.id
                    ]
                );

            if (
                rows.length === 0
            ) {
                await connection.rollback();

                transactionStarted =
                    false;

                return res
                    .status(404)
                    .json({
                        message:
                            "Không tìm thấy CV"
                    });
            }

            const cvCanXoa =
                rows[0];

            await connection.query(
                `
                    DELETE FROM cv

                    WHERE
                        id = ?
                        AND ung_vien_id = ?
                `,
                [
                    req.params.cvId,
                    req.params.id
                ]
            );

            /*
             * Nếu CV bị xóa là CV chính
             * thì chọn CV mới làm CV chính.
             */
            if (
                cvCanXoa.la_ban_chinh
            ) {
                const [cvMoi] =
                    await connection.query(
                        `
                            SELECT id

                            FROM cv

                            WHERE
                                ung_vien_id = ?

                            ORDER BY
                                ngay_tai_len DESC,
                                id DESC

                            LIMIT 1
                        `,
                        [
                            req.params.id
                        ]
                    );

                if (
                    cvMoi.length > 0
                ) {
                    await connection.query(
                        `
                            UPDATE cv

                            SET
                                la_ban_chinh = 1

                            WHERE id = ?
                        `,
                        [
                            cvMoi[0].id
                        ]
                    );
                }
            }

            await connection.commit();

            transactionStarted =
                false;

            /*
             * Xóa file CV vật lý
             * sau khi DB đã commit thành công.
             */
            const filePath =
                duongDanFile(
                    cvCanXoa.duong_dan
                );

            if (filePath) {
                fs.unlink(
                    filePath,
                    function () {}
                );
            }

            res.json({
                message:
                    "Xóa CV thành công"
            });
        } catch (error) {
            if (
                connection &&
                transactionStarted
            ) {
                await connection.rollback();
            }

            console.error(
                "DELETE /api/ung-vien/:id/cv/:cvId:",
                error
            );

            res.status(500).json({
                message:
                    "Không xóa được CV"
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);


/* =========================
   XÓA ỨNG VIÊN
========================= */

router.delete(
    "/:id",
    kiemTraDangNhap,
    kiemTraVaiTro(
        "admin",
        "manager"
    ),
    async function (
        req,
        res
    ) {
        try {
            const [files] =
                await db.query(
                    `
                        SELECT duong_dan
                        FROM cv
                        WHERE ung_vien_id = ?
                    `,
                    [req.params.id]
                );

            const [result] =
                await db.query(
                    `
                        DELETE FROM ung_vien
                        WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (
                result.affectedRows ===
                0
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Không tìm thấy ứng viên"
                    });
            }

            files.forEach(
                function (file) {
                    const filePath =
                        duongDanFile(
                            file.duong_dan
                        );

                    if (filePath) {
                        fs.unlink(
                            filePath,
                            function () {}
                        );
                    }
                }
            );

            res.json({
                message:
                    "Xóa ứng viên thành công"
            });
        } catch (error) {
            console.error(
                "DELETE /api/ung-vien/:id:",
                error
            );

            res.status(500).json({
                message:
                    "Không xóa được ứng viên"
            });
        }
    }
);


module.exports = router;