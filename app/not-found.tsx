import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p
        className="text-6xl font-bold mb-4"
        style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--accent)", opacity: 0.3 }}
      >
        404
      </p>
      <h1
        className="text-xl font-semibold mb-2"
        style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
      >
        页面不存在
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-tertiary)" }}>
        你访问的页面找不到了
      </p>
      <Link
        href="/"
        className="text-sm px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        ← 回到主页
      </Link>
    </div>
  );
}
