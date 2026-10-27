# Kiến Trúc Phần Mềm — Dự Án MySpace TV

## 1. Phân tích Nền tảng Mục tiêu: Samsung UA40K5300 (`TVHTML5 7.20261021.13.00`)
- **Model**: Samsung UA40K5300 (Series 5 Full HD 1920×1080, ra mắt năm 2016).
- **Trình duyệt ghi nhận trên thiết bị**: `TVHTML5` phiên bản `7.20261021.13.00`.
- **Đặc điểm kỹ thuật và giới hạn**:
  1. Không chạy hệ điều hành Android TV (không thể cài tệp `.apk`).
  2. Bộ nhớ RAM dành cho một tab trình duyệt bị giới hạn nghiêm ngặt; nếu tải ảnh gốc 4K/8K chưa nén hoặc chạy nhiều hiệu ứng `backdrop-filter: blur()` liên tục sẽ gây giật khung hình hoặc tự đóng trình duyệt.
  3. Không có ứng dụng **YouTube Kids** riêng biệt trên kho ứng dụng của dòng K5300; chỉ có thể truy cập qua trình duyệt hoặc danh sách phát thiếu nhi trên YouTube.
  4. Điều khiển từ xa của TV gửi các sự kiện phím chuẩn (`ArrowUp` `38`, `ArrowDown` `40`, `ArrowLeft` `37`, `ArrowRight` `39`, `Enter` `13`) cùng mã phím `Return` đặc thù (`10009`, `461`, `88`) và 4 phím màu (`403` Đỏ, `404` Xanh lá, `405` Vàng, `406` Xanh dương).

## 2. Quyết định Kiến trúc
Thay vì ép cài gói ứng dụng phức tạp không tương thích với `TVHTML5`, MySpace TV sử dụng kiến trúc **Web App Nhẹ + Dịch vụ Đồng bộ Mạng Nội bộ (WebSocket + HTTP Fallback)**:
1. **Giao diện TV (`MySpace TV` - `/?mode=tv`)**:
   - Hiển thị toàn màn hình 16:9, hỗ trợ căn lề an toàn chống cắt viền (`Overscan Safe Area`), 3 kiểu bố cục (`Hàng ngang`, `Lưới ứng dụng`, `Đồng hồ lớn tối giản`), đổi hình nền tức thì không tải lại trang.
   - Bắt phím điều hướng không gian 2 chiều (Spatial Navigation) có cơ chế tự khôi phục tiêu điểm (Focus Recovery) và chống lặp phím (`< 85ms`).
2. **Trang quản lý điện thoại (`MySpace Mobile` - `/?mode=mobile`)**:
   - Cho phép chọn ảnh từ điện thoại, tự động nén và thu phóng về kích thước chuẩn TV (`<= 1600×900`, JPEG 82%, `< 2.5MB`) ngay trên trình duyệt điện thoại trước khi gửi lên TV.
   - Quản lý màu sắc, bố cục, thêm/sửa/xóa/sắp xếp lối tắt và trò chơi.
3. **Dịch vụ Đồng bộ (`server.ts` + `data/myspace-state.json`)**:
   - Lưu trữ bền vững toàn bộ cấu hình vào tệp `data/myspace-state.json` trên máy chủ kết hợp `localStorage` trên trình duyệt.
   - Bảo vệ bằng mã ghép nối PIN (mặc định `2026`) để ngăn thiết bị lạ trong mạng tự ý thay đổi giao diện TV.
