
import "./globals.css"; // Tailwind global styles

import { Providers } from "./providers";

import { useTheme } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // This ensures the dark class is always applied to <html> for Tailwind dark mode
  // (ThemeProvider in Providers handles toggling the class)
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
