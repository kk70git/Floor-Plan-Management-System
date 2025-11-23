import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTheme } from '../context/ThemeContext';
import { z } from 'zod'; 

const signupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  name: z.string().min(1, { message: "Full Name is required." }),
  // Secret key is optional in schema, but we check logic manually
  secretKey: z.string().optional(),
});

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); 
  const [secretKey, setSecretKey] = useState(''); // <--- NEW STATE
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const userData = parseJwt(token);
      const userRole = userData ? userData.role : 'user';

      if (userRole === 'admin' || userRole === 'superadmin') {
        router.replace('/admin/upload');
      } else {
        router.replace('/booking/search');
      }
    }
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();

    const formData = { name, email, password, secretKey };
    const validation = signupSchema.safeParse(formData);

    if (!validation.success) {
      alert(`❌ ${validation.error.issues[0].message}`);
      return; 
    }

    // Frontend check: Ensure key is entered if role is privileged
    if (role !== 'user' && !secretKey) {
        alert("❌ You must enter the Secret Key to sign up for this role.");
        return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, secretKey }), // Send key
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ Account Created! Please Login.");
        router.push('/login');
      } else {
        alert("❌ Error: " + data.message);
      }
    } catch (error) {
      alert("❌ Network Error: Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-200 p-4 relative">
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
          Create Account 🆕
        </h2>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Full Name
            </label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Email Address
            </label>
            <input 
              type="email" 
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john@company.com"
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
              placeholder="Create a password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {/* Role Selection */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Select Role
            </label>
            <select 
              value={role} 
              onChange={(e) => {
                  setRole(e.target.value);
                  setSecretKey(''); // Clear key on role change
              }} 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          {/* NEW: Conditional Secret Key Input */}
          {role !== 'user' && (
              <div className="animate-fade-in">
                <label className="block text-red-600 dark:text-red-400 text-sm font-bold mb-2">
                  🔑 Enter {role === 'admin' ? 'Admin' : 'Super Admin'} Secret Key
                </label>
                <input 
                  type="password" 
                  required
                  className="w-full px-3 py-2 border-2 border-red-300 dark:border-red-800 rounded bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Secret Passkey"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 mt-2"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-500 hover:text-blue-700 font-semibold">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}