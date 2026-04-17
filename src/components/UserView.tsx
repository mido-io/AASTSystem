"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { checkBookingConflict, validateBookingLeadTime } from "@/app/actions/bookingActions";
import WeeklyCalendar from "./WeeklyCalendar";

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
}

interface Room {
  id: string;
  name: string;
  type: string;
}

interface HistoryBooking {
  id: string;
  booking_date: string;
  status: string;
  type: string;
  rejection_reason?: string | null;
  suggested_alternative?: string | null;
  rooms?: { name: string } | null;
}

interface UserViewProps {
  role: string;
  userId: string;
  canViewAvailability?: boolean;
}

export default function UserView({ role, userId, canViewAvailability }: UserViewProps) {
  const isSecretary = role === "SECRETARY";

  const [roomType, setRoomType] = useState<"LECTURE" | "MULTI_PURPOSE">(
    isSecretary ? "MULTI_PURPOSE" : "LECTURE"
  );
  const [date, setDate] = useState("");
  const [startSlotId, setStartSlotId] = useState("");
  const [endSlotId, setEndSlotId] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyBookings, setHistoryBookings] = useState<HistoryBooking[]>([]);

  // Multi-purpose fields
  const [purpose, setPurpose] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerTitle, setManagerTitle] = useState("");
  const [managerMobile, setManagerMobile] = useState("");
  const [reqLaptop, setReqLaptop] = useState(false);
  const [reqVideoConf, setReqVideoConf] = useState(false);
  const [reqMicQty, setReqMicQty] = useState(0);

  const supabase = createClient();

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from("bookings")
      .select("id, booking_date, status, type, rejection_reason, suggested_alternative, rooms(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setHistoryBookings(data as unknown as HistoryBooking[]);
  }, [supabase, userId]);

  useEffect(() => {
    const init = async () => {
      const [slotsRes, roomsRes] = await Promise.all([
        supabase.from("time_slots").select("*").eq("is_active", true).order("start_time"),
        supabase.from("rooms").select("*").eq("is_active", true).order("name"),
      ]);

      if (slotsRes.data) setTimeSlots(slotsRes.data);
      if (roomsRes.data) setRooms(roomsRes.data);
      setLoading(false);
    };

    init();
  }, [supabase]);

  useEffect(() => {
    if (!loading) fetchHistory();
  }, [loading, fetchHistory]);

  // Client-side min date (server will strictly re-validate)
  const getMinDate = () => {
    const now = new Date();
    const hoursToAdd = role === "SECRETARY" ? 48 : role === "EMPLOYEE" ? 24 : 0;
    const minDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    return minDate.toISOString().split("T")[0];
  };

  const resetForm = () => {
    setDate("");
    setStartSlotId("");
    setEndSlotId("");
    setRoomId("");
    setRoomType(isSecretary ? "MULTI_PURPOSE" : "LECTURE");
    setPurpose("");
    setManagerName("");
    setManagerTitle("");
    setManagerMobile("");
    setReqLaptop(false);
    setReqVideoConf(false);
    setReqMicQty(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !startSlotId || !endSlotId || !roomId) {
      toast.error("Please fill all required fields");
      return;
    }

    if (startSlotId === endSlotId) {
      toast.error("Start and end time slots must be different");
      return;
    }

    if (roomType === "MULTI_PURPOSE" && (!purpose.trim() || !managerName.trim() || !managerTitle.trim() || !managerMobile.trim())) {
      toast.error("All event manager details are required for multi-purpose bookings");
      return;
    }

    setSubmitting(true);

    // Server-side timezone-strict lead time validation
    const timeValidation = await validateBookingLeadTime(role, date);
    if (!timeValidation.valid) {
      toast.error(timeValidation.message ?? "Selected date does not meet the required advance notice period.");
      setSubmitting(false);
      return;
    }

    // Conflict check
    const conflictCheck = await checkBookingConflict(roomId, date, startSlotId, endSlotId);
    if (conflictCheck.conflict) {
      toast.error(conflictCheck.message ?? "This room is already booked during the selected time.");
      setSubmitting(false);
      return;
    }

    const bookingType = roomType === "LECTURE" ? "EXCEPTIONAL" : "MULTI_PURPOSE";

    const payload: Record<string, unknown> = {
      user_id: userId,
      room_id: roomId,
      booking_date: date,
      start_slot_id: startSlotId,
      end_slot_id: endSlotId,
      status: "PENDING",
      type: bookingType,
    };

    if (roomType === "MULTI_PURPOSE") {
      payload.purpose = purpose.trim();
      payload.manager_name = managerName.trim();
      payload.manager_title = managerTitle.trim();
      payload.manager_mobile = managerMobile.trim();
      payload.req_laptop = reqLaptop;
      payload.req_video_conf = reqVideoConf;
      payload.req_mic_qty = reqMicQty;
    }

    const { error } = await supabase.from("bookings").insert(payload);

    if (error) {
      toast.error(error.message || "Failed to submit booking request");
    } else {
      toast.success("Booking request submitted successfully! The admin will review it shortly.");
      resetForm();
      await fetchHistory();
    }

    setSubmitting(false);
  };

  const STATUS_STYLE: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    ADMIN_APPROVED: "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
  };

  const STATUS_LABEL: Record<string, string> = {
    APPROVED: "Approved",
    ADMIN_APPROVED: "Awaiting Branch Manager",
    REJECTED: "Rejected",
    PENDING: "Pending Review",
  };

  const filteredRooms = rooms.filter((r) => r.type === roomType);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex justify-center py-12">
        <Loader2 className="animate-spin text-secondary h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Calendar (only for overridden employees) */}
      {canViewAvailability && <WeeklyCalendar />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Booking Form */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 h-fit">
          <h2 className="text-2xl font-bold text-primary dark:text-white mb-2">New Booking Request</h2>
          {isSecretary && (
            <div className="mb-6 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                As a Secretary, you may only book <strong>Multi-Purpose</strong> rooms with at least <strong>48 hours</strong> advance notice.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Room Type (hidden for secretaries — always MULTI_PURPOSE) */}
            {!isSecretary && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Room Type
                </label>
                <select
                  value={roomType}
                  onChange={(e) => { setRoomType(e.target.value as "LECTURE" | "MULTI_PURPOSE"); setRoomId(""); }}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                >
                  <option value="LECTURE">Lecture Room (Exceptional)</option>
                  <option value="MULTI_PURPOSE">Multi-Purpose Room</option>
                </select>
              </div>
            )}

            {/* Specific Room */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {isSecretary ? "Multi-Purpose Room" : "Specific Room"}
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                required
              >
                <option value="">Select a room</option>
                {filteredRooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {filteredRooms.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No active rooms of this type. Contact admin.</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={date}
                min={getMinDate()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                required
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Minimum {role === "SECRETARY" ? "48" : "24"} hours advance notice required (enforced server-side using Cairo timezone)
              </p>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Start Time
              </label>
              <select
                value={startSlotId}
                onChange={(e) => setStartSlotId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                required
              >
                <option value="">Select start time</option>
                {timeSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.start_time.substring(0, 5)}
                  </option>
                ))}
              </select>
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                End Time
              </label>
              <select
                value={endSlotId}
                onChange={(e) => setEndSlotId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                required
              >
                <option value="">Select end time</option>
                {timeSlots
                  .filter((s) => !startSlotId || s.start_time > (timeSlots.find((x) => x.id === startSlotId)?.start_time ?? ""))
                  .map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.end_time.substring(0, 5)}
                    </option>
                  ))}
              </select>
            </div>

            {/* Multi-Purpose Section */}
            {roomType === "MULTI_PURPOSE" && (
              <div className="pt-6 border-t border-gray-200 dark:border-slate-700 space-y-5">
                <h3 className="text-lg font-semibold text-primary dark:text-white">Event Manager Details &amp; Tech Requirements</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Purpose / Event Type <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                    rows={3}
                    required
                    placeholder="e.g. Faculty workshop on curriculum development"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Manager Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                    required
                    placeholder="Full name of event manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={managerTitle}
                    onChange={(e) => setManagerTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                    required
                    placeholder="e.g. Associate Professor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={managerMobile}
                    onChange={(e) => setManagerMobile(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                    required
                    placeholder="e.g. 01012345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Mobile Microphones (quantity)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reqMicQty}
                    onChange={(e) => setReqMicQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary focus:outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqLaptop}
                      onChange={(e) => setReqLaptop(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Requires Laptop</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqVideoConf}
                      onChange={(e) => setReqVideoConf(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Requires Video Conference</span>
                  </label>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-secondary hover:bg-yellow-500 text-primary font-bold rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-70"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>

        {/* Request History */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">My Booking Requests</h2>
          {historyBookings.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No booking requests yet. Submit your first request using the form.</p>
          ) : (
            <div className="space-y-4">
              {historyBookings.map((b) => {
                const roomName = Array.isArray(b.rooms) ? (b.rooms as { name: string }[])[0]?.name : (b.rooms as { name: string } | null)?.name;
                return (
                  <div key={b.id} className="p-4 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">{roomName ?? "Unknown Room"}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {b.booking_date} &bull; {b.type === "MULTI_PURPOSE" ? "Multi-Purpose" : "Exceptional Lecture"}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded flex-shrink-0 ${STATUS_STYLE[b.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </div>

                    {b.status === "REJECTED" && (b.rejection_reason || b.suggested_alternative) && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-md text-xs space-y-1.5">
                        {b.rejection_reason && (
                          <p className="text-red-800 dark:text-red-400">
                            <strong className="font-semibold">Reason:</strong> {b.rejection_reason}
                          </p>
                        )}
                        {b.suggested_alternative && (
                          <p className="text-amber-800 dark:text-amber-400">
                            <strong className="font-semibold">Suggested Alternative:</strong> {b.suggested_alternative}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
