import { FormSkeleton } from "@/components/admin/FormSkeleton";

export default function AdminUserNewLoading() {
  return (
    <FormSkeleton
      maxWidthClass="max-w-5xl"
      pageClassName="w-full bg-[#FAFAFA] min-h-screen py-10 px-4 sm:px-6 lg:px-8"
      fieldCount={8}
      showSecondaryButton={false}
    />
  );
}
