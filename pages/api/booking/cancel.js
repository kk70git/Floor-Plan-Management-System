import dbConnect from '../../../lib/db';
import FloorPlan from '../../../models/FloorPlan';
import withMonitor from '../../../utils/withMonitor';
import authMiddleware from '../../../utils/authMiddleware';
import { z } from 'zod';

const cancelSchema = z.object({
  bookingId: z.string().min(1, { message: "Booking ID is required" }),
  type: z.enum(['room', 'seat']), 
});

async function handler(req, res) {
  await dbConnect();

  if (req.method === 'DELETE') {
    try {
      const userId = req.user.id; // Secure User ID from token

      // 1. Validate Input
      const validation = cancelSchema.safeParse(req.body);
      if (!validation.success) {
         return res.status(400).json({ success: false, message: validation.error.issues[0].message });
      }

      const { bookingId, type } = validation.data;
      let result;

      // 2. Attempt to remove from ROOMS
      if (type === 'room') {
        result = await FloorPlan.updateOne(
          { "meetingRooms.bookings._id": bookingId }, 
          { 
            $pull: { 
              "meetingRooms.$.bookings": { _id: bookingId, user: userId } 
            } 
          }
        );
      }

      // 3. Attempt to remove from SEATS
      if (type === 'seat') {
        result = await FloorPlan.updateOne(
          { "seats.bookings._id": bookingId }, 
          { 
            $pull: { 
              "seats.$.bookings": { _id: bookingId, user: userId } 
            } 
          }
        );
      }

      // 4. Check if anything was actually modified
      if (result.modifiedCount > 0) {
        return res.status(200).json({ success: true, message: "Booking cancelled successfully." });
      } else {
        return res.status(404).json({ success: false, message: "Booking not found or you are not authorized to cancel it." });
      }

    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}

export default withMonitor(authMiddleware(handler));