import { useState, useEffect } from 'react'; // Added useEffect
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTheme } from '../context/ThemeContext';
import { z } from 'zod'; 

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }), 
});

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // --- NEW: Redirect if already logged in ---
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const userData = parseJwt(token);
      const role = userData ? userData.role : 'user';

      // Redirect based on role
      if (role === 'admin' || role === 'superadmin') {
        router.replace('/admin/upload');
      } else {
        router.replace('/booking/search');
      }
    }
  }, []);
  // ------------------------------------------

  const handleLogin = async (e) => {
    e.preventDefault();

    const formData = { email, password };
    const validation = loginSchema.safeParse(formData);

    if (!validation.success) {
      alert(`❌ ${validation.error.issues[0].message}`);
      return; 
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        
        const userData = parseJwt(data.token);
        const role = userData ? userData.role : 'user';
        
        alert("✅ Login Successful!"); 
        
        if (role === 'admin' || role === 'superadmin') {
          router.push('/admin/upload');
        } else {
          router.push('/booking/search');
        }
      } else {
        alert("❌ Error: " + data.message);
      }
    } catch (error) {
      alert("❌ Network Error: Could not connect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-200 p-4">
      <div className="absolute top-4 right-4">
        <button 
          onClick={toggleTheme}
          className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded shadow text-sm font-medium"
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Sign In
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Email Address
            </label>
            <input 
              type="email" 
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Password
            </label>
            <input 
              type="password" 
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Need an account?{' '}
          <Link href="/signup" className="text-blue-500 hover:text-blue-700 font-semibold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}