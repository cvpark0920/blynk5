import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Chrome } from 'lucide-react';
import { toast } from 'sonner';

interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Call the login function from UnifiedAuthContext
    onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg mx-auto mb-4">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500">
              Enter your credentials to access the admin panel
            </p>
          </div>

          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-11 relative font-medium border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign in with Google
            </Button>

          </div>
        </div>
      </div>
    </div>
  );
}
