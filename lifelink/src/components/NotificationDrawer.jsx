import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock, X, AlertCircle, Shield, CheckCheck, ExternalLink } from 'lucide-react';

export default function NotificationDrawer({ isOpen, onClose, currentRole, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL' | 'EMERGENCY' | 'TRANSFER' | 'DONATION' | 'TASK'

  const getAuthHeader = () => {
    const token = localStorage.getItem('bloodlink_auth_token') || ('mock_token_for_' + currentRole.id);
    return { 'Authorization': `Bearer ${token}` };
  };

  const fetchNotifications = () => {
    fetch('/api/notifications', {
      headers: getAuthHeader()
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, currentRole]);

  const handleMarkRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: getAuthHeader()
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateAlert = async () => {
    try {
      await fetch('/api/notifications/simulate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          title: '🚨 CRITICAL MATCH: 2 Units O- Needed Immediately',
          body: 'AIIMS Apex ER has logged a Stage 1 proximity alert for hypovolemic patient.',
          channel: 'IN_APP'
        })
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white shadow-2xl h-full flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blood-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notifications & Outreach Feed</h3>
              <p className="text-[11px] text-slate-500">Live targeted delivery for {currentRole.name}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
          <button
            onClick={handleMarkAllRead}
            className="text-blood-700 hover:text-blood-800 font-semibold flex items-center space-x-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>

          <button
            onClick={handleSimulateAlert}
            className="text-slate-600 hover:text-slate-900 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition text-[11px]"
          >
            + Test Ping
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center space-x-1.5 overflow-x-auto text-[11px]">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'EMERGENCY', label: 'Emergencies' },
            { id: 'TRANSFER', label: 'Transfers' },
            { id: 'DONATION', label: 'Certificates' },
            { id: 'TASK', label: 'Tasks' }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                filterCategory === c.id
                  ? 'bg-blood-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">Loading notifications...</div>
          ) : (() => {
            const filtered = notifications.filter(notif => {
              if (filterCategory === 'ALL') return true;
              let metadata = {};
              try {
                if (typeof notif.metadata === 'string') metadata = JSON.parse(notif.metadata);
                else if (typeof notif.metadata === 'object') metadata = notif.metadata || {};
              } catch {}

              const titleLower = (notif.title || '').toLowerCase();
              if (filterCategory === 'EMERGENCY') return metadata.requestId || titleLower.includes('emergency') || titleLower.includes('request');
              if (filterCategory === 'TRANSFER') return metadata.transferId || titleLower.includes('transfer') || titleLower.includes('courier');
              if (filterCategory === 'DONATION') return metadata.certHash || metadata.donationId || titleLower.includes('certificate') || titleLower.includes('donation');
              if (filterCategory === 'TASK') return metadata.taskId || metadata.incidentId || titleLower.includes('task') || titleLower.includes('logistics');
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                  <Bell className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No notifications match this category.</p>
                </div>
              );
            }

            return filtered.map(notif => {
              const isUnread = notif.delivery_status !== 'READ';
              let metadata = {};
              try {
                if (typeof notif.metadata === 'string') metadata = JSON.parse(notif.metadata);
                else if (typeof notif.metadata === 'object') metadata = notif.metadata || {};
              } catch {}

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-2 transition ${
                    isUnread
                      ? 'bg-rose-50/60 border-blood-200 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                      {isUnread && <span className="w-2 h-2 rounded-full bg-blood-600 inline-block animate-pulse"></span>}
                      <span>{notif.title}</span>
                    </span>
                    <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                      {notif.channel}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed text-[11px]">{notif.body}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>{notif.created_at}</span>
                    <div className="flex items-center space-x-2">
                      {/* Deep Link Actions based on metadata (SRS Section 6) */}
                      {metadata.requestId && (
                        <button
                          onClick={() => {
                            const targetTab = currentRole.id === 'DONOR' ? 'donor' : 'hospital';
                            if (onNavigate) onNavigate(targetTab, { requestId: metadata.requestId, donorId: metadata.donorId });
                            onClose();
                          }}
                          className="text-blood-700 hover:underline font-bold flex items-center space-x-0.5"
                        >
                          <span>View Request ({metadata.requestId})</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {metadata.transferId && (
                        <button
                          onClick={() => {
                            if (onNavigate) onNavigate('inventory', { transferId: metadata.transferId });
                            onClose();
                          }}
                          className="text-blood-700 hover:underline font-bold flex items-center space-x-0.5"
                        >
                          <span>View Transfer ({metadata.transferId})</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {(metadata.certHash || metadata.donationId) && (
                        <button
                          onClick={() => {
                            if (onNavigate) onNavigate('donor', { certHash: metadata.certHash });
                            onClose();
                          }}
                          className="text-blood-700 hover:underline font-bold flex items-center space-x-0.5"
                        >
                          <span>View Certificate</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {(metadata.taskId || metadata.incidentId) && (
                        <button
                          onClick={() => {
                            if (onNavigate) onNavigate('incidents', { taskId: metadata.taskId, incidentId: metadata.incidentId });
                            onClose();
                          }}
                          className="text-blood-700 hover:underline font-bold flex items-center space-x-0.5"
                        >
                          <span>View Task ({metadata.taskId || metadata.incidentId})</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {isUnread && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="text-slate-500 hover:text-slate-800 font-semibold"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
