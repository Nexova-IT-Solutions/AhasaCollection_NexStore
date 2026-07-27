"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

export default function ContactPage() {
  const { toast } = useToast();
  const t = useTranslations("Contact");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    message: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = t("errorName");
    if (!formData.email.trim()) {
      newErrors.email = t("errorEmailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("errorEmailInvalid");
    }
    if (!formData.message.trim()) newErrors.message = t("errorMessage");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: t("toastSuccess"),
      description: t("toastSuccessDesc"),
    });

    setFormData({
      name: "",
      email: "",
      phone: "",
      title: "",
      message: "",
    });
    setIsSubmitting(false);
  };

  return (
    <section className="py-16 px-4 bg-[#FFF7FB]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#1F1720] mb-2">{t("needHelp")}</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Input
                name="name"
                placeholder={t("placeholderName")}
                value={formData.name}
                onChange={handleChange}
                className={`px-4 py-6 border-gray-200 focus:ring-[#A7066A] focus-visible:ring-[#A7066A] ${
                  errors.name ? "border-red-500" : ""
                }`}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <Input
                name="email"
                type="email"
                placeholder={t("placeholderEmail")}
                value={formData.email}
                onChange={handleChange}
                className={`px-4 py-6 border-gray-200 focus:ring-[#A7066A] focus-visible:ring-[#A7066A] ${
                  errors.email ? "border-red-500" : ""
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <Input
                name="phone"
                placeholder={t("placeholderPhone")}
                value={formData.phone}
                onChange={handleChange}
                className="px-4 py-6 border-gray-200 focus:ring-[#A7066A] focus-visible:ring-[#A7066A]"
              />
            </div>
            <div>
              <Input
                name="title"
                placeholder={t("placeholderTitle")}
                value={formData.title}
                onChange={handleChange}
                className="px-4 py-6 border-gray-200 focus:ring-[#A7066A] focus-visible:ring-[#A7066A]"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex-1">
              <Textarea
                name="message"
                placeholder={t("placeholderMessage")}
                value={formData.message}
                onChange={handleChange}
                className={`h-full min-h-[200px] px-4 py-4 border-gray-200 focus:ring-[#A7066A] focus-visible:ring-[#A7066A] ${
                  errors.message ? "border-red-500" : ""
                }`}
              />
              {errors.message && (
                <p className="text-red-500 text-xs mt-1">{errors.message}</p>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-12 py-6 bg-[#A7066A] hover:bg-[#8A0558] text-white font-bold rounded-md transition-colors"
            >
              {isSubmitting ? t("sending") : t("sendMessage")}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
