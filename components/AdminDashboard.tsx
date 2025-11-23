import React, { useEffect, useState } from 'react';
import { getAllRecords, deleteRecord } from '../services/storageService';
import { VoiceRecord } from '../types';
import { Trash2, Calendar, Activity, ArrowLeft, Monitor, Globe } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [records, setRecords] = useState<VoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    const data = await getAllRecords();
    setRecords(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this log entry?')) {
      await deleteRecord(id);
      await loadRecords();
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getPlatformIcon = (ua?: string) => {
     if (!ua) return <Monitor className="w-3 h-3" />;
     if (ua.includes('Mobile')) return <Monitor className="w-3 h-3" />; // Using Monitor as generic placeholder, can be phone icon
     return <Monitor className="w-3 h-3" />;
  };

  return (
    <div className="w-full h-full min-h-screen bg-zinc-950 text-zinc-100 p-6 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-cyan-500" />
                Access Logs
              </h1>
              <p className="text-zinc-500 text-sm font-mono mt-1">
                USER ANALYTICS // IP LOGGING ENABLED
              </p>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg flex gap-4 text-xs font-mono">
             <div>
                <span className="text-zinc-500 block">TOTAL LOGS</span>
                <span className="text-xl text-white font-bold">{records.length}</span>
             </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 animate-pulse">
              Loading access records...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              No logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900/80 border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500 font-mono">
                    <th className="p-4 font-medium w-48">Timestamp</th>
                    <th className="p-4 font-medium w-48">User IP</th>
                    <th className="p-4 font-medium">Result</th>
                    <th className="p-4 font-medium">Demographics</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 text-zinc-400 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 opacity-50" />
                            {formatDate(rec.timestamp)}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-zinc-300">
                        <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-cyan-500" />
                            {rec.ip || 'Unknown'}
                        </div>
                        <div className="text-[10px] text-zinc-600 truncate max-w-[150px] mt-1" title={rec.userAgent}>
                            {rec.userAgent || 'Unknown UA'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${
                                rec.analysis.overallScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                                rec.analysis.overallScore >= 60 ? 'bg-cyan-500/10 text-cyan-400' :
                                'bg-orange-500/10 text-orange-400'
                            }`}>
                                {rec.analysis.overallScore}
                            </div>
                            <div>
                                <div className="font-medium text-white">{rec.analysis.voiceArchetype}</div>
                                <div className="text-xs text-zinc-500">{rec.analysis.similarVoice}</div>
                            </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-zinc-400 space-y-1">
                         <div>
                            <span className="text-zinc-600">AGE:</span> {rec.analysis.estimatedAge}
                         </div>
                         <div>
                            <span className="text-zinc-600">WGT:</span> {rec.analysis.estimatedWeight}
                         </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleDelete(rec.id, e)}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-red-600 hover:text-white text-zinc-500 transition-all"
                            title="Delete Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;