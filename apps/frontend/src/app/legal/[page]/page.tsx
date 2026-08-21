import { notFound } from 'next/navigation';
import { PatternCorner } from '@/components/brand/pattern-corner';
import { ShapeSignature } from '@/components/brand/shape-signature';
import { Wordmark } from '@/components/brand/wordmark';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const TITLES: Record<string, string> = {
  terms: 'Terms of service',
  privacy: 'Privacy policy',
};

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const title = TITLES[page];
  if (!title) notFound();

  let text = '';
  try {
    const res = await fetch(`${API_BASE}/public-config/legal/${page}`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { text?: string };
      text = data.text ?? '';
    }
  } catch {
    // Treat as unpublished below.
  }
  if (!text) notFound();

  return (
    <main className="relative min-h-svh bg-white px-6 py-12">
      <PatternCorner position="top-right" size={2} cellSize={56} />
      <div className="relative z-10 mx-auto w-full max-w-prose">
        <div className="mb-8 flex items-center gap-3">
          <ShapeSignature size={28} />
          <Wordmark withSignature={false} className="text-[20px]" />
        </div>
        <span className="text-eyebrow uppercase text-brand-blue">Legal</span>
        <h1 className="mt-2 font-display text-display-lg tracking-[-0.02em] text-ink">{title}</h1>
        <div className="mt-8 whitespace-pre-wrap text-body text-ink-2">{text}</div>
      </div>
    </main>
  );
}
