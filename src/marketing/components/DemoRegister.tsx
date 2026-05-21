import { motion } from "framer-motion";
import { useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

const phoneRegex = /^\+?[0-9\s\-()]{9,20}$/;

export const DemoRegister = () => {
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation("marketing");

  const formSchema = z.object({
    firstName: z.string().trim()
      .min(2, { message: t("register.errors.firstNameMin") })
      .max(50, { message: t("register.errors.firstNameMax") }),
    lastName: z.string().trim()
      .min(2, { message: t("register.errors.lastNameMin") })
      .max(50, { message: t("register.errors.lastNameMax") }),
    school: z.string().trim()
      .min(2, { message: t("register.errors.schoolMin") })
      .max(100, { message: t("register.errors.schoolMax") }),
    phone: z.string().trim()
      .regex(phoneRegex, { message: t("register.errors.phone") }),
    email: z.string().trim()
      .email({ message: t("register.errors.email") })
      .max(255, { message: t("register.errors.emailMax") }),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { firstName: "", lastName: "", school: "", phone: "", email: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: FormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    // eslint-disable-next-line no-console
    console.log("Demo registration submitted", values);

    setSubmitted(true);
    toast({
      title: t("register.toast.title"),
      description: t("register.toast.desc", { name: values.firstName }),
    });
    form.reset();
  };

  const isSubmitting = form.formState.isSubmitting;
  const perks = [t("register.perks.p1"), t("register.perks.p2"), t("register.perks.p3")];

  return (
    <section id="demo-register" className="py-24 bg-secondary/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid gap-10 lg:grid-cols-2 items-center rounded-3xl border border-border/60 bg-card p-8 md:p-14 shadow-card"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              <Sparkles className="h-4 w-4" /> {t("register.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
              {t("register.titleA")} <span className="gradient-text">{t("register.titleHighlight")}</span> {t("register.titleB")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              {t("register.desc")}
            </p>
            <ul className="mt-6 space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-medium">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center text-center rounded-2xl border border-primary/20 bg-primary/5 p-10"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-icon mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold">{t("register.success.title")}</h3>
              <p className="mt-2 text-muted-foreground">
                {t("register.success.desc")}
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>
                {t("register.success.reset")}
              </Button>
            </motion.div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 rounded-2xl border border-border/60 bg-background p-6 md:p-8"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("register.fields.firstName")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("register.fields.firstNamePh")} autoComplete="given-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("register.fields.lastName")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("register.fields.lastNamePh")} autoComplete="family-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("register.fields.school")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("register.fields.schoolPh")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("register.fields.phone")}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder={t("register.fields.phonePh")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("register.fields.email")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder={t("register.fields.emailPh")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("register.submitting")}
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="h-5 w-5" />
                      {t("register.submit")}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t("register.privacy")}
                </p>
              </form>
            </Form>
          )}
        </motion.div>
      </div>
    </section>
  );
};
