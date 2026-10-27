import React, { useState } from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolWindowHeader } from './tool-window-header.component';

function Tool() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <ToolWindowHeader>
        <button type="button" onClick={() => setCount(count + 1)}>
          Compter {count}
        </button>
      </ToolWindowHeader>
      <p>contenu</p>
    </div>
  );
}

describe('ToolWindowHeader', () => {
  it("place les enfants dans l'emplacement d'en-tête de la zone, en gardant l'état de la fenêtre", () => {
    render(
      <aside data-anchor="bottom">
        <header>
          <h2>Logs</h2>
          <div data-testid="slot" data-tool-window-header="" />
          <button type="button">Fermer</button>
        </header>
        <div data-testid="body">
          <Tool />
        </div>
      </aside>,
    );
    const button = within(screen.getByTestId('slot')).getByRole('button', { name: 'Compter 0' });
    expect(within(screen.getByTestId('body')).queryByRole('button')).toBeNull();
    fireEvent.click(button);
    expect(within(screen.getByTestId('slot')).getByRole('button', { name: 'Compter 1' })).toBeInTheDocument();
  });

  it('rend sur place hors zone', () => {
    render(<Tool />);
    expect(screen.getByRole('button', { name: 'Compter 0' })).toBeInTheDocument();
  });
});
