import { useState } from 'react';

// Links straight to a device's card, so settings that live on the device (and are shared by every
// profile) can be reached from the mappings that use it
export function deviceHref(id: string, parentId?: string) {
  const hash = `#device-${id}`;
  return parentId ? `/peripherals?id=${parentId}${hash}` : `/devices${hash}`;
}

export function deviceAnchorId(id: string) {
  return `device-${id}`;
}

// Whether the page was opened from a link to the card being rendered. Read once, so the
// highlight doesn't come back when the card re-renders
export function useIsLinkedDevice(id: string | undefined) {
  const [linked] = useState(
    () => !!id && typeof window !== 'undefined' && window.location.hash === `#device-${id}`
  );
  return linked;
}
