/**
 * @jest-environment jsdom
 */
/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from '@testing-library/react';

import { FoodPhotoInput } from '@/components/FoodPhotoInput';

describe('FoodPhotoInput', () => {
  it('shows an Add Photo trigger and a capture-less file input when no photo is attached', () => {
    render(<FoodPhotoInput previewUrl={null} onChange={jest.fn()} onRemove={jest.fn()} />);

    const addButton = screen.getByRole('button', { name: /add photo/i });
    expect(addButton).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).not.toHaveAttribute('capture');

    expect(screen.queryByRole('button', { name: /remove photo/i })).toBeNull();
  });

  it('clicking the Add Photo trigger opens the hidden file input', () => {
    render(<FoodPhotoInput previewUrl={null} onChange={jest.fn()} onRemove={jest.fn()} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, 'click');

    fireEvent.click(screen.getByRole('button', { name: /add photo/i }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('forwards file selection via onChange', () => {
    const onChange = jest.fn();
    render(<FoodPhotoInput previewUrl={null} onChange={onChange} onRemove={jest.fn()} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('shows the thumbnail with an attached indicator and a Remove photo button when a photo is set', () => {
    render(
      <FoodPhotoInput
        previewUrl="blob:http://localhost/preview"
        onChange={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByAltText('Food preview')).toHaveAttribute(
      'src',
      'blob:http://localhost/preview',
    );
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add photo/i })).toBeNull();
    expect(screen.getByRole('button', { name: /remove photo/i })).toBeInTheDocument();
  });

  it('calls onRemove when Remove photo is clicked', () => {
    const onRemove = jest.fn();
    render(
      <FoodPhotoInput previewUrl="blob:http://localhost/preview" onChange={jest.fn()} onRemove={onRemove} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /remove photo/i }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
