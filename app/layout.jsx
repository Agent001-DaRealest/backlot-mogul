export const metadata = {
  metadataBase: new URL('https://vibecode-blush.vercel.app'),
  title: 'SP-1000',
  description: 'LEAPS Terminal — Track corporate buyback windows, IV, and signal scoring for quality mega-caps.',
  openGraph: {
    title: 'SP-1000 LEAPS Terminal',
    description: 'Track corporate buyback windows, IV, and signal scoring for quality mega-caps.',
    images: [{ url: '/south-end-ai-logo-social.jpeg', width: 1632, height: 2624 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SP-1000 LEAPS Terminal',
    description: 'Track corporate buyback windows, IV, and signal scoring for quality mega-caps.',
    images: ['/south-end-ai-logo-social.jpeg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, backgroundColor: '#111', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
