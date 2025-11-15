/**
 * Tests for Footer component
 */
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/layout/Footer';
import React from 'react';

describe('Footer', () => {
  it('should render footer', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('should render governance links', () => {
    render(<Footer />);
    expect(screen.getByText('Proposals')).toBeInTheDocument();
    expect(screen.getByText('Treasury')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('should render resources links', () => {
    render(<Footer />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('API Reference')).toBeInTheDocument();
    expect(screen.getByText('Tutorials')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
  });

  it('should render community links', () => {
    render(<Footer />);
    const links = screen.getAllByText('Discord');
    expect(links.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Twitter').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GitHub').length).toBeGreaterThan(0);
    expect(screen.getByText('Forum')).toBeInTheDocument();
  });

  it('should render legal links', () => {
    render(<Footer />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('should render social media links', () => {
    render(<Footer />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('should render GNUS DAO branding', () => {
    render(<Footer />);
    const branding = screen.getAllByText(/GNUS DAO/i);
    expect(branding.length).toBeGreaterThan(0);
  });

  it('should render copyright notice', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
  });

  it('should have proper link structure', () => {
    render(<Footer />);
    const proposalsLink = screen.getByText('Proposals').closest('a');
    expect(proposalsLink).toHaveAttribute('href', '/proposals');
  });

  it('should render all navigation sections', () => {
    render(<Footer />);
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Legal')).toBeInTheDocument();
  });

  it('should have external links with proper attributes', () => {
    render(<Footer />);
    const githubLinks = screen.getAllByText('GitHub');
    const githubLink = githubLinks[0].closest('a');
    expect(githubLink).toHaveAttribute('href');
    expect(githubLink?.getAttribute('href')).toContain('github.com');
  });

  it('should render with proper styling classes', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('border-t');
  });
});

