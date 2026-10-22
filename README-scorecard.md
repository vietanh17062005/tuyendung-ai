# Cập nhật tiêu chí đánh giá phỏng vấn theo đợt tuyển dụng

## Thay đổi
- Mỗi đợt tuyển dụng có bộ tiêu chí đánh giá phỏng vấn riêng, liên kết bằng `dot_tuyen_id`.
- Bộ mẫu mặc định chỉ gồm kỹ năng giao tiếp, thái độ/cầu tiến, làm việc nhóm và trách nhiệm; không trộn tiêu chí chuyên môn do AI tạo theo JD.
- Lần đầu mở tiêu chí của một đợt, hệ thống sao chép bộ mẫu vào đợt đó. Sau đó chỉnh sửa không ảnh hưởng đợt khác.
- Form chấm điểm tự tải tiêu chí theo đợt tuyển dụng của ứng viên; ô điểm ban đầu để trống.
- Các tiêu chí/điểm đã lưu trong feedback được giữ trong `diem_json` để bảo toàn thông tin đã chấm.

## Cập nhật
1. Sao lưu dự án và database hiện tại.
2. Chép các thư mục/file trong ZIP đè lên dự án hiện tại (không thay `.env`).
3. Khởi động lại server. Khi gọi API tiêu chí, ứng dụng tự bổ sung cột `dot_tuyen_id` nếu chưa có và khởi tạo bộ mẫu.
4. Mở Feedback & kết quả phỏng vấn, chọn đợt tuyển dụng trong mục Scorecard, rồi bấm “Xem và sửa tiêu chí đánh giá”.

## Lưu ý
- Đợt tuyển dụng cần có ít nhất một lịch phỏng vấn/ứng viên để xuất hiện trong danh sách chọn trên trang Feedback.
- Tổng trọng số các tiêu chí đang dùng phải bằng 100%.
- Đã kiểm tra cú pháp JavaScript bằng `node --check`; chưa kết nối database của bạn để chạy kiểm thử tích hợp.
- ZIP này không chứa `.env`, `.env.local`, `node_modules`, thư mục CV tải lên hoặc `.git`.
