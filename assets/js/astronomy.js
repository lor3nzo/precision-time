const PI = Math.PI;
const RAD = PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = 23.4397 * RAD;
const SUNRISE_ANGLE = -0.833 * RAD;

function toJulian(date) { return date.valueOf() / DAY_MS - 0.5 + J1970; }
function fromJulian(j) { return new Date((j + 0.5 - J1970) * DAY_MS); }
function toDays(date) { return toJulian(date) - J2000; }
function solarMeanAnomaly(d) { return RAD * (357.5291 + 0.98560028 * d); }
function eclipticLongitude(m) {
  const c = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  const p = RAD * 102.9372;
  return m + c + p + PI;
}
function declination(l) { return Math.asin(Math.sin(l) * Math.sin(OBLIQUITY)); }
function julianCycle(d, lw) { return Math.round(d - 0.0009 - lw / (2 * PI)); }
function approxTransit(ht, lw, n) { return 0.0009 + (ht + lw) / (2 * PI) + n; }
function solarTransitJ(ds, m, l) { return J2000 + ds + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l); }
function hourAngle(h, phi, dec) {
  const value = (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (value < -1 || value > 1) return null;
  return Math.acos(value);
}

export function calculateSunTimes(date, latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  const sampleDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
  const lw = -longitude * RAD;
  const phi = latitude * RAD;
  const d = toDays(sampleDate);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const m = solarMeanAnomaly(ds);
  const l = eclipticLongitude(m);
  const dec = declination(l);
  const jNoon = solarTransitJ(ds, m, l);
  const w = hourAngle(SUNRISE_ANGLE, phi, dec);
  if (w === null) return { sunrise: null, sunset: null, dayLengthMs: null };

  const a = approxTransit(w, lw, n);
  const jSet = solarTransitJ(a, m, l);
  const jRise = jNoon - (jSet - jNoon);
  const sunrise = fromJulian(jRise);
  const sunset = fromJulian(jSet);

  return {
    sunrise,
    sunset,
    dayLengthMs: sunset.getTime() - sunrise.getTime()
  };
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}
