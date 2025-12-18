export const metadata = {
  title: 'Devbox API v2alpha',
  description: 'Devbox API v2alpha Documentation'
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

