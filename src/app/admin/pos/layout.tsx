/**
 * POS sub-layout — No special wrapping needed since the POS page now
 * lives inside the main admin layout. This layout just passes children
 * through, with role-based access control handled by the parent layout.
 */
export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
