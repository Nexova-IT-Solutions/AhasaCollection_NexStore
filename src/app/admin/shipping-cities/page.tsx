import { redirect } from "next/navigation";

export default function ShippingCitiesRedirectPage() {
  redirect("/admin/settings/shipping");
}
