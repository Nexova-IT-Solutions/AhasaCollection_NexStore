import { TableSkeleton } from "@/components/admin/TableSkeleton";

export default function AdminGiftCardsLoading() {
  return (
    <TableSkeleton
      title="Gift Cards Setup"
      subtitle="Loading gift cards..."
      columns={["Image", "Gift Card Code", "Initial Value", "Balance", "Expiration", "Status", "Actions"]}
      rowCount={8}
      minTableWidth="1080px"
    />
  );
}
