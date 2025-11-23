import dbConnect from '../../../lib/db';
import Notification from '../../../models/Notification';
import authMiddleware from '../../../utils/authMiddleware';
import withMonitor from '../../../utils/withMonitor';

async function handler(req, res) {
  await dbConnect();
  const userId = req.user.id;

  // --- GET: Fetch Unread Notifications ---
  if (req.method === 'GET') {
    try {
        const notifications = await Notification.find({ userId, isRead: false })
            .sort({ timestamp: -1 }); // Newest first
        return res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
  }

  // --- PUT: Mark as Read (Dismiss) ---
  if (req.method === 'PUT') {
      try {
          const { notificationId } = req.body;
          
          if (notificationId) {
            // Dismiss one
            await Notification.findByIdAndUpdate(notificationId, { isRead: true });
          } else {
            // Dismiss ALL
            await Notification.updateMany({ userId, isRead: false }, { isRead: true });
          }
          
          return res.status(200).json({ success: true });
      } catch (error) {
          return res.status(500).json({ success: false, error: error.message });
      }
  }
}

export default withMonitor(authMiddleware(handler));