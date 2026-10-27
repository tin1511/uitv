# Hướng Dẫn Cài Đặt & Chạy Trên Máy Tính Windows (`setup-windows.md`)

## 1. Yêu cầu môi trường trên Windows
- Hệ điều hành: Windows 10 hoặc Windows 11.
- Cài đặt **Node.js LTS** (phiên bản 18.x hoặc 20.x trở lên) từ `https://nodejs.org`.
- Máy tính Windows, điện thoại và TV Samsung UA40K5300 kết nối vào **cùng một mạng Wi-Fi / LAN gia đình**.

## 2. Các bước khởi chạy
1. Mở **PowerShell** hoặc **Command Prompt** tại thư mục gốc của dự án `MySpace TV`.
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi động máy chủ đồng bộ và giao diện MySpace TV tại cổng `3000`:
   ```bash
   npm run dev
   ```
4. Tìm địa chỉ IP nội bộ (LAN IP) của máy tính Windows:
   ```bash
   ipconfig
   ```
   Tìm dòng `IPv4 Address` (ví dụ: `192.168.1.50`).

## 3. Kiểm thử ngay trên máy tính Windows
- Mở trình duyệt Chrome hoặc Edge tại địa chỉ: `http://localhost:3000`
- Chọn chế độ **"Kiểm thử Đôi (TV + Điện thoại)"** ở thanh trên cùng để vừa thao tác trên giao diện **MySpace Mobile** (bên phải) vừa quan sát **MySpace TV** (bên trái) thay đổi hình nền, màu sắc, bố cục và ứng dụng ngay lập tức.
