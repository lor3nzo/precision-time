import assert from 'node:assert/strict';
import { analyzeSamples } from '../assets/js/accuracy.js';
import { calculateSunTimes, formatDuration } from '../assets/js/astronomy.js';
import { formatUtcOffset, getTimeParts, getUtcOffsetMinutes } from '../assets/js/timezone.js';

function minutesOf(parts) {
  let hour = Number(parts.time.split(':')[0]);
  const minute = Number(parts.time.split(':')[1]);
  if (parts.dayPeriod === 'PM' && hour !== 12) hour += 12;
  if (parts.dayPeriod === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

{
  const result = analyzeSamples([
    { rttMs: 12, offsetMs: 100 },
    { rttMs: 14, offsetMs: 102 },
    { rttMs: 16, offsetMs: 98 },
    { rttMs: 80, offsetMs: 145 },
    { rttMs: 120, offsetMs: 200 },
    { rttMs: 18, offsetMs: 101 }
  ]);
  assert.ok(result);
  assert.ok(Math.abs(result.offsetMs - 100) <= 2, `unexpected offset ${result.offsetMs}`);
  assert.equal(result.rttMs, 12);
  assert.equal(result.samples, 6);
  assert.ok(result.uncertaintyMs >= 6);
}

{
  const date = new Date(Date.UTC(2026, 9, 7, 12));
  const solar = calculateSunTimes(date, 40.7128, -74.0060);
  assert.ok(solar?.sunrise && solar?.sunset);
  const rise = getTimeParts(solar.sunrise, 'America/New_York', { hour12: true, showSeconds: false });
  const set = getTimeParts(solar.sunset, 'America/New_York', { hour12: true, showSeconds: false });
  assert.ok(Math.abs(minutesOf(rise) - 419) <= 10, `NYC sunrise out of expected range: ${rise.time} ${rise.dayPeriod}`);
  assert.ok(Math.abs(minutesOf(set) - 1109) <= 10, `NYC sunset out of expected range: ${set.time} ${set.dayPeriod}`);
  assert.equal(formatDuration(solar.dayLengthMs), '11h 31m');
}

{
  const winter = new Date('2026-01-15T12:00:00Z');
  const summer = new Date('2026-07-15T12:00:00Z');
  assert.equal(formatUtcOffset(getUtcOffsetMinutes(winter, 'America/New_York')), 'UTC-05:00');
  assert.equal(formatUtcOffset(getUtcOffsetMinutes(summer, 'America/New_York')), 'UTC-04:00');
  assert.equal(formatUtcOffset(getUtcOffsetMinutes(summer, 'Asia/Kathmandu')), 'UTC+05:45');
}

{
  const midnight = new Date('2026-10-08T00:05:00Z');
  const parts = getTimeParts(midnight, 'UTC', { hour12: false, showSeconds: false });
  assert.equal(parts.time, '00:05');
  assert.equal(parts.dayPeriod, '');
}

console.log('All logic tests passed.');
