import { useRouter } from 'next/router';

const SignOutButton = () => {
  const router = useRouter();

  const handleSignOut = () => {
    // 1. Remove Authentication Tokens & Data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('offline_floor_plan'); 

    // 2. Redirect the user to the login page
    alert("👋 You have been logged out securely.");
    router.push('/login');
  };

  return (
    <button 
      onClick={handleSignOut}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded shadow transition-colors"
    >
      Sign Out
    </button>
  );
};

export default SignOutButton;