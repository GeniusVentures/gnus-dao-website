/**
 * Tests for Button component
 */
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import React from 'react';

describe('Button', () => {
  it('should render button with default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
  });

  it('should render button with primary variant', () => {
    render(<Button variant="default">Primary</Button>);
    const button = screen.getByRole('button', { name: 'Primary' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
  });

  it('should render button with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toHaveClass('bg-destructive');
  });

  it('should render button with outline variant', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button', { name: 'Outline' });
    expect(button).toHaveClass('border');
  });

  it('should render button with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button', { name: 'Secondary' });
    expect(button).toHaveClass('bg-secondary');
  });

  it('should render button with ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button', { name: 'Ghost' });
    expect(button).toBeInTheDocument();
  });

  it('should render button with link variant', () => {
    render(<Button variant="link">Link</Button>);
    const button = screen.getByRole('button', { name: 'Link' });
    expect(button).toHaveClass('underline-offset-4');
  });

  it('should render button with small size', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button', { name: 'Small' });
    expect(button).toHaveClass('h-9');
  });

  it('should render button with large size', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button', { name: 'Large' });
    expect(button).toHaveClass('h-11');
  });

  it('should render button with icon size', () => {
    render(<Button size="icon" aria-label="Icon button">X</Button>);
    const button = screen.getByRole('button', { name: 'Icon button' });
    expect(button).toHaveClass('h-10', 'w-10');
  });

  it('should handle disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('should handle custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button).toHaveClass('custom-class');
  });

  it('should handle onClick event', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    const button = screen.getByRole('button', { name: 'Click' });
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('should render with type attribute', () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should render children correctly', () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>
    );
    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should combine variant and size classes', () => {
    render(<Button variant="destructive" size="lg">Large Destructive</Button>);
    const button = screen.getByRole('button', { name: 'Large Destructive' });
    expect(button).toHaveClass('bg-destructive');
    expect(button).toHaveClass('h-11');
  });

  it('should have proper accessibility attributes', () => {
    render(<Button aria-label="Accessible button">Button</Button>);
    const button = screen.getByRole('button', { name: 'Accessible button' });
    expect(button).toHaveAttribute('aria-label', 'Accessible button');
  });
});

