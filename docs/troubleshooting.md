# Xử Lý Sự Cố & Lưu Ý Bảo Mật (`troubleshooting.md`)

## 1. Hình nền gửi từ điện thoại báo lỗi hoặc không hiển thị
- **Nguyên nhân**: Ảnh gốc quá nặng (>12MB) hoặc sai định dạng, hoặc mã PIN ghép nối trên điện thoại không khớp với mã PIN của TV (mặc định `2026`).
- **Cách khắc phục**: Chọn ảnh định dạng `.jpg`, `.png` hoặc `.webp`. Trình quản lý **MySpace Mobile** sẽ tự động nén ảnh xuống dưới `2.5MB` trước khi gửi để bảo vệ bộ nhớ RAM của TV Samsung UA40K5300.

## 2. Phím điều hướng trên Remote TV không di chuyển ô chọn
- **Nguyên nhân**: Trình duyệt `TVHTML5` đang ở chế độ nhập địa chỉ thanh URL hoặc mất tiêu điểm (focus).
- **Cách khắc phục**: Nhấn phím `OK` hoặc một phím mũi tên bất kỳ trong vùng trang web; cơ chế **Tự động khôi phục tiêu điểm (Focus Recovery)** của MySpace TV sẽ tự động chọn lại ô ứng dụng đầu tiên.

## 3. Lưu ý Bảo mật khi chạy HTTP trong mạng nội bộ (Mục 13)
- Khi chạy trong mạng LAN gia đình qua giao thức `http://192.168.x.x:3000`, dữ liệu cấu hình và hình nền chỉ lưu truyền nội bộ trong bộ định tuyến (Router) của gia đình và được lưu tại tệp `data/myspace-state.json` trên máy tính của bạn, không gửi ảnh cá nhân ra máy chủ bên thứ ba.
- Tuy nhiên, nếu dùng chung mạng Wi-Fi với người lạ, hãy đổi **Mã ghép nối PIN** trong mục **7. Kết nối TV** để ngăn thiết bị khác tự ý thay đổi hình nền hoặc thêm URL lạ.
- Hệ thống đã tích hợp bộ lọc bảo mật chặn tuyệt đối các URL chứa `javascript:`, `data:`, `vbscript:` hoặc trỏ vào `/api/*`.
