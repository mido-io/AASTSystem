"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";

type TimeSlot = { id: string; start_time: string; end_time: string };
type Booking = {
  id: string;
  booking_date: string;
  type: string;
  room_id: string;
  start_slot_id: string;
  end_slot_id: string;
  rooms: { name: string };
  users?: { full_name: string };
};

export default function CalendarPage() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View State
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [currentDate, setCurrentDate] = useState(new Date());

  const supabase = createClient();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    
    // Get boundaries based on viewMode
    let startStr = "";
    let endStr = "";

    if (viewMode === 'WEEK') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      startStr = startOfWeek.toISOString().split("T")[0];
      endStr = endOfWeek.toISOString().split("T")[0];
    } else {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      startOfMonth.setDate(startOfMonth.getDate() - startOfMonth.getDay()); // Pad start
      endOfMonth.setDate(endOfMonth.getDate() + (6 - endOfMonth.getDay())); // Pad end
      startStr = startOfMonth.toISOString().split("T")[0];
      endStr = endOfMonth.toISOString().split("T")[0];
    }

    const [slotsRes, bookingsRes] = await Promise.all([
      supabase.from("time_slots").select("id, start_time, end_time").eq("is_active", true).order("start_time"),
      supabase.from("bookings").select(`
        id, booking_date, type, room_id, start_slot_id, end_slot_id,
        rooms(name), users(full_name)
      `)
      .or('status.eq.APPROVED,type.eq.FIXED')
      .gte("booking_date", startStr)
      .lte("booking_date", endStr)
    ]);

    if (slotsRes.data) setSlots(slotsRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data as unknown as Booking[]);
    
    if (slotsRes.error || bookingsRes.error) {
      toast.error("Failed to load calendar data");
    }
    setLoading(false);
  };

  const traverseDate = (direction: 'PREV' | 'NEXT') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'WEEK') {
      newDate.setDate(currentDate.getDate() + (direction === 'NEXT' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'NEXT' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Helper to determine cell color based on PRD
  const getColorStyle = (type: string) => {
    if (type === 'FIXED') return 'bg-blue-100 text-blue-800 border-blue-300 shadow-blue-50';
    if (type === 'MULTI_PURPOSE') return 'bg-green-100 text-green-800 border-green-300 shadow-green-50';
    if (type === 'EXCEPTIONAL') return 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-yellow-50';
    // Fallback for STANDARD / LECTURE
    return 'bg-purple-50 text-purple-800 border-purple-200 shadow-purple-50';
  };

  const getBookingsForCell = (dateStr: string, slotId?: string) => {
    // If slotId is omitted, return ALL bookings for that day (used in Month view)
    return bookings.filter(b => 
        b.booking_date === dateStr && 
        (!slotId || b.start_slot_id === slotId || b.end_slot_id === slotId)
    );
  };

  // Month grid generator
  const getMonthGrid = () => {
    const grid = [];
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Rewind to Sunday
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // Fast forward to Saturday
    
    let d = new Date(startDate);
    while (d <= endDate) {
      grid.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return grid;
  };
  const monthGrid = getMonthGrid();

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Content */}
        <div className="flex justify-between items-center bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Advanced Grid</h1>
              <p className="text-slate-500 text-sm">Reviewing System Load</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('WEEK')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'WEEK' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Weekly</button>
            <button onClick={() => setViewMode('MONTH')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'MONTH' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Monthly</button>
          </div>

          <div className="flex items-center gap-4 border border-gray-200 rounded-lg p-1 bg-gray-50">
            <button onClick={() => traverseDate('PREV')} className="p-2 hover:bg-white rounded-md transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
            <span className="font-semibold text-slate-800 px-2 text-sm w-48 text-center">
              {viewMode === 'WEEK' ? 
                `${weekDays[0].toLocaleDateString('en-GB')}  —  ${weekDays[6].toLocaleDateString('en-GB')}` :
                currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              }
            </span>
            <button onClick={() => traverseDate('NEXT')} className="p-2 hover:bg-white rounded-md transition-colors"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 items-center flex-wrap px-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-600"><span className="w-3 h-3 rounded-full bg-blue-400"></span> Fixed</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-600"><span className="w-3 h-3 rounded-full bg-green-400"></span> Multi-Purpose</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-600"><span className="w-3 h-3 rounded-full bg-yellow-400"></span> Exceptional</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-600"><span className="w-3 h-3 rounded-full bg-purple-300"></span> Lecture</span>
        </div>

        {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-secondary" /></div>
        ) : viewMode === 'WEEK' ? (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-x-auto relative">
                <table className="w-full min-w-[1000px] border-collapse bg-white text-sm">
                    <thead>
                        <tr>
                            <th className="p-4 border-b border-r border-slate-200 bg-slate-50 w-24 sticky left-0 z-10 text-center">Time</th>
                            {weekDays.map((date, idx) => (
                                <th key={idx} className="p-4 border-b border-slate-200 bg-slate-50 min-w-[200px] text-center">
                                    <div className="font-bold text-slate-800 uppercase tracking-wider">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                    <div className="text-slate-500 font-medium text-xs mt-1">{date.toLocaleDateString('en-GB')}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {slots.map(slot => (
                            <tr key={slot.id} className="group">
                                <td className="p-3 border-b border-r border-slate-200 text-center font-semibold text-slate-600 bg-slate-50 sticky left-0 z-10 group-hover:bg-slate-100 transition-colors">
                                    {slot.start_time.substring(0, 5)}
                                    <div className="text-[10px] text-slate-400">- {slot.end_time.substring(0, 5)}</div>
                                </td>
                                
                                {weekDays.map((date, idx) => {
                                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                    const cellBookings = getBookingsForCell(dateStr, slot.id);

                                    return (
                                        <td key={idx} className="p-2 border-b border-slate-200 align-top hover:bg-slate-50/50 transition-colors">
                                            <div className="flex flex-col gap-2 min-h-[80px]">
                                                {cellBookings.length === 0 ? (
                                                    <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 text-xs font-medium">Free</div>
                                                ) : (
                                                    cellBookings.map(booking => (
                                                        <div key={booking.id} className={`p-2 border rounded-md shadow-sm ${getColorStyle(booking.type)} flex flex-col`}>
                                                            <span className="font-bold text-xs truncate" title={booking.rooms?.name}>{booking.rooms?.name || 'Unknown Room'}</span>
                                                            <span className="text-[10px] truncate opacity-90 mt-1" title={booking.users?.full_name}>{booking.users?.full_name || 'System Generated'}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-4 text-center font-bold text-slate-700 border-r last:border-0 border-slate-200">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
                    {monthGrid.map((date, idx) => {
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        const cellBookings = getBookingsForCell(dateStr);
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                        
                        return (
                            <div key={idx} className={`min-h-[140px] p-2 border-r border-b border-slate-100 transition-colors ${!isCurrentMonth ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50/50'}`}>
                                <div className={`text-right font-semibold text-sm mb-2 ${!isCurrentMonth ? 'text-slate-400' : 'text-slate-700'}`}>
                                    {date.getDate()}
                                </div>
                                <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                                    {cellBookings.map(booking => (
                                        <div key={booking.id} className={`p-1 px-2 border rounded shadow-sm ${getColorStyle(booking.type)} flex flex-col`}>
                                            <span className="font-bold text-[10px] truncate" title={booking.rooms?.name}>{booking.rooms?.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
