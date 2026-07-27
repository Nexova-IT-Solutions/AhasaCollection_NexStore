import { PackageOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

type OrderEmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
};

export function OrderEmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  actionLabel,
  onAction,
}: OrderEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-[#A7066A] shadow-sm">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{description}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-5 bg-[#A7066A] hover:bg-[#8A0558]">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
