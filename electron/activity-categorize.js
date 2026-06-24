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

const DOMAIN_CODING = /github\.com|gitlab\.com|stackoverflow\.com|docs\.microsoft\.com|developer\.mozilla\.org|juejin\.cn|csdn\.net|gitee\.com|npmjs\.com|leetcode\.com|luogu\.com|nowcoder\.com|acwing\.com|cppreference\.com|cplusplus\.com|rust-lang\.org|go\.dev|vuejs\.org|react\.dev|angular\.io|webpack\.js\.org|tailwindcss\.com|developer\.apple\.com|developers\.google\.com/i;
const DOMAIN_ENTERTAINMENT = /bilibili\.com|youtube\.com|netflix\.com|iqiyi\.com|youku\.com|v\.qq\.com|douyin\.com|kuaishou\.com|xiaohongshu\.com|huya\.com|douyu\.com|twitch\.tv|weibo\.com|tieba\.baidu\.com|x\.com|instagram\.com|reddit\.com|facebook\.com|tiktok\.com|qq\.com\/(?:music|video)|spotify\.com/i;
const DOMAIN_STUDY = /zhihu\.com|csdn\.net|juejin\.cn|arxiv\.org|wikipedia\.org|baike\.baidu\.com|mooc\.cn|icourse163\.org|coursera\.org|edx\.org|khanacademy\.org|chaoxing\.com|zhihuishu\.com|cnki\.net|wos\.com|pubmed\.ncbi\.nlm\.nih\.gov|scholar\.google\.com|books\.google\.com|runoob\.com|w3schools\.com|python123\.io/i;

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
  if (/github|gitlab|stackoverflow|juejin|csdn|gitee|npm|leetcode|luogu|nowcoder|acwing|cppreference|rust-lang|go\.dev|vue|react|angular|webpack|tailwind/i.test(t)) return CATEGORIES.CODING;
  if (/bilibili|youtube|netflix|iqiyi|youku|腾讯?视频|douyin|抖音|kuaishou|快手|xiaohongshu|小红书|huya|虎牙|douyu|斗鱼|twitch|weibo|微博|tieba|贴吧|instagram|reddit|facebook|x\.com|tiktok|spotify|网易云音乐|qq音乐/i.test(t)) return CATEGORIES.ENTERTAINMENT;
  if (/zhihu|csdn|juejin|stackoverflow|medium|arxiv|wikipedia|baike|mooc|icourse|coursera|edx|khan|chaoxing|zhihuishu|cnki|wos|pubmed|scholar|runoob|w3schools|python123|anki|notion|obsidian|zotero/i.test(t)) return CATEGORIES.STUDY;
  return CATEGORIES.BROWSING;
}

/**
 * Normalize an application name.
 * @param {string} app
 * @param {string} title
 * @param {string} [url]
 * @returns {{ app: string, category: string, domain?: string, project?: string }}
 */
