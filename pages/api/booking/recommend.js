import dbConnect from '../../../lib/db';
import FloorPlan from '../../../models/FloorPlan';
import User from '../../../models/User';
import withMonitor from '../../../utils/withMonitor';
import authMiddleware from '../../../utils/authMiddleware'; 
import { z } from 'zod'; 
import { RecommendationEngine } from '../../../services/RecommendationEngine'; // <--- Import Class

const searchSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  participants: z.coerce.number().min(1),
  type: z.enum(['room', 'seat']).optional(),
  floorNumber: z.coerce.number().optional(), 
});

async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      // 1. Validate
      const validation = searchSchema.safeParse(req.body);
      if (!validation.success) {
         return res.status(400).json({ success: false, message: validation.error.issues[0].message });
      }

      // 2. Gather Data (User & Plans)
      const userId = req.user.id; 
      const currentUser = await User.findById(userId);
      const allPlans = await FloorPlan.find({});
      // 3. OOPS: Instantiate the Engine
      // We create an "Object" that holds the state (user, plans) and behavior (logic)
      const engine = new RecommendationEngine(currentUser, allPlans);

      // 4. Get Results
      const recommendations = engine.findMatches(validation.data);

      return res.status(200).json({ success: true, data: recommendations });

    } catch (error) {
      console.error("API Error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default withMonitor(authMiddleware(handler));