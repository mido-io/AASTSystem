"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Search, Building } from "lucide-react";
import { toast } from "react-hot-toast";

type TimeSlot = { id: string; start_time: string; end_time: string };
type Room = { id: string; name: string; type: string };

export default function EmptyRoomSearch() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  
  // Search Form State
  const [searchDate, setSearchDate] = useState("");
  const [searchSlotId, setSearchSlotId] = useState("");
  const [searchType, setSearchType] = useState<"LECTURE" | "MULTI_PURPOSE" | "ALL">("ALL");
  
  const [availableRooms, setAvailableRooms] = useState<Room[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchSlots();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSlots = async () => {
    const { data } = await supabase.from("time_slots").select("*").eq("is_active", true).order("start_time");
    if (data) setSlots(data as TimeSlot[]);
  };

  const executeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDate || !searchSlotId) {
      return toast.error("Date and Time Slot are required.");
    }
    
    setIsSearching(true);
    setAvailableRooms(null);

    // 1. Fetch all ACTIVE rooms matching the desired type
    let roomsQuery = supabase.from("rooms").select("*").eq("is_active", true);
    if (searchType !== "ALL") {
      roomsQuery = roomsQuery.eq("type", searchType);
    }
    const { data: allRooms, error: roomError } = await roomsQuery;

    if (roomError) {
      toast.error("Error fetching rooms");
      setIsSearching(false);
      return;
    }

    // 2. Fetch all CONFIRMED / FIXED bookings during that exact timeframe
    const { data: overlappingBookings, error: bookingError } = await supabase
      .from("bookings")
      .select("room_id")
      .eq("booking_date", searchDate)
      .or(`start_slot_id.eq.${searchSlotId},end_slot_id.eq.${searchSlotId}`)
      .or('status.eq.APPROVED,type.eq.FIXED');

    if (bookingError) {
      toast.error("Error evaluating overlaps");
      setIsSearching(false);
      return;
    }

    // 3. Filter rooms: exclude any room_id found in overlappingBookings
    const bookedRoomIds = new Set(overlappingBookings.map(b => b.room_id));
    const emptyRooms = (allRooms as Room[]).filter(room => !bookedRoomIds.has(room.id));

    setAvailableRooms(emptyRooms);
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Empty Room Query Engine</h1>
            <p className="text-slate-500 text-sm">Instantly detect spatial availability without calendar scanning.</p>
          </div>
        </div>

        {/* Search Matrix */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={executeSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Specific Date</label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none bg-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Time Slot</label>
              <select
                value={searchSlotId}
                onChange={(e) => setSearchSlotId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none bg-white"
                required
              >
                <option value="">Select Slot...</option>
                {slots.map(s => (
                  <option key={s.id} value={s.id}>{s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Room Type</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:outline-none bg-white"
              >
                <option value="ALL">Any Type</option>
                <option value="LECTURE">Lecture</option>
                <option value="MULTI_PURPOSE">Multi-Purpose</option>
              </select>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={isSearching}
                className="w-full bg-primary hover:bg-blue-900 text-white font-bold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Scan DB
              </button>
            </div>
          </form>
        </div>

        {/* Results Matrix */}
        {availableRooms !== null && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Spatial Availability</h3>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                {availableRooms.length} Found
              </span>
            </div>
            
            <div className="p-6">
              {availableRooms.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <p className="text-lg font-medium">Critical Capacity Reached</p>
                  <p className="text-sm mt-1">Zero unassigned rooms observed for this precise timeframe and configuration.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableRooms.map(room => (
                    <div key={room.id} className="border border-slate-200 p-4 rounded-xl flex items-center gap-4 hover:border-primary transition-colors">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <Building className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 block text-lg leading-tight">{room.name}</h4>
                        <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase mt-1 inline-block">
                          {room.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
