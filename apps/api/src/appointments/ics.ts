import type { AppointmentRecord } from '../../../../packages/db/src/appointments.js';

function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n/g, '\\n');
}

function compactLocalDateTime(date: string, time: string): string {
  return `${date.replaceAll('-', '')}T${time.slice(0, 5).replace(':', '')}00`;
}

function addOneHour(date: string, time: string): { date: string; time: string } {
  const value = new Date(`${date}T${time.slice(0, 5)}:00Z`);
  value.setUTCHours(value.getUTCHours() + 1);
  return {
    date: value.toISOString().slice(0, 10),
    time: value.toISOString().slice(11, 16),
  };
}

function formatTimestamp(value: Date): string {
  return value
    .toISOString()
    .replaceAll(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function createAppointmentIcs(
  appointment: AppointmentRecord,
  timezone = process.env.BUSINESS_TIMEZONE || 'Asia/Dubai',
): string {
  const end = addOneHour(appointment.appointmentDate, appointment.appointmentTime);
  const description = [
    `Customer: ${appointment.customerName}`,
    `Contact: ${appointment.contactNumber}`,
    appointment.faultDescription,
  ].join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//Jacky's Service Portal//Appointments//EN",
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(`${appointment.appointmentReference}@jackys-service-portal`)}`,
    `DTSTAMP:${formatTimestamp(appointment.createdAt)}`,
    `DTSTART;TZID=${escapeText(timezone)}:${compactLocalDateTime(appointment.appointmentDate, appointment.appointmentTime)}`,
    `DTEND;TZID=${escapeText(timezone)}:${compactLocalDateTime(end.date, end.time)}`,
    `SUMMARY:${escapeText(`Service appointment ${appointment.appointmentReference}`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(appointment.address ?? '')}`,
    `STATUS:${appointment.status === 'Cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.join('\r\n')}\r\n`;
}
