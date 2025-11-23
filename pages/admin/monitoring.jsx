import { useState, useEffect } from 'react';
import withAuth from '../../components/withAuth';
import SignOutButton from '../../components/SignOutButton';
import { callSecuredApi } from '../../utils/apiClient';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'next/router'; // <-- NEW IMPORT

function SystemMonitoring() {
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { theme, toggleTheme } = useTheme();
  const router = useRouter(); // <-- GET ROUTER INSTANCE

  const fetchStats = async (page = 1) => {
// ... (rest of fetchStats remains the same) ...
    try {
      // Pass the page number to the API
      const res = await callSecuredApi(`/admin/logs?page=${page}&limit=10`, 'GET');
      const data = await res.json();
      
      if (data.success) {
        setMetrics(data.metrics);
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error("Monitor fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
        setLoading(true); 
    }
  };
  
  useEffect(() => {
    fetchStats(currentPage);
    const interval = setInterval(() => fetchStats(currentPage), 5000);
    return () => clearInterval(interval);
  }, [currentPage]);

  // Helper Styles
  const cardClass = "bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700";
  const headerClass = "text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider font-semibold";
  const valueClass = "text-3xl font-bold text-gray-800 dark:text-white mt-2";

  if (loading && !metrics) return <div className="p-10 text-center dark:text-white">Loading System Vitals... 💓</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 font-sans p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">System Health Monitor 🩺</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Real-time performance metrics and traffic logs.</p>
            </div>
            <div className="flex items-center gap-3">
                {/* NEW: DASHBOARD BUTTON */}
                <button 
                    onClick={() => router.push('/admin/upload')}
                    className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md transition-colors"
                >
                    Go to Dashboard
                </button>
                {/* END NEW BUTTON */}
                <button 
                    onClick={toggleTheme}
                    className="p-2 rounded bg-white dark:bg-gray-800 text-gray-600 dark:text-yellow-400 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                >
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <SignOutButton />
            </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`${cardClass} border-t-4 border-t-blue-500`}>
                <div className={headerClass}>Total Requests</div>
                <div className={valueClass}>{metrics?.totalRequests}</div>
            </div>
            <div className={`${cardClass} border-t-4 ${metrics?.avgDuration > 500 ? 'border-t-red-500' : 'border-t-green-500'}`}>
                <div className={headerClass}>Avg Latency</div>
                <div className={valueClass}>{metrics?.avgDuration} ms</div>
            </div>
            <div className={`${cardClass} border-t-4 ${metrics?.errorCount > 0 ? 'border-t-orange-500' : 'border-t-green-500'}`}>
                <div className={headerClass}>Error Rate</div>
                <div className={valueClass}>{metrics?.errorCount}</div>
            </div>
            <div className={`${cardClass} border-t-4 border-t-cyan-500`}>
                <div className={headerClass}>Success Rate</div>
                <div className={valueClass}>{metrics?.successRate}%</div>
            </div>
        </div>

        {/* TRAFFIC LOGS TABLE */}
        <div className={cardClass}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Recent Traffic Log</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                            <th className="p-3 rounded-tl-lg">Time</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Path</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 rounded-tr-lg">Latency</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {logs.map((log) => (
                            <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-800 dark:text-gray-300">
                                <td className="p-3">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        log.method === 'GET' 
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    }`}>
                                        {log.method}
                                    </span>
                                </td>
                                <td className="p-3 font-mono text-xs text-gray-600 dark:text-gray-400">{log.path}</td>
                                <td className="p-3">
                                    <span className={`font-bold ${
                                        log.status >= 400 
                                        ? 'text-red-600 dark:text-red-400' 
                                        : 'text-green-600 dark:text-green-400'
                                    }`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="p-3">{log.duration} ms</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="mt-6 flex justify-center items-center gap-2">
                <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Prev
                </button>

                {/* Page Numbers */}
                {[...Array(totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    if (pageNum < currentPage - 2 || pageNum > currentPage + 2) return null;

                    return (
                        <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 rounded font-bold transition-colors ${
                                currentPage === pageNum 
                                ? 'bg-blue-600 text-white shadow' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}

                <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Next
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}


export default withAuth(SystemMonitoring, ['admin', 'superadmin']);