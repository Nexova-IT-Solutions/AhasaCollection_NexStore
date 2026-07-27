import { FormSkeleton } from "@/components/admin/FormSkeleton";

export default function AdminProductEditLoading() {
  return <FormSkeleton maxWidthClass="max-w-[1600px]" fieldCount={7} />;
}
