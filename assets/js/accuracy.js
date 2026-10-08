function median(values) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function analyzeSamples(samples) {
  const valid = samples.filter(sample =>
    Number.isFinite(sample.rttMs) && sample.rttMs >= 0 &&
    Number.isFinite(sample.offsetMs)
  );
  if (!valid.length) return null;

  const sorted = [...valid].sort((a, b) => a.rttMs - b.rttMs);
  const keepCount = Math.max(3, Math.ceil(sorted.length / 2));
  const selected = sorted.slice(0, keepCount);
  const offsetMs = median(selected.map(sample => sample.offsetMs));
  const deviations = selected.map(sample => Math.abs(sample.offsetMs - offsetMs));
  const mad = median(deviations) || 0;
  const rttMs = selected[0].rttMs;
  const medianRtt = median(selected.map(sample => sample.rttMs));
  const uncertaintyMs = Math.max(rttMs / 2, medianRtt / 2 + mad * 1.4826);

  return { offsetMs, uncertaintyMs, rttMs, samples: valid.length };
}

export async function measureClock(endpoint = 'api/time.php', sampleCount = 9) {
  const samples = [];

  for (let i = 0; i < sampleCount; i += 1) {
    const t1 = Date.now();
    const p1 = performance.now();
    try {
      const response = await fetch(`${endpoint}?s=${i}&t=${t1}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const p3 = performance.now();
      const t3 = Date.now();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const serverMs = Number(payload.unix_ms);
      if (!Number.isFinite(serverMs)) throw new Error('Invalid timestamp');

      const rttMs = p3 - p1;
      const clientMidpointMs = (t1 + t3) / 2;
      samples.push({ rttMs, offsetMs: clientMidpointMs - serverMs });
    } catch {
      // Failed samples are omitted. The caller handles complete failure.
    }

    if (i < sampleCount - 1) await new Promise(resolve => setTimeout(resolve, 55));
  }

  return analyzeSamples(samples);
}
