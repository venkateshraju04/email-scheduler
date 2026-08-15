import { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setError(null);
      const { credential } = credentialResponse;
      if (!credential) throw new Error('No credential received from Google');

      const response = await api.post('/auth/google', { idToken: credential });
      const { token, user } = response.data;
      
      login(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed', err);
      setError(err.response?.data?.error || 'Failed to authenticate with backend');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col items-center">
          <h1 className="mb-8 text-2xl font-bold text-gray-900">Login</h1>
          
          <div className="w-full flex justify-center mb-6">
            {/* The prompt asked for a custom styled button, but to securely get the idToken for backend verification, we must use the official Google button. 
                We will render it full width. */}
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google login failed')}
              width="336" // approx full width of the padded container
              shape="rectangular"
              text="signin_with"
            />
          </div>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <div className="relative mb-6 w-full flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative bg-white px-2 text-xs text-gray-400">
              or sign up through email
            </div>
          </div>

          <form className="w-full space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input 
              placeholder="Email ID" 
              disabled 
            />
            <Input 
              type="password" 
              placeholder="Password" 
              disabled 
            />
            
            <Button 
              type="button" 
              fullWidth 
              className="mt-2" 
              disabled
            >
              Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
