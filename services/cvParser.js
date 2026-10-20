const fs = require("fs");
const os = require("os");
const path = require("path");
const pdfParse = require("pdf-parse");
const WordExtractor = require("word-extractor");
const { createWorker } = require("tesseract.js");
const yauzl = require("yauzl");

let ocrWorkerPromise;

async function layOcrWorker() {
    if (!ocrWorkerPromise) {
        const cacheRoot = process.env.VERCEL === "1"
            ? "/tmp"
            : path.join(os.homedir(), ".cache");
        const cachePath = path.join(cacheRoot, "tuyendung-ai", "tesseract");
        fs.mkdirSync(cachePath, { recursive: true });
        ocrWorkerPromise = createWorker("vie+eng", undefined, { cachePath });
    }

    return ocrWorkerPromise;
}

function layNoiDungDocx(buffer) {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(
            buffer,
            { lazyEntries: true, validateEntrySizes: true },
            (error, zip) => {
                if (error) return reject(new Error("File DOCX không hợp lệ hoặc bị hỏng."));
                let settled = false;
                function fail(message) {
                    if (settled) return;
                    settled = true;
                    zip.close();
                    reject(new Error(message));
                }

                zip.on("error", () => fail("Không thể đọc nội dung file DOCX."));
                zip.on("end", () => {
                    if (!settled) fail("DOCX không có nội dung văn bản chính.");
                });
                zip.on("entry", (entry) => {
                    if (entry.fileName !== "word/document.xml") {
                        zip.readEntry();
                        return;
                    }
                    if (entry.uncompressedSize > 15 * 1024 * 1024) {
                        fail("Nội dung DOCX vượt quá giới hạn xử lý.");
                        return;
                    }
                    zip.openReadStream(entry, (streamError, stream) => {
                        if (streamError) {
                            fail("Không thể trích xuất văn bản từ DOCX.");
                            return;
                        }
                        const chunks = [];
                        let size = 0;
                        stream.on("data", (chunk) => {
                            size += chunk.length;
                            if (size > 15 * 1024 * 1024) {
                                stream.destroy(new Error("DOCX vượt quá giới hạn xử lý."));
                                return;
                            }
                            chunks.push(chunk);
                        });
                        stream.on("error", () => fail("Không thể trích xuất văn bản từ DOCX."));
                        stream.on("end", () => {
                            if (settled) return;
                            settled = true;
                            zip.close();
                            resolve(Buffer.concat(chunks).toString("utf8"));
                        });
                    });
                });
                zip.readEntry();
            },
        );
    });
}

function giaiMaXML(text) {
    return text
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
}

async function trichXuatPdfScanBangOCR(buffer) {
    // PDF scan thường chỉ chứa ảnh, vì vậy cần render từng trang thành ảnh rồi OCR.
    // Giới hạn 5 trang đầu để tránh xử lý CV quá dài gây tốn tài nguyên.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = require("@napi-rs/canvas");
    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    const worker = await layOcrWorker();
    const pages = [];
    try {
        const soTrang = Math.min(Number(pdf.numPages) || 0, 5);
        for (let pageNumber = 1; pageNumber <= soTrang; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.6 });
            const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
            const context = canvas.getContext("2d");
            await page.render({ canvasContext: context, viewport }).promise;
            const result = await worker.recognize(canvas.toBuffer("image/png"));
            const text = String(result?.data?.text || "").trim();
            if (text) pages.push(text);
        }
    } finally {
        await pdf.destroy().catch(() => {});
    }
    return pages.join("\n\n");
}

async function trichXuatNoiDungCV(buffer, tenFile, mimeType) {
    let extension = path.extname(tenFile || "").toLowerCase();
    if (!extension) {
        const extensionByMime = {
            "application/pdf": ".pdf",
            "application/msword": ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "image/jpeg": ".jpg",
            "image/png": ".png",
        };
        extension = extensionByMime[String(mimeType || "").split(";")[0].trim().toLowerCase()] || "";
    }
    let text;

    if (extension === ".pdf") {
        try {
            const result = await pdfParse(buffer);
            text = result.text;
        } catch (error) {
            text = "";
        }
        if (String(text || "").trim().length < 30) {
            try {
                text = await trichXuatPdfScanBangOCR(buffer);
            } catch (error) {
                console.error("Không thể OCR PDF scan:", error.message || error);
            }
        }
    } else if (extension === ".docx") {
        const xml = await layNoiDungDocx(buffer);
        text = giaiMaXML(xml
            .replace(/<\/w:p>/g, "\n")
            .replace(/<w:tab\b[^>]*\/>/g, "\t")
            .replace(/<w:br\b[^>]*\/>/g, "\n")
            .replace(/<[^>]*>/g, " "));
    } else if (extension === ".doc") {
        const extractor = new WordExtractor();
        const document = await extractor.extract(buffer);
        text = document.getBody();
    } else if ([".jpg", ".jpeg", ".png"].includes(extension)) {
        const worker = await layOcrWorker();
        const result = await worker.recognize(buffer);
        text = result.data.text;
    } else {
        throw new Error("Định dạng CV không được hỗ trợ để trích xuất nội dung.");
    }

    const cleanedText = String(text || "")
        .replace(/\u0000/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    if (cleanedText.length < 30) {
        if (extension === ".pdf") {
            throw new Error("PDF không có đủ văn bản để đọc. Hệ thống đã thử OCR cho PDF scan nhưng chưa trích xuất được. Hãy chạy npm install để cài thư viện OCR, bảo đảm kết nối Internet ở lần chạy OCR đầu tiên, hoặc tải CV dạng DOCX/PDF có thể bôi đen và sao chép chữ.");
        }
        if ([".doc", ".docx"].includes(extension)) {
            throw new Error("Không trích xuất được nội dung Word. Hãy mở file và lưu lại dưới dạng DOCX mới rồi tải lên.");
        }
        throw new Error("Không trích xuất được đủ nội dung từ CV. Hãy kiểm tra file hoặc bổ sung thông tin bằng tay.");
    }

    return cleanedText.slice(0, 30000);
}

module.exports = { trichXuatNoiDungCV };
