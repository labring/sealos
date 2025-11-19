export const metadata = {
  title: 'AIProxy API v2alpha',
  description: 'AIProxy API v2alpha Documentation'
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}

