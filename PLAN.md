# Kế hoạch triển khai Memory Match Master

## Bước 1: MVP & Ý tưởng (Đã hoàn thành)
- Game lật bài trí nhớ.
- Chế độ chơi: 1-4 người.
- Độ khó: Easy, Medium, Hard.

## Bước 2: Triển khai Code (Đang thực hiện)
- [x] Khởi tạo dự án Next.js (Cấu trúc app/, layout, page).
- [ ] Thiết lập bảng `leaderboard` trên Supabase (Cần người dùng thực hiện trên Dashboard Supabase).
- [x] Kết nối Frontend với Supabase qua API Routes.
- [x] Di chuyển logic game sang Next.js (app/page.tsx).
- [ ] Đảm bảo ứng dụng chạy mượt trên Local.

## Bước 3: Deploy (Mục tiêu)
- [ ] Đẩy code lên GitHub.
- [ ] Kết nối GitHub với **Vercel**.
- [ ] Cấu hình Environment Variables (Supabase URL, Anon Key) trên Vercel.
- [ ] Kiểm tra link ứng dụng thực tế.
