# Đồng bộ web demo với PowerPoint — 13/09/2026

Chỉnh trực tiếp bản ZIP được gửi. Không ghi hoặc thay đổi repository GitHub nào.
Đối chiếu với `DSA_Dark_Search_Hash_Redesigned.pptx`, bản đã sửa theo nhánh
`TraiNguyenVan/dsa-group-project/feature/basic-algorithm-implementation/src/cpp`.

| Demo | Input mặc định | Kết quả |
|---|---|---|
| Linear search | 14, 7, 21, 4, 18; tìm 4 | index 3 |
| Binary search | 3, 8, 12, 17, 23, 31, 42; tìm 31 | index 5 |
| Interpolation search | 10, 20, 30, 40, 50, 60, 70; tìm 50 | index 4 |
| Division | 26; size 10 | bucket 6 |
| Mid-square | 1234; size 100 | bucket 22 |
| Multiplicative | 26; size 10 | bucket 0 |
| Chaining | 15, 25, 35; size 10 | bucket 5: 35 → 25 → 15 |
| Linear probing | 12, 22, 32; size 10 | slots 2, 3, 4 |
| Quadratic probing | 22, 33, 44; size 11 | slots 0, 1, 3 |
| Double hashing | 22, 33, 44; size 11 | slots 0, 4, 5 |
| Hash search (bổ sung trên web) | 12, 22, 32; size 10; tìm 32 | index 4 |

## Quy tắc đã sửa

- Quadratic dùng `j(j+1)/2`, modulo bằng lũy thừa 2 nhỏ nhất không nhỏ hơn kích thước bảng, bỏ qua chỉ số ngoài bảng. Không dùng `j² mod size` nữa.
- Chaining thêm đầu danh sách, giữ khóa trùng. Linear/quadratic cũng giữ các lần chèn khóa trùng như code slide.
- Double hashing dùng `1 + key % (size - 1)`; chỉ chấp nhận size nguyên tố để bước nhảy thăm được mọi ô. Riêng phương pháp này bỏ qua khóa trùng như code slide.
- Mid-square lấy cửa sổ cố định: `floor(key² / 1000) % 100`. Không thay đổi số chữ số theo size. UI chỉ hiện bucket có dữ liệu, vẫn ghi đúng chỉ số trong bảng 100 bucket.
- Division giữ hành vi ghi đè khi va chạm và giải thích việc ghi đè trong từng bước.
- Hash search dùng cùng quy tắc tạo bảng với linear probing. Nếu không chèn đủ khóa vì bảng đầy, hiển thị lỗi rõ ràng thay vì âm thầm bỏ mất khóa.
- Hash nhận khóa 0–9999, phù hợp miền ví dụ C++; tìm kiếm vẫn hỗ trợ số âm. Giữ giới hạn 12 giá trị cho giao diện dễ đọc.
- Bỏ Folding còn sót; không thêm Universal. Giữ mid-square, multiplicative và double hashing là các ví dụ bổ sung trong PowerPoint, không gán chúng là code từ repository tham khảo.
- Giữ giao diện nền tối, nhập input, reset, tạm dừng và điều khiển từng bước. Cập nhật ba đoạn C++ tìm kiếm trong web theo slide.

## Kiểm thử đã chạy

`npm run test:algorithms`: **12/12 nhóm kiểm thử đạt**.

- Mười ví dụ PowerPoint cho kết quả chính xác.
- 500 mảng xác định × 3 cách tìm kiếm × 33 giá trị đích, đối chiếu với phép kiểm tra membership độc lập; kiểm tra thêm chỉ số đầu tiên cho linear.
- Mảng rỗng, trùng phần tử, số âm, ngoài miền tìm kiếm, input sai và mảng chưa sắp xếp.
- Linear/quadratic với mọi size 2–13; double với các size nguyên tố trong miền: chèn đầy, thử chèn thêm, bảo toàn dữ liệu đã chèn.
- Quadratic đi qua khoảng trống ngoài bảng; wraparound, khóa trùng, collision ghi đè và lỗi bảng đầy khi tìm kiếm hash.
- Mid-square đối chiếu bằng cắt chuỗi 8 chữ số cho toàn bộ 10.000 khóa 0–9999.
- Đọc trực tiếp defaults từ app.js rồi chạy engine; kiểm tra tên thuật toán trong từng phần C++ và không còn Folding/Universal trong HTML.
- `node --check` thành công cho app.js và demo-engine.js.

Giới hạn: chưa xác minh bằng trình duyệt thật hoặc build toàn bộ Vinext trong phiên này vì môi trường không có trình duyệt và dependency riêng của ứng dụng. Kết quả trên xác minh engine thực sự được web sử dụng và cấu hình ví dụ, không khẳng định đã kiểm tra giao diện bằng thao tác click.

## Chạy nhanh

Từ thư mục DSA-main:

```bash
python3 -m http.server 8080 --directory public
```

Mở http://localhost:8080/presentation.html.
Trên Windows có thể dùng `py` thay cho `python3`.

Chạy kiểm thử không cần cài dependency (Node.js theo engines trong package.json):

```bash
npm run test:algorithms
```

## Chỉnh khung quét ở slide giới thiệu Linear search

Khung sáng dùng đúng chiều cao, bo góc và vị trí trên của ô. Chiều rộng tính từ
chiều rộng grid trừ bốn khoảng cách rồi chia năm; mỗi bước dịch đúng một ô cộng
một khoảng cách, thay cho các khoảng dịch cố định trước đây. Giảm quầng sáng,
dừng ngắn ở từng ô, dừng lâu ở số 4 và mờ đi trước khi quay lại đầu.
Chỉ số dưới mảng dùng cùng khoảng cách với grid. Thay đổi chỉ thuộc CSS;
không thay đổi thuật toán. Chưa kiểm tra trực quan bằng trình duyệt thật.
