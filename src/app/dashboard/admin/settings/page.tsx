"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Edit2, Check, X, Power, PowerOff, Building, Clock, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";
import { checkBookingConflict } from "@/app/actions/bookingActions";

type Room = { id: string; name: string; type: string; is_active: boolean };
type TimeSlot = { id: string; start_time: string; end_time: string; is_active: boolean };

export default function SettingsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Room Form State
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState<"LECTURE" | "MULTI_PURPOSE">("LECTURE");

  // Slot Form State
  const [isSlotFormOpen, setIsSlotFormOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");

  // Semester Schedule State
  const [semesterRoomId, setSemesterRoomId] = useState("");
  const [semesterStartDate, setSemesterStartDate] = useState("");
  const [semesterStartSlot, setSemesterStartSlot] = useState("");
  const [semesterEndSlot, setSemesterEndSlot] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [roomsRes, slotsRes] = await Promise.all([
      supabase.from("rooms").select("*").order("name"),
      supabase.from("time_slots").select("*").order("start_time")
    ]);

    if (roomsRes.data) setRooms(roomsRes.data);
    if (slotsRes.data) setSlots(slotsRes.data);
    
    if (roomsRes.error || slotsRes.error) {
      toast.error("Error fetching dynamic settings");
    }
    setLoading(false);
  };

  // --- Rooms Logic ---
  const saveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return toast.error("Room name required");

    const payload = { name: roomName.trim(), type: roomType };

    if (editingRoomId) {
      const { error } = await supabase.from("rooms").update(payload).eq("id", editingRoomId);
      if (error) return toast.error(error.message);
      toast.success("Room updated!");
    } else {
      const { error } = await supabase.from("rooms").insert({ ...payload, is_active: true });
      if (error) return toast.error(error.message);
      toast.success("Room created!");
    }

    setRoomName("");
    setRoomType("LECTURE");
    setEditingRoomId(null);
    setIsRoomFormOpen(false);
    fetchData(); // Refresh immediately
  };

  const toggleRoomStatus = async (room: Room) => {
    const { error } = await supabase.from("rooms").update({ is_active: !room.is_active }).eq("id", room.id);
    if (error) return toast.error(error.message);
    toast.success(room.is_active ? "Room disabled" : "Room enabled");
    fetchData();
  };

  // --- Slots Logic ---
  const saveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotStart || !slotEnd) return toast.error("Start and end time required");
    
    // Ensure properly formatted times for DB (e.g., 08:30:00)
    let formattedStart = slotStart;
    let formattedEnd = slotEnd;
    if (formattedStart.length === 5) formattedStart += ":00";
    if (formattedEnd.length === 5) formattedEnd += ":00";

    const payload = { start_time: formattedStart, end_time: formattedEnd };

    if (editingSlotId) {
      const { error } = await supabase.from("time_slots").update(payload).eq("id", editingSlotId);
      if (error) return toast.error(error.message);
      toast.success("Time slot updated!");
    } else {
      const { error } = await supabase.from("time_slots").insert({ ...payload, is_active: true });
      if (error) return toast.error(error.message);
      toast.success("Time slot created!");
    }

    setSlotStart("");
    setSlotEnd("");
    setEditingSlotId(null);
    setIsSlotFormOpen(false);
    fetchData(); // Refresh immediately
  };

  const toggleSlotStatus = async (slot: TimeSlot) => {
    const { error } = await supabase.from("time_slots").update({ is_active: !slot.is_active }).eq("id", slot.id);
    if (error) return toast.error(error.message);
    toast.success(slot.is_active ? "Slot disabled" : "Slot enabled");
    fetchData();
  };

  // --- Semester Schedule Logic ---
  const generateSemesterSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterRoomId || !semesterStartDate || !semesterStartSlot || !semesterEndSlot) {
      return toast.error("All fields are required");
    }
    
    setIsGenerating(true);
    
    // Generate dates: 16 weeks precisely (avoiding timezone shift bugs)
    const dates = [];
    const [year, month, day] = semesterStartDate.split("-").map(Number);
    for (let i = 0; i < 16; i++) {
      const d = new Date(year, month - 1, day + (i * 7));
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(dateString);
    }
    
    // Validate conflicts for ALL 16 dates to ensure transaction integrity
    for (const date of dates) {
      const conflictCheck = await checkBookingConflict(semesterRoomId, date, semesterStartSlot, semesterEndSlot);
      if (conflictCheck.conflict) {
        toast.error(`Conflict detected on ${date}! Schedule generation aborted.`);
        setIsGenerating(false);
        return;
      }
    }
    
    const { data: userData } = await supabase.auth.getUser();

    // Prepare atomic payload
    const payload = dates.map(date => ({
      room_id: semesterRoomId,
      booking_date: date,
      start_slot_id: semesterStartSlot,
      end_slot_id: semesterEndSlot,
      status: "APPROVED",
      type: "FIXED",
      user_id: userData.user?.id
    }));
    
    // Bulk insert executes in a single PostgreSQL atomic transaction implicitly
    const { error } = await supabase.from("bookings").insert(payload);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Successfully generated 16-week Fixed Schedule!");
      setSemesterRoomId("");
      setSemesterStartDate("");
      setSemesterStartSlot("");
      setSemesterEndSlot("");
    }
    setIsGenerating(false);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center py-20">
        <Loader2 className="animate-spin text-secondary h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex justify-between items-center bg-primary text-white p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-3xl font-bold">Dynamic Settings</h1>
            <p className="text-blue-100 mt-2">Manage infrastructure elements dynamically (Rooms & Time Slots) without DB access.</p>
          </div>
        </div>

        {/* --- ROOMS SECTION --- */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building className="text-secondary" /> Rooms Registry
            </h2>
            <button
              onClick={() => {
                setIsRoomFormOpen(!isRoomFormOpen);
                setEditingRoomId(null);
                setRoomName("");
                setRoomType("LECTURE");
              }}
              className="bg-primary hover:bg-blue-900 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
            >
              {isRoomFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isRoomFormOpen ? "Cancel" : "Add Room"}
            </button>
          </div>

          {isRoomFormOpen && (
            <form onSubmit={saveRoom} className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Room Name / Label</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none"
                  placeholder="e.g. Conference Hall A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Room Type</label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value as "LECTURE" | "MULTI_PURPOSE")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none"
                >
                  <option value="LECTURE">Lecture</option>
                  <option value="MULTI_PURPOSE">Multi-Purpose</option>
                </select>
              </div>
              <div>
                <button type="submit" className="w-full bg-secondary hover:bg-yellow-500 text-primary font-bold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Save Data
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-xs tracking-wider uppercase">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Room Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rooms.map((room) => (
                  <tr key={room.id} className={!room.is_active ? "opacity-60 bg-gray-50" : ""}>
                    <td className="px-6 py-4">
                      {room.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold">
                          <Power className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold">
                          <PowerOff className="w-3 h-3" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{room.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{room.type}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 text-sm">
                        <button
                          onClick={() => {
                            setEditingRoomId(room.id);
                            setRoomName(room.name);
                            setRoomType(room.type as any);
                            setIsRoomFormOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleRoomStatus(room)}
                          className={`p-2 rounded-lg transition-colors ${room.is_active ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}
                          title="Toggle State"
                        >
                          {room.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- TIME SLOTS SECTION --- */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-secondary" /> Time Slots Schema
            </h2>
            <button
              onClick={() => {
                setIsSlotFormOpen(!isSlotFormOpen);
                setEditingSlotId(null);
                setSlotStart("");
                setSlotEnd("");
              }}
              className="bg-primary hover:bg-blue-900 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
            >
              {isSlotFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isSlotFormOpen ? "Cancel" : "Add Slot"}
            </button>
          </div>

          {isSlotFormOpen && (
            <form onSubmit={saveSlot} className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none"
                  required
                />
              </div>
              <div>
                <button type="submit" className="w-full bg-secondary hover:bg-yellow-500 text-primary font-bold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Save Data
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-xs tracking-wider uppercase">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Start Time</th>
                  <th className="px-6 py-4">End Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {slots.map((slot) => (
                  <tr key={slot.id} className={!slot.is_active ? "opacity-60 bg-gray-50" : ""}>
                    <td className="px-6 py-4">
                      {slot.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold">
                          <Power className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold">
                          <PowerOff className="w-3 h-3" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{slot.start_time.substring(0, 5)}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{slot.end_time.substring(0, 5)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 text-sm">
                        <button
                          onClick={() => {
                            setEditingSlotId(slot.id);
                            setSlotStart(slot.start_time.substring(0, 5));
                            setSlotEnd(slot.end_time.substring(0, 5));
                            setIsSlotFormOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleSlotStatus(slot)}
                          className={`p-2 rounded-lg transition-colors ${slot.is_active ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}
                          title="Toggle State"
                        >
                          {slot.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- SEMESTER SCHEDULE SECTION --- */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-secondary" /> Fixed Academic Schedules
            </h2>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl mb-6">
            <p className="text-sm text-blue-800 font-medium mb-4">
              Use this tool to atomically generate a 16-week 'FIXED' semester schedule. If any single week conflicts with an existing verified booking, the entire transaction will be safely aborted.
            </p>
            
            <form onSubmit={generateSemesterSchedule} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Room</label>
                <select
                  value={semesterRoomId}
                  onChange={(e) => setSemesterRoomId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none bg-white"
                  required
                >
                  <option value="">Select Room</option>
                  {rooms.filter(r => r.is_active).map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date (Week 1)</label>
                <input
                  type="date"
                  value={semesterStartDate}
                  onChange={(e) => setSemesterStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                <select
                  value={semesterStartSlot}
                  onChange={(e) => setSemesterStartSlot(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none bg-white"
                  required
                >
                  <option value="">Start Slot</option>
                  {slots.filter(s => s.is_active).map(s => (
                    <option key={s.id} value={s.id}>{s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                <select
                  value={semesterEndSlot}
                  onChange={(e) => setSemesterEndSlot(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none bg-white"
                  required
                >
                  <option value="">End Slot</option>
                  {slots.filter(s => s.is_active).map(s => (
                    <option key={s.id} value={s.id}>{s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}</option>
                  ))}
                </select>
              </div>

              <div>
                <button 
                  type="submit" 
                  disabled={isGenerating}
                  className="w-full bg-primary hover:bg-blue-900 text-white font-bold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                  Generate 16 Weeks
                </button>
              </div>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}
