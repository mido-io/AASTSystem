"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, X, GitMerge, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

type Employee = {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
};

type Delegation = {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  primary_user: { full_name: string; employee_id: string } | null;
  substitute_user: { full_name: string; employee_id: string } | null;
};

export default function DelegationsPage() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [primaryUserId, setPrimaryUserId] = useState("");
  const [substituteUserId, setSubstituteUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [delegRes, empRes] = await Promise.all([
      supabase
        .from("delegations")
        .select(`
          id, start_date, end_date, is_active, created_at,
          primary_user:primary_user_id(full_name, employee_id),
          substitute_user:substitute_user_id(full_name, employee_id)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("users")
        .select("id, employee_id, full_name, role")
        .in("role", ["EMPLOYEE", "SECRETARY"])
        .eq("is_approved", true)
        .order("full_name"),
    ]);

    if (delegRes.data) setDelegations(delegRes.data as unknown as Delegation[]);
    if (empRes.data) setEmployees(empRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!primaryUserId || !substituteUserId || !startDate || !endDate) {
      toast.error("All fields are required");
      return;
    }

    if (primaryUserId === substituteUserId) {
      toast.error("Primary and substitute must be different employees");
      return;
    }

    if (startDate > endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("delegations").insert({
      primary_user_id: primaryUserId,
      substitute_user_id: substituteUserId,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Delegation created successfully!");
      setShowForm(false);
      setPrimaryUserId("");
      setSubstituteUserId("");
      setStartDate("");
      setEndDate("");
      fetchData();
    }

    setSubmitting(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("delegations")
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update delegation");
    } else {
      toast.success(current ? "Delegation deactivated" : "Delegation activated");
      fetchData();
    }
  };

  const deleteDelegation = async (id: string) => {
    if (!confirm("Delete this delegation? This cannot be undone.")) return;
    const { error } = await supabase.from("delegations").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete delegation");
    } else {
      toast.success("Delegation deleted");
      setDelegations((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const getStatus = (d: Delegation) => {
    if (!d.is_active) return { label: "Inactive", cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400" };
    if (d.end_date < today) return { label: "Expired", cls: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" };
    if (d.start_date > today) return { label: "Upcoming", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" };
    return { label: "Active Now", cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" };
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900/50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary dark:text-white flex items-center gap-3">
              <GitMerge className="w-8 h-8 text-secondary" />
              Delegation Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Grant temporary access rights to substitute employees during leave periods.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary hover:bg-blue-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New Delegation"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 mb-8">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Create Delegation</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Primary Employee (going on leave)
                </label>
                <select
                  value={primaryUserId}
                  onChange={(e) => setPrimaryUserId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Substitute Employee (covering)
                </label>
                <select
                  value={substituteUserId}
                  onChange={(e) => setSubstituteUserId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                  required
                >
                  <option value="">Select substitute</option>
                  {employees.filter((e) => e.id !== primaryUserId).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || today}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300 mb-4">
                  The substitute employee will gain calendar availability view access during the delegation period.
                  These permissions are automatically revoked after the end date.
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-secondary hover:bg-yellow-500 text-primary font-bold px-6 py-3 rounded-lg transition-colors disabled:opacity-70"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Delegation
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delegations List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">All Delegations</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-secondary h-8 w-8" />
            </div>
          ) : delegations.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <GitMerge className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No delegations configured yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-semibold border-b border-gray-100 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Primary Employee</th>
                    <th className="px-4 py-3">Substitute</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {delegations.map((d) => {
                    const primaryUser = Array.isArray(d.primary_user) ? d.primary_user[0] : d.primary_user;
                    const substituteUser = Array.isArray(d.substitute_user) ? d.substitute_user[0] : d.substitute_user;
                    const status = getStatus(d);

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{primaryUser?.full_name ?? "Unknown"}</p>
                          <p className="text-xs text-slate-400 font-mono">{primaryUser?.employee_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{substituteUser?.full_name ?? "Unknown"}</p>
                          <p className="text-xs text-slate-400 font-mono">{substituteUser?.employee_id}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {d.start_date} &rarr; {d.end_date}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => toggleActive(d.id, d.is_active)}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                d.is_active
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30"
                                  : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30"
                              }`}
                            >
                              {d.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => deleteDelegation(d.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                              title="Delete delegation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
