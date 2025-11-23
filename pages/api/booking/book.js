import dbConnect from '../../../lib/db';
import FloorPlan from '../../../models/FloorPlan';
import User from '../../../models/User';
import withMonitor from '../../../utils/withMonitor';
import authMiddleware from '../../../utils/authMiddleware'; // <--- IMPORT

async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      const { floorId, roomId, startTime, endTime } = req.body;
      
      // GET USER ID FROM TOKEN (Secure)
      const userId = req.user.id; 

      // VALIDATE TIME LIMITS
      const reqStart = new Date(startTime);
      const reqEnd = new Date(endTime);
      const now = new Date();

      if (reqStart < new Date(now.getTime() - 60000)) {
        return res.status(400).json({ message: "Cannot book a time in the past." });
      }

      if (reqEnd <= reqStart) {
        return res.status(400).json({ message: "End time must be after Start time." });
      }

      // FETCH FLOOR PLAN
      const plan = await FloorPlan.findById(floorId);
      if (!plan) {
        return res.status(404).json({ message: "Floor plan not found" });
      }

      // FIND RESOURCE (Room OR Seat)
      let targetResource = plan.meetingRooms.find(r => r.roomId === roomId);
      let type = 'room';

      if (!targetResource) {
        targetResource = plan.seats.find(s => s.seatId === roomId);
        type = 'seat';
      }

      if (!targetResource) {
        return res.status(404).json({ message: "Room or Seat not found" });
      }

      // CHECK AVAILABILITY
      const isOccupied = targetResource.bookings.some(b => {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return (reqStart < bEnd && reqEnd > bStart);
      });

      if (isOccupied) {
        return res.status(409).json({ message: "This resource is already booked for that time." });
      }

      // ADD BOOKING
      targetResource.bookings.push({
        user: userId,
        startTime: reqStart,
        endTime: reqEnd,
        timestamp: Date.now()
      });

      await plan.save();

      // UPDATE USER HISTORY
      const user = await User.findById(userId);
      const historyIndex = user.bookingHistory.findIndex(h => h.roomId.toString() === roomId);
      
      if (historyIndex > -1) {
        user.bookingHistory[historyIndex].count += 1;
        user.bookingHistory[historyIndex].lastBooked = Date.now();
      } else {
        user.bookingHistory.push({
          roomId: roomId,
          count: 1,
          lastBooked: Date.now()
        });
      }
      await user.save();

      return res.status(200).json({ success: true, message: `${type === 'seat' ? 'Seat' : 'Room'} booked successfully!` });

    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }
}

// Wrap with Auth Middleware AND Monitor
export default withMonitor(authMiddleware(handler));