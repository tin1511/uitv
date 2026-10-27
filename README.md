# MySpace TV — Giao diện Smart TV Cá nhân Tùy chỉnh bằng Điện thoại

**MySpace TV** là giao diện Smart TV cá nhân được thiết kế riêng cho **Samsung UA40K5300** (trình duyệt `TVHTML5` phiên bản `7.20261021.13.00`), cho phép điều hướng bằng điều khiển từ xa (Remote Samsung) và tùy chỉnh toàn diện (hình nền, màu sắc, bố cục, ứng dụng, trò chơi) theo thời gian thực từ điện thoại di động thông qua **MySpace Mobile**.

## Cấu trúc Dự án
- `src/shared/types.ts`: Định nghĩa kiểu dữ liệu dùng chung cho TV, Điện thoại và Máy chủ đồng bộ.
- `src/shared/defaultConfig.ts`: Cấu hình mặc định, bộ hình nền SVG nhẹ RAM và danh sách ứng dụng phân loại 3 nhóm.
- `src/shared/validation.ts`: Kiểm tra an toàn URL (chống XSS `javascript:`), kiểm tra định dạng/dung lượng hình nền (`< 2.5MB`), sắp xếp ứng dụng và bộ kiểm thử tự động 7 bài test.
- `src/components/MySpaceMobileManager.tsx`: Trang quản lý trên điện thoại gồm 8 phân mục (Tổng quan, Hình nền, Giao diện, Bố cục, Ứng dụng, Trò chơi, Kết nối TV, Cài đặt).
- `src/components/MySpaceTVGames.tsx`: 3 trò chơi tương thích điều khiển bằng Remote Samsung (Cờ Caro TV 9×9, Giải đố 2048 TV, Lật Hình Trí Nhớ TV).
- `src/App.tsx`: Giao diện chính **MySpace TV (16:9)** kết hợp chế độ kiểm thử đôi cạnh nhau.
- `server.ts`: Máy chủ đồng bộ Express + WebSocket (`/ws`) + HTTP Polling dự phòng, lưu trữ bền vững tại `data/myspace-state.json`.
- `docs/`: Tài liệu kiến trúc, cài đặt trên Windows, kết nối điện thoại, triển khai lên Samsung UA40K5300 và xử lý sự cố.
