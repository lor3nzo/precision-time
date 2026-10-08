import { measureClock } from './accuracy.js';
import { calculateSunTimes, formatDuration } from './astronomy.js';
import { getPreference, setPreference } from './storage.js';
import { initTheme } from './theme.js';
import {
  formatDate,
  formatUtcOffset,
  formatZoneName,
  getCalendarDateInZone,
  getSystemTimeZone,
  getTimeParts,
  getUtcOffsetMinutes
} from './timezone.js';

const els = {
  themeToggle: document.querySelector('#theme-toggle'),
  heroTime: document.querySelector('#hero-time'),
  heroAmPm: document.querySelector('#hero-ampm'),
  dateLine: document.querySelector('#date-line'),
  primaryLocation: document.querySelector('#primary-location'),
  timezoneLabel: document.querySelector('#timezone-label'),
  statusTitle: document.querySelector('#status-title'),
  accuracySummary: document.querySelector('#accuracy-summary'),
  remeasure: document.querySelector('#remeasure-button'),
  accuracyValue: document.querySelector('#accuracy-value'),
  accuracyDetail: document.querySelector('#accuracy-detail'),
  accuracyDot: document.querySelector('#accuracy-dot'),
  offsetValue: document.querySelector('#offset-value'),
  uncertaintyValue: document.querySelector('#uncertainty-value'),
  rttValue: document.querySelector('#rtt-value'),
  samplesValue: document.querySelector('#samples-value'),
  worldGrid: document.querySelector('#world-grid'),
  zoneName: document.querySelector('#zone-name'),
  utcOffset: document.querySelector('#utc-offset'),
  zoneAbbr: document.querySelector('#zone-abbr'),
  hourFormatToggle: document.querySelector('#hour-format-toggle'),
  secondsToggle: document.querySelector('#seconds-toggle'),
  sunrise: document.querySelector('#sunrise'),
  sunset: document.querySelector('#sunset'),
  dayLength: document.querySelector('#day-length'),
  panelSunrise: document.querySelector('#panel-sunrise'),
  panelSunset: document.querySelector('#panel-sunset'),
  panelDayLength: document.querySelector('#panel-day-length'),
  solarLocation: document.querySelector('#solar-location'),
  coordinates: document.querySelector('#coordinates'),
  searchTrigger: document.querySelector('#search-trigger'),
  searchPopover: document.querySelector('#search-popover'),
  searchClose: document.querySelector('#search-close'),
  citySearch: document.querySelector('#city-search'),
  searchResults: document.querySelector('#search-results')
};

const DEFAULT_WORLD_SLUGS = ['los-angeles', 'london', 'paris', 'beijing', 'tokyo'];
const state = {
  cities: [],
  primary: null,
  worldCities: [],
  hour12: getPreference('hour12', 'true') !== 'false',
  showSeconds: getPreference('showSeconds', 'true') !== 'false',
  trustedEpochAtSyncMs: Date.now(),
  perfAtSyncMs: performance.now(),
  synced: false,
  worldNodes: new Map(),
  lastRenderKey: '',
  lastSolarDateKey: '',
  searchMatches: [],
  searchIndex: -1
};

function trustedNow() {
  return new Date(state.trustedEpochAtSyncMs + (performance.now() - state.perfAtSyncMs));
}

function establishClock(epochMs) {
  state.trustedEpochAtSyncMs = epochMs;
  state.perfAtSyncMs = performance.now();
}

function formatMilliseconds(value, signed = false) {
  const seconds = Math.abs(value) / 1000;
  const prefix = signed ? (value >= 0 ? '+' : '−') : '';
  return `${prefix}${seconds.toFixed(seconds < 0.1 ? 3 : 2)} s`;
}

function accuracyCopy(result) {
  const abs = Math.abs(result.offsetMs);
  const tolerance = Math.max(25, result.uncertaintyMs);
  if (abs <= tolerance) {
    return {
      title: 'Your clock is synchronized.',
      short: 'Within measured tolerance',
      detail: 'The measured device-clock difference is within the uncertainty of this network test.',
      dot: 'good'
    };
  }
  if (abs < 1000) {
    return {
      title: 'Your clock is slightly off.',
      short: 'Small clock difference detected',
      detail: 'The device clock differs from the server reference, but by less than one second.',
      dot: 'warn'
    };
  }
  return {
    title: 'Your clock needs adjustment.',
    short: 'Clock difference detected',
    detail: 'The device clock differs from the server reference by more than one second.',
    dot: 'bad'
  };
}

