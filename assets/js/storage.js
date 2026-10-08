const PREFIX = 'precision-time:';

export function getPreference(key, fallback = null) {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function setPreference(key, value) {
  try {
    localStorage.setItem(PREFIX + key, String(value));
  } catch {
    // Storage can be unavailable in privacy modes; the app still functions.
  }
}
