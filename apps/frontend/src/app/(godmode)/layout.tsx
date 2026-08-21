/**
 * Godmode route group — deliberately OUTSIDE the (authenticated) group
 * so the control plane renders without the app chrome. Its own auth is
 * the passphrase unlock token, handled client-side in the page.
 */
export default function GodmodeLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-col bg-surface-muted">{children}</div>;
}
