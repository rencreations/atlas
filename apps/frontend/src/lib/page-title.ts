'use client';

import * as React from 'react';

const APP_SUFFIX = ' — Atlas';

/** Event fired after the base title changes so the notification bell can
 *  re-apply its unread-count prefix. */
export const ATLAS_TITLE_EVENT = 'atlas:title';

let base = '';

export function setPageTitle(name: string) {
  base = `${name}${APP_SUFFIX}`;
  if (typeof document !== 'undefined') {
    document.title = base;
    window.dispatchEvent(new Event(ATLAS_TITLE_EVENT));
  }
}

/** Current base title (without the bell's unread-count prefix). Empty
 *  until a page calls usePageTitle. */
export function getPageTitleBase(): string {
  return base;
}

/** Give each page a distinct tab title ("Projects — Atlas") so browser
 *  tabs and history entries stop all reading the same generic title. */
export function usePageTitle(name: string) {
  React.useEffect(() => {
    setPageTitle(name);
  }, [name]);
}
