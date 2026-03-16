import ClientAppConfigBootstrap from '@/components/providers/ClientAppConfigBootstrap';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Devbox API Documentation',
  description: 'Devbox API Documentation'
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientAppConfigBootstrap>{children}</ClientAppConfigBootstrap>
      </body>
    </html>
  );
}
