## Mô tả hệ thống IoT GDPR Healthcare

Hệ thống bảo mật IoT GDPR Healthcare sử dụng cảm biến trên Wokwi, lưu trữ/xử lý dữ liệu trên Azure Cloud và dùng broker có sẵn để truyền dữ liệu cảm biến.

### 1) Đăng nhập và phân quyền theo email
- Người dùng đăng nhập bằng tài khoản email.
- Email quản trị viên (admin) mặc định: **22004249@st.vlute.edu.vn**.
- Mọi email khác khi đăng nhập mặc định có quyền **user**.
- Admin có quyền nâng cấp user thành admin.

### 2) Dữ liệu cảm biến và hạ tầng
- Thiết bị cảm biến chạy trên môi trường Wokwi.
- Dữ liệu được gửi qua broker có sẵn.
- Hệ thống cloud sử dụng Azure để tiếp nhận và xử lý dữ liệu.

### 3) Chức năng gửi email hằng ngày
- Hệ thống gửi email tự động cho từng người dùng **1 lần mỗi ngày**.
- Nội dung email gồm bản tổng hợp các chỉ số cảm biến trung bình trong ngày.
- Việc gửi email phải đảm bảo đúng tần suất (không gửi quá 1 lần/ngày cho cùng một người dùng).
