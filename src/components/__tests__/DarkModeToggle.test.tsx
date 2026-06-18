/**
 * @jest-environment jsdom
 */
/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react';

import { DarkModeToggle } from '@/components/DarkModeToggle';

describe('DarkModeToggle', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: jest.fn(() => null), setItem: jest.fn() },
      writable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => ({ matches: false })),
      writable: true,
    });
    document.documentElement.classList.remove('dark');
  });

  it('renders the interactive toggle, not the static fallback', () => {
    render(<DarkModeToggle />);
    expect(screen.queryByLabelText('Toggle dark mode')).toBeNull();
    expect(
      screen.getByRole('button', { name: /switch to (light|dark) mode/i }),
    ).toBeInTheDocument();
  });
});
