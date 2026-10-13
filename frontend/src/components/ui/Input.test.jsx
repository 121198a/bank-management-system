import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';
import Select from './Select';

describe('Input / Select accessibility', () => {
  it('ties the visible label to the control (name, click-to-focus)', async () => {
    render(<Input label="Email address" type="email" placeholder="you@example.com" />);
    const field = screen.getByLabelText('Email address');
    expect(field.tagName).toBe('INPUT');
    await userEvent.click(screen.getByText('Email address'));
    expect(field).toHaveFocus();
  });

  it('gives every instance its own id and honours an explicit id', () => {
    render(<><Input label="One" /><Input label="Two" /><Input label="Three" id="custom" /></>);
    const ids = ['One', 'Two', 'Three'].map((l) => screen.getByLabelText(l).id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[2]).toBe('custom');
  });

  it('links the error message with aria-describedby and flags the control invalid', () => {
    render(<Input label="Password" error="Too short" />);
    const field = screen.getByLabelText('Password');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Too short');
  });

  it('does not mark a valid control invalid', () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });

  it('labels selects the same way', () => {
    render(<Select label="Account type" options={[{ value: 'a', label: 'Savings' }]} />);
    expect(screen.getByLabelText('Account type').tagName).toBe('SELECT');
  });

  it('the required asterisk is hidden from assistive technology', () => {
    render(<Input label="Full name" required />);
    // The accessible name excludes the aria-hidden asterisk; "required" is exposed as a state instead.
    const field = screen.getByRole('textbox', { name: 'Full name' });
    expect(field).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });
});
