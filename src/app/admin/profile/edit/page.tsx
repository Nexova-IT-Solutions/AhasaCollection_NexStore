import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminProfileEditPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getServerSession(authOptions)

  if (!session || session.user.role === "USER") {
    redirect("/")
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1F1720]">Edit Profile</h1>
          <p className="mt-1 text-sm text-[#6B5A64]">Update the current admin account details from here.</p>
        </div>

        <Card className="rounded-2xl border border-brand-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1F1720]">Profile editor</CardTitle>
            <CardDescription>Connect the edit form for {session.user.name || session.user.email || "this user"} here.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="bg-[#A7066A] hover:bg-[#8E055A] text-white rounded-xl">
              <Link href={`/admin`}>Back to dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-brand-border text-[#1F1720] hover:bg-[#FCEAF4] hover:text-[#A7066A]">
              <Link href={`/${locale || "en"}/profile`}>Open my profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}