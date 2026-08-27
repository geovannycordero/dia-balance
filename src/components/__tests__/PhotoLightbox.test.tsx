/**
 * @jest-environment jsdom
 */
/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from '@testing-library/react';

import { PhotoLightbox } from '@/components/PhotoLightbox';

describe('PhotoLightbox', () => {
  it('renders nothing when src is null', () => {
    const { container } = render(<PhotoLightbox src={null} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the full-size image and a close button when src is set', () => {
    render(<PhotoLightbox src="https://example.com/food.jpg" onClose={jest.fn()} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/food.jpg');
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<PhotoLightbox src="https://example.com/food.jpg" onClose={onClose} />);

    fireEvent.click(screen.getByTestId('lightbox-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<PhotoLightbox src="https://example.com/food.jpg" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(<PhotoLightbox src="https://example.com/food.jpg" onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
