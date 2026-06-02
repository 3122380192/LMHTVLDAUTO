<div align=center>
<h1>Công Cụ Hỗ Trợ Tự Động Chấp Nhận Trận Đấu LOL</h1>
  <img width="350" height="350" src="./resources/logo.png?raw=true"/>
</div>

<div align="center">

![Static Badge](https://img.shields.io/badge/react-18.2.0-blue)
![Static Badge](https://img.shields.io/badge/electron-28.3.3-blue)

</div>

<div align=center>
  Phần mềm tự động chấp nhận trận đấu trong Liên Minh Huyền Thoại và cung cấp thêm một số tính năng phụ cực kỳ hữu ích.
</div>

[English](./README_en.md) | Tiếng Việt

## ✨ Tính năng
1. **🚀 Tự động chấp nhận trận đấu**: Tự động chấp nhận trận đấu trong vòng 1 giây.  
   Nếu bạn muốn đổi ý sau khi đã tự động chấp nhận, chỉ cần nhấn nút "Từ chối trận đấu" trên giao diện ứng dụng.
2. **🏆 Hiển thị mức rank của đồng đội khi chọn tướng**: Tính năng này sẽ không hoạt động ở các máy chủ không còn hiển thị tên người chơi trong giai đoạn cấm/chọn.
3. **👥 Hiển thị người chơi duo/premade**: Trong trận đấu, hiển thị thông tin các cặp duo (hoặc tổ đội nhiều người) của cả hai bên, được sắp xếp theo số lượng thành viên.
4. **📖 Hiển thị quy tắc hàng chờ**: Trong trận đấu, hiển thị quy tắc hàng chờ của người chơi cả hai bên.
5. **🎲 Chế độ ARAM**: Khi chọn tướng ARAM, bạn có thể chọn trước các tướng mong muốn của đồng đội. Nếu tướng đó được xúc xắc ra, ứng dụng sẽ tự động chọn giúp bạn.
6. **🪪 Thay đổi thẻ hồ sơ (Hovercard)**: Di chuột vào ảnh đại diện của bạn để xem hiệu ứng thay đổi.

## 🌟 Ưu điểm nổi bật
- **Sử dụng CPU cực thấp**: Nhờ cơ chế đăng ký sự kiện (event subscription), ứng dụng chỉ chạy khi các sự kiện cụ thể diễn ra, thời gian còn lại mức sử dụng CPU gần như bằng 0.
- **Không can thiệp tệp tin game**: Không tiêm (inject) mã độc hay chỉnh sửa bất kỳ tệp tin nào của game, giữ cho game luôn sạch và an toàn.
- **Gọi API an toàn**: Sử dụng cùng API nội bộ với LeagueClient, đảm bảo độ an toàn và bảo mật cao.


## 🔍 Câu hỏi thường gặp (FAQ)
### 1. Sử dụng công cụ này có bị khóa tài khoản không?
- Nhiều người dùng đã sử dụng công cụ này trong hơn 3 năm qua và chưa có trường hợp nào bị khóa tài khoản.  
  Tuy nhiên, tác giả không chịu trách nhiệm cho bất kỳ rủi ro nào; vui lòng tự cân nhắc trước khi sử dụng.  
  Nếu bạn lo ngại, xin vui lòng không sử dụng.

### 2. Tại sao một số tính năng bị lỗi hoặc không hoạt động?
- Các tính năng hoạt động phụ thuộc hoàn toàn vào API của LeagueClient. Nếu Riot cập nhật API chính thức, một số tính năng có thể tạm thời không hoạt động.

### 3. Làm thế nào để gỡ cài đặt ứng dụng?
- Chỉ cần xóa thư mục của ứng dụng. Phần mềm không lưu thêm bất kỳ tệp tin nào khác trên máy tính của bạn.

### 4. Tệp tin cấu hình ở đâu?
- Thông thường bạn không cần chỉnh sửa tệp tin cấu hình này.
- Đường dẫn: `lol-app-win32-x64\resources\app\app-config.json`

## 👤 Tác giả
- Phát triển bởi **Vua Lì Đòn**

## 🎉 Lời kết
**Nếu ứng dụng này hữu ích với bạn, hãy tặng cho mình 1 ⭐️ nhé!**  
**Đó là nguồn động lực lớn nhất dành cho mình!**
