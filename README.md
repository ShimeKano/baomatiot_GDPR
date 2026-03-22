# baomatiot_GDPR

Triển khai tối thiểu cho yêu cầu hệ thống bảo mật IoT GDPR healthcare:

- Cảm biến Wokwi gửi dữ liệu qua broker có sẵn.
- Dữ liệu trung bình ngày được đẩy lên Azure Cloud (mô phỏng qua `AzureCloudClient`).
- Đăng nhập bằng email:
  - `22004249@st.vlute.edu.vn` mặc định là `admin`.
  - Các email khác mặc định là `user`.
  - Admin có thể nâng quyền user lên admin.
- Hệ thống gửi mail 1 lần/ngày cho mỗi người dùng với tổng hợp chỉ số trung bình của cảm biến.

## Chạy test

```bash
python -m unittest -v
```
