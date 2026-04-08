# Coffee Shop Management System Backend

Backend API cho hệ thống quan ly quan ca phe theo mo hinh multi-role, ho tro admin, chu cua hang, nhan vien va khach hang dat mon tai ban thong qua QR code.

Du an tap trung vao bai toan van hanh thuc te cua quan ca phe:
- Quan ly nhieu cua hang
- Quan ly menu, ban, don hang va thanh toan
- Nhan don theo thoi gian thuc
- Theo doi nhan vien, ca lam va ton kho
- Bao cao, thong ke va mot so tinh nang AI ho tro goi y

## Roles

- `admin`: quan ly he thong, hosts, stores, store requests, dashboard tong quan
- `host`: quan ly cua hang, menu, ban, orders, bills, vouchers, staff, inventory, reports, analytics
- `staff`: check-in/check-out va xem lich su ca lam
- `customer`: xem menu cong khai, dat mon khong can dang nhap, ap dung voucher

## Core Features

### Public ordering flow
- Khach scan QR tai ban de vao menu cua cua hang
- Xem danh muc, san pham, thong tin ban
- Dat mon khong can auth
- Ap dung voucher truoc khi tao order
- Host nhan thong bao don moi qua Socket.IO

### Store operations
- CRUD categories, products, tables
- Upload hinh anh va logo qua Multer + Cloudinary
- Tao lai QR code cho ban
- Quan ly trang thai ban va san pham
- Tao bill va danh dau thanh toan

### Business management
- Quan ly staff theo tung store
- Quan ly shifts, check-in/check-out, theo doi ca dang hoat dong
- Quan ly ingredients, cong thuc san pham va dieu chinh ton kho
- Bao cao ton kho, usage report, sales summary, product profitability
- Analytics cho doanh thu, peak hours, best sellers, customer insights, table performance

### Platform management
- Admin dashboard stats, revenue overview, recent activities
- Duyet store requests
- Quan ly host accounts va khoa/mo khoa tai khoan

### AI support
- Chat voi AI
- Goi y combo cho gio hang
- Goi y mon
- Phan tich ho so khach hang

## Tech Stack

- Node.js
- Express 5
- TypeScript
- MongoDB + Mongoose
- Socket.IO
- JWT authentication
- bcryptjs
- Multer + Cloudinary
- express-validator
- Nodemailer
- OpenAI SDK

## Project Structure

```text
src/
|-- app.ts
|-- server.ts
|-- config/
|   |-- cloudinary.ts
|   |-- database.ts
|   `-- openai.ts
|-- controllers/
|-- middlewares/
|-- models/
|-- routes/
|-- services/
|-- scripts/
|   `-- seedAdmin.ts
`-- utils/
```

## Main API Groups

Base URL: `http://localhost:5000/api/v1`

- `/auth`: login, register, me
- `/admin`: dashboard, stores, hosts, store requests, activity logs, revenue
- `/host`: store operations, menu, tables, orders, bills, vouchers, staff, inventory, reports, analytics, shifts
- `/staff`: my shift, check-in, check-out, shift history
- `/public`: menu cong khai, table info, create order, apply voucher
- `/ai`: chat, cart combo recommendation, order suggestion, customer profile analysis

Health check:
- `GET /api/v1/health`

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Tao file `.env` trong root project.

Toi thieu ban can cac bien sau:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
OPENAI_API_KEY=your_openai_api_key
```

Luu y:
- AI routes can `OPENAI_API_KEY`
- Upload hinh anh can Cloudinary credentials
- Mot so tinh nang email se can SMTP config neu ban su dung trong thuc te

### 3. Run in development

```bash
npm run dev
```

### 4. Build production bundle

```bash
npm run build
```

### 5. Start compiled server

```bash
npm start
```

### 6. Seed admin account

```bash
npm run seed:admin
```

Tai khoan mac dinh duoc tao boi script:
- Email: `admin@coffee.com`
- Password: `admin123`

## Real-time Behavior

Server duoc khoi tao bang HTTP server + Socket.IO trong [src/server.ts](./src/server.ts). Khi khach tao order, host co the nhan thong bao don moi theo thoi gian thuc de xu ly nhanh hon.

## Why This Project Is Recruiter-Friendly

Du an nay khong chi la CRUD co ban. No the hien kha ro cac nhom bai toan backend thuong gap:
- Role-based access control cho nhieu loai nguoi dung
- Public ordering flow tach biet voi khu vuc quan tri
- Xu ly nghiep vu don hang, bill, voucher, inventory, shift
- Upload media, real-time events, analytics va reporting
- To chuc code theo huong `routes -> controllers -> services -> models`

## Current Notes

- Project hien chua co test suite tu dong
- Repo nay la backend only, frontend khong nam trong repo nay
- Neu ban gui repo cho recruiter, nen kem them screenshots hoac link frontend demo de ho thay flow end-to-end nhanh hon

## Suggested Demo Flow

Neu muon reviewer hieu nhanh du an, hay demo theo thu tu sau:
1. Admin tao hoac duyet store
2. Host them category, product, table
3. Khach scan QR va tao order
4. Host nhan order real-time va tao bill
5. Staff check-in/check-out
6. Xem dashboard analytics hoac inventory report
