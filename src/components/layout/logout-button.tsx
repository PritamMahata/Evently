"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function useLogout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function logout() {
    if (loading) return;
    setLoading(true);
    const res = await api("/api/auth/logout");
    if (!res.ok) {
      toast.error(res.error.message);
      setLoading(false);
      return;
    }
    toast.success("You've been logged out.");
    router.push("/");
    router.refresh();
  }
  return { logout, loading };
}

export function LogoutMenuItem() {
  const { logout, loading } = useLogout();
  return (
    <DropdownMenuItem
      onClick={() => {
        void logout();
      }}
      disabled={loading}
    >
      <LogOut /> {loading ? "Logging out…" : "Log out"}
    </DropdownMenuItem>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const { logout, loading } = useLogout();
  return (
    <Button
      variant="outline"
      className={className}
      onClick={logout}
      loading={loading}
    >
      {!loading && <LogOut />} Log out
    </Button>
  );
}
