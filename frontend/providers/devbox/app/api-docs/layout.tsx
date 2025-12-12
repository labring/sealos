export const metadata = {
  title: 'Devbox API Documentation',
  description: 'Devbox API Documentation'
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
