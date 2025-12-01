// Backend

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- Socket.io (real-time)
- Bcrypt (hash password)
- Multer + Cloudinary (upload images)
- Express-validator (validation)

backend/
├── src/
│ ├── config/
│ │ ├── db.js
│ │ └── cloudinary.js
│ ├── models/
│ │ ├── User.js
│ │ ├── Store.js
│ │ ├── Category.js
│ │ ├── Product.js
│ │ ├── Table.js
│ │ └── Order.js
│ ├── routes/
│ │ ├── auth.js
│ │ ├── admin.js
│ │ ├── store.js
│ │ ├── order.js
│ │ └── public.js
│ ├── controllers/
│ ├── middleware/
│ │ ├── auth.js
│ │ └── upload.js
│ ├── utils/
│ │ └── socket.js
│ └── server.js
└── package.json

2. Các Module cần có (Siêu tối giản)
   A. Module Admin

Quản lý cửa hàng

CRUD cửa hàng
Kích hoạt/vô hiệu hóa cửa hàng

Dashboard đơn giản

Tổng số cửa hàng
Tổng số đơn hàng trong hệ thống

B. Module Host/Store Owner

Quản lý Menu

CRUD danh mục
CRUD sản phẩm (tên, giá, ảnh, mô tả)
Toggle còn hàng/hết hàng

Quản lý Bàn

CRUD bàn
Tạo & in QR code

Quản lý Đơn hàng

Nhận đơn real-time (Socket.io)
Xem danh sách đơn
Đánh dấu hoàn thành/hủy
Xem chi tiết đơn

Thống kê cơ bản

Doanh thu hôm nay/tuần/tháng
Số đơn hàng
Top 5 món bán chạy

C. Module Khách hàng (Rất đơn giản)

Xem menu

Scan QR → vào trang menu
Hiển thị sản phẩm theo danh mục
Xem chi tiết món

Đặt hàng

Add to cart
Checkout (nhập SĐT + ghi chú)
Submit đơn
Hiện modal "Đặt hàng thành công! Món ăn sẽ có sau ~10 phút"
✅ XONG - không có tracking

Database Schema
// Users
{
\_id,
email,
password, // bcrypt hash
role: enum['admin', 'host'],
name,
phone,
storeId: ObjectId // nếu là host
}

// Stores
{
\_id,
name,
address,
phone,
logo: String, // URL
ownerId: ObjectId (ref Users),
isActive: Boolean,
createdAt
}

// Categories
{
\_id,
name,
storeId: ObjectId (ref Stores),
order: Number // thứ tự hiển thị
}

// Products
{
\_id,
name,
description,
price: Number,
image: String, // URL
categoryId: ObjectId (ref Categories),
storeId: ObjectId (ref Stores),
isAvailable: Boolean,
createdAt
}

// Tables
{
\_id,
tableNumber: String, // "B01", "B02"
area: String, // "Tầng 1", "Sân thượng"
storeId: ObjectId (ref Stores),
qrCodeUrl: String // Link đến menu
}

// Orders
{
\_id,
orderNumber: String, // auto-gen: "ORD20240115001"
storeId: ObjectId (ref Stores),
tableId: ObjectId (ref Tables),
tableName: String, // cache để hiển thị
customerPhone: String,
customerNote: String,
items: [
{
productId: ObjectId,
name: String, // cache
price: Number, // cache
quantity: Number
}
],
totalAmount: Number,
status: enum['pending', 'completed', 'cancelled'],
createdAt,
completedAt
}

```

---

## 5. **Flow đặt hàng siêu đơn giản**
```

1. Khách scan QR code tại bàn
   ↓
2. Redirect: /menu/{storeId}?table={tableId}
   ↓
3. Browse menu, add to cart
   ↓
4. Click "Đặt hàng"
   ↓
5. Form popup:
   - Số điện thoại (required)
   - Ghi chú (optional)
   - Button "Xác nhận"
     ↓
6. POST /api/orders
   ↓
7. Backend:
   - Lưu order vào DB
   - Socket.io emit "new_order" đến Host
     ↓
8. Response success
   ↓
9. Frontend:
   - Clear cart
   - Show success modal:
     "✅ Đặt hàng thành công!
     Món ăn sẽ có sau ~10 phút
     Cảm ơn quý khách!"
   - Button "Tiếp tục gọi món" / "Đóng"
     ↓
10. Host dashboard:
    - Popup notification "Đơn hàng mới!"
    - Hiển thị trong danh sách đơn
      ↓
11. Host làm món → đánh dấu "Hoàn thành"
    ↓
12. Khách lên quầy thanh toán

```

**✅ Không có tracking, không có notification cho khách**

---

## 6. **API Endpoints tối giản**

### **Auth**
```

POST /api/auth/login
POST /api/auth/register (chỉ admin tạo host)
GET /api/auth/me

```

### **Admin**
```

GET /api/admin/stores
POST /api/admin/stores
PUT /api/admin/stores/:id
DELETE /api/admin/stores/:id
GET /api/admin/stats

```

### **Host - Menu**
```

GET /api/stores/:storeId/categories
POST /api/stores/:storeId/categories
PUT /api/categories/:id
DELETE /api/categories/:id

GET /api/stores/:storeId/products
POST /api/stores/:storeId/products
PUT /api/products/:id
DELETE /api/products/:id
PATCH /api/products/:id/toggle-availability

```

### **Host - Tables**
```

GET /api/stores/:storeId/tables
POST /api/stores/:storeId/tables
PUT /api/tables/:id
DELETE /api/tables/:id

```

### **Host - Orders**
```

GET /api/stores/:storeId/orders
GET /api/orders/:id
PATCH /api/orders/:id/status
GET /api/stores/:storeId/stats

```

### **Public - Customer**
```

GET /api/public/stores/:storeId/menu (categories + products)
GET /api/public/tables/:tableId (lấy info bàn)
POST /api/public/orders (tạo đơn)

9. UI Screens chính
   Admin (3 screens)

Login
Dashboard (số liệu + list stores)
Store form (create/edit)

Host (5 screens)

Login
Dashboard (stats + recent orders)
Menu management (categories + products)
Table management + QR codes
Order list + detail

Customer (2 screens)

Menu page (browse + cart)
Success modal (sau khi order)

= Tổng ~10 screens chính
