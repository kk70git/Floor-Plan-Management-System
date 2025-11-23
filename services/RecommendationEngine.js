// This class Encapsulates the logic for finding the best room.
export class RecommendationEngine {
  
  constructor(user, allPlans) {
    this.user = user;
    this.plans = allPlans;
    // Encapsulated Constants
    this.BUILDING_ENTRANCE = { x: 0, y: 0, floorNumber: 0 };
    this.VERTICAL_PENALTY = 20;
    this.BASE_SCORE = 1000;
  }

  /**
   * Calculates 3D distance from the main entrance.
   * @private (Encapsulation)
   */
  _calculateDistance(targetFloor, targetX, targetY) {
    const dx = targetX - this.BUILDING_ENTRANCE.x;
    const dy = targetY - this.BUILDING_ENTRANCE.y;
    const floorDiff = targetFloor - this.BUILDING_ENTRANCE.floorNumber;
    const dz = floorDiff * this.VERTICAL_PENALTY;
    
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  /**
   * Calculates the smart score based on distance and usage history.
   * @private
   */
  _calculateScore(distance, usageCount) {
    let score = this.BASE_SCORE - distance + (usageCount * 10);
    return score < 0 ? 0 : score;
  }

  /**
   * Main public method to get sorted recommendations.
   */
  findMatches(searchParams) {
    const { startTime, endTime, participants, type, floorNumber } = searchParams;
    const searchType = type || 'room';
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Build User Preferences Map
    const preferences = {};
    if (this.user && this.user.bookingHistory) {
      this.user.bookingHistory.forEach(h => {
        preferences[h.roomId] = h.count;
      });
    }

    let recommendations = [];

    this.plans.forEach(plan => {
      // Filter by Floor if requested
      if (floorNumber !== undefined && plan.floorNumber !== floorNumber) return;

      const itemsToCheck = (searchType === 'seat') ? (plan.seats || []) : (plan.meetingRooms || []);

      itemsToCheck.forEach(item => {
        // 1. Capacity Check
        const capacityOk = (searchType === 'seat') ? (participants <= 1) : (item.capacity >= participants);

        if (capacityOk) {
          // 2. Availability Check
          let isAvailable = true;
          if (item.bookings) {
            for (let booking of item.bookings) {
              const bStart = new Date(booking.startTime);
              const bEnd = new Date(booking.endTime);
              if (start < bEnd && end > bStart) {
                isAvailable = false;
                break;
              }
            }
          }

          if (isAvailable) {
            const itemCoordinates = item.coordinates || {x:0, y:0};
            
            // Use Class Methods
            const distance = this._calculateDistance(
              plan.floorNumber, 
              itemCoordinates.x, 
              itemCoordinates.y
            );

            const uniqueId = (searchType === 'seat') ? item.seatId : item.roomId;
            const usageCount = preferences[uniqueId] || 0;
            const score = this._calculateScore(distance, usageCount);

            recommendations.push({
              roomName: item.name || `Seat ${item.seatId}`,
              roomId: uniqueId,     
              dbId: item._id,           
              floorName: plan.name,
              floorNumber: plan.floorNumber,
              floorId: plan._id,
              capacity: (searchType === 'seat') ? 1 : item.capacity,
              distance: distance,
              usageCount: usageCount,
              matchScore: score 
            });
          }
        }
      });
    });

    // Sort Descending by Score
    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
  }
}