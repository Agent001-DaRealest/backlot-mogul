import PacificDreamsShell from '../../../components/pacific-dreams/PacificDreamsShell';

export const metadata = {
  title: 'Pacific Dreams — Movie Studio Simulator',
  description: 'Build your Hollywood empire one film at a time.',
  openGraph: {
    title: 'Pacific Dreams — Movie Studio Simulator',
    description: 'Build your Hollywood empire one film at a time.',
    images: [{ url: '/south-end-games-logo-social.jpg' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pacific Dreams — Movie Studio Simulator',
    description: 'Build your Hollywood empire one film at a time.',
    images: ['/south-end-games-logo-social.jpg'],
  },
};

export default function PacificDreamsPage() {
  return <PacificDreamsShell />;
}
