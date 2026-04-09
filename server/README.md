## Backend (Node.js + Express + MongoDB)

### 1. O'rnatish

```bash
cd server
cp .env.example .env   # kerak bo'lsa qiymatlarni o'zgartiring
npm install
```

`.env` faylida eng kamida quyidagilar bo'lishi kerak:

- `MONGODB_URI` – MongoDB ulanish satri
- `JWT_SECRET` – JWT uchun maxfiy kalit
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` – super admin (platform owner) yaratilishi uchun
- `CORS_ORIGIN` – production uchun ruxsat etilgan frontend origin(lar), vergul bilan ajratiladi
  - Misol: `CORS_ORIGIN=https://app.example.com,https://admin.example.com`

Muhim:

- `NODE_ENV=production` bo'lsa, `CORS_ORIGIN` bo'sh bo'lishi mumkin emas.
- Productionda faqat `CORS_ORIGIN` dagi originlar APIga browser orqali kira oladi.

### 2. Serverni ishga tushirish

```bash
cd server
npm run dev
```

Server odatda `http://localhost:5000` da ishlaydi.

### 3. Asosiy endpointlar (yadro)

- **Health check**: `GET /api/health`
- **Login**: `POST /api/auth/login`
  - Body: `{ "email": "...", "password": "..." }`
  - Javobda: `token` (JWT) va `user` ma'lumotlari
- **Current user**: `GET /api/auth/me` (Header: `Authorization: Bearer <token>`)

### 4. Rollar bo'yicha asosiy API lar

#### Super admin (platform owner)

- `POST /api/schools` – yangi maktab + (ixtiyoriy) direktor yaratish
- `GET /api/schools` – barcha maktablar ro'yxati

#### Director (maktab direktori)

Bu endpointlar uchun headerda direktor JWT tokeni bo'lishi kerak.

- `POST /api/director/classes` – sinf yaratish
- `GET /api/director/classes` – sinflar ro'yxati (o'z maktabi bo'yicha)
- `POST /api/director/subjects` – fan yaratish
- `GET /api/director/subjects` – fanlar ro'yxati
- `POST /api/director/teachers` – o'qituvchi yaratish (`name`, `email`, `password`, `subjectId`)
- `POST /api/director/students` – o'quvchi yaratish (`name`, `email`, `password`, `classId`)
- `POST /api/director/parents` – ota-ona yaratish (`name`, `email`, `password`, `studentId`)

#### Teacher (o'qituvchi)

- `POST /api/teacher/grades` – baho qo'yish (`studentId`, `subjectId`, `grade`, `date?`)
- `GET /api/teacher/grades?classId=...` – baholar ro'yxati
- `POST /api/teacher/attendance` – davomat belgilash (`classId`, `date`, `entries[{ studentId, status }]`)
- `POST /api/teacher/homework` – uy vazifasi berish (`classId`, `subjectId`, `description`, `deadline`)

#### Student (o'quvchi)

- `GET /api/student/grades` – o'z baholari
- `GET /api/student/attendance` – o'z davomati
- `GET /api/student/homework` – sinfi uchun uy vazifalari

#### Parent (ota-ona)

- `GET /api/parent/children` – o'z farzandlari ro'yxati
- `GET /api/parent/grades` – farzandining baholari
- `GET /api/parent/attendance` – farzandining davomati
- `GET /api/parent/homework` – farzand sinfining uy vazifalari

### 5. Multi-school xavfsizlik

Har bir foydalanuvchi `User.school` orqali ma'lum bir maktabga biriktirilgan, `JWT` ichida ham `schoolId` saqlanadi. Barcha so'rovlar:

- `authRequired` middleware orqali autentifikatsiya qilinadi
- `role` tekshiruvlari (`requireRoles(...)`) orqali ruxsat nazorat qilinadi
- Maktab ma'lumotlari `schoolId` bo'yicha ajratiladi (har bir queryda shu scope ishlatiladi)

