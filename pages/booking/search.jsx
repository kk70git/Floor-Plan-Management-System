import { useState, useEffect } from 'react';
import withAuth from '../../components/withAuth';
import SignOutButton from '../../components/SignOutButton';
import NotificationList from '../../components/NotificationList'; 
import { callSecuredApi } from '../../utils/apiClient';
import { useTheme } from '../../context/ThemeContext';
import { MapPin, Users, Star, TrendingUp, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'; // ADDED: Chevron Icons

function BookingSearch() {
  const [participants, setParticipants] = useState(1);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [searchType, setSearchType] = useState('room'); 
  const [results, setResults] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [notifications, setNotifications] = useState([]); 
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(false);

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Adjust this number to show more/less items

  const { theme, toggleTheme } = useTheme();

  const getCurrentDateTime = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const userData = parseJwt(token);
      if (userData && userData.role) {
        setUserRole(userData.role);
      }
      fetchMyBookings();
      fetchNotifications(); 
    }
  }, []);

  // --- PAGINATION LOGIC ---
  // Calculate which items to display for the current page
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResults = results.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(results.length / itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  // ------------------------

  const fetchMyBookings = async () => {
      try {
        const res = await callSecuredApi('/booking/my-bookings', 'GET');
        const data = await res.json();
        if (data.success) setMyBookings(data.data);
      } catch (err) { console.error("Failed to fetch bookings"); }
  };

  const fetchNotifications = async () => {
    try {
        const res = await callSecuredApi('/user/notifications', 'GET');
        const data = await res.json();
        if (data.success) setNotifications(data.data);
    } catch (err) { console.error("Failed to fetch notifications"); }
  };

  const handleDismiss = async (id) => {
      try {
        await callSecuredApi('/user/notifications', 'PUT', { notificationId: id });
        setNotifications(notifications.filter(n => n._id !== id));
      } catch (e) { console.error(e); }
  };

  const handleDismissAll = async () => {
      try {
        await callSecuredApi('/user/notifications', 'PUT', {});
        setNotifications([]);
      } catch (e) { console.error(e); }
  };

  const handleCancelBooking = async (bookingId, type, name) => {
    if (!confirm(`Are you sure you want to cancel your booking for ${name}?`)) return;

    try {
      const res = await callSecuredApi('/booking/cancel', 'DELETE', { bookingId, type });
      const data = await res.json();

      if (data.success) {
        alert("✅ Booking Cancelled.");
        fetchMyBookings(); 
      } else {
        alert("❌ Error: " + data.message);
      }
    } catch (err) {
      alert("Failed to cancel booking.");
    }
  };

  const handleSwitchType = (type) => {
      setSearchType(type);
      setResults([]); 
      setCurrentPage(1); // Reset page on switch
      if (type === 'seat') setParticipants(1);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);

    const selectedStart = new Date(startTime);
    const now = new Date();

    if (selectedStart < now) {
      alert("❌ You cannot travel back in time! Please choose a future time.");
      setLoading(false);
      return;
    }

    if (new Date(endTime) <= selectedStart) {
      alert("❌ End time must be after Start time.");
      setLoading(false);
      return;
    }

    try {
      const response = await callSecuredApi('/booking/recommend', 'POST', {
          type: searchType, 
          participants: searchType === 'seat' ? 1 : Number(participants), 
          startTime,
          endTime
      });
      
      const data = await response.json();
      setResults(data.data || []);
      setCurrentPage(1); // Reset to Page 1 on new search
    } catch (error) {
      alert("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (item) => {
    if (new Date(startTime) < new Date()) {
        alert("❌ Time has passed since you searched. Please update your start time.");
        return;
    }

    if(!confirm(`Confirm booking for ${item.roomName}?`)) return;

    const response = await callSecuredApi('/booking/book', 'POST', {
        floorId: item.floorId,
        roomId: item.roomId,
        startTime,
        endTime
    });
    const result = await response.json();
    
    if (result.success) {
      alert(`✅ ${searchType === 'seat' ? 'Seat' : 'Room'} Booked!`);
      setResults([]);
      fetchMyBookings(); 
    } else {
      alert("❌ Error: " + result.message);
    }
  };

  const inputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors";
  const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1";
  const cardClass = "bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 font-sans p-6">
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
         <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Smart Booking </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Logged in as <span className="font-bold text-blue-600 dark:text-blue-400">{userRole.toUpperCase()}</span>
            </p>
         </div>
         <div className="flex items-center gap-3">
            <button 
                onClick={toggleTheme}
                className="p-2 rounded bg-white dark:bg-gray-800 text-gray-600 dark:text-yellow-400 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
            >
                {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <SignOutButton />
         </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: SEARCH */}
        <div className="space-y-6">
            <div className={cardClass}>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
                    <button 
                        onClick={() => handleSwitchType('room')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${searchType === 'room' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        🏢 Meeting Room
                    </button>
                    <button 
                        onClick={() => handleSwitchType('seat')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${searchType === 'seat' ? 'bg-white dark:bg-gray-600 shadow text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        🪑 Hot Desk
                    </button>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                    {searchType === 'room' && (
                        <div>
                            <label className={labelClass}>Participants</label>
                            <input type="number" min="1" value={participants} onChange={(e) => setParticipants(e.target.value)} className={inputClass} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Start Time</label>
                            <input type="datetime-local" min={getCurrentDateTime()} value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>End Time</label>
                            <input type="datetime-local" min={startTime || getCurrentDateTime()} value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={inputClass} />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition-all disabled:opacity-70">
                        {loading ? 'Searching...' : `Find Best ${searchType === 'room' ? 'Rooms' : 'Seats'}`}
                    </button>
                </form>
            </div>

            {results.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            Available {searchType === 'room' ? 'Rooms' : 'Seats'}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Showing {currentResults.length} of {results.length}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {/* Map over currentResults instead of results */}
                        {currentResults.map((item, index) => (
                        <div key={item.roomId} className={`${cardClass} flex justify-between items-start border-l-4 ${((currentPage - 1) * itemsPerPage + index) === 0 ? 'border-l-green-500 ring-2 ring-green-100 dark:ring-green-900' : 'border-l-gray-300 dark:border-l-gray-600'}`}>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-white">
                                        {searchType === 'seat' ? '🪑' : '🏢'} {item.roomName}
                                    </h4>
                                    {/* Show badge only for the absolute first item on page 1 */}
                                    {currentPage === 1 && index === 0 && (
                                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold border border-green-200">
                                            🏆 Best Match
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Floor {item.floorNumber} ({item.floorName})
                                </p>
                                
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-medium border ${
                                        item.matchScore > 900 
                                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800' 
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                                    }`}>
                                        <TrendingUp size={12} /> Score: {item.matchScore.toFixed(0)}
                                    </span>

                                    {item.usageCount > 0 && (
                                        <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded font-medium border border-yellow-200 dark:border-yellow-800">
                                            <Star size={12} fill="currentColor" /> Booked {item.usageCount}x
                                        </span>
                                    )}

                                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-medium border border-blue-100 dark:border-blue-800">
                                        <Users size={12} /> Cap: {item.capacity}
                                    </span>

                                    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded font-medium">
                                        <MapPin size={12} /> {item.distance.toFixed(0)}m walk
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleBook(item)}
                                className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded shadow transition-colors"
                            >
                                Book
                            </button>
                        </div>
                        ))}
                    </div>

                    {/* --- PAGINATION CONTROLS --- */}
                    {results.length > itemsPerPage && (
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <button 
                                onClick={prevPage} 
                                disabled={currentPage === 1}
                                className="p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button 
                                onClick={nextPage} 
                                disabled={currentPage === totalPages}
                                className="p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                    {/* --------------------------- */}

                </div>
            )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
            <NotificationList 
                notifications={notifications}
                onDismiss={handleDismiss}
                onDismissAll={handleDismissAll}
            />

            <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">📅 My Upcoming Bookings</h3>
                {myBookings.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center text-gray-500">
                        No active bookings found.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {myBookings.map((booking) => (
                            <div key={booking.id} className={`${cardClass} border-l-4 border-l-blue-500 relative overflow-hidden`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-lg text-gray-800 dark:text-white">{booking.roomName}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${booking.type === 'room' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'}`}>
                                            {booking.type}
                                        </span>
                                        
                                        <button 
                                            onClick={() => handleCancelBooking(booking.id, booking.type, booking.roomName)}
                                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                            title="Cancel Booking"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    📍 {booking.floorName} <span className="text-gray-400 mx-1">•</span> Floor {booking.floorNumber}
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3 text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Start:</span>
                                        <span className="text-gray-800 dark:text-gray-200">{new Date(booking.startTime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">End:</span>
                                        <span className="text-gray-800 dark:text-gray-200">{new Date(booking.endTime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}

export default withAuth(BookingSearch);