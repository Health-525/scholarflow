/**
 * Activity categorization rules for Electron main process.
 *
 * Normalizes app names and classifies windows into categories based on
 * application name, window title and extracted domain.
 */

'use strict';

const CATEGORIES = Object.freeze({
  CODING: 'coding',
  BROWSING: 'browsing',
  STUDY: 'study',
  ENTERTAINMENT: 'entertainment',
  COMMUNICATION: 'communication',
  SYSTEM: 'system',
  OTHER: 'other',
});

const DOMAIN_CODING = /github\.com|gitlab\.com|stackoverflow\.com/i;
const DOMAIN_ENTERTAINMENT = /bilibili\.com|youtube\.com|netflix\.com/i;
const DOMAIN_STUDY = /zhihu\.com|csdn\.net|juejin\.cn|arxiv\.org|wikipedia/i;

/**
 * Extract a domain from a window title such as "标题 - github.com - Chrome".
 * @param {string} title
 * @returns {string | undefined}
 */
function extractDomain(title) {
  if (!title) return undefined;
  // Match " - domain.com - " style separators (em dash, en dash or hyphen)
  const m = title.match(/[—–-]\s*([\w-]+\.(?:com|cn|org|net|io|dev|edu|gov)(?:\.[a-z]{2})?)\s*[—–-]/);
  if (m && m[1]) return m[1].toLowerCase();
  return undefined;
}

/**
 * Extract VS Code project name from a title such as "project - Visual Studio Code"
 * or "filename - project - Visual Studio Code".
 * @param {string} title
 * @returns {string | undefined}
 */
function extractProject(title) {
  if (!title) return undefined;
  // "filename - project - Visual Studio Code" -> project
  let m = title.match(/[—–-]\s*([^—–-]+?)\s*[—–-]\s*(?:Visual Studio Code|Cursor|Code)$/i);
  if (m && m[1] && !m[1].includes('.')) return m[1].trim();
  // "project - Visual Studio Code" -> project
  m = title.match(/^([^—–-]+?)\s*[—–-]\s*(?:Visual Studio Code|Cursor|Code)$/i);
  if (m && m[1] && !m[1].includes('.')) return m[1].trim();
  return undefined;
}

/**
 * Extract Obsidian vault name from a title such as "vault - Obsidian"
 * or "note - vault - Obsidian".
 * @param {string} title
 * @returns {string | undefined}
 */
function extractObsidianVault(title) {
  if (!title) return undefined;
  let m = title.match(/[—–-]\s*([^—–-]+?)\s*[—–-]\s*Obsidian$/i);
  if (m && m[1]) return m[1].trim();
  m = title.match(/^([^—–-]+?)\s*[—–-]\s*Obsidian$/i);
  return m && m[1] ? m[1].trim() : undefined;
}

/**
 * Classify a browser window by domain and title.
 * @param {string | undefined} domain
 * @param {string} title
 * @returns {string}
 */
function classifyBrowsing(domain, title) {
  const t = title || '';
  if (domain) {
    const d = domain.toLowerCase();
    if (DOMAIN_CODING.test(d)) return CATEGORIES.CODING;
    if (DOMAIN_ENTERTAINMENT.test(d)) return CATEGORIES.ENTERTAINMENT;
    if (DOMAIN_STUDY.test(d)) return CATEGORIES.STUDY;
    return CATEGORIES.BROWSING;
  }
  if (/github|gitlab/i.test(t)) return CATEGORIES.CODING;
  if (/bilibili|youtube|netflix/i.test(t)) return CATEGORIES.ENTERTAINMENT;
  if (/zhihu|csdn|juejin|stackoverflow|medium|arxiv|wikipedia/i.test(t)) return CATEGORIES.STUDY;
  return CATEGORIES.BROWSING;
}

/**
 * Normalize an application name.
 * @param {string} app
 * @param {string} title
 * @returns {{ app: string, category: string, domain?: string, project?: string }}
 */
function categorizeActivity(app, title) {
  const a = (app || '').toLowerCase();
  const t = (title || '').toLowerCase();

  // Browsers
  if (/chrome|edge|firefox|brave/.test(a)) {
    const browser = a.includes('edge') ? 'Edge' : a.includes('firefox') ? 'Firefox' : a.includes('brave') ? 'Brave' : 'Chrome';
    const domain = extractDomain(title);
    return { app: browser, category: classifyBrowsing(domain, title), domain };
  }

  // Code editors / IDEs
  if (/visual studio code|vscode|cursor/.test(a)) {
    return { app: 'VS Code', category: CATEGORIES.CODING, project: extractProject(title) };
  }
  if (a.includes('code')) {
    return { app: 'VS Code', category: CATEGORIES.CODING, project: extractProject(title) };
  }

  // Terminals / shells
  if (/terminal|cmd|powershell|windows terminal|iterm|alacritty|wezterm/.test(a)) {
    return { app: '终端', category: CATEGORIES.CODING };
  }

  // Development tools
  if (/github desktop/.test(a)) return { app: 'GitHub Desktop', category: CATEGORIES.CODING };
  if (/postman|insomnia|hoppscotch|apidog/.test(a)) return { app: 'Postman', category: CATEGORIES.CODING };

  // Study tools
  if (/obsidian/.test(a)) return { app: 'Obsidian', category: CATEGORIES.STUDY, project: extractObsidianVault(title) };
  if (/notion/.test(a)) return { app: 'Notion', category: CATEGORIES.STUDY };
  if (/matlab/.test(a)) return { app: 'MATLAB', category: CATEGORIES.STUDY };

  // Communication
  if (/wechat|微信/.test(a)) return { app: '微信', category: CATEGORIES.COMMUNICATION };
  if (/telegram/.test(a)) return { app: 'Telegram', category: CATEGORIES.COMMUNICATION };
  if (/feishu|lark|飞书/.test(a)) return { app: '飞书', category: CATEGORIES.COMMUNICATION };
  if (/discord|slack|teams|钉钉|企业微信|腾讯会议/.test(a)) return { app: 'Discord', category: CATEGORIES.COMMUNICATION };

  // Entertainment
  if (/bilibili|youtube|netflix|iqiyi|youku|腾讯视频/.test(a)) return { app: '视频', category: CATEGORIES.ENTERTAINMENT };
  if (/steam|epic games|origin|原神|genshin|崩坏|星穹铁道/.test(a)) return { app: '游戏', category: CATEGORIES.ENTERTAINMENT };
  if (/spotify|网易云|qq音乐|apple music/.test(a)) return { app: '音乐', category: CATEGORIES.ENTERTAINMENT };

  // System / file management
  if (/explorer|文件资源管理器|finder|nautilus|dolphin|文件管理/.test(a)) return { app: '文件管理', category: CATEGORIES.SYSTEM };
  if (/system settings|settings|系统设置|控制面板|偏好设置/.test(a)) return { app: '系统设置', category: CATEGORIES.SYSTEM };

  // Fallback: title-based domain classification for unknown apps
  const domain = extractDomain(title);
  if (domain) {
    return { app: app.charAt(0).toUpperCase() + app.slice(1), category: classifyBrowsing(domain, title), domain };
  }

  // Generic fallback
  return { app: app.charAt(0).toUpperCase() + app.slice(1), category: CATEGORIES.OTHER };
}

module.exports = { categorizeActivity, extractDomain, classifyBrowsing };
