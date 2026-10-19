import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SiteFooter } from './SiteFooter';

afterEach(cleanup);

describe('SiteFooter', () => {
  it('renders the exact branding wording', () => {
    const { container } = render(<SiteFooter />);
    expect(container.textContent?.trim()).toBe('ScholarFlow is a product of Bornosoft.');
  });

  it('links Bornosoft to the external site safely in a new tab', () => {
    render(<SiteFooter />);
    const link = screen.getByRole('link', { name: 'Bornosoft' });
    expect(link.getAttribute('href')).toBe('https://bornosoft.bd/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('optionally renders a top border hairline', () => {
    const { container } = render(<SiteFooter withTopBorder />);
    const footer = container.querySelector('footer');
    expect(footer?.className).toContain('border-t');
  });
});
