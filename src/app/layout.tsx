import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

import type { Metadata } from 'next';

import { SessionProviderWrapper } from '@/components/SessionProviderWrapper';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Dia Balance - Diabetes Management Diary',
  description: 'Track. Analyze. Understand. Your complete diabetes management toolkit in one app.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive" src="/theme-init.js" />
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
