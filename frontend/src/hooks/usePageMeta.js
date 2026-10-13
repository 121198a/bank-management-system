import { useEffect } from 'react';
import { DEFAULT_TITLE, titleFor } from '../config/brand';

const setDescription = (text) => {
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', text);
};

/** Gives each routed page its own <title> and meta description (restored on leaving the page). */
export default function usePageMeta(heading, description) {
  useEffect(() => {
    const previousTitle = document.title;
    const previousDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
    document.title = heading ? titleFor(heading) : DEFAULT_TITLE;
    if (description) setDescription(description);
    return () => {
      document.title = previousTitle;
      if (description && previousDescription) setDescription(previousDescription);
    };
  }, [heading, description]);
}
