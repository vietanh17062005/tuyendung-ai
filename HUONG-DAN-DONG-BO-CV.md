# Đồng bộ CV giữa máy local và bản deploy

## Cơ chế mới

- Tất cả luồng tải CV lên, tải CV từ URL, tải CV hàng loạt và thay CV đều lưu vào cùng một Vercel Blob Store.
- Database lưu URL Blob trong cột `cv.duong_dan`; local và deploy đều đọc cùng URL này.
- Các CV cũ có đường dẫn local vẫn có thể xem được trên máy đang giữ file, nhưng cần chuyển lên Blob để bản deploy và các máy khác xem được.

## 1. Cấu hình môi trường local

1. Trong Vercel, mở **Project → Settings → Environment Variables**.
2. Sao chép giá trị `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` và `BLOB_READ_WRITE_TOKEN` của đúng dự án đang deploy.
3. Tạo file `.env` tại thư mục chứa `server.js` bằng cách sao chép `.env.example`, rồi điền các giá trị thật. Không gửi file `.env` hoặc token cho người khác và không commit file này lên Git.
4. Local và deploy phải trỏ tới cùng database cloud và cùng Blob Store. Nếu local vẫn trỏ `localhost`/XAMPP còn deploy dùng database cloud, dữ liệu ứng viên và CV trong hai database sẽ không tự đồng bộ.
5. Chạy `npm install`, sau đó `npm start`.

## 2. Cấu hình Vercel

Trong Environment Variables của Vercel, bảo đảm `BLOB_READ_WRITE_TOKEN` trỏ tới cùng Blob Store và các biến DB trỏ tới database cloud như cấu hình local. Sau đó redeploy dự án.

## 3. Chuyển các CV cũ đang nằm trên máy local

Trước khi chuyển, hãy sao lưu database. Đảm bảo `.env` trên máy đang chạy script trỏ tới database cloud mà bản deploy sử dụng, vì script sẽ cập nhật `cv.duong_dan` trong database đó.

Chạy thử, chưa thay đổi database:

```bash
npm run migrate:cv
```

Kiểm tra `cv-migration-report.json`. Chỉ các file tìm thấy trong thư mục `uploads/cv` mới có thể được chuyển; file đã mất cần tải lên lại.

Khi đã kiểm tra báo cáo và chắc chắn cấu hình đúng, chạy thật:

```bash
node scripts/migrate-cv-to-blob.js --apply
```

Script upload file lên Blob và cập nhật URL vào bản ghi CV tương ứng. Không chạy `--apply` nếu chưa sao lưu database hoặc chưa xác nhận `.env` trỏ đúng database cloud.

## Lưu ý

- `BLOB_READ_WRITE_TOKEN` phải là token có quyền đọc/ghi Blob. Không dùng mật khẩu Gmail hay token API khác.
- Blob URL là đường dẫn công khai để xem/tải CV. Vì CV có thể chứa thông tin cá nhân, chỉ cấp quyền truy cập hệ thống cho người được phép; nếu cần lưu trữ riêng tư, cần thiết kế cơ chế Blob private và route tải file có xác thực.
- Thay đổi này đồng bộ kho file CV và metadata khi cả hai môi trường dùng cùng database. Nó không tự hợp nhất hai database khác nhau.


## Lưu trữ CV riêng tư

Blob Store dùng chế độ private. Các route backend dùng `get(url, { access: "private" })` và chỉ stream nội dung sau khi kiểm tra đăng nhập/quyền truy cập; không redirect trình duyệt tới URL Blob. Upload mới và script migration đều dùng `access: "private"`.
