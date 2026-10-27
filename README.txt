HĐV TV & HĐV REMOTE ECOSYSTEM — PHIÊN BẢN SẢN PHẨM THỰC TẾ 1.0
===================================================================
Chủ tịch dự án: Hồn Đất Việt (HĐV TV)
Thiết bị mục tiêu: Samsung Smart TV UA40K5300 (Series 5 • 2016 • Full HD 1920x1080 • Tizen 2.4)

1. KIẾN TRÚC HỆ THỐNG ĐÃ TRIỂN KHAI
-----------------------------------
- HĐV TV Frontend (16:9): Giao diện màn hình lớn gồm đầy đủ 8 khu vực (Trang chủ, Thanh điều hướng, Kho ứng dụng, Media 6 kênh văn hóa - lịch sử - âm nhạc - hoạt hình Việt Nam, Yêu thích, Tìm kiếm, Trợ lý AI Hồn Đất Việt, Cài đặt 60fps & Chẩn đoán thiết bị).
- HĐV Remote PWA: Ứng dụng điều khiển TV trên Android, iPhone, Windows; hỗ trợ cài đặt ra màn hình chính (PWA Manifest + Service Worker) và điều khiển/tìm kiếm bằng giọng nói Tiếng Việt (vi-VN).
- HĐV Bridge (Express + WebSocket /ws + Windows LAN Script):
  + Đồng bộ hai chiều thời gian thực giữa HĐV Remote và HĐV TV kèm xác nhận 3 trạng thái độc lập (1. Nhận dạng giọng nói -> 2. Gửi lệnh qua Bridge -> 3. TV xác nhận thực thi ACK).
  + Quét cổng mạng LAN thực tế (:8001, :8002, :55000, :7676) và tải kịch bản `public/hdv-bridge-windows.mjs` để chạy trực tiếp trong mạng LAN gia đình trên Windows.

2. HƯỚNG DẪN CHẠY TRÊN WINDOWS & KẾT NỐI TV SAMSUNG UA40K5300
-------------------------------------------------------------
Bước 1: Cài đặt Node.js LTS (v18 hoặc v20+) trên máy tính Windows.
Bước 2: Mở cửa sổ dòng lệnh (PowerShell / CMD) tại thư mục dự án và chạy:
  npm install
  npm run dev
Bước 3: Xem địa chỉ IP LAN của máy tính Windows (bằng lệnh `ipconfig`, ví dụ 192.168.1.50).
Bước 4:
  - Trên TV Samsung UA40K5300: Mở trình duyệt Internet Browser, truy cập `http://<IP_MAY_TINH>:3000/?mode=tv` và bấm biểu tượng Ngôi sao (Bookmark) để ghim làm trang chủ.
  - Trên Điện thoại Android / iPhone: Mở trình duyệt truy cập `http://<IP_MAY_TINH>:3000/?mode=remote` (hoặc dùng đường dẫn HTTPS để cấp quyền Micro giọng nói và bấm "Cài PWA").
Bước 5 (Tùy chọn cho cổng phần cứng LAN :8001):
  - Chạy thêm lệnh: `node public/hdv-bridge-windows.mjs --tv-ip <IP_CUA_TV>` để kiểm tra và chuyển tiếp lệnh phần cứng tới cổng 8001 của TV.

3. LƯU Ý KỸ THUẬT TRUNG THỰC TRÊN SAMSUNG UA40K5300
---------------------------------------------------
- Các lệnh Điều hướng (Lên, Xuống, Trái, Phải, OK, Back, Home, Menu), Âm lượng (VOL+, VOL-, Mute), Chuyển kênh (CH+, CH-) và Tìm kiếm giọng nói tiếng Việt hoạt động thực tế 100% giữa HĐV Remote và HĐV TV qua WebSocket.
- Nút Nguồn (KEY_POWER): Có thể đưa giao diện vào chế độ Nghỉ (Standby) hoặc gửi lệnh tắt TV (KEY_POWEROFF) qua cổng LAN :8001. Khi TV đã tắt nguồn hoàn toàn, Wi-Fi của UA40K5300 ngắt điện nên bắt buộc phải bật lại bằng điều khiển hồng ngoại (IR) vật lý.
- Đổi cổng HDMI vật lý (KEY_SOURCE): Trình duyệt web bị sandbox chặn quyền đổi cổng HDMI phần cứng; cần gửi qua HĐV Bridge LAN (:8001) hoặc bấm phím Source trên điều khiển vật lý.