async function runAccuracyMeasurement() {
  els.remeasure.disabled = true;
  els.remeasure.textContent = 'Measuring…';
  els.statusTitle.textContent = 'Measuring your clock…';
  els.accuracyValue.textContent = 'Measuring…';
  els.accuracyDot.className = 'status-dot';

  const result = await measureClock('api/time.php', 9);
  if (!result) {
    els.statusTitle.textContent = 'Local time is running.';
    els.accuracySummary.textContent = 'Server accuracy measurement is unavailable. Showing the device clock.';
    els.accuracyValue.textContent = 'Unavailable';
    els.accuracyDetail.textContent = 'The time endpoint could not be reached. The clock remains functional using this device.';
    els.offsetValue.textContent = '—';
    els.uncertaintyValue.textContent = '—';
    els.rttValue.textContent = '—';
    els.samplesValue.textContent = '0';
  } else {
    const serverEpochEstimate = Date.now() - result.offsetMs;
    establishClock(serverEpochEstimate);
    state.synced = true;

    const copy = accuracyCopy(result);
    els.statusTitle.textContent = copy.title;
    els.accuracySummary.textContent = `${copy.short}. Device difference ${formatMilliseconds(result.offsetMs, true)} ± ${formatMilliseconds(result.uncertaintyMs)}.`;
    els.accuracyValue.textContent = copy.short;
    els.accuracyDetail.textContent = copy.detail;
    els.accuracyDot.className = `status-dot ${copy.dot}`;
    els.offsetValue.textContent = formatMilliseconds(result.offsetMs, true);
    els.uncertaintyValue.textContent = `±${formatMilliseconds(result.uncertaintyMs)}`;
    els.rttValue.textContent = `${result.rttMs.toFixed(1)} ms`;
    els.samplesValue.textContent = String(result.samples);
  }

  els.remeasure.disabled = false;
  els.remeasure.textContent = 'Measure again';
  state.lastRenderKey = '';
}

function createWorldCards() {
  els.worldGrid.replaceChildren();
  state.worldNodes.clear();

  for (const city of state.worldCities) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'city-card';
    button.dataset.slug = city.slug;

    const name = document.createElement('span');
    name.className = 'city-name';
    name.textContent = city.name.toUpperCase();

    const time = document.createElement('time');
    time.className = 'city-time';
    time.textContent = '--:--';

    const date = document.createElement('span');
    date.className = 'city-date';
    date.textContent = city.country;

    button.append(name, time, date);
    button.addEventListener('click', () => selectCity(city, true));
    els.worldGrid.append(button);
    state.worldNodes.set(city.slug, { button, time, date });
  }
}

function renderSolar(now) {
  const city = state.primary;
  if (!city || !Number.isFinite(city.lat) || !Number.isFinite(city.lon)) {
    for (const element of [els.sunrise, els.sunset, els.panelSunrise, els.panelSunset, els.panelDayLength]) element.textContent = '—';
    els.dayLength.textContent = 'Solar data unavailable';
    els.solarLocation.textContent = 'No coordinates';
    els.coordinates.textContent = '—';
    return;
  }

  const calendar = getCalendarDateInZone(now, city.timezone);
  if (calendar.key === state.lastSolarDateKey) return;
  state.lastSolarDateKey = calendar.key;

  const solar = calculateSunTimes(calendar.asUtcDate, city.lat, city.lon);
  els.solarLocation.textContent = city.name;
  els.coordinates.textContent = `${city.lat.toFixed(4)}°, ${city.lon.toFixed(4)}°`;

  if (!solar?.sunrise || !solar?.sunset) {
    els.sunrise.textContent = '—';
    els.sunset.textContent = '—';
    els.dayLength.textContent = 'Polar day/night';
    els.panelSunrise.textContent = '—';
    els.panelSunset.textContent = '—';
    els.panelDayLength.textContent = 'Polar day/night';
    return;
  }

  const sunriseText = getTimeParts(solar.sunrise, city.timezone, { hour12: state.hour12, showSeconds: false });
  const sunsetText = getTimeParts(solar.sunset, city.timezone, { hour12: state.hour12, showSeconds: false });
  const withPeriod = parts => [parts.time, parts.dayPeriod].filter(Boolean).join(' ');
  const dayLength = formatDuration(solar.dayLengthMs);

  els.sunrise.textContent = withPeriod(sunriseText);
  els.sunset.textContent = withPeriod(sunsetText);
  els.dayLength.textContent = `${dayLength} daylight`;
  els.panelSunrise.textContent = withPeriod(sunriseText);
  els.panelSunset.textContent = withPeriod(sunsetText);
  els.panelDayLength.textContent = dayLength;
}

