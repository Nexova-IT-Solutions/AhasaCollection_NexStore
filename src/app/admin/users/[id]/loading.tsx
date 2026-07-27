import { FormSkeleton } from "@/components/admin/FormSkeleton";

export default function AdminUserDetailsLoading() {
  return (
    <FormSkeleton
      maxWidthClass="max-w-[1600px]"
      pageClassName="w-full bg-[#FAFAFA] min-h-screen py-10 px-4 sm:px-6 lg:px-8"
      fieldCount={6}
      showSecondaryButton={false}
    />
  );
}
