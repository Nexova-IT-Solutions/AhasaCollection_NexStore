import { TableSkeleton } from "@/components/admin/TableSkeleton";

export default function AdminMoodsLoading() {
  return (
    <TableSkeleton
      title="Moods Setup"
      subtitle="Loading moods..."
      columns={["Icon", "Mood Name", "Slug", "Status", "Actions"]}
      rowCount={6}
      minTableWidth="900px"
    />
  );
}
