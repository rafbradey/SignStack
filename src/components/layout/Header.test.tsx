import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';

describe('Header component', () => {
  it('renders branding title and subtitle', () => {
    render(<Header />);
    expect(screen.getByText('SignStack')).toBeDefined();
    expect(screen.getByText('PDF Stacking & Precision Overlay')).toBeDefined();
  });

  it('renders the 100% Client-Side privacy badge', () => {
    render(<Header />);
    expect(screen.getByText(/100% Client-Side \/ Local/i)).toBeDefined();
  });

  it('opens About modal when "How it works" button is clicked', () => {
    render(<Header />);
    const button = screen.getByRole('button', { name: /how it works/i });
    fireEvent.click(button);

    // Modal should now be opened with title "About SignStack"
    expect(screen.getByText('About SignStack')).toBeDefined();
    expect(screen.getByText('100% Client-Side Privacy')).toBeDefined();
  });

  it('opens Keyboard Shortcuts modal when "Shortcuts" button is clicked', () => {
    render(<Header />);
    const button = screen.getByRole('button', { name: /shortcuts/i });
    fireEvent.click(button);

    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined();
    expect(screen.getByText('Page Navigation')).toBeDefined();
    expect(screen.getByText('Zoom & Pan')).toBeDefined();
  });

  it('opens Keyboard Shortcuts modal when "?" key is pressed globally', () => {
    render(<Header />);
    fireEvent.keyDown(window, { key: '?' });

    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined();
    expect(screen.getByText('Overlay Controls')).toBeDefined();
  });
});

