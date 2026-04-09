# Face ID qurilma integratsiyasi (kelajakda)

Bu hujjat **maktab eshigida qo‘yiladigan Face ID qurilma** (yuzni tanib eshikni ochuvchi tizim) ni keyinchalik loyihaga ulash uchun reja va talablar.

---

## Hozir nima bor

- **Sayt orqali Face ID davomat:** O‘qituvchi/direktor brauzerda kamerani yoqadi, o‘quvchi yuzi taniladi, davomatga qo‘yiladi. Eshik ochilishi yo‘q.

---

## Kelajakda qilish: eshikdagi qurilma

**Maqsad:** Maktab kirishida qurilma yuzni skaner qilsa → tizim tanisa → (ixtiyoriy) eshik ochilsa yoki kirish jurnaliga yozilsa.

### Siz qilishingiz kerak bo‘ladigan ishlar

1. **Qurilma tanlash va sotib olish**
   - Yuzni tanib, eshikni ochadigan yoki API orqali ma’lumot yuboradigan qurilma (masalan: ZKTeco, Hikvision, iFlytek va boshqalar).
   - Qurilmaning **API dokumentatsiyasi** yoki **Webhook/HTTP callback** qo‘llab-quvvatlashi kerak (qurilma taniydi → serverga so‘rov yuboradi).

2. **Qurilma ma’lumotini olish**
   - Qanday formatda ma’lumot yuboradi? (HTTP POST, MQTT, TCP va hokazo.)
   - Tanishgan foydalanuvchi qanday identifikatsiya qilinadi? (ID, kartochka raqami, descriptor va hokazo.)
   - Agar qurilma o‘z bazasida yuzlarni saqlasa — bizning tizimdagi o‘quvchilar ro‘yxatini qurilmaga qanday berish mumkin (export/import yoki API).

3. **Tizim bilan bog‘lash**
   - Qurilma qaysi maktab / eshik uchun ishlatilishi (maktab ID, eshik/joy nomi).
   - Kerak bo‘lsa: kirishni **davomat**ga ham yozish (masalan, “bugun maktabga kirdi” sifatida).

---

## Loyiha tomonda keyinchalik qilinadigan ishlar

(Qurilma va API ma’lumotlari tayyor bo‘lgach.)

1. **Backend**
   - Qurilma dan keladigan so‘rovlarni qabul qiluvchi **API endpoint** (masalan: `POST /api/access/face-event`).
   - So‘rovda: qurilma ID, maktab ID, tanishgan shaxs identifikatori (yoki descriptor), vaqt.
   - Tanishgan shaxsni **Student/User** bilan bog‘lash (ID yoki descriptor orqali).
   - Kirishni **AccessLog** yoki **Attendance** kabi jadvalga yozish.
   - (Agar loyiha eshikni boshqaradigan bo‘lsa) qurilmaga “eshikni och” buyrug‘ini yuborish — qurilma buni qo‘llab-quvvatlasa.

2. **Xavfsizlik**
   - Qurilma dan keladigan so‘rovlarni tekshirish: API key, IP cheklovi yoki imzo (qurilma qanday autentifikatsiya qilsa).

3. **Admin/Director interfeysi**
   - Qurilmalar ro‘yxati (qaysi qurilma qaysi maktabda, qaysi eshikda).
   - Kirishlar jurnali (kim, qachon, qaysi eshikdan).

---

## Qisqacha checklist (keyinchalik)

- [ ] Face ID qurilma tanlandi va sotib olish rejalashtirildi.
- [ ] Qurilma API / Webhook dokumentatsiyasi olingan.
- [ ] Tanishgan shaxs identifikatsiyasi aniqlandi (ID, kartochka, descriptor).
- [ ] Backend da qurilma eventlarini qabul qiluvchi endpoint rejalashtirildi.
- [ ] Kirish jurnali (va kerak bo‘lsa davomat) modeli/API loyihada mavjud yoki qo‘shiladi.
- [ ] Director panelida qurilma va kirishlar bo‘limi rejalashtirildi.

Hozir buni amalga oshirish shart emas; qurilma va API tayyor bo‘lgach, shu reja asosida bosqichma-bosqich ulash mumkin.
