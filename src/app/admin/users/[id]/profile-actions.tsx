"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";

type ProfileActionsProps = {
  userId: string;
  userName: string;
  usersListHref: string;
};

export function ProfileActions({ userId, userName, usersListHref }: ProfileActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const ok = window.confirm(`Are you sure you want to permanently delete ${userName}?`);
    if (!ok) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete user");
      }

      toast({
        title: "User deleted",
        description: `${userName} was removed from the system.`,
      });
      router.push(usersListHref);
      router.refresh();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete this user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button asChild variant="outline" className="rounded-full">
        <Link href={usersListHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users List
        </Link>
      </Button>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`${usersListHref}/${userId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit User
          </Link>
        </Button>
        <Button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          variant="destructive"
          className="rounded-full"
        >
          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Delete User
        </Button>
      </div>
    </div>
  );
}
