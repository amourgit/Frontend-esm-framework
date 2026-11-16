import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { useLayoutType } from '@egen-civitas/esm-react-utils';
import { ErrorState } from '.';

const mockUseLayoutType = vi.mocked(useLayoutType);

describe('ErrorState', () => {
  it('renders an error state widget card', () => {
    const testError = {
      response: {
        status: 500,
        statusText: 'Internal Server Error',
      },
    };
    render(<ErrorState headerTitle="documents" error={testError} />);

    expect(screen.getByRole('heading', { name: /documents/i })).toBeInTheDocument();
    expect(screen.getByText(/Error 500: Internal Server Error/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sorry, there was a problem displaying this information. You can try to reload this page, or contact the site administrator and quote the error code above./i,
      ),
    ).toBeInTheDocument();
  });

  it('should render tablet layout when layout type is tablet', () => {
    mockUseLayoutType.mockReturnValue('tablet');

    render(<ErrorState headerTitle="test" error={{}} />);
    // Mise en page tablette : titre plus grand (`text-xl`).
    expect(screen.getByRole('heading')).toHaveClass('text-xl');
  });

  it('should render desktop layout when layout type is not tablet', () => {
    mockUseLayoutType.mockReturnValue('small-desktop');

    render(<ErrorState headerTitle="test" error={{}} />);
    // Mise en page bureau : titre compact (`text-sm`), pas la taille tablette.
    expect(screen.getByRole('heading')).toHaveClass('text-sm');
    expect(screen.getByRole('heading')).not.toHaveClass('text-xl');
  });

  it('should handle error with partial response data', () => {
    const error = { response: { status: 404 } };
    render(<ErrorState headerTitle="test" error={error} />);
    expect(screen.getByText(/Error 404:/i)).toBeInTheDocument();
  });
});
