import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, BookOpen, CalendarDays, Camera, Eye, EyeOff, MapPin, Pencil, ScrollText, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type AuthUserLike = {
  name?: string;
  email?: string;
  phone?: string | null;
  photoUrl?: string | null;
  schoolName?: string | null;
  schoolAddress?: string | null;
  className?: string | null;
  role?: string;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  gender: string;
  dateOfBirth: string;
  nationalId: string;
  country: string;
  cityState: string;
  postalCode: string;
  taxId: string;
};

type FaceApiModule = typeof import("@/lib/faceApi");

let faceApiModulePromise: Promise<FaceApiModule> | null = null;

const loadFaceApiModule = async (): Promise<FaceApiModule> => {
  if (!faceApiModulePromise) {
    faceApiModulePromise = import("@/lib/faceApi");
  }

  return faceApiModulePromise;
};

const splitName = (name?: string) => {
  const parts = (name || "").trim().split(" ").filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const readAuthUser = (): AuthUserLike | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUserLike;
  } catch {
    return null;
  }
};

const updateAuthUserInStorage = (patch: Partial<AuthUserLike>) => {
  if (typeof window === "undefined") return;
  const current = readAuthUser();
  const next = { ...(current || {}), ...patch };
  localStorage.setItem("auth_user", JSON.stringify(next));
};

type UnifiedProfileSectionProps = {
  token: string | null;
  user?: AuthUserLike | null;
  storageKey: string;
  roleLabel: string;
  variant?: "default" | "student";
  onQuickNavigate?: (section: string) => void;
  allowPasswordChange?: boolean;
  allowPhotoUpload?: boolean;
  onUserUpdated?: (patch: Partial<AuthUserLike>) => void;
};