function renderPrimary(now) {
  const city = state.primary;
  if (!city) return;
  const parts = getTimeParts(now, city.timezone, { hour12: state.hour12, showSeconds: state.showSeconds });
  els.heroTime.textContent = parts.time;
  els.heroAmPm.textContent = parts.dayPeriod.toLowerCase();
  els.heroTime.dateTime = now.toISOString();
  els.primaryLocation.textContent = `${city.name}${city.country ? `, ${city.country}` : ''}`;
  els.dateLine.textContent = formatDate(now, city.timezone);
  els.dateLine.dateTime = now.toISOString().slice(0, 10);
  els.timezoneLabel.textContent = city.timezone;
  els.zoneName.textContent = city.timezone;
  els.zoneAbbr.textContent = formatZoneName(now, city.timezone);
  els.utcOffset.textContent = formatUtcOffset(getUtcOffsetMinutes(now, city.timezone));
  renderSolar(now);
}

function renderWorld(now) {
  for (const city of state.worldCities) {
    const nodes = state.worldNodes.get(city.slug);
    if (!nodes) continue;
    const parts = getTimeParts(now, city.timezone, { hour12: state.hour12, showSeconds: false });
    nodes.time.textContent = [parts.time, parts.dayPeriod].filter(Boolean).join(' ');
    nodes.time.dateTime = now.toISOString();
    nodes.date.textContent = formatDate(now, city.timezone, true);
    nodes.button.setAttribute('aria-current', String(state.primary?.slug === city.slug));
    nodes.button.setAttribute('aria-label', `Use ${city.name}, ${city.country} as primary city`);
  }
}

function renderLoop() {
  const now = trustedNow();
  const key = state.showSeconds
    ? `${Math.floor(now.getTime() / 1000)}|${state.primary?.slug}|${state.hour12}`
    : `${Math.floor(now.getTime() / 60000)}|${state.primary?.slug}|${state.hour12}`;

  if (key !== state.lastRenderKey) {
    state.lastRenderKey = key;
    renderPrimary(now);
    renderWorld(now);
  }
  requestAnimationFrame(renderLoop);
}

function selectCity(city, updateUrl = false) {
  state.primary = city;
  state.lastRenderKey = '';
  state.lastSolarDateKey = '';
  setPreference('primaryCity', city.slug);

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set('city', city.slug);
    history.pushState({ city: city.slug }, '', url);
  }
  closeSearch();
}

function searchCities(query) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return state.cities.slice(0, 8);
  return state.cities
    .map(city => {
      const cityName = city.name.toLocaleLowerCase();
      const country = city.country.toLocaleLowerCase();
      const zone = city.timezone.toLocaleLowerCase();
      let score = 100;
      if (cityName === needle) score = 0;
      else if (cityName.startsWith(needle)) score = 1;
      else if (cityName.includes(needle)) score = 2;
      else if (country.startsWith(needle)) score = 3;
      else if (country.includes(needle)) score = 4;
      else if (zone.includes(needle)) score = 5;
      return { city, score };
    })
    .filter(item => item.score < 100)
    .sort((a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name))
    .slice(0, 12)
    .map(item => item.city);
}

function renderSearchResults() {
  state.searchMatches = searchCities(els.citySearch.value);
  state.searchIndex = state.searchMatches.length ? 0 : -1;
  els.searchResults.replaceChildren();

  if (!state.searchMatches.length) {
    const empty = document.createElement('p');
    empty.className = 'search-result';
    empty.textContent = 'No matching cities in the included city dataset.';
    els.searchResults.append(empty);
    return;
  }

  state.searchMatches.forEach((city, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(index === state.searchIndex));

    const label = document.createElement('span');
    label.textContent = city.name;
    const detail = document.createElement('small');
    detail.textContent = `${city.country} · ${city.timezone}`;
    button.append(label, detail);
    button.addEventListener('click', () => selectCity(city, true));
    els.searchResults.append(button);
  });
}

function updateSearchSelection() {
  const options = [...els.searchResults.querySelectorAll('[role="option"]')];
  options.forEach((option, index) => option.setAttribute('aria-selected', String(index === state.searchIndex)));
  options[state.searchIndex]?.scrollIntoView({ block: 'nearest' });
}

