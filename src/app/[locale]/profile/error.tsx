"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Profile Error Boundary Caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-6">
      <div className="p-4 bg-red-50 rounded-full text-red-600">
        <AlertTriangle className="w-12 h-12" />
      </div>
      
      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 font-brand">Something went wrong!</h2>
        <p className="text-gray-500">
          We encountered an error while loading your profile. This might be a temporary connection issue.
        </p>
      </div>

      {error.digest && (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 font-mono text-xs text-gray-400">
          Error Digest: {error.digest}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => reset()}
          className="bg-[#A7066A] hover:bg-[#8A0558] rounded-full px-8 gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Try Again
        </Button>
        <Button variant="outline" asChild className="rounded-full px-8 gap-2 border-gray-200">
          <Link href="/">
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="pt-8 text-xs text-gray-400">
        <p>If the error persists, please contact our support team.</p>
        <p className="mt-1 italic">Technical details are logged for our developers.</p>
      </div>
    </div>
  );
}
