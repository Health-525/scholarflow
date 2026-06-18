/**
 * 课程颜色生成器 — 自动适配深色/浅色模式
 */
export interface CourseColor {
  bg: string;
  border: string;
  accent: string;
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function courseHue(title: string): number {
  const rules: Array<[RegExp, number]> = [
    [/体育|跆拳道|篮球|足球|羽毛球|游泳/, 145],
    [/马克思|毛泽东|形势|政策|思政/, 5],
    [/数学|统计|数值|模型|线性|微积分|概率/, 210],
    [/Python|编程|算法|数据结构|大数据|软件/, 280],
    [/英语|日语|德语|法语|语言/, 35],
    [/实验|实践|实训|劳动/, 90],
  ];
  for (const [re, hue] of rules) if (re.test(title)) return hue;
  return hashHue(title);
}

/**
 * 判断当前是否为深色模式
 */
function isDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (document.documentElement.getAttribute("data-theme") !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

/**
 * 获取课程颜色 — 自动适配深色模式
 *
 * Light: 高亮度低饱和度背景 + 中等饱和度强调色
 * Dark: 低亮度高饱和度背景 + 高亮度强调色（在深色背景上发光）
 */
export function courseColor(title: string): CourseColor {
  const hue = courseHue(title);
  const dark = isDarkMode();

  if (dark) {
    // Dark mode: tinted blocks that stand out against dark cards
    // Background: low-saturation tinted fill (20-22% lightness, 65% opacity)
    // Border: very subtle tint so edges don't look like bright "white borders"
    // Accent: soft luminous color (65% lightness, 50% saturation — readable but not neon)
    return {
      bg: `hsla(${hue}, 32%, 21%, 0.72)`,
      border: `hsla(${hue}, 30%, 28%, 0.22)`,
      accent: `hsl(${hue}, 50%, 65%)`,
    };
  }

  // Light mode: soft pastel backgrounds + deep ink accents
  return {
    bg: `hsla(${hue}, 85%, 92%, 0.92)`,
    border: `hsla(${hue}, 70%, 55%, 0.55)`,
    accent: `hsl(${hue}, 70%, 40%)`,
  };
}


