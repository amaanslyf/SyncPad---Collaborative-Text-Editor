import type { ReactNode } from 'react';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <div className="bg-orbs" />
      <main className="main-content">{children}</main>
    </div>
  );
}
