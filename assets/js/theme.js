import { getPreference, setPreference } from './storage.js';

const THEMES = ['system', 'dark', 'light'];

export function initTheme(button) {
  let theme = getPreference('theme', 'system');
  if (!THEMES.includes(theme)) theme = 'system';

  const apply = () => {
    document.documentElement.dataset.theme = theme;
    const label = button.querySelector('.theme-label');
    const icon = button.querySelector('.theme-icon');
    if (label) label.textContent = theme[0].toUpperCase() + theme.slice(1);
    if (icon) icon.textContent = theme === 'dark' ? '●' : theme === 'light' ? '○' : '◐';
    button.setAttribute('aria-label', `Theme: ${theme}. Activate to change theme.`);
  };

  apply();
  button.addEventListener('click', () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setPreference('theme', theme);
    apply();
  });
}
