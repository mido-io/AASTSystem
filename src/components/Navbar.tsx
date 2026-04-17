"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn, LogOut, User, Calendar, Search, Settings, Users, LayoutDashboard, GitMerge } from "lucide-react";

type UserProfile = {
  full_name: string;
  role: string;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  BRANCH_MANAGER: "Branch Manager",
  SECRETARY: "Secretary",
  EMPLOYEE: "Employee",
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  BRANCH_MANAGER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  SECRETARY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  EMPLOYEE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export default function Navbar() {
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUser(user ? { id: user.id } : null);

      if (user) {
        const { data } = await supabase
          .from("users")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
      setLoadingAuth(false);
    };

    fetchAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuthUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href))
      ? "bg-white/20 text-white"
      : "text-gray-300 hover:text-white hover:bg-white/10";

  return (
    <nav className="bg-primary text-white shadow-md w-full z-50 sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <Link
            href={authUser ? "/dashboard" : "/"}
            className="font-bold text-xl tracking-tight flex items-center gap-1 flex-shrink-0"
          >
            <span className="text-secondary font-extrabold text-2xl">AAST</span>
            <span>Sys</span>
          </Link>

          {/* Admin navigation links */}
          {authUser && profile?.role === "ADMIN" && (
            <div className="hidden lg:flex items-center gap-1">
              <Link href="/dashboard" className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-md font-medium transition-colors ${isActive("/dashboard")}`}>
                <LayoutDashboard className="w-4 h-4" />
                Requests
              </Link>
              <Link href="/dashboard/admin/calendar" className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-md font-medium transition-colors ${isActive("/dashboard/admin/calendar")}`}>
                <Calendar className="w-4 h-4" />
                Calendar
              </Link>
              <Link href="/dashboard/admin/search" className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-md font-medium transition-colors ${isActive("/dashboard/admin/search")}`}>
                <Search className="w-4 h-4" />
                Room Search
              </Link>
              <Link href="/dashboard/admin/users" className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-md font-medium transition-colors ${isActive("/dashboard/admin/users")}`}>
                <Users className="w-4 h-4" />
                Users
              </Link>
              <Link href="/dashboard/admin/delegations" className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-md font-medium transition-colors ${isActive("/dashboard/admin/delegations")}`}>
                <GitMerge className="w-4 h-4" />
                Delegations
              </Link>
              <Link href="/dashboard/admin/settings" className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-md font-medium transition-colors ${isActive("/dashboard/admin/settings")}`}>
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          )}

          {/* Right: user badge + logout */}
          <div className="flex items-center gap-3">
            {!loadingAuth && authUser && profile ? (
              <>
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white leading-tight">{profile.full_name}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${ROLE_COLOR[profile.role] ?? "bg-gray-100 text-gray-800"}`}>
                      {ROLE_LABEL[profile.role] ?? profile.role}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-secondary/20 border border-secondary/30 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-white/20 text-sm font-medium rounded-lg text-white hover:bg-white/10 focus:outline-none transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : !loadingAuth && !authUser ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-primary bg-secondary hover:bg-yellow-500 transition-colors shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
