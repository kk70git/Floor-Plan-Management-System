import { X, Bell } from 'lucide-react';

export default function NotificationList({ notifications, onDismiss, onDismissAll }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-end mb-4">
        {/* REMOVED: animate-pulse */}
        <h3 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
          <Bell size={20} /> Notifications
        </h3>
        <button 
          onClick={onDismissAll} 
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline transition-colors"
        >
          Clear All
        </button>
      </div>
      
      <div className="space-y-3">
        {notifications.map(n => (
          <div key={n._id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg relative shadow-sm transition-all hover:shadow-md">
            <div className="pr-6">
              <p className="font-bold text-red-800 dark:text-red-300 text-sm mb-1">
                {n.reason || "Alert"}
              </p>
              <p className="text-gray-800 dark:text-gray-200 text-sm">
                {n.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {new Date(n.timestamp).toLocaleString()}
              </p>
            </div>
            <button 
              onClick={() => onDismiss(n._id)}
              className="absolute top-2 right-2 text-red-400 hover:text-red-600 dark:hover:text-red-200 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}