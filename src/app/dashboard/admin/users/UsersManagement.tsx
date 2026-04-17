"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";

type UserProfile = {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
  can_view_availability: boolean;
  is_approved: boolean;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Employee",
  SECRETARY: "Secretary",
  BRANCH_MANAGER: "Branch Manager",
  ADMIN: "Admin",
};

const ROLE_COLOR: Record<string, string> = {
  EMPLOYEE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  SECRETARY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  BRANCH_MANAGER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "EMPLOYEE" | "SECRETARY" | "BRANCH_MANAGER">("ALL");
  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("users")
      .select("id, employee_id, full_name, role, can_view_availability, is_approved, created_at")
      .neq("role", "ADMIN")
      .order("created_at", { ascending: false });

    if (filter !== "ALL") {
      query = query.eq("role", filter);
    }

    const { data, error } = await query;

    if (data && !error) {
      setUsers(data as UserProfile[]);
    } else {
      toast.error("Failed to load users");
    }
    setLoading(false);
  }, [supabase, filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleAvailability = async (userId: string, currentValue: boolean) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, can_view_availability: !currentValue } : u));

    const { error } = await supabase
      .from("users")
      .update({ can_view_availability: !currentValue })
      .eq("id", userId);

    if (error) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, can_view_availability: currentValue } : u));
      toast.error("Failed to update user");
    } else {
      toast.success(`Availability view ${!currentValue ? "enabled" : "disabled"}`);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId);
    if (error) {
      toast.error("Failed to update role");
    } else {
      toast.success("Role updated successfully");
      fetchUsers();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
      {/* Filter tabs */}
      <div className="px-6 pt-6 pb-0 flex gap-2 border-b border-gray-100 dark:border-slate-700 flex-wrap">
        {(["ALL", "EMPLOYEE", "SECRETARY", "BRANCH_MANAGER"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              filter === f
                ? "border-secondary text-primary dark:text-white bg-secondary/10"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {f === "ALL" ? "All Users" : ROLE_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-semibold border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">View Availability</th>
                  <th className="px-4 py-3">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">{u.employee_id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{u.full_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLOR[u.role] ?? ""}`}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.is_approved ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"}`}>
                        {u.is_approved ? "Active" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAvailability(u.id, u.can_view_availability)}
                        title={u.can_view_availability ? "Revoke calendar access" : "Grant calendar access"}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          u.can_view_availability
                            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {u.can_view_availability ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {u.can_view_availability ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-secondary focus:outline-none"
                      >
                        <option value="EMPLOYEE">Employee</option>
                        <option value="SECRETARY">Secretary</option>
                        <option value="BRANCH_MANAGER">Branch Manager</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No users found for the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
