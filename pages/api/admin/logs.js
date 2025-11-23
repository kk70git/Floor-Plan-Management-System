import dbConnect from '../../../lib/db';
import SystemLog from '../../../models/SystemLog';
import authMiddleware from '../../../utils/authMiddleware';

async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      // 1. AUTH CHECK
      const userRole = req.user.role;
      if (userRole !== 'admin' && userRole !== 'superadmin') {
          return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // 2. PAGINATION PARAMS
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10; // Default to 10 logs per page
      const skip = (page - 1) * limit;

      // 3. AGGREGATE STATS (Global stats, not affected by pagination)
      const stats = await SystemLog.aggregate([
        {
          $group: {
            _id: null,
            avgDuration: { $avg: "$duration" },
            totalRequests: { $sum: 1 },
            errorCount: { 
              $sum: { 
                $cond: [{ $gte: ["$status", 400] }, 1, 0] 
              }
            }
          }
        }
      ]);

      // 4. FETCH PAGINATED LOGS
      const totalLogs = await SystemLog.countDocuments({});
      const totalPages = Math.ceil(totalLogs / limit);

      const recentLogs = await SystemLog.find({})
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      const metrics = stats[0] || { avgDuration: 0, totalRequests: 0, errorCount: 0 };

      return res.status(200).json({ 
        success: true, 
        metrics: {
            avgDuration: Math.round(metrics.avgDuration),
            totalRequests: metrics.totalRequests,
            errorCount: metrics.errorCount,
            successRate: metrics.totalRequests ? ((1 - (metrics.errorCount / metrics.totalRequests)) * 100).toFixed(1) : 100
        },
        logs: recentLogs,
        pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalLogs: totalLogs
        }
      });

    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default authMiddleware(handler);