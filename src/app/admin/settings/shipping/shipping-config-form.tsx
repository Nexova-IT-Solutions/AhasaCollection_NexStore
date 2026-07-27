"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const shippingConfigSchema = z.object({
  deliveryFee: z.coerce.number().min(0, "Delivery fee must be non-negative"),
  freeDeliveryThreshold: z.coerce.number().min(0, "Threshold must be non-negative"),
  isFreeDeliveryEnabled: z.boolean().default(true),
  expressDeliveryFee: z.coerce.number().min(0, "Express fee must be non-negative"),
  isDeliveryEnabled: z.boolean().default(true),
  deliveryNote: z.string().optional().nullable(),
});

type ShippingConfigFormValues = z.infer<typeof shippingConfigSchema>;

export function ShippingConfigForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<ShippingConfigFormValues>({
    resolver: zodResolver(shippingConfigSchema),
    defaultValues: {
      deliveryFee: 350,
      freeDeliveryThreshold: 5000,
      isFreeDeliveryEnabled: true,
      expressDeliveryFee: 650,
      isDeliveryEnabled: true,
      deliveryNote: "",
    },
  });

  // Fetch current config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/shipping-config", {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch config");
        }

        const data = await response.json();
        if (data.success && data.data) {
          form.reset({
            deliveryFee: data.data.deliveryFee,
            freeDeliveryThreshold: data.data.freeDeliveryThreshold,
            isFreeDeliveryEnabled: data.data.isFreeDeliveryEnabled,
            expressDeliveryFee: data.data.expressDeliveryFee,
            isDeliveryEnabled: data.data.isDeliveryEnabled,
            deliveryNote: data.data.deliveryNote || "",
          });
        }
      } catch (error) {
        console.error("Error fetching config:", error);
        toast({
          title: "Error",
          description: "Failed to load shipping configuration",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [form, toast]);

  async function onSubmit(values: ShippingConfigFormValues) {
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/shipping-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to update config");
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Shipping configuration updated successfully",
        });
      }
    } catch (error) {
      console.error("Error updating config:", error);
      toast({
        title: "Error",
        description: "Failed to update shipping configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-[#6B5A64]">Loading configuration...</div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Delivery Fee */}
        <FormField
          control={form.control}
          name="deliveryFee"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#1F1720]">Standard Delivery Fee (LKR)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 350"
                  className="rounded-lg border-brand-border"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Cost charged for delivery when order is below free delivery threshold
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Free Delivery Toggle */}
        <FormField
          control={form.control}
          name="isFreeDeliveryEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-brand-border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-[#1F1720]">Enable Free Delivery</FormLabel>
                <FormDescription>
                  Allow orders above a certain amount to be delivered for free
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Free Delivery Threshold */}
        <FormField
          control={form.control}
          name="freeDeliveryThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#1F1720]">Free Delivery Threshold (LKR)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 5000"
                  className="rounded-lg border-brand-border"
                  disabled={!form.watch("isFreeDeliveryEnabled")}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Minimum order amount for free delivery
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Express Delivery Fee */}
        <FormField
          control={form.control}
          name="expressDeliveryFee"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#1F1720]">Express Delivery Fee (LKR)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 650"
                  className="rounded-lg border-brand-border"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Cost for express/priority delivery
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Delivery Enabled Toggle */}
        <FormField
          control={form.control}
          name="isDeliveryEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-brand-border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-[#1F1720]">Enable Delivery</FormLabel>
                <FormDescription>
                  Turn off to temporarily disable all delivery orders
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Delivery Note */}
        <FormField
          control={form.control}
          name="deliveryNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#1F1720]">Delivery Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Orders will be delivered within 2-3 business days"
                  className="rounded-lg border-brand-border resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Additional information to display to customers at checkout
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSaving}
          className="w-full bg-[#A7066A] hover:bg-[#8E055A] text-white rounded-xl sm:w-auto"
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </form>
    </Form>
  );
}
