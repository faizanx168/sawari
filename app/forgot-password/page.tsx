'use client';

import { Suspense } from 'react';
import ForgotPasswordForm from './components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
} 