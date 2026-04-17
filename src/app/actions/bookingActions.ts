"use server";

import { createClient } from "@/lib/supabase/server";

export async function checkBookingConflict(
  roomId: string,
  bookingDate: string,
  startSlotId: string,
  endSlotId: string,
  excludeBookingId?: string
) {
  const supabase = await createClient();

  // 1. Fetch exact start and end times for requested slots
  const { data: slots, error: slotsError } = await supabase
    .from("time_slots")
    .select("id, start_time, end_time")
    .in("id", [startSlotId, endSlotId]);

  if (slotsError || !slots || slots.length === 0) {
    return { conflict: false, error: "Invalid time slots." };
  }

  const startSlot = slots.find((s) => s.id === startSlotId);
  const endSlot = slots.find((s) => s.id === endSlotId);
  
  if (!startSlot || !endSlot) {
    return { conflict: false, error: "Time slots not found." };
  }

  // 2. Fetch existing bookings that are APPROVED or FIXED
  let query = supabase
    .from("bookings")
    .select(`
      id,
      start_slot:start_slot_id(start_time),
      end_slot:end_slot_id(end_time)
    `)
    .eq("room_id", roomId)
    .eq("booking_date", bookingDate)
    .or("status.eq.APPROVED,status.eq.ADMIN_APPROVED,type.eq.FIXED");

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data: existingBookings, error: bookingsError } = await query;

  if (bookingsError) {
    return { conflict: false, error: "Failed to verify database conflicts." };
  }

  // 3. Evaluate overlap in time
  for (const booking of existingBookings || []) {
    const existingStart = (Array.isArray(booking.start_slot) ? (booking.start_slot[0] as any)?.start_time : (booking.start_slot as any)?.start_time) as string | undefined;
    const existingEnd = (Array.isArray(booking.end_slot) ? (booking.end_slot[0] as any)?.end_time : (booking.end_slot as any)?.end_time) as string | undefined;

    if (!existingStart || !existingEnd) continue;

    // A overlaps B if (StartA < EndB) and (EndA > StartB)
    if (startSlot.start_time < existingEnd && endSlot.end_time > existingStart) {
      return { 
        conflict: true, 
        message: "Conflict detected: The selected room is already booked during this time."
      };
    }
  }

  return { conflict: false };
}

export async function validateBookingLeadTime(role: string, requestedDateStr: string) {
  // Enforce server-side timezone evaluation mapped STRICTLY to Africa/Cairo (EET)
  const now = new Date();
  
  // Create an Intl.DateTimeFormat to force Cairo extraction
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // Extract precise Cairo units
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  const cairoDate = new Date(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second')
  );

  // Buffer constraint maps
  let minDateObj = new Date(cairoDate.getTime());
  if (role === "SECRETARY") {
    minDateObj.setHours(cairoDate.getHours() + 48);
  } else if (role === "EMPLOYEE") {
    minDateObj.setHours(cairoDate.getHours() + 24);
  }

  // Generate strictly formatted minDateString for direct array comparison
  const buildYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const minDateStr = buildYMD(minDateObj);

  if (requestedDateStr < minDateStr) {
    return { 
      valid: false, 
      message: `Invalid timeframe. Your operational bounds strictly restrict scheduling prior to ${minDateStr} due to the active organizational buffer.` 
    };
  }

  return { valid: true };
}
