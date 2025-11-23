import jwt from 'jsonwebtoken';

const authMiddleware = (handler) => {
  return async (req, res) => {
    // 1. Check for Token in Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Access Denied: No token provided." });
    }

    const token = authHeader.split(' ')[1];

    try {
      // 2. Verify Token and Extract Payload
      // This throws an error if the token is expired or signed incorrectly
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 3. Inject User Data into the Request
      // req.user now holds { id: userId, role: userRole }
      req.user = decoded; 
        
      // 4. Proceed to the API handler function
      return handler(req, res);

    } catch (error) {
      // Authentication Failed (Error: Invalid/Expired token)
      return res.status(401).json({ message: "Invalid or expired token." });
    }
  };
};

export default authMiddleware;