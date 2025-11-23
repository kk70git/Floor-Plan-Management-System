import dbConnect from '../lib/db';
import SystemLog from '../models/SystemLog';

const withMonitor = (handler) => {
  return async (req, res) => {
    const start = Date.now();

    // Intercept the 'res.json' and 'res.status' methods to capture data
    const originalJson = res.json;
    const originalStatus = res.status;
    
    let capturedStatus = 200; // Default status

    // Hook into res.status
    res.status = (statusCode) => {
      capturedStatus = statusCode;
      return originalStatus.call(res, statusCode);
    };

    // Hook into res.json (this is where the response actually finishes)
    res.json = (body) => {
      const duration = Date.now() - start;

      // Fire-and-forget logging (don't await, so we don't slow down the user)
      (async () => {
        try {
          await dbConnect();
          await SystemLog.create({
            path: req.url,
            method: req.method,
            status: capturedStatus,
            duration: duration
          });
        } catch (error) {
          console.error("System Monitor Error:", error);
        }
      })();

      return originalJson.call(res, body);
    };

    return handler(req, res);
  };
};

export default withMonitor;