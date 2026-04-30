import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DirectorLayout from "@/components/DirectorLayout";
import { ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getStoredAuth } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type ClassOption = {
  _id: string;
  name: string;
};

const AddStudent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = getStoredAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    studentCode: "",
    birthDate: "",
    gender: "",
    nationality: "",
    birthCertSeries: "",
    birthCertNumber: "",
    classId: "",
    academicYear: "",
    educationLanguage: "",
    status: "",
    admissionOrderNumber: "",
    admissionOrderDate: "",
    classAdmissionDate: "",
    phone: "",
    parentName: "",
    parentPassport: "",
    parentPhone: "",
    region: "",
    district: "",
    address: "",
  });

  const setField = (name: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const fetchClasses = async () => {
      if (!token) return;
      setClassesLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/director/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Sinflarni yuklashda xatolik");
        }
        setClasses(data);
      } catch (err) {
        toast({
          title: "Xatolik",
          description: err instanceof Error ? err.message : "Sinflarni yuklashda xatolik",
          variant: "destructive",
        });
      } finally {
        setClassesLoading(false);
      }
    };

    void fetchClasses();
  }, [toast, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: "Xatolik",
        description: "Tizimga qayta kiring.",
        variant: "destructive",
      });
      return;
    }

    if (!form.name || !form.email || !form.password || !form.classId) {
      toast({
        title: "Ma'lumot yetarli emas",
        description: "F.I.Sh., email, parol va sinf majburiy.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        parentName: form.parentName || undefined,
        classId: form.classId,
        studentCode: form.studentCode || undefined,
        birthDate: form.birthDate || undefined,
        gender: form.gender || undefined,
        nationality: form.nationality || undefined,
        birthCertSeries: form.birthCertSeries || undefined,
        birthCertNumber: form.birthCertNumber || undefined,
        status: form.status || "active",
        admissionOrderNumber: form.admissionOrderNumber || undefined,
        admissionOrderDate: form.admissionOrderDate || undefined,
        classAdmissionDate: form.classAdmissionDate || undefined,
        academicYear: form.academicYear || undefined,
        educationLanguage: form.educationLanguage || undefined,
        parentPassport: form.parentPassport || undefined,
        parentPhone: form.parentPhone || undefined,
        region: form.region || undefined,
        district: form.district || undefined,
        address: form.address || undefined,
      };

      const res = await fetch(`${API_BASE_URL}/api/director/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "O'quvchini qo'shishda xatolik");
      }

      toast({
        title: "Saqlandi",
        description: "O'quvchi databasega qo'shildi.",
      });
      navigate("/school-admin/dashboard?section=students&view=base");
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof Error ? err.message : "O'quvchini qo'shishda xatolik",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DirectorLayout
      currentSection="students"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6">
          <h1 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">
            O&apos;quvchi qo&apos;shish
          </h1>
          <p className="text-sm flex items-center justify-start gap-1 text-[#FE9F43] font-medium md:text-sm">
            Talabaning asosiy ma&apos;lumotlarini kiriting va saqlang.
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/school-admin/dashboard?section=students&view=base")}
            className="w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Orqaga
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/school-admin/dashboard?section=students&view=base")} disabled={submitting}>
              Bekor qilish
            </Button>
            <Button type="submit" form="add-student-form" disabled={submitting}>
              {submitting ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>O'quvchi ma'lumotlari</CardTitle>
            <CardDescription>
              Quyidagi bo'limlarda o'quvchi haqidagi ma'lumotlarni kiriting. Majburiy maydonlar (*) to'ldirilishi shart.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="add-student-form" onSubmit={handleSubmit} className="space-y-8">
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Asosiy ma'lumotlar</h3>
                  <p className="text-xs text-muted-foreground">
                    O'quvchining shaxsiy ma'lumotlari va maktabdagi holati.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">F.I.Sh. *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Masalan: Mamatqulov Murodbek"
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Masalan: student@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Parol *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Kamida 6 ta belgi"
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentCode">ID (o'quvchi kodi)</Label>
                    <Input
                      id="studentCode"
                      name="studentCode"
                      value={form.studentCode}
                      onChange={handleChange}
                      placeholder="Masalan: 123456"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Tug'ilgan sana</Label>
                    <Input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      value={form.birthDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Jinsi</Label>
                    <Select value={form.gender} onValueChange={(value) => setField("gender", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Erkak</SelectItem>
                        <SelectItem value="female">Ayol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nationality">Millati</Label>
                    <Input
                      id="nationality"
                      name="nationality"
                      value={form.nationality}
                      onChange={handleChange}
                      placeholder="Masalan: o'zbek"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sinf *</Label>
                    <Select value={form.classId} onValueChange={(value) => setField("classId", value)} disabled={classesLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={classesLoading ? "Sinflar yuklanmoqda..." : "Sinf tanlang"} />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls._id} value={cls._id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicYear">O'quv yili</Label>
                    <Input
                      id="academicYear"
                      name="academicYear"
                      value={form.academicYear}
                      onChange={handleChange}
                      placeholder="Masalan: 2025-2026"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ta'lim tili</Label>
                    <Select value={form.educationLanguage} onValueChange={(value) => setField("educationLanguage", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uz">O'zbek</SelectItem>
                        <SelectItem value="ru">Rus</SelectItem>
                        <SelectItem value="en">Ingliz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>O'quvchi holati</Label>
                    <Select value={form.status} onValueChange={(value) => setField("status", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">O'quvchi</SelectItem>
                        <SelectItem value="inactive">Vaqtincha to'xtagan</SelectItem>
                        <SelectItem value="graduated">Bitirgan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Hujjatlar</h3>
                  <p className="text-xs text-muted-foreground">
                    Tug'ilganlik guvohnomasi va maktabga qabul buyruq ma'lumotlari.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="birthCertSeries">Guvohnoma seriyasi</Label>
                    <Input
                      id="birthCertSeries"
                      name="birthCertSeries"
                      value={form.birthCertSeries}
                      onChange={handleChange}
                      placeholder="Masalan: AA"
                      autoCapitalize="characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthCertNumber">Guvohnoma raqami</Label>
                    <Input
                      id="birthCertNumber"
                      name="birthCertNumber"
                      value={form.birthCertNumber}
                      onChange={handleChange}
                      placeholder="Masalan: 1234567"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admissionOrderNumber">Qabul buyrug'i raqami</Label>
                    <Input
                      id="admissionOrderNumber"
                      name="admissionOrderNumber"
                      value={form.admissionOrderNumber}
                      onChange={handleChange}
                      placeholder="Masalan: 15-son"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admissionOrderDate">Qabul buyrug'i sanasi</Label>
                    <Input
                      id="admissionOrderDate"
                      name="admissionOrderDate"
                      type="date"
                      value={form.admissionOrderDate}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classAdmissionDate">Sinfga qabul sanasi</Label>
                    <Input
                      id="classAdmissionDate"
                      name="classAdmissionDate"
                      type="date"
                      value={form.classAdmissionDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Aloqa va manzil</h3>
                  <p className="text-xs text-muted-foreground">
                    O'quvchi va yashash manzili bo'yicha ma'lumotlar.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">O'quvchi telefoni</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Masalan: +998 90 123 45 67"
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Viloyat</Label>
                    <Input
                      id="region"
                      name="region"
                      value={form.region}
                      onChange={handleChange}
                      placeholder="Masalan: Toshkent viloyati"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">Tuman / shahar</Label>
                    <Input
                      id="district"
                      name="district"
                      value={form.district}
                      onChange={handleChange}
                      placeholder="Masalan: Yunusobod tumani"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">To'liq manzil</Label>
                    <Input
                      id="address"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Masalan: Ko'cha, uy, xonadon"
                    />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Ota-ona / vasiy</h3>
                  <p className="text-xs text-muted-foreground">
                    Ota-ona yoki vasiyning shaxsiy va aloqa ma'lumotlari.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="parentName">F.I.Sh.</Label>
                    <Input
                      id="parentName"
                      name="parentName"
                      value={form.parentName}
                      onChange={handleChange}
                      placeholder="Masalan: Mamatqulov Akmal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentPassport">Passport (seriya va raqam)</Label>
                    <Input
                      id="parentPassport"
                      name="parentPassport"
                      value={form.parentPassport}
                      onChange={handleChange}
                      placeholder="Masalan: AA1234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Telefon</Label>
                    <Input
                      id="parentPhone"
                      name="parentPhone"
                      type="tel"
                      value={form.parentPhone}
                      onChange={handleChange}
                      placeholder="Masalan: +998 90 123 45 67"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </section>
            </form>
          </CardContent>
        </Card>
      </div>
    </DirectorLayout>
  );
};

export default AddStudent;
