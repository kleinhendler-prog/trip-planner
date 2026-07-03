import React from 'react';
import { Header } from './header';

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="flex h-screen flex-col bg-white">
      <Header />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export { AppShell };
