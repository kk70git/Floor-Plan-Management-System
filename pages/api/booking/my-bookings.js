import dbConnect from '../../../lib/db';
import FloorPlan from '../../../models/FloorPlan';
import User from '../../../models/User';
import withMonitor from '../../../utils/withMonitor';
import authMiddleware from '../../../utils/authMiddleware'; // <--- IMPORT

async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      // GET USER ID FROM TOKEN (Secure)
      // We ignore req.query.userId and trust the token instead
      const userId = req.user.id; 
      
      const allPlans = await FloorPlan.find({});
      let myBookings = [];
      const now = new Date();

      allPlans.forEach(plan => {
        
        // Check MEETING ROOMS
        if (plan.meetingRooms) {
            plan.meetingRooms.forEach(room => {
                if (room.bookings) {
                    room.bookings.forEach(booking => {
                        if (booking.user.toString() === userId && new Date(booking.endTime) > now) {
                            myBookings.push({
                                id: booking._id,
                                roomName: room.name, 
                                type: 'room',
                                floorName: plan.name,
                                floorNumber: plan.floorNumber,
                                startTime: booking.startTime,
                                endTime: booking.endTime
                            });
                        }
                    });
                }
            });
        }

        // Check SEATS
        if (plan.seats) {
            plan.seats.forEach(seat => {
                if (seat.bookings) {
                    seat.bookings.forEach(booking => {
                        if (booking.user.toString() === userId && new Date(booking.endTime) > now) {
                            myBookings.push({
                                id: booking._id,
                                roomName: `Seat ${seat.seatId}`,
                                type: 'seat',
                                floorName: plan.name,
                                floorNumber: plan.floorNumber,
                                startTime: booking.startTime,
                                endTime: booking.endTime
                            });
                        }
                    });
                }
            });
        }

      });

      myBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      return res.status(200).json({ success: true, data: myBookings });

    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default withMonitor(authMiddleware(handler));