import { Head } from '@inertiajs/react';

export default function TwoFactorChallenge() {
  return (
    <>
      <Head title="Two-factor authentication" />
      <h1 className="text-2xl font-bold">Two-factor authentication (В разработке)</h1>
    </>
  );
}

TwoFactorChallenge.layout = { title: 'Authentication code' };
