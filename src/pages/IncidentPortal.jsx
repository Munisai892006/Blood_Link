import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckSquare, PlusCircle, UserCheck, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { ClinicalDisclaimerBanner } from '../components/Disclaimers';

export default function IncidentPortal({ currentRole }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('URGENT');
  const [taskAssignee, setTaskAssignee] = useState('USR-VOL-01');

  const getAuthToken = () => localStorage.getItem('bloodlink_auth_token') || ('mock_token_for_' + currentRole.id);

  const fetchVolunteers = () => {
    fetch('/api/incidents/volunteers', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setVolunteers(data);
          setTaskAssignee(data[0].id);
        }
      })
      .catch(() => {});
  };

  const fetchIncidents = () => {
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => {
        setIncidents(data);
        if (data.length > 0) {
          fetchIncidentDetail(data[0].id);
        } else {
          setLoading(false);
        }
      });
  };

  const fetchIncidentDetail = (id) => {
    fetch(`/api/incidents/${id}`)
      .then(res => res.json())
      .then(data => {
        setSelectedIncident(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchIncidents();
    fetchVolunteers();
  }, [currentRole]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle) return;

    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          title: taskTitle,
          priority: taskPriority,
          assigned_to: taskAssignee
        })
      });

      if (res.ok) {
        setTaskTitle('');
        fetchIncidentDetail(selectedIncident.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const res = await fetch(`/api/incidents/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        fetchIncidentDetail(selectedIncident.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/incidents/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchIncidentDetail(selectedIncident.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ClinicalDisclaimerBanner />

      {/* Volunteer Scope Disclaimer (FR-VOL-002) */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3.5 rounded-r-lg shadow-xs">
        <div className="flex items-start space-x-3 text-xs text-blue-900 leading-relaxed">
          <ShieldAlert className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold text-blue-950">Volunteer Role & Transit Scope (FR-VOL-002): </strong>
            Registered civilian volunteers support communication, non-clinical staging, cold-chain carrier routing, and donor guidance. 
            Volunteers do <strong>not</strong> operate emergency medical vehicles or provide clinical ambulance services.
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <span>Incident & Volunteer Coordination HQ</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-casualty disaster response and community logistics orchestration.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-600">Active Incident:</span>
          <select
            value={selectedIncident?.id || ''}
            onChange={(e) => fetchIncidentDetail(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
          >
            {incidents.map(inc => (
              <option key={inc.id} value={inc.id}>
                {inc.title} [{inc.severity}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedIncident && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incident Overview Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                {selectedIncident.id}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                {selectedIncident.severity}
              </span>
            </div>

            <h2 className="text-base font-bold text-slate-900">{selectedIncident.title}</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedIncident.description}
            </p>

            <div className="pt-2 border-t border-slate-100 text-xs space-y-2 text-slate-500">
              <div>Region: <strong className="text-slate-800">{selectedIncident.region}</strong></div>
              <div>Lead Coordinator: <strong className="text-slate-800">{selectedIncident.coordinator_name}</strong></div>
              <div>Status: <strong className="text-emerald-700">{selectedIncident.status}</strong></div>
            </div>
          </div>

          {/* Volunteer Task Board (FR-INC-002, FR-VOL-001) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-blood-600" />
                  <span>Logistics Task Allocations ({selectedIncident.tasks?.length || 0})</span>
                </h3>
                <p className="text-xs text-slate-500">Task breakdown for accredited civilian logistics teams</p>
              </div>
            </div>

            {/* Quick Add Task */}
            <form onSubmit={handleCreateTask} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Assign new logistics task (e.g. Courier escort to AIIMS Trauma Bay)"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                required
              />
              <select
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-medium"
              >
                {volunteers.length > 0 ? (
                  volunteers.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.full_name} ({v.role === 'EMERGENCY_COORDINATOR' ? 'Coordinator' : 'Volunteer'})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="USR-VOL-01">Amit Patel (Volunteer Lead)</option>
                    <option value="USR-COORD-01">Karthik Raman (Disaster Ops)</option>
                  </>
                )}
              </select>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-semibold"
              >
                <option value="URGENT">URGENT</option>
                <option value="HIGH">HIGH</option>
                <option value="NORMAL">NORMAL</option>
              </select>
              <button
                type="submit"
                className="bg-blood-600 hover:bg-blood-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center justify-center space-x-1 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Assign Task</span>
              </button>
            </form>

            {/* Task Items */}
            <div className="space-y-3 pt-2">
              {selectedIncident.tasks?.map(task => {
                const isDone = task.status === 'COMPLETED';
                return (
                  <div key={task.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">{task.id}</span>
                        
                        {/* Dynamic Priority Selector */}
                        <select
                          value={task.priority}
                          onChange={(e) => handleUpdateTask(task.id, { priority: e.target.value })}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border border-transparent cursor-pointer ${
                            task.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : task.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="URGENT">URGENT</option>
                          <option value="HIGH">HIGH</option>
                          <option value="NORMAL">NORMAL</option>
                        </select>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isDone ? 'bg-emerald-100 text-emerald-800' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-900">{task.title}</div>
                      
                      {/* Dynamic Assignee Selector */}
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                        <span>Assigned to:</span>
                        <select
                          value={task.assigned_to || ''}
                          onChange={(e) => handleUpdateTask(task.id, { assigned_to: e.target.value })}
                          className="text-[11px] font-medium bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-800"
                        >
                          <option value="">Unassigned</option>
                          {volunteers.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.full_name} ({v.role === 'EMERGENCY_COORDINATOR' ? 'Coordinator' : 'Volunteer'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                          className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition"
                        >
                          Start Task
                        </button>
                      )}
                      {task.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition shadow-xs"
                        >
                          Mark Done
                        </button>
                      )}
                      {task.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                          className="px-2.5 py-1 text-slate-400 hover:text-slate-600 text-[10px] font-medium"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
