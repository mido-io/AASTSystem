"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState<"EMPLOYEE" | "SECRETARY">("EMPLOYEE");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedId = employeeId.trim();

    if (!trimmedName || !trimmedId) {
      setError("All fields are required");
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(trimmedId)) {
      setError("Employee ID must contain only letters and numbers (no spaces or special characters)");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const email = `${trimmedId.toLowerCase()}@aastmt.edu`;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: undefined },
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
          throw new Error("An account with this Employee ID already exists. Please login instead.");
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Registration failed. Please try again.");
      }

      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        employee_id: trimmedId.toUpperCase(),
        full_name: trimmedName,
        role,
        is_approved: false,
        can_view_availability: false,
      });

      if (profileError) {
        throw new Error("Failed to create user profile. Employee ID may already be taken.");
      }

      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-8 bg-gray-50 dark:bg-slate-900/50">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-green-200 dark:border-green-800/30 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Registration Submitted!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            Your account has been created and is <strong>pending administrator approval</strong>.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
            You will be able to sign in once an administrator reviews and approves your registration.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-3 px-4 bg-secondary hover:bg-yellow-500 text-primary font-bold rounded-lg text-center transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-8 bg-gray-50 dark:bg-slate-900/50">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary mb-2">
            AAST<span className="text-secondary">Sys</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create your account to request room access
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-medium border border-red-100 dark:border-red-800/30">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors"
              placeholder="e.g. Ahmed Mohamed Ali"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Employee ID
            </label>
            <input
              type="text"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors"
              placeholder="e.g. EMP001"
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Letters and numbers only, no spaces</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "EMPLOYEE" | "SECRETARY")}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors"
            >
              <option value="EMPLOYEE">Employee / Lecturer</option>
              <option value="SECRETARY">College Secretary / Representative</option>
            </select>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {role === "EMPLOYEE"
                ? "Can book lecture rooms (24h min) and multi-purpose rooms"
                : "Can only book multi-purpose rooms (48h min advance notice required)"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors"
              placeholder="Repeat your password"
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
              <UserPlus className="h-5 w-5" />
            )}
            <span>{loading ? "Creating Account..." : "Create Account"}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {"Already have an account? "}
          <Link href="/login" className="text-secondary font-semibold hover:text-yellow-500 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
