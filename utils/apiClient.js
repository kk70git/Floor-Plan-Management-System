const API_BASE_URL = '/api';

export const callSecuredApi = async (endpoint, method = 'GET', body = null) => {
  const token = localStorage.getItem('auth_token');
  
  // 1. Inject the Token into the Authorization Header
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  };

  const config = {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  // 2. Universal 401/403 Check (Session Integrity)
  if (response.status === 401 || response.status === 403) {
    // Session expired or unauthorized role access. Force logout.
    localStorage.removeItem('auth_token');
    localStorage.removeItem('active_user_id');
    localStorage.removeItem('user_role');
    
    // Redirect the user immediately
    window.location.href = '/login'; 
    
    throw new Error('Session expired or unauthorized. Redirecting to login.');
  }
  
  return response;
};