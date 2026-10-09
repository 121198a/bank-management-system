import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, capitalize, truncate, getErrorMessage } from './formatters';

describe('formatters', () => {
  it('formats INR with Indian grouping and two decimals', () => {
    expect(formatCurrency(1234567.5)).toBe('₹12,34,567.50');
  });
  it('shows a dash for missing amounts/dates instead of NaN/Invalid Date', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });
  it('capitalize and truncate behave on edge input', () => {
    expect(capitalize('hELLO')).toBe('Hello');
    expect(capitalize()).toBe('');
    expect(truncate('abcdef', 3)).toBe('abc…');
    expect(truncate('abc', 3)).toBe('abc');
  });
  it('getErrorMessage prefers validation errors, then message, then a fallback', () => {
    expect(getErrorMessage({ response: { data: { errors: [{ message: 'A' }, { message: 'B' }] } } })).toBe('A. B');
    expect(getErrorMessage({ response: { data: { message: 'Nope' } } })).toBe('Nope');
    expect(getErrorMessage({ message: 'net down' })).toBe('net down');
    expect(getErrorMessage({})).toBe('Something went wrong');
  });
  it('explains timeouts and unreachable servers in plain language', () => {
    expect(getErrorMessage({ code: 'ECONNABORTED', message: 'timeout of 20000ms exceeded' })).toMatch(/too long/);
    expect(getErrorMessage({ request: {}, message: 'Network Error' })).toMatch(/internet connection/);
    // A real server answer always wins over the generic network wording.
    expect(getErrorMessage({ request: {}, response: { data: { message: 'Insufficient funds' } } })).toBe('Insufficient funds');
  });
});
