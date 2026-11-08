export interface PanelMasterTheme {
  preset: string;
  accentColor: string;
  secondaryColor: string;
  bgColor: string;
  surfaceColor: string;
  cornerRadius: number;
  finish: 'solid' | 'glass' | 'soft' | 'outlines' | 'flat';
  surfaceOpacity: number;
  shadowLevel: 'none' | 'low' | 'medium' | 'high';
  motion: 'subtle' | 'lively' | 'off';
  liftCards: boolean;
  accentGlow: boolean;
  ambientLight: boolean;
  density: 'comfortable' | 'compact';
  fontFamily: 'inter' | 'system' | 'geometric' | 'mono';
  textSize: number;
  sidebarStyle: 'attached' | 'floating';
  sidebarSide: 'left' | 'right';
  sidebarWidth: number;
  activeItemStyle: 'bar' | 'pill' | 'solid' | 'icon';
  sectionLabels: boolean;
  tabTitle: string;
  footerText: string;
}

export const DEFAULT_THEME: PanelMasterTheme = {
  preset: 'forge-steel',
  accentColor: '#3b82f6',
  secondaryColor: '#94a3b8',
  bgColor: '#09090b',
  surfaceColor: '#111116',
  cornerRadius: 12,
  finish: 'solid',
  surfaceOpacity: 100,
  shadowLevel: 'low',
  motion: 'subtle',
  liftCards: true,
  accentGlow: true,
  ambientLight: false,
  density: 'comfortable',
  fontFamily: 'inter',
  textSize: 100,
  sidebarStyle: 'attached',
  sidebarSide: 'left',
  sidebarWidth: 240,
  activeItemStyle: 'pill',
  sectionLabels: true,
  tabTitle: 'PanelMaster Cloud',
  footerText: 'PanelMaster v1.0 · Powered by Docker Engine',
};

const THEME_STORAGE_KEY = 'panelmaster_theme';

export function getFontFamilyString(font: string): string {
  switch (font) {
    case 'mono':
      return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    case 'geometric':
      return 'Century Gothic, Futura, "Plus Jakarta Sans", system-ui, sans-serif';
    case 'system':
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    case 'inter':
    default:
      return 'Inter, "Plus Jakarta Sans", -apple-system, sans-serif';
  }
}

export function applyThemeToDocument(theme: PanelMasterTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch (_) {}

  if (theme.tabTitle) {
    document.title = theme.tabTitle;
  }

  const fontCss = getFontFamilyString(theme.fontFamily);
  const opacityFraction = Math.max(0.6, Math.min(1, theme.surfaceOpacity / 100));

  let styleTag = document.getElementById('pm-theme-styles') as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'pm-theme-styles';
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = `
    :root {
      --pm-accent: ${theme.accentColor};
      --pm-accent-soft: ${theme.accentColor}22;
      --pm-accent-glow: ${theme.accentColor}44;
      --pm-secondary: ${theme.secondaryColor};
      --pm-bg: ${theme.bgColor};
      --pm-surface: ${theme.surfaceColor};
      --pm-radius: ${theme.cornerRadius}px;
      --pm-radius-sm: ${Math.max(4, theme.cornerRadius - 4)}px;
      --pm-radius-lg: ${theme.cornerRadius + 4}px;
      --pm-font: ${fontCss};
    }

    body {
      background-color: var(--pm-bg) !important;
      font-family: var(--pm-font) !important;
    }

    ::selection {
      background-color: var(--pm-accent) !important;
      color: #ffffff !important;
    }

    /* Backgrounds */
    .bg-\\[\\#09090b\\], .bg-\\[\\#070709\\], .bg-\\[\\#07090e\\] {
      background-color: var(--pm-bg) !important;
    }

    /* Surfaces and Cards */
    .bg-\\[\\#111114\\], .bg-\\[\\#111116\\], .bg-\\[\\#121622\\] {
      background-color: var(--pm-surface) !important;
      opacity: ${opacityFraction};
      ${theme.finish === 'glass' ? 'backdrop-filter: blur(12px) !important;' : ''}
    }

    /* Accents & Buttons */
    .bg-blue-600, .bg-blue-500, .bg-amber-600, .bg-amber-500 {
      background-color: var(--pm-accent) !important;
    }
    .hover\\:bg-blue-500:hover, .hover\\:bg-amber-500:hover {
      filter: brightness(1.15) !important;
    }

    /* Text Accents */
    .text-blue-400, .text-blue-500, .text-amber-500, .text-amber-400 {
      color: var(--pm-accent) !important;
    }

    /* Border Accents */
    .border-blue-500, .border-blue-600, .border-amber-500, .border-amber-600 {
      border-color: var(--pm-accent) !important;
    }
    .border-b-blue-500, .border-b-amber-500 {
      border-bottom-color: var(--pm-accent) !important;
    }
    .focus\\:border-blue-500:focus, .focus\\:border-amber-500:focus {
      border-color: var(--pm-accent) !important;
    }

    /* Soft Accent Badges */
    .bg-blue-600\\/10, .bg-blue-600\\/15, .bg-blue-600\\/20, .bg-amber-500\\/10, .bg-amber-500\\/20 {
      background-color: var(--pm-accent-soft) !important;
    }
    .border-blue-500\\/20, .border-blue-500\\/30, .border-amber-500\\/20, .border-amber-500\\/30 {
      border-color: var(--pm-accent-glow) !important;
    }

    /* Radii */
    .rounded-2xl {
      border-radius: var(--pm-radius-lg) !important;
    }
    .rounded-xl {
      border-radius: var(--pm-radius) !important;
    }
    .rounded-lg {
      border-radius: var(--pm-radius-sm) !important;
    }

    /* Motion */
    ${theme.motion === 'off' ? '* { transition: none !important; animation: none !important; }' : ''}

    /* Accent Glow */
    ${
      theme.accentGlow
        ? `.shadow-blue-600\\/20, .shadow-amber-600\\/20, .shadow-md {
             box-shadow: 0 4px 20px -2px ${theme.accentColor}44 !important;
           }`
        : ''
    }
  `;
}

export function loadSavedTheme(): PanelMasterTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_THEME, ...parsed };
    }
  } catch (_) {}
  return DEFAULT_THEME;
}