export default function UnifiedProfileSection({
  token,
  user,
  storageKey,
  roleLabel,
  variant = "default",
  onQuickNavigate,
  allowPasswordChange = true,
  allowPhotoUpload = true,
  onUserUpdated,
}: UnifiedProfileSectionProps) {
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [changePasswordEnabled, setChangePasswordEnabled] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.photoUrl || null);

  const sourceUser = useMemo(() => user || readAuthUser() || {}, [user]);
  const locationSource = (sourceUser.schoolAddress || sourceUser.schoolName || "").toString().trim();
  const locationLabel = useMemo(() => {
    if (!locationSource) return "Manzil kiritilmagan";
    const parts = locationSource
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]} / ${parts[parts.length - 1]}`;
    }
    return locationSource;
  }, [locationSource]);

  const buildForm = useCallback((): ProfileForm => {
    const storedUser = readAuthUser();
    const activeUser = user || storedUser || {};
    const extrasRaw = localStorage.getItem(storageKey);
    const extras = extrasRaw ? JSON.parse(extrasRaw) : {};
    const { firstName, lastName } = splitName(activeUser.name);

    return {
      firstName,
      lastName,
      email: (activeUser.email || "").toString(),
      phone: (activeUser.phone || "").toString(),
      bio: (extras.bio || roleLabel || "").toString(),
      gender: (extras.gender || "").toString(),
      dateOfBirth: (extras.dateOfBirth || "").toString(),
      nationalId: (extras.nationalId || "").toString(),
      country: (extras.country || "").toString(),
      cityState: (extras.cityState || "").toString(),
      postalCode: (extras.postalCode || "").toString(),
      taxId: (extras.taxId || "").toString(),
    };
  }, [roleLabel, storageKey, user]);

  const [form, setForm] = useState<ProfileForm>(() => buildForm());

  useEffect(() => {
    setForm(buildForm());
    setPhotoUrl((user || readAuthUser() || {}).photoUrl || null);
    setEditMode(false);
  }, [buildForm, user]);

  const displayName = `${form.firstName} ${form.lastName}`.trim();
  const locationHref = `https://www.google.com/maps/search/${encodeURIComponent(locationSource || locationLabel)}`;
  const canSave = !savingDetails && !savingPhoto;

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetDraft = () => {
    setForm(buildForm());
    setChangePasswordEnabled(false);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowPasswordConfirm(false);
  };

  const handleSaveDetails = async () => {
    if (!token) return;
    const fullName = `${form.firstName} ${form.lastName}`.trim();

    if (!fullName || !form.email.trim()) {
      toast({
        title: "Xatolik",
        description: "FISH va email majburiy.",
        variant: "destructive",
      });
      return;
    }

    if (changePasswordEnabled) {
      if (!newPassword.trim()) {
        toast({ title: "Xatolik", description: "Yangi parolni kiriting.", variant: "destructive" });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ title: "Xatolik", description: "Parol tasdiqlash bilan mos emas.", variant: "destructive" });
        return;
      }
    }

    setSavingDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          password: changePasswordEnabled ? newPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Profilni saqlashda xatolik");
      }

      const patch = {
        name: data.name || fullName,
        email: data.email || form.email.trim(),
        phone: data.phone ?? null,
      };
      updateAuthUserInStorage(patch);
      onUserUpdated?.(patch);

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          bio: form.bio,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          nationalId: form.nationalId,
          country: form.country,
          cityState: form.cityState,
          postalCode: form.postalCode,
          taxId: form.taxId,
        }),
      );

      setEditMode(false);
      setChangePasswordEnabled(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Saqlandi", description: "Profil ma'lumotlari yangilandi." });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof Error ? err.message : "Profilni saqlashda xatolik",
        variant: "destructive",
      });
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePhotoChange = async (file?: File) => {
    if (!file?.type.startsWith("image/") || !token || !allowPhotoUpload) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setSavingPhoto(true);
      try {
        // 1) Save photo first (fast) to avoid UI "freezing" while Face API models load.
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ photoUrl: dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Profil rasmini saqlashda xatolik");
        }

        const nextPhoto = data.photoUrl || null;
        setPhotoUrl(nextPhoto);
        updateAuthUserInStorage({ photoUrl: nextPhoto });
        onUserUpdated?.({ photoUrl: nextPhoto });
        toast({ title: "Rasm saqlandi", duration: 5000 });

        // 2) Best-effort FaceID descriptor update (non-blocking).
        // Face API models are loaded from a CDN; if network is slow/blocked, we must not block the UX.
        void (async () => {
          try {
            const { getDescriptorFromImage } = await loadFaceApiModule();
            const descriptor = await Promise.race<number[] | null>([
              getDescriptorFromImage(dataUrl),
              new Promise<number[] | null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
            ]);

            if (!descriptor) return;
            await fetch(`${API_BASE_URL}/api/auth/profile`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ faceDescriptor: descriptor }),
            });
          } catch {
            // Best-effort only; ignore failures/timeouts.
          }
        })();
      } catch (err) {
        toast({
          title: "Xatolik",
          description: err instanceof Error ? err.message : "Profil rasmini saqlashda xatolik",
          variant: "destructive",
        });
      } finally {
        setSavingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const readOnlyValue = (value: string) => (editMode ? value : value || "-");
  const readOnlyInputClass = editMode
    ? ""
    : "bg-slate-50/80 border-slate-200 text-slate-900 focus-visible:ring-0 focus-visible:ring-offset-0";
  const profileLabelClass = "text-sm font-bold tracking-wide text-[#FE9F43]";

  const studentExtras = useMemo(() => {
    if (variant !== "student") return null;
    const className = (sourceUser.className || "").toString().trim() || null;
    const schoolName = (sourceUser.schoolName || "").toString().trim() || null;

    const subscription = (() => {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem("dashboard:student:subscriptionInfo");
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { status?: "active" | "expired"; endDate?: string | null };
        if (parsed?.status === "expired") return "expired";
        if (parsed?.status === "active") return "active";
        if (parsed?.endDate) return new Date(parsed.endDate).getTime() < Date.now() ? "expired" : "active";
        return null;
      } catch {
        return null;
      }
    })();

    return { className, schoolName, subscription };
  }, [sourceUser.className, sourceUser.schoolName, variant]);

  return (
    <Card className="border-slate-200/80 bg-gradient-to-b from-slate-50/70 to-white">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl font-semibold">Profil ma'lumotlari</CardTitle>
          {editMode ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDraft();
                  setEditMode(false);
                }}
                disabled={!canSave}
                className="rounded-full px-4"
              >
                Bekor qilish
              </Button>
              <Button type="button" onClick={() => void handleSaveDetails()} disabled={!canSave} className="rounded-full px-4">
                {savingDetails ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={() => setEditMode(true)} disabled={savingPhoto} className="rounded-full px-4">
              <Pencil className="mr-2 h-4 w-4" />
              Tahrirlash
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-8 rounded-2xl border bg-white/70 p-5 backdrop-blur sm:p-6">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handlePhotoChange(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
          <div className="flex items-start justify-center lg:justify-start">
            <div className="group relative h-32 w-32 sm:h-40 sm:w-40 lg:h-44 lg:w-44">
              <Avatar className="h-full w-full border-4 border-teal-600/80 bg-background shadow-sm">
                {photoUrl ? <AvatarImage src={photoUrl} alt="" className="object-cover" /> : null}
                <AvatarFallback className="bg-slate-100 text-muted-foreground">
                  <UserCircle className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
                </AvatarFallback>
              </Avatar>
              {allowPhotoUpload && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={savingPhoto || savingDetails}
                  aria-label="Profil rasmini o'zgartirish"
                  title="Profil rasmini o'zgartirish"
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
                >
                  <Camera className="h-9 w-9 text-teal-400" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {!editMode ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_200px] lg:items-start">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <p className={profileLabelClass}>Ism familiya</p>
                    <p className="text-base font-semibold text-foreground">{displayName || "-"}</p>
                    <p className="text-xs text-muted-foreground">{form.email || "-"}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className={profileLabelClass}>Telefon raqam</p>
                    <p className="text-sm font-medium text-foreground">{form.phone || "-"}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className={profileLabelClass}>Bio</p>
                    <p className="max-w-[350px] text-sm leading-relaxed text-foreground break-words">
                      {form.bio || "-"}
                    </p>
                  </div>
                </div>

                {studentExtras && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className={profileLabelClass}>Sinf</p>
                      <p className="text-sm font-medium text-foreground">{studentExtras.className || "-"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className={profileLabelClass}>Maktab</p>
                      <p className="text-sm font-medium text-foreground">{studentExtras.schoolName || "-"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className={profileLabelClass}>Obuna holati</p>
                      <p className="text-sm font-medium text-foreground">
                        {studentExtras.subscription === "expired"
                          ? "Tugagan"
                          : studentExtras.subscription === "active"
                            ? "Faol"
                            : "-"}
                      </p>
                    </div>
                  </div>
                )}

                {variant === "student" && typeof onQuickNavigate === "function" && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onQuickNavigate("schedule")}>
                      <CalendarDays className="h-4 w-4 text-sky-600" />
                      Dars jadvali
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onQuickNavigate("grades")}>
                      <Award className="h-4 w-4 text-amber-600" />
                      Baholar
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onQuickNavigate("homework")}>
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                      Uy vazifa
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onQuickNavigate("exams")}>
                      <ScrollText className="h-4 w-4 text-violet-600" />
                      Imtihonlar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ism</Label>
                  <Input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} className={readOnlyInputClass} />
                </div>
                <div className="space-y-2">
                  <Label>Familiya</Label>
                  <Input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} className={readOnlyInputClass} />
                </div>
                <div className="space-y-2">
                  <Label>Telefon raqam</Label>
                  <Input value={readOnlyValue(form.phone)} onChange={(e) => setField("phone", e.target.value)} className={readOnlyInputClass} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Bio</Label>
                  <Input value={readOnlyValue(form.bio)} onChange={(e) => setField("bio", e.target.value)} className={readOnlyInputClass} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <a
            href={locationHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80"
          >
            <MapPin className="h-4 w-4" />
            {locationLabel}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
