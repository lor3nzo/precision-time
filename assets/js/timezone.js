export function getSystemTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatTime(date, timeZone, { hour12 = true, showSeconds = true } = {}) {
  const options = {
    timeZone,
    hour: '2-digit',
    minute: '2-digit'
  };
  if (hour12) options.hour12 = true;
  else options.hourCycle = 'h23';
  if (showSeconds) options.second = '2-digit';
  return new Intl.DateTimeFormat('en-US', options).formatToParts(date);
}

export function getTimeParts(date, timeZone, options = {}) {
  const parts = formatTime(date, timeZone, options);
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    time: [map.hour, map.minute, options.showSeconds === false ? null : map.second].filter(Boolean).join(':'),
    dayPeriod: map.dayPeriod || ''
  };
}

export function formatDate(date, timeZone, short = false) {
  return new Intl.DateTimeFormat('en-US', short
    ? { timeZone, weekday: 'short', month: 'short', day: 'numeric' }
    : { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  ).format(date);
}

export function formatZoneName(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short'
  }).formatToParts(date);
  return parts.find(part => part.type === 'timeZoneName')?.value || timeZone;
}

export function getUtcOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second)
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

export function formatUtcOffset(minutes) {
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function getCalendarDateInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    key: `${map.year}-${map.month}-${map.day}`,
    asUtcDate: new Date(Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), 12))
  };
}
