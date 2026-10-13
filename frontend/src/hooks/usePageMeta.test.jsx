import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import usePageMeta from './usePageMeta';
import { BRAND, DEFAULT_TITLE } from '../config/brand';

const Page = ({ heading, description }) => { usePageMeta(heading, description); return null; };
const desc = () => document.querySelector('meta[name="description"]')?.getAttribute('content');

describe('usePageMeta', () => {
  it('sets a per-page title and description and restores the previous ones on leave', () => {
    document.head.innerHTML = '<meta name="description" content="default text">'; // reset head first...
    document.title = DEFAULT_TITLE; // ...then set the title (replacing head removes the <title> element)
    const { unmount } = render(<Page heading="Sign in" description="Sign in to your account." />);
    expect(document.title).toBe(`Sign in — ${BRAND.name}`);
    expect(desc()).toBe('Sign in to your account.');
    unmount();
    expect(document.title).toBe(DEFAULT_TITLE);
    expect(desc()).toBe('default text');
  });

  it('creates the description tag when the page has none', () => {
    document.head.innerHTML = '';
    render(<Page heading="Terms" description="Terms text." />);
    expect(desc()).toBe('Terms text.');
  });

  it('uses the default title when no heading is given', () => {
    render(<Page />);
    expect(document.title).toBe(DEFAULT_TITLE);
  });
});
