"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ReportIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#e3e2c3] flex flex-col items-center justify-center space-y-10 font-poppins">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
