import { TimeSlot, WorkingHoursRow } from "./types";

export const SLOT_INTERVAL = 30; // минути

/**
 * Връща днешната дата по българско време (Europe/Sofia) като "YYYY-MM-DD".
 * Работи еднакво на клиента и на сървъра — Vercel върви на UTC, затова
 * НЕ използваме new Date().getDate() директно за "днес".
 */
export function getTodaySofia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Проверка дали даден ден е работен спрямо working_hours от базата */
export function isWorkingDay(
  date: Date,
  workingHours: WorkingHoursRow[]
): boolean {
  const dayOfWeek = date.getDay();
  return workingHours.some((wh) => wh.day_of_week === dayOfWeek);
}

/**
 * Генериране на 30-минутни слотове от start_time до end_time.
 * bookedTimes е списък с часове (["10:00", "11:30"]) маркирани като заети.
 */
export function generateSlotsForDay(
  startTime: string,
  endTime: string,
  bookedTimes: string[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m < endMinutes; m += SLOT_INTERVAL) {
    const hour = Math.floor(m / 60);
    const min = m % 60;
    const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
    slots.push({
      time,
      available: !bookedTimes.includes(time),
    });
  }

  return slots;
}

/**
 * Генериране на дните за показване.
 * Започваме от УТРЕ (i = 1) — днешният ден не е достъпен за записване.
 */
export function getUpcomingDays(count: number = 14): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }

  return days;
}

/** Форматиране на дата към ISO string (YYYY-MM-DD) */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Имена на дните на български */
const DAY_NAMES_BG = ["Нед", "Пон", "Вт", "Ср", "Чет", "Пет", "Съб"];
const MONTH_NAMES_BG = [
  "яну", "фев", "мар", "апр", "май", "юни",
  "юли", "авг", "сеп", "окт", "ное", "дек",
];

export function formatDayShort(date: Date): {
  dayName: string;
  dayNum: number;
  month: string;
} {
  return {
    dayName: DAY_NAMES_BG[date.getDay()],
    dayNum: date.getDate(),
    month: MONTH_NAMES_BG[date.getMonth()],
  };
}
