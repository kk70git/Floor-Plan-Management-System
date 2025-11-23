import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// Helper to extract data from JWT (Client-Side Decoding)
const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

const withAuth = (WrappedComponent, allowedRoles = []) => {
  return (props) => {
    const router = useRouter();
    const [verified, setVerified] = useState(false);

    useEffect(() => {
      // 1. Check for the JWT Token
      const token = localStorage.getItem('auth_token');

      // CASE A: Not Logged In (No Token) -> Go to Login
      if (!token) {
        router.replace('/login');
        return;
      }

      // 2. Decode Token to get Role directly from the source
      const userData = parseJwt(token);
      
      // If token is malformed (decoding failed), clear it and logout
      if (!userData || !userData.role) {
        localStorage.removeItem('auth_token');
        router.replace('/login');
        return;
      }

      const userRole = userData.role;

      // 3. Check Role Permission
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        alert("⛔ Access Denied: You do not have permission.");
        
        // Intelligent Redirect
        if (userRole === 'user') {
          router.replace('/booking/search');
        } else {
          router.replace('/login');
        }
        return;
      }

      // CASE C: Token Valid & Role Authorized
      setVerified(true);
    }, []);

    if (!verified) {
      return <div style={{ padding: '50px', textAlign: 'center' }}>Verifying Secure Access... 🔒</div>;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;