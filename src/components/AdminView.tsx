"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, X, UserCheck, Bell } from "lucide-react";
import { toast } from "react-hot-toast";
import { checkBookingConflict } from "@/app/actions/bookingActions";

type PendingBooking = {
  id: string;
  booking_date: string;
  type: string;
  room_id: string;
  start_slot_id: string;
  end_slot_id: string;
  users?: { full_name: string } | { full_name: string }[] | null;
  rooms?: { name: string } | { name: string }[] | null;
  start_slot?: { start_time: string } | { start_time: string }[] | null;
  end_slot?: { end_time: string } | { end_time: string }[] | null;
};

type PendingUser = {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
  created_at: string;
};

export default function AdminView() {
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Booking reject modal state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [suggestedAlternative, setSuggestedAlternative] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // User action state
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, type, room_id, start_slot_id, end_slot_id,
        users:user_id(full_name),
        rooms:room_id(name),
        start_slot:start_slot_id(start_time),
        end_slot:end_slot_id(end_time)
      `)
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setBookings(data as unknown as PendingBooking[]);
    } else if (error) {
      toast.error("Failed to load pending requests");
    }
    setLoadingBookings(false);
  }, [supabase]);

  const fetchPendingUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, employee_id, full_name, role, created_at")
      .eq("is_approved", false)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setPendingUsers(data as PendingUser[]);
    }
    setLoadingUsers(false);
  }, [supabase]);

  useEffect(() => {
    fetchBookings();
    fetchPendingUsers();
  }, [fetchBookings, fetchPendingUsers]);

  // --- User Approval ---
  const handleApproveUser = async (u: PendingUser) => {
    setProcessingUserId(u.id);
    const { error } = await supabase.from("users").update({ is_approved: true }).eq("id", u.id);
    if (error) {
      toast.error("Failed to approve user");
    } else {
      toast.success(`${u.full_name} approved and activated!`);
      setPendingUsers((prev) => prev.filter((x) => x.id !== u.id));
    }
    setProcessingUserId(null);
  };

  const handleRejectUser = async (u: PendingUser) => {
    if (!confirm(`Reject and delete the registration for ${u.full_name}? This cannot be undone.`)) return;
    setProcessingUserId(u.id);
    const { error } = await supabase.from("users").delete().eq("id", u.id);
    if (error) {
      toast.error("Failed to reject user");
    } else {
      toast.success(`${u.full_name}'s registration rejected.`);
      setPendingUsers((prev) => prev.filter((x) => x.id !== u.id));
    }
    setProcessingUserId(null);
  };

  // --- Booking Actions ---
  const handleApprove = async (booking: PendingBooking) => {
    setProcessingId(booking.id);

    if (!booking.room_id) {
      toast.error("This booking has no valid room assigned.");
      setProcessingId(null);
      return;
    }

    const conflictCheck = await checkBookingConflict(
      booking.room_id,
      booking.booking_date,
      booking.start_slot_id,
      booking.end_slot_id,
      booking.id
    );

    if (conflictCheck.conflict) {
      toast.error(conflictCheck.message || "Double-booking conflict detected!");
      setProcessingId(null);
      return;
    }

    const newStatus = booking.type === "MULTI_PURPOSE" ? "ADMIN_APPROVED" : "APPROVED";

    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", booking.id);

    if (error) {
      toast.error("Failed to approve booking");
    } else {
      toast.success(
        booking.type === "MULTI_PURPOSE"
          ? "Forwarded to Branch Manager for final approval!"
          : "Booking Approved!"
      );
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    }
    setProcessingId(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId) return;

    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }

    setProcessingId(rejectId);

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "REJECTED",
        rejection_reason: rejectionReason.trim(),
        suggested_alternative: suggestedAlternative.trim() || null,
      })
      .eq("id", rejectId);

    if (error) {
      toast.error("Failed to reject booking");
      setProcessingId(null);
    } else {
      toast.success("Booking rejected. User has been notified.");
      setBookings((prev) => prev.filter((b) => b.id !== rejectId));
      setRejectId(null);
      setRejectionReason("");
      setSuggestedAlternative("");
      setProcessingId(null);
    }
  };

  const ROLE_LABEL: Record<string, string> = {
    EMPLOYEE: "Employee",
    SECRETARY: "Secretary",
    BRANCH_MANAGER: "Branch Manager",
    ADMIN: "Admin",
  };

  return (
    <div className="space-y-8">
      {/* ── Pending User Registrations ── */}
      {(loadingUsers || pendingUsers.length > 0) && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800/30">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Pending Registrations</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">New users awaiting account activation</p>
            </div>
            {pendingUsers.length > 0 && (
              <span className="ml-auto bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-sm font-bold border border-amber-200 dark:border-amber-800/30">
                {pendingUsers.length} Pending
              </span>
            )}
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-amber-500 h-6 w-6" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-amber-50 dark:bg-amber-900/10 text-slate-600 dark:text-slate-300 font-semibold border-b border-amber-100 dark:border-amber-800/30">
                  <tr>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50 dark:divide-slate-700/30">
                  {pendingUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-amber-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">{u.employee_id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{u.full_name}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-semibold">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                        {new Date(u.created_at).toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApproveUser(u)}
                            disabled={processingUserId === u.id}
                            className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-800/30 font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            {processingUserId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(u)}
                            disabled={processingUserId === u.id}
                            className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800/30 font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Pending Booking Requests ── */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 relative">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-primary">Pending Booking Requests</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <a href="/dashboard/admin/search" className="text-sm font-medium bg-amber-50 text-amber-900 hover:bg-amber-100 px-4 py-2 rounded-lg border border-amber-200 transition-colors">
              Room Search
            </a>
            <a href="/dashboard/admin/calendar" className="text-sm font-medium bg-green-50 text-green-900 hover:bg-green-100 px-4 py-2 rounded-lg border border-green-200 transition-colors">
              Calendar View
            </a>
            <a href="/dashboard/admin/users" className="text-sm font-medium bg-blue-50 text-blue-900 hover:bg-blue-100 px-4 py-2 rounded-lg border border-blue-200 transition-colors">
              Manage Users
            </a>
            <a href="/dashboard/admin/settings" className="text-sm font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 transition-colors">
              Settings
            </a>
            <span className="bg-secondary/20 text-primary px-3 py-1 rounded-full text-sm font-bold border border-secondary/30">
              {bookings.length} Pending
            </span>
          </div>
        </div>

        {loadingBookings ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-secondary h-8 w-8" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Check className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-50" />
            <p className="font-medium">No pending booking requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-semibold border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {bookings.map((booking) => {
                  const userName = Array.isArray(booking.users) ? booking.users[0]?.full_name : booking.users?.full_name;
                  const roomName = Array.isArray(booking.rooms) ? booking.rooms[0]?.name : booking.rooms?.name;
                  const startTime = Array.isArray(booking.start_slot) ? booking.start_slot[0]?.start_time : booking.start_slot?.start_time;
                  const endTime = Array.isArray(booking.end_slot) ? booking.end_slot[0]?.end_time : booking.end_slot?.end_time;

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{userName ?? "Unknown"}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{roomName ?? "Unassigned"}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{booking.booking_date}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {startTime?.substring(0, 5)} &ndash; {endTime?.substring(0, 5)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          booking.type === "MULTI_PURPOSE"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}>
                          {booking.type === "MULTI_PURPOSE" ? "Multi-Purpose" : "Exceptional Lecture"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 text-sm">
                          <button
                            onClick={() => handleApprove(booking)}
                            disabled={processingId === booking.id}
                            className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-800/30 font-medium transition-colors disabled:opacity-50"
                          >
                            {processingId === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectId(booking.id)}
                            disabled={processingId === booking.id}
                            className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800/30 font-medium transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Reject
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

        {/* Reject Modal */}
        {rejectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-lg">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">Reject Booking Request</h3>
              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    autoFocus
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    rows={3}
                    placeholder="e.g. Room is occupied by a fixed lecture schedule on this date."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Suggested Alternative <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={suggestedAlternative}
                    onChange={(e) => setSuggestedAlternative(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                    rows={3}
                    placeholder="e.g. I suggest Room B at the same time, or Room A available at 2:00 PM."
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">This suggestion will be shown to the user in their request history.</p>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => { setRejectId(null); setRejectionReason(""); setSuggestedAlternative(""); }}
                    className="px-4 py-2 font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!!processingId}
                    className="px-4 py-2 font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {processingId === rejectId && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