function setBackgroundInert(value) {
  for (const selector of ['main', '.site-header', '.site-footer']) {
    const element = document.querySelector(selector);
    if (element) element.inert = value;
  }
}

function openSearch() {
  els.searchPopover.hidden = false;
  setBackgroundInert(true);
  els.searchTrigger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  els.citySearch.value = '';
  renderSearchResults();
  requestAnimationFrame(() => els.citySearch.focus());
}

function closeSearch() {
  if (els.searchPopover.hidden) return;
  els.searchPopover.hidden = true;
  setBackgroundInert(false);
  els.searchTrigger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  els.searchTrigger.focus({ preventScroll: true });
}

function bindEvents() {
  initTheme(els.themeToggle);
  els.remeasure.addEventListener('click', runAccuracyMeasurement);
  els.searchTrigger.addEventListener('click', openSearch);
  els.searchClose.addEventListener('click', closeSearch);
  els.searchPopover.addEventListener('click', event => {
    if (event.target === els.searchPopover) closeSearch();
  });
  els.citySearch.addEventListener('input', renderSearchResults);
  els.citySearch.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && state.searchMatches.length) {
      event.preventDefault();
      state.searchIndex = (state.searchIndex + 1) % state.searchMatches.length;
      updateSearchSelection();
    } else if (event.key === 'ArrowUp' && state.searchMatches.length) {
      event.preventDefault();
      state.searchIndex = (state.searchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
      updateSearchSelection();
    } else if (event.key === 'Enter' && state.searchMatches[state.searchIndex]) {
      event.preventDefault();
      selectCity(state.searchMatches[state.searchIndex], true);
    } else if (event.key === 'Escape') {
      closeSearch();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === '/' && els.searchPopover.hidden && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      openSearch();
    } else if (event.key === 'Escape' && !els.searchPopover.hidden) {
      closeSearch();
    }
  });

  els.hourFormatToggle.addEventListener('click', () => {
    state.hour12 = !state.hour12;
    setPreference('hour12', state.hour12);
    els.hourFormatToggle.textContent = state.hour12 ? '12-hour' : '24-hour';
    state.lastRenderKey = '';
    state.lastSolarDateKey = '';
  });

  els.secondsToggle.addEventListener('click', () => {
    state.showSeconds = !state.showSeconds;
    setPreference('showSeconds', state.showSeconds);
    els.secondsToggle.textContent = state.showSeconds ? 'Shown' : 'Hidden';
    state.lastRenderKey = '';
  });

  window.addEventListener('popstate', () => choosePrimaryCity());
}

function choosePrimaryCity() {
  const params = new URLSearchParams(window.location.search);
  const requestedSlug = params.get('city');
  const savedSlug = getPreference('primaryCity');
  const systemZone = getSystemTimeZone();

  const city =
    state.cities.find(item => item.slug === requestedSlug) ||
    state.cities.find(item => item.slug === savedSlug) ||
    state.cities.find(item => item.timezone === systemZone) ||
    {
      slug: 'local',
      name: systemZone.split('/').at(-1)?.replaceAll('_', ' ') || 'Local',
      country: '',
      timezone: systemZone,
      lat: null,
      lon: null
    };

  state.primary = city;
  state.lastRenderKey = '';
  state.lastSolarDateKey = '';
}

async function loadCities() {
  const response = await fetch('data/cities.json', { cache: 'force-cache', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Unable to load city data (${response.status})`);
  const cities = await response.json();
  if (!Array.isArray(cities) || !cities.length) throw new Error('City dataset is invalid');
  state.cities = cities;
  state.worldCities = DEFAULT_WORLD_SLUGS.map(slug => cities.find(city => city.slug === slug)).filter(Boolean);
}

async function init() {
  bindEvents();
  els.hourFormatToggle.textContent = state.hour12 ? '12-hour' : '24-hour';
  els.secondsToggle.textContent = state.showSeconds ? 'Shown' : 'Hidden';

  try {
    await loadCities();
    choosePrimaryCity();
    createWorldCards();
  } catch (error) {
    console.error(error);
    const zone = getSystemTimeZone();
    state.primary = { slug: 'local', name: 'Local time', country: '', timezone: zone, lat: null, lon: null };
    els.accuracySummary.textContent = 'City data could not be loaded; local clock mode is active.';
  }

  renderLoop();
  void runAccuracyMeasurement();
}

void init();