function categorizeActivity(app, title, url) {
  const a = (app || '').toLowerCase();
  const t = (title || '').toLowerCase();

  // 优先使用真实 URL（部分平台 active-win 可提供），否则回退到标题推断
  let urlDomain;
  if (url) {
    try {
      urlDomain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      urlDomain = undefined;
    }
  }

  // Browsers
  if (/chrome|edge|firefox|brave/.test(a)) {
    const browser = a.includes('edge') ? 'Edge' : a.includes('firefox') ? 'Firefox' : a.includes('brave') ? 'Brave' : 'Chrome';
    const domain = urlDomain || extractDomain(title);
    return { app: browser, category: classifyBrowsing(domain, title), domain };
  }

  // ── Code editors / IDEs ─────────────────────────────────────
  if (/visual studio code|vscode|code - insiders|code-insiders/.test(a)) {
    return { app: 'VS Code', category: CATEGORIES.CODING, project: extractProject(title) };
  }
  if (/cursor/.test(a)) return { app: 'Cursor', category: CATEGORIES.CODING };
  if (/windsurf/.test(a)) return { app: 'Windsurf', category: CATEGORIES.CODING };
  if (/trae/.test(a)) return { app: 'Trae', category: CATEGORIES.CODING };
  if (/claude code/.test(a)) return { app: 'Claude Code', category: CATEGORIES.CODING };
  if (/android studio/.test(a)) return { app: 'Android Studio', category: CATEGORIES.CODING };
  if (/intellij idea/.test(a)) return { app: 'IntelliJ IDEA', category: CATEGORIES.CODING };
  if (/pycharm/.test(a)) return { app: 'PyCharm', category: CATEGORIES.CODING };
  if (/webstorm/.test(a)) return { app: 'WebStorm', category: CATEGORIES.CODING };
  if (/xcode/.test(a)) return { app: 'Xcode', category: CATEGORIES.CODING };
  if (/sublime text|sublime_text/.test(a)) return { app: 'Sublime Text', category: CATEGORIES.CODING };
  if (/notepad\+\+|notepadpp/.test(a)) return { app: 'Notepad++', category: CATEGORIES.CODING };
  if (/vim|gvim/.test(a)) return { app: 'Vim', category: CATEGORIES.CODING };
  if (/neovim|nvim/.test(a)) return { app: 'Neovim', category: CATEGORIES.CODING };
  if (/emacs/.test(a)) return { app: 'Emacs', category: CATEGORIES.CODING };

  // ── Terminals / shells ──────────────────────────────────────
  if (/windows terminal|windowsterminal/.test(a)) return { app: 'Windows Terminal', category: CATEGORIES.CODING };
  if (/powershell/.test(a)) return { app: 'PowerShell', category: CATEGORIES.CODING };
  if (/git bash|git-bash|bash/.test(a)) return { app: 'Git Bash', category: CATEGORIES.CODING };
  if (/\bcmd\b|命令提示符/.test(a)) return { app: 'cmd', category: CATEGORIES.CODING };
  if (/wsl/.test(a)) return { app: 'WSL', category: CATEGORIES.CODING };
  if (/iterm/.test(a)) return { app: 'iTerm', category: CATEGORIES.CODING };
  if (/alacritty/.test(a)) return { app: 'Alacritty', category: CATEGORIES.CODING };
  if (/wezterm/.test(a)) return { app: 'WezTerm', category: CATEGORIES.CODING };
  // Generic terminal must come after named terminals
  if (/terminal|终端/.test(a)) return { app: '终端', category: CATEGORIES.CODING };

  // ── Development tools ───────────────────────────────────────
  if (/github desktop/.test(a)) return { app: 'GitHub Desktop', category: CATEGORIES.CODING };
  if (/postman|insomnia|hoppscotch|apidog/.test(a)) return { app: 'Postman', category: CATEGORIES.CODING };

  // ── Entertainment ───────────────────────────────────────────
  if (/bilibili|哔哩哔哩/.test(a)) return { app: 'Bilibili', category: CATEGORIES.ENTERTAINMENT };
  if (/youtube/.test(a)) return { app: 'YouTube', category: CATEGORIES.ENTERTAINMENT };
  if (/netflix/.test(a)) return { app: 'Netflix', category: CATEGORIES.ENTERTAINMENT };
  if (/iqiyi|爱奇艺/.test(a)) return { app: '爱奇艺', category: CATEGORIES.ENTERTAINMENT };
  if (/youku|优酷/.test(a)) return { app: '优酷', category: CATEGORIES.ENTERTAINMENT };
  if (/腾讯视频|qq 视频/.test(a)) return { app: '腾讯视频', category: CATEGORIES.ENTERTAINMENT };
  if (/douyin|抖音/.test(a)) return { app: '抖音', category: CATEGORIES.ENTERTAINMENT };
  if (/kuaishou|快手/.test(a)) return { app: '快手', category: CATEGORIES.ENTERTAINMENT };
  if (/xiaohongshu|小红书/.test(a)) return { app: '小红书', category: CATEGORIES.ENTERTAINMENT };
  if (/huya|虎牙/.test(a)) return { app: '虎牙', category: CATEGORIES.ENTERTAINMENT };
  if (/douyu|斗鱼/.test(a)) return { app: '斗鱼', category: CATEGORIES.ENTERTAINMENT };
  if (/twitch/.test(a)) return { app: 'Twitch', category: CATEGORIES.ENTERTAINMENT };
  if (/steam/.test(a)) return { app: 'Steam', category: CATEGORIES.ENTERTAINMENT };
  if (/epic games|epicgames/.test(a)) return { app: 'Epic Games', category: CATEGORIES.ENTERTAINMENT };
  if (/原神|genshin/.test(a)) return { app: '原神', category: CATEGORIES.ENTERTAINMENT };
  if (/spotify/.test(a)) return { app: 'Spotify', category: CATEGORIES.ENTERTAINMENT };
  if (/网易云音乐|netease cloud music/.test(a)) return { app: '网易云音乐', category: CATEGORIES.ENTERTAINMENT };
  if (/qq音乐|qqmusic/.test(a)) return { app: 'QQ音乐', category: CATEGORIES.ENTERTAINMENT };

  // ── Communication ───────────────────────────────────────────
  if (/\bqq\b|腾讯qq|tencent qq/.test(a)) return { app: 'QQ', category: CATEGORIES.COMMUNICATION };
  if (/tim/.test(a)) return { app: 'Tim', category: CATEGORIES.COMMUNICATION };
  if (/wechat|微信/.test(a)) return { app: '微信', category: CATEGORIES.COMMUNICATION };
  if (/钉钉/.test(a)) return { app: '钉钉', category: CATEGORIES.COMMUNICATION };
  if (/腾讯会议|voov meeting/.test(a)) return { app: '腾讯会议', category: CATEGORIES.COMMUNICATION };
  if (/企业微信|wecom|wxwork/.test(a)) return { app: '企业微信', category: CATEGORIES.COMMUNICATION };
  if (/飞书|feishu|lark/.test(a)) return { app: '飞书', category: CATEGORIES.COMMUNICATION };
  if (/slack/.test(a)) return { app: 'Slack', category: CATEGORIES.COMMUNICATION };
  if (/teams|microsoft teams/.test(a)) return { app: 'Teams', category: CATEGORIES.COMMUNICATION };
  if (/zoom/.test(a)) return { app: 'Zoom', category: CATEGORIES.COMMUNICATION };
  if (/discord/.test(a)) return { app: 'Discord', category: CATEGORIES.COMMUNICATION };
  if (/telegram/.test(a)) return { app: 'Telegram', category: CATEGORIES.COMMUNICATION };

  // ── Design / creative ───────────────────────────────────────
  if (/figma/.test(a)) return { app: 'Figma', category: CATEGORIES.STUDY };
  if (/photoshop|adobe photoshop/.test(a)) return { app: 'Photoshop', category: CATEGORIES.STUDY };
  if (/illustrator|adobe illustrator/.test(a)) return { app: 'Illustrator', category: CATEGORIES.STUDY };
  if (/premiere|adobe premiere/.test(a)) return { app: 'Premiere', category: CATEGORIES.STUDY };
  if (/after effects|adobe after effects/.test(a)) return { app: 'After Effects', category: CATEGORIES.STUDY };
  if (/blender/.test(a)) return { app: 'Blender', category: CATEGORIES.STUDY };
  if (/maya/.test(a)) return { app: 'Maya', category: CATEGORIES.STUDY };
  if (/cinema 4d|c4d/.test(a)) return { app: 'C4D', category: CATEGORIES.STUDY };
  if (/sketch/.test(a)) return { app: 'Sketch', category: CATEGORIES.STUDY };

  // ── Study / productivity ────────────────────────────────────
  if (/obsidian/.test(a)) return { app: 'Obsidian', category: CATEGORIES.STUDY, project: extractObsidianVault(title) };
  if (/notion/.test(a)) return { app: 'Notion', category: CATEGORIES.STUDY };
  if (/logseq/.test(a)) return { app: 'Logseq', category: CATEGORIES.STUDY };
  if (/anki/.test(a)) return { app: 'Anki', category: CATEGORIES.STUDY };
  if (/marginnote/.test(a)) return { app: 'MarginNote', category: CATEGORIES.STUDY };
  if (/zotero/.test(a)) return { app: 'Zotero', category: CATEGORIES.STUDY };
  if (/xmind/.test(a)) return { app: 'XMind', category: CATEGORIES.STUDY };
  if (/typora/.test(a)) return { app: 'Typora', category: CATEGORIES.STUDY };
  if (/wps/.test(a)) return { app: 'WPS', category: CATEGORIES.STUDY };
  if (/matlab/.test(a)) return { app: 'MATLAB', category: CATEGORIES.STUDY };
  if (/microsoft word|winword/.test(a)) return { app: 'Microsoft Word', category: CATEGORIES.STUDY };
  if (/microsoft excel|excel/.test(a)) return { app: 'Microsoft Excel', category: CATEGORIES.STUDY };
  if (/microsoft powerpoint|powerpnt/.test(a)) return { app: 'Microsoft PowerPoint', category: CATEGORIES.STUDY };
  if (/onenote|microsoft onenote/.test(a)) return { app: 'OneNote', category: CATEGORIES.STUDY };

  // ── System / file management ────────────────────────────────
  if (/explorer|文件资源管理器|nautilus|dolphin|文件管理/.test(a)) return { app: '文件管理', category: CATEGORIES.SYSTEM };
  if (/finder/.test(a)) return { app: 'Finder', category: CATEGORIES.SYSTEM };
  if (/system settings|settings|系统设置|控制面板|偏好设置/.test(a)) return { app: '系统设置', category: CATEGORIES.SYSTEM };
  if (/任务管理器|task manager/.test(a)) return { app: '任务管理器', category: CATEGORIES.SYSTEM };
  if (/注册表|regedit/.test(a)) return { app: '注册表', category: CATEGORIES.SYSTEM };
  if (/计算器|calculator/.test(a)) return { app: '计算器', category: CATEGORIES.SYSTEM };
  if (/记事本|notepad(?!\+\+)/.test(a)) return { app: '记事本', category: CATEGORIES.SYSTEM };
  if (/截图|snipping|screenshot/.test(a)) return { app: '截图工具', category: CATEGORIES.SYSTEM };
  if (/录屏|screen recorder|obs/.test(a)) return { app: '录屏工具', category: CATEGORIES.SYSTEM };

  // Fallback: title-based domain classification for unknown apps
  const domain = extractDomain(title);
  if (domain) {
    return { app: app.charAt(0).toUpperCase() + app.slice(1), category: classifyBrowsing(domain, title), domain };
  }

  // Generic fallback
  return { app: app.charAt(0).toUpperCase() + app.slice(1), category: CATEGORIES.OTHER };
}

module.exports = { categorizeActivity, extractDomain, classifyBrowsing };
