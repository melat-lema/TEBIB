// src/components/auth/GoogleButton.tsx
import { useState } from 'react';
import { FaGoogle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';

export default function GoogleButton({ label, failedMessage }: { label: string; failedMessage: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Supabase sends the browser back here with the session in the URL; AuthContext picks it up
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      toast.error(failedMessage);
      setLoading(false);
    }
    // on success the browser leaves the page for Google
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      <FaGoogle className="h-4 w-4 text-red-500" />
      {loading ? '…' : label}
    </button>
  );
}
