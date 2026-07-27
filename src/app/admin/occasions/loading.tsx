import { TableSkeleton } from "@/components/admin/TableSkeleton";

export default function AdminOccasionsLoading() {
  return (
    <TableSkeleton
      title="Occasions Setup"
      subtitle="Loading occasions..."
      columns={["Header", "Occasion Name", "Slug Mapping", "Attributes", "Actions"]}
      rowCount={7}
      minTableWidth="920px"
    />
  );
}
