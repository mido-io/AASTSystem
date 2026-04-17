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

export default function WeeklyCalendar() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  const supabase = createClient();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startStr = startOfWeek.toISOString().split("T")[0];
    const endStr = endOfWeek.toISOString().split("T")[0];

    const [slotsRes, bookingsRes] = await Promise.all([
      supabase.from("time_slots").select("id, start_time, end_time").eq("is_active", true).order("start_time"),
      supabase.from("bookings").select(`
        id, booking_date, type, room_id, start_slot_id, end_slot_id,
        rooms(name), users(full_name)
      `)
      .or('status.eq.APPROVED,status.eq.ADMIN_APPROVED,type.eq.FIXED')
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
    newDate.setDate(currentDate.getDate() + (direction === 'NEXT' ? 7 : -7));
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
    if (type === 'FIXED') return 'bg-blue-100 text-blue-800 border-blue-300 shadow-blue-50 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-200';
    if (type === 'MULTI_PURPOSE') return 'bg-green-100 text-green-800 border-green-300 shadow-green-50 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-200';
    if (type === 'EXCEPTIONAL') return 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-yellow-50 dark:bg-yellow-900/30 dark:border-yellow-800/50 dark:text-yellow-200';
    // Fallback for STANDARD / LECTURE
    return 'bg-purple-50 text-purple-800 border-purple-200 shadow-purple-50 dark:bg-purple-900/30 dark:border-purple-800/50 dark:text-purple-200';
  };

  const getBookingsForCell = (dateStr: string, slotId?: string) => {
    return bookings.filter(b => 
        b.booking_date === dateStr && 
        (!slotId || b.start_slot_id === slotId || b.end_slot_id === slotId)
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 w-full mb-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <CalendarIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">System Calendar</h2>
            <p className="text-slate-500 text-sm">Read-only availability view</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 border border-gray-200 dark:border-slate-600 rounded-lg p-1 bg-gray-50 dark:bg-slate-700">
          <button onClick={() => traverseDate('PREV')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-200" /></button>
          <span className="font-semibold text-slate-800 dark:text-slate-100 px-2 text-sm w-48 text-center">
            {weekDays[0].toLocaleDateString('en-GB')} &mdash; {weekDays[6].toLocaleDateString('en-GB')}
          </span>
          <button onClick={() => traverseDate('NEXT')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors"><ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-200" /></button>
        </div>
      </div>

      {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-secondary" /></div>
      ) : (
          <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-x-auto relative">
              <table className="w-full min-w-[1000px] border-collapse text-sm">
                  <thead>
                      <tr>
                          <th className="p-4 border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-24 sticky left-0 z-10 text-center dark:text-slate-200">Time</th>
                          {weekDays.map((date, idx) => (
                              <th key={idx} className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-w-[200px] text-center dark:text-slate-200">
                                  <div className="font-bold uppercase tracking-wider">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                  <div className="text-slate-500 font-medium text-xs mt-1">{date.toLocaleDateString('en-GB')}</div>
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {slots.map(slot => (
                          <tr key={slot.id} className="group">
                              <td className="p-3 border-b border-r border-slate-200 dark:border-slate-700 text-center font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 sticky left-0 z-10 group-hover:bg-slate-100 dark:group-hover:bg-slate-700 transition-colors">
                                  {slot.start_time.substring(0, 5)}
                                  <div className="text-[10px] text-slate-400">- {slot.end_time.substring(0, 5)}</div>
                              </td>
                              
                              {weekDays.map((date, idx) => {
                                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                  const cellBookings = getBookingsForCell(dateStr, slot.id);

                                  return (
                                      <td key={idx} className="p-2 border-b border-slate-200 dark:border-slate-700 align-top hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                          <div className="flex flex-col gap-2 min-h-[80px]">
                                              {cellBookings.length === 0 ? (
                                                  <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 dark:text-slate-600 text-xs font-medium">Free</div>
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
      )}
    </div>
  );
}
