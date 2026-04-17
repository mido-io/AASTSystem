"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn, Loader2, Clock } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function LoginForm() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const isPending = searchParams.get("pending") === "true";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!employeeId.trim()) {
      setError("Employee ID is required");
      setLoading(false);
      return;
    }

    const email = `${employeeId.trim().toLowerCase()}@aastmt.edu`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error("Invalid Employee ID or password");
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-8 bg-gray-50 dark:bg-slate-900/50">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary mb-2">
            AAST<span className="text-secondary">Sys</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Room &amp; Hall Management System
          </p>
        </div>

        {isPending && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-4 rounded-lg flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Account Pending Approval</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Your registration is awaiting administrator approval. You will be able to login once approved.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="employeeId"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Employee ID
            </label>
            <input
              id="employeeId"
              type="text"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors"
              placeholder="e.g. EMP001"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-primary bg-secondary hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="h-5 w-5" />
            )}
            <span>{loading ? "Signing in..." : "Sign in"}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {"Don't have an account? "}
          <Link href="/register" className="text-secondary font-semibold hover:text-yellow-500 transition-colors">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-secondary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
