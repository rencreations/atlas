'use client';

import 'gif-picker-react/style.css';
import * as React from 'react';
import { GifPicker, Theme, type Gif } from 'gif-picker-react';
import { Klipy } from 'gif-picker-react/providers/klipy';

/**
 * Thin wrapper around gif-picker-react's Klipy provider, kept in its own
 * module so the picker (and its CSS) only loads when this lazy chunk is
 * requested, never on the main chat bundle.
 *
 * Klipy aggregates GIFs, stickers, and clips behind one app key and is
 * called directly from the browser, the key is designed to be public.
 */
export default function KlipyGifPicker({
  appKey,
  onPick,
}: {
  appKey: string;
  onPick: (gif: { id: string; url: string }) => void;
}) {
  const provider = React.useMemo(() => Klipy(appKey), [appKey]);
  const [theme, setTheme] = React.useState<Theme>(Theme.AUTO);

  React.useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT);
  }, []);

  return (
    <GifPicker
      provider={provider}
      onGifClick={(gif: Gif) => onPick({ id: gif.id, url: gif.imageUrl })}
      theme={theme}
      width="100%"
      height={360}
    />
  );
}
