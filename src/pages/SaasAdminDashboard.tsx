import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL =
  import.meta.env.VITE_SAAS_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001";

type Plan = {
  _id: string;
  name: string;
  maxStudents: number;
  maxBranches: number;
  price: number;
  features?: {
    analytics?: boolean;
    ai?: boolean;
    payment?: boolean;
    attendanceReports?: boolean;
    finance?: boolean;
  };
};

type Tenant = {
  _id: string;
  name: string;
  slug: string;
  planId: string;
  status?: string;
};

type FeatureKey = "analytics" | "ai" | "payment" | "attendanceReports" | "finance";

const FEATURE_KEYS: FeatureKey[] = ["analytics", "ai", "payment", "attendanceReports", "finance"];

const SaasAdminDashboard = () => {
  const { toast } = useToast();
  const [section, setSection] = useState<"overview" | "schools" | "subscriptions" | "users" | "profile">("overview");
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const token = useMemo(() => localStorage.getItem("auth_token") || "", []);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  const loadPlans = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/plans`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to load plans");
    setPlans(data.plans || []);
  }, []);

  const loadTenants = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/tenants`, {
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to load tenants");
    setTenants(data.tenants || []);
  }, [authHeaders]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadPlans(), loadTenants()]);
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof Error ? err.message : "Ma'lumotlarni yuklab bo'lmadi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, loadPlans, loadTenants]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleCreatePlan = async (form: HTMLFormElement) => {
    const formData = new FormData(form);
    const features = FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = formData.get(key) === "on";
      return acc;
    }, {} as Record<FeatureKey, boolean>);

    const payload = {
      name: String(formData.get("name") || ""),
      maxStudents: Number(formData.get("maxStudents")),
      maxBranches: Number(formData.get("maxBranches")),
      price: Number(formData.get("price")),
      features,
    };

    const res = await fetch(`${API_BASE_URL}/api/plans`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Plan yaratilmadi");
    }

    setPlans((prev) => [data.plan, ...prev]);
  };

  const handleDeletePlan = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "Plan o'chirilmadi");
    }

    setPlans((prev) => prev.filter((plan) => plan._id !== id));
  };

  const handleCreateTenant = async (form: HTMLFormElement) => {
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || ""),
      slug: String(formData.get("slug") || ""),
      planId: String(formData.get("planId") || ""),
      owner: {
        fullname: String(formData.get("ownerFullname") || ""),
        email: String(formData.get("ownerEmail") || ""),
        password: String(formData.get("ownerPassword") || ""),
      },
    };

    const res = await fetch(`${API_BASE_URL}/api/tenants`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Tenant yaratilmadi");
    }

    setTenants((prev) => [data.tenant, ...prev]);
  };

  const handleDeleteTenant = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/tenants/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "Tenant o'chirilmadi");
    }

    setTenants((prev) => prev.filter((tenant) => tenant._id !== id));
  };

  const stats = {
    plans: plans.length,
    tenants: tenants.length,
  };

  return (
    <AdminLayout
      title="SaaS Super Admin"
      subtitle="Planlar va tenantlarni boshqarish"
      currentSection={section}
      onSectionChange={setSection}
    >
      {section === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Planlar soni</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.plans}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tenantlar soni</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.tenants}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "subscriptions" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Planlar</h2>
              <p className="text-sm text-muted-foreground">SaaS tariflarini boshqarish</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button disabled={loading}>Yangi plan</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Yangi plan yaratish</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setLoading(true);
                    try {
                      await handleCreatePlan(event.currentTarget);
                      event.currentTarget.reset();
                      toast({ title: "Plan yaratildi" });
                    } catch (err) {
                      toast({
                        title: "Xatolik",
                        description: err instanceof Error ? err.message : "Plan yaratilmadi",
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Plan nomi</Label>
                    <Input id="name" name="name" required placeholder="Pro" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maxStudents">Max o'quvchi</Label>
                      <Input id="maxStudents" name="maxStudents" type="number" required defaultValue={1000} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxBranches">Max filial</Label>
                      <Input id="maxBranches" name="maxBranches" type="number" required defaultValue={5} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Narx</Label>
                    <Input id="price" name="price" type="number" required defaultValue={0} />
                  </div>
                  <div className="space-y-2">
                    <Label>Featurelar</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {FEATURE_KEYS.map((feature) => (
                        <label key={feature} className="flex items-center gap-2 text-sm">
                          <Checkbox id={feature} name={feature} />
                          <span>{feature}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>Saqlash</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>O'quvchi</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Narx</TableHead>
                    <TableHead>Featurelar</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan._id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{plan.maxStudents}</TableCell>
                      <TableCell>{plan.maxBranches}</TableCell>
                      <TableCell>{plan.price}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {FEATURE_KEYS.filter((key) => plan.features?.[key]).map((key) => (
                            <Badge key={key} variant="secondary">{key}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await handleDeletePlan(plan._id);
                              toast({ title: "Plan o'chirildi" });
                            } catch (err) {
                              toast({
                                title: "Xatolik",
                                description: err instanceof Error ? err.message : "Plan o'chirilmadi",
                                variant: "destructive",
                              });
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                        >
                          O'chirish
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!plans.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Hozircha plan yo'q.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "schools" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Tenantlar</h2>
              <p className="text-sm text-muted-foreground">Maktab tenantlarini boshqarish</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button disabled={loading}>Yangi tenant</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>Yangi tenant yaratish</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setLoading(true);
                    try {
                      await handleCreateTenant(event.currentTarget);
                      event.currentTarget.reset();
                      toast({ title: "Tenant yaratildi" });
                    } catch (err) {
                      toast({
                        title: "Xatolik",
                        description: err instanceof Error ? err.message : "Tenant yaratilmadi",
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Maktab nomi</Label>
                    <Input id="name" name="name" required placeholder="Default School" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input id="slug" name="slug" required placeholder="default-school" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planId">Plan</Label>
                    <select
                      id="planId"
                      name="planId"
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Plan tanlang</option>
                      {plans.map((plan) => (
                        <option key={plan._id} value={plan._id}>{plan.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ownerFullname">Owner fullname</Label>
                      <Input id="ownerFullname" name="ownerFullname" required placeholder="Owner Name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerEmail">Owner email</Label>
                      <Input id="ownerEmail" name="ownerEmail" type="email" required placeholder="owner@school.uz" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerPassword">Owner password</Label>
                    <Input id="ownerPassword" name="ownerPassword" type="password" required placeholder="StrongPass123@" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>Saqlash</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant._id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>{tenant.slug}</TableCell>
                      <TableCell>{tenant.planId}</TableCell>
                      <TableCell>
                        <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                          {tenant.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await handleDeleteTenant(tenant._id);
                              toast({ title: "Tenant o'chirildi" });
                            } catch (err) {
                              toast({
                                title: "Xatolik",
                                description: err instanceof Error ? err.message : "Tenant o'chirilmadi",
                                variant: "destructive",
                              });
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                        >
                          O'chirish
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!tenants.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        Hozircha tenant yo'q.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "users" && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Hozircha user management qo'shilmagan.
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default SaasAdminDashboard;
