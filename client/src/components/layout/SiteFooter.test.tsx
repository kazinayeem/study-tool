import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../i18n/I18nContext';
import { SiteFooter } from './SiteFooter';

const renderFooter = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );

afterEach(cleanup);

describe('SiteFooter', () => {
  it('renders the branding wording', () => {
    const { container } = renderFooter(<SiteFooter />);
    expect(container.textContent).toContain('ScholarFlow is a product of Bornosoft.');
  });

  it('links to every policy page', () => {
    renderFooter(<SiteFooter />);
    expect(screen.getAllByRole('link', { name: 'Privacy Policy' })[0].getAttribute('href')).toBe('/privacy');
    expect(screen.getAllByRole('link', { name: 'Terms of Service' })[0].getAttribute('href')).toBe('/terms');
    expect(screen.getAllByRole('link', { name: 'Cookie Policy' })[0].getAttribute('href')).toBe('/cookies');
  });

  it('links Bornosoft to the external site safely in a new tab', () => {
    renderFooter(<SiteFooter />);
    const link = screen.getByRole('link', { name: 'Bornosoft' });
    expect(link.getAttribute('href')).toBe('https://bornosoft.bd/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('optionally renders a top border hairline', () => {
    const { container } = renderFooter(<SiteFooter withTopBorder />);
    const footer = container.querySelector('footer');
    expect(footer?.className).toContain('border-t');
  });
});
