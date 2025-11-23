import { useState, useEffect } from 'react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import withAuth from '../../components/withAuth';
import SignOutButton from '../../components/SignOutButton';
import { callSecuredApi } from '../../utils/apiClient';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'next/router';
import { z } from 'zod'; 

// 1. Room Schema
const roomValidationSchema = z.object({
  roomId: z.coerce.number().gt(0, { message: "Room ID must be greater than 0" }), 
  name: z.string().min(1, { message: "Room Name is required" }),
  capacity: z.coerce.number().min(5, { message: "Capacity must be at least 5" }),
});

// 2. Floor Schema
const floorValidationSchema = z.object({
  name: z.string().min(1, { message: "Floor Name is required" }),
  floorNumber: z.coerce.number().min(0, { message: "Floor Number cannot be negative" }), 
});

// 3. UPDATED: Strict Seat Schema (S-1 format)
const seatValidationSchema = z.object({
  // Regex: Starts with 'S', followed by '-', followed by one or more digits.
  seatId: z.string().regex(/^S-\d+$/, { message: "Seat ID must follow strict 'S-Number' format (e.g., S-1, S-45)" }),
  x: z.coerce.number(),
  y: z.coerce.number(),
});

function AdminDashboard() {
  const [existingPlans, setExistingPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(''); 
  const [floorName, setFloorName] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [currentVersion, setCurrentVersion] = useState(0);

  const [rooms, setRooms] = useState([]);
  const [seats, setSeats] = useState([]);
  
  const [roomForm, setRoomForm] = useState({ roomId: '', name: '', capacity: 10, x: 0, y: 0 });
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [seatForm, setSeatForm] = useState({ seatId: '', x: 0, y: 0 });

  const { status, saveDataLocally } = useOfflineSync('/api/admin/floorplan');
  const { theme, toggleTheme } = useTheme();

   const router = useRouter();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
        const res = await callSecuredApi('/admin/floorplan', 'GET'); 
        const data = await res.json();
        if (data.success) setExistingPlans(data.data);
    } catch (err) {
        console.error("Failed to load plans");
    }
  };


  const handleSelectPlan = (planId) => {
    setSelectedPlanId(planId);
    if (planId === '') {
        setFloorName(''); setFloorNumber(''); setRooms([]); setSeats([]); setCurrentVersion(0);
    } else {
        const plan = existingPlans.find(p => p._id === planId);
        if (plan) {
            setFloorName(plan.name); setFloorNumber(plan.floorNumber);
            
            const flatten = (item) => ({
                ...item,
                x: item.coordinates ? item.coordinates.x : (item.x || 0),
                y: item.coordinates ? item.coordinates.y : (item.y || 0)
            });

            setRooms(plan.meetingRooms ? plan.meetingRooms.map(flatten) : []); 
            setSeats(plan.seats ? plan.seats.map(flatten) : []); 
            setCurrentVersion(plan.version);
        }
    }
  };

  const handleAddOrUpdateRoom = (e) => {
    e.preventDefault();

    const validation = roomValidationSchema.safeParse(roomForm);
    if (!validation.success) {
        alert(`❌ ${validation.error.issues[0].message}`);
        return;
    }

    if (!isEditingRoom) {
        if (rooms.some(r => r.roomId === roomForm.roomId)) {
            alert("Room ID must be unique on this floor!");
            return;
        }
    }

    const roomToSave = { ...roomForm };
    delete roomToSave.coordinates; 

    if (isEditingRoom) {
        setRooms(rooms.map(r => r.roomId === roomForm.roomId ? roomToSave : r));
        setIsEditingRoom(false);
    } else {
        setRooms([...rooms, roomToSave]);
    }
    setRoomForm({ roomId: '', name: '', capacity: 10, x: 0, y: 0 });
  };

  const handleEditRoomClick = (room) => { setRoomForm(room); setIsEditingRoom(true); };
  const handleDeleteRoomClick = (roomIdToDelete) => { if(confirm("Remove this room?")) { setRooms(rooms.filter(r => r.roomId !== roomIdToDelete)); } };

  const handleAddSeat = (e) => {
    e.preventDefault();

    // Validate with Strict Regex
    const validation = seatValidationSchema.safeParse(seatForm);
    if (!validation.success) {
        alert(`❌ ${validation.error.issues[0].message}`);
        return;
    }

    if (seats.some(s => s.seatId === seatForm.seatId)) { 
        alert("Seat ID already exists on this floor!"); 
        return; 
    }
    
    setSeats([...seats, seatForm]);
    setSeatForm({ seatId: '', x: 0, y: 0 });
  };

  const handleDeleteSeat = (seatId) => { setSeats(seats.filter(s => s.seatId !== seatId)); };

  const handleSaveFloorPlan = async () => {
    const validation = floorValidationSchema.safeParse({ name: floorName, floorNumber });
    if (!validation.success) {
        alert(`❌ ${validation.error.issues[0].message}`);
        return;
    }

    const formatResource = (item) => ({
        ...item,
        coordinates: {
            x: Number(item.x || 0),
            y: Number(item.y || 0)
        }
    });

    const payload = {
        _id: selectedPlanId || undefined,
        name: floorName,
        floorNumber: Number(floorNumber),
        meetingRooms: rooms.map(formatResource), 
        seats: seats.map(formatResource), 
        version: selectedPlanId ? currentVersion : 1,
    };

    if (status === 'Online') {
        try {
            const res = await callSecuredApi('/admin/floorplan', 'POST', payload);
            const result = await res.json();
            
            if (res.ok) {
                alert(result.message);
                fetchPlans();
                if (!selectedPlanId) handleSelectPlan('');
            } else {
                alert("❌ Error: " + result.message);
            }
        } catch (error) {
            alert("Network Error: Could not connect to API.");
        }
    } else {
        saveDataLocally(payload);
    }
  };

  const handleDeleteFloor = async () => {
      if (!selectedPlanId) return;
      if (!confirm("Delete this floor, all rooms, AND all seats?")) return;

      try {
        const res = await callSecuredApi(`/admin/floorplan?id=${selectedPlanId}`, 'DELETE');
        const result = await res.json(); 

        if (res.ok) {
            alert(result.message); 
            fetchPlans();
            handleSelectPlan('');
        } else {
            alert("Error deleting floor: " + result.message);
        }
      } catch (e) { console.error(e); }
  };

  const inputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors";
  const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 font-sans p-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1"></p>
        </div>
        <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {status}
            </span>
            <button onClick={toggleTheme} className="p-2 rounded bg-white dark:bg-gray-800 text-gray-600 dark:text-yellow-400 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button 
                    onClick={() => router.push('/admin/monitoring')}
                    className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md transition-colors"
                >
                    System Monitor
            </button>
            <SignOutButton />
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <label className={labelClass}>Select Floor to Edit</label>
                <select value={selectedPlanId} onChange={(e) => handleSelectPlan(e.target.value)} className={inputClass}>
                    <option value="">-- Create New Floor --</option>
                    {existingPlans.map(p => (
                        <option key={p._id} value={p._id}>{p.name} (Floor {p.floorNumber})</option>
                    ))}
                </select>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b dark:border-gray-700 pb-2">Floor Details</h3>
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Floor Name</label>
                        <input type="text" value={floorName} onChange={e => setFloorName(e.target.value)} className={inputClass} placeholder="e.g. Engineering Wing" />
                    </div>
                    <div>
                        <label className={labelClass}>Floor Number</label>
                        <input type="number" value={floorNumber} onChange={e => setFloorNumber(e.target.value)} className={inputClass} placeholder="e.g. 3" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col gap-3">
                <button onClick={handleSaveFloorPlan} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition-all">
                    {selectedPlanId ? 'Save Changes' : 'Create Floor Plan'}
                </button>
                {selectedPlanId && (
                    <button onClick={handleDeleteFloor} className="w-full py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded shadow-sm border border-red-200 transition-all">
                        Delete Entire Floor
                    </button>
                )}
            </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                    {isEditingRoom ? '✏️ Edit Room' : '🏢 Add Meeting Room'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                    <div className="col-span-2 md:col-span-1">
                        <input placeholder="ID" value={roomForm.roomId} onChange={e => setRoomForm({...roomForm, roomId: e.target.value})} disabled={isEditingRoom} className={inputClass} />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                        <input placeholder="Name" value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} className={inputClass} />
                    </div>
                    <div className="col-span-1">
                        <input type="number" placeholder="Cap" value={roomForm.capacity} onChange={e => setRoomForm({...roomForm, capacity: e.target.value})} className={inputClass} />
                    </div>
                    <div className="col-span-1">
                        <input type="number" placeholder="X" value={roomForm.x} onChange={e => setRoomForm({...roomForm, x: e.target.value})} className={inputClass} />
                    </div>
                    <div className="col-span-1">
                        <input type="number" placeholder="Y" value={roomForm.y} onChange={e => setRoomForm({...roomForm, y: e.target.value})} className={inputClass} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAddOrUpdateRoom} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-sm transition-colors">
                        {isEditingRoom ? 'Update Room' : 'Add Room'}
                    </button>
                    {isEditingRoom && (
                        <button onClick={() => { setIsEditingRoom(false); setRoomForm({roomId:'', name:'', capacity:10, x:0, y:0}); }} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium text-sm transition-colors">
                            Cancel
                        </button>
                    )}
                </div>
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                                <th className="p-3 rounded-tl-lg">ID</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Capacity</th>
                                <th className="p-3">Coordinates</th>
                                <th className="p-3 rounded-tr-lg text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {rooms.length === 0 && (
                                <tr><td colSpan="5" className="p-4 text-center text-gray-500 italic">No meeting rooms added yet.</td></tr>
                            )}
                            {rooms.map((r) => (
                                <tr key={r.roomId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-800 dark:text-gray-300">
                                    <td className="p-3 font-medium">{r.roomId}</td>
                                    <td className="p-3">{r.name}</td>
                                    <td className="p-3">{r.capacity}</td>
                                    <td className="p-3 text-gray-500">{r.coordinates ? `${r.coordinates.x}, ${r.coordinates.y}` : `${r.x}, ${r.y}`}</td>
                                    <td className="p-3 text-right space-x-2">
                                        <button onClick={() => handleEditRoomClick(r)} className="text-blue-500 hover:text-blue-700">✏️</button>
                                        <button onClick={() => handleDeleteRoomClick(r.roomId)} className="text-red-500 hover:text-red-700">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">🪑 Add Hot Desk / Seat</h3>
                <div className="flex flex-wrap items-end gap-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="w-24">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">ID</label>
                        <input placeholder="S-1" value={seatForm.seatId} onChange={e => setSeatForm({...seatForm, seatId: e.target.value})} className={`${inputClass} text-sm`} />
                    </div>
                    <div className="w-20">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">X</label>
                        <input type="number" placeholder="0" value={seatForm.x} onChange={e => setSeatForm({...seatForm, x: e.target.value})} className={`${inputClass} text-sm`} />
                    </div>
                    <div className="w-20">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">Y</label>
                        <input type="number" placeholder="0" value={seatForm.y} onChange={e => setSeatForm({...seatForm, y: e.target.value})} className={`${inputClass} text-sm`} />
                    </div>
                    <button onClick={handleAddSeat} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-sm transition-colors h-[38px]">
                        + Add
                    </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {seats.length === 0 && <span className="text-gray-400 text-sm italic">No seats added.</span>}
                    {seats.map(s => (
                        <span key={s.seatId} className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-100 dark:border-purple-800">
                            🪑 {s.seatId}
                            <button onClick={() => handleDeleteSeat(s.seatId)} className="text-purple-400 hover:text-red-500 font-bold leading-none">×</button>
                        </span>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(AdminDashboard, ['admin', 'superadmin']);