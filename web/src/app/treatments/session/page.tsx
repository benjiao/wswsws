'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TreatmentSessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to today's treatments
    router.replace('/treatments/session/today');
  }, [router]);

  return null; // or a loading spinner
}