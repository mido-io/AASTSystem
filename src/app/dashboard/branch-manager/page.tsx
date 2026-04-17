"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, X, Info } from "lucide-react";
import { toast } from "react-hot-toast";

type AdminApprovedBooking = {
  id: string;
  booking_date: string;
  type: string;
  room_id: string;
  start_slot_id: string;
  end_slot_id: string;
  purpose?: string;
  manager_name?: string;
  manager_title?: string;
  manager_mobile?: string;
  req_laptop?: boolean;
  req_video_conf?: boolean;
  req_mic_qty?: number;
  users?: { full_name: string } | { full_name: string }[] | null;
  rooms?: { name: string } | { name: string }[] | null;
  start_slot?: { start_time: string } | { start_time: string }[] | null;
  end_slot?: { end_time: string } | { end_time: string }[] | null;
};

export default function BranchManagerPage() {
  const [bookings, setBookings] = useState<AdminApprovedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, type, room_id, start_slot_id, end_slot_id,
        purpose, manager_name, manager_title, manager_mobile,
        req_laptop, req_video_conf, req_mic_qty,
        users:user_id(full_name),
        rooms:room_id(name),
        start_slot:start_slot_id(start_time),
        end_slot:end_slot_id(end_time)
      `)
      .eq("status", "ADMIN_APPROVED")
      .eq("type", "MULTI_PURPOSE")
      .order("booking_date", { ascending: true });

    if (!error && data) {
      setBookings(data as unknown as AdminApprovedBooking[]);
    } else if (error) {
      toast.error("Failed to load requests");
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleApprove = async (booking: AdminApprovedBooking) => {
    setProcessingId(booking.id);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "APPROVED" })
      .eq("id", booking.id);

    if (error) {
      toast.error("Failed to approve booking");
    } else {
      toast.success("Multi-purpose booking fully approved!");
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    }
    setProcessingId(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }

    setProcessingId(rejectId);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "REJECTED", rejection_reason: rejectionReason.trim() })
      .eq("id", rejectId);

    if (error) {
      toast.error("Failed to reject booking");
      setProcessingId(null);
    } else {
      toast.success("Booking rejected.");
      setBookings((prev) => prev.filter((b) => b.id !== rejectId));
      setRejectId(null);
      setRejectionReason("");
      setProcessingId(null);
    }
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary dark:text-white">Branch Manager Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review and approve multi-purpose room booking requests forwarded by the Admin.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 relative">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-xl font-bold text-primary dark:text-white">Pending Final Approval</h2>
            <span className="bg-secondary/20 text-primary px-3 py-1 rounded-full text-sm font-bold border border-secondary/30">
              {bookings.length} Pending
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-secondary h-8 w-8" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Check className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-50" />
              <p className="font-medium">No multi-purpose bookings awaiting your approval.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {bookings.map((booking) => {
                const userName = Array.isArray(booking.users) ? booking.users[0]?.full_name : booking.users?.full_name;
                const roomName = Array.isArray(booking.rooms) ? booking.rooms[0]?.name : booking.rooms?.name;
                const startTime = Array.isArray(booking.start_slot) ? booking.start_slot[0]?.start_time : booking.start_slot?.start_time;
                const endTime = Array.isArray(booking.end_slot) ? booking.end_slot[0]?.end_time : booking.end_slot?.end_time;
                const isExpanded = expandedId === booking.id;

                return (
                  <div key={booking.id} className="p-6">
                    <div className="flex flex-wrap gap-4 justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-slate-900 dark:text-slate-100">{userName ?? "Unknown"}</h3>
                          <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-semibold">
                            Multi-Purpose
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
                          <p><span className="font-medium text-slate-700 dark:text-slate-300">Room:</span> {roomName ?? "Unassigned"}</p>
                          <p><span className="font-medium text-slate-700 dark:text-slate-300">Date:</span> {booking.booking_date}</p>
                          <p><span className="font-medium text-slate-700 dark:text-slate-300">Time:</span> {startTime?.substring(0, 5)} &ndash; {endTime?.substring(0, 5)}</p>
                          {booking.purpose && (
                            <p><span className="font-medium text-slate-700 dark:text-slate-300">Purpose:</span> {booking.purpose}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                          className="mt-2 flex items-center gap-1 text-xs text-secondary hover:text-yellow-600 font-medium transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                          {isExpanded ? "Hide" : "Show"} event details
                        </button>

                        {isExpanded && (
                          <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg text-sm space-y-1">
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Event Manager Details</p>
                            {booking.manager_name && <p><span className="text-slate-500">Name:</span> {booking.manager_name}</p>}
                            {booking.manager_title && <p><span className="text-slate-500">Title:</span> {booking.manager_title}</p>}
                            {booking.manager_mobile && <p><span className="text-slate-500">Mobile:</span> {booking.manager_mobile}</p>}
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-2">Technical Requirements</p>
                            <p><span className="text-slate-500">Laptop:</span> {booking.req_laptop ? "Yes" : "No"}</p>
                            <p><span className="text-slate-500">Video Conference:</span> {booking.req_video_conf ? "Yes" : "No"}</p>
                            <p><span className="text-slate-500">Microphones:</span> {booking.req_mic_qty ?? 0}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(booking)}
                          disabled={processingId === booking.id}
                          className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 px-4 py-2 rounded-md border border-green-200 dark:border-green-800/30 font-medium text-sm transition-colors disabled:opacity-50"
                        >
                          {processingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectId(booking.id)}
                          disabled={processingId === booking.id}
                          className="flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 px-4 py-2 rounded-md border border-red-200 dark:border-red-800/30 font-medium text-sm transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-md">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">Reject Booking</h3>
            <form onSubmit={handleRejectSubmit}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                autoFocus
                required
                className="w-full px-4 py-3 mb-4 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                rows={4}
                placeholder="Reason for rejection by Branch Manager"
              />
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setRejectId(null); setRejectionReason(""); }}
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
  );
}
