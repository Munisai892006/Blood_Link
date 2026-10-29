import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, CheckCircle, ShieldAlert, Clock, ArrowDownRight, RefreshCw, XCircle, PlusCircle, Download, Truck, Thermometer, ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import { ClinicalDisclaimerBanner } from '../components/Disclaimers';

export default function InventoryPortal({ currentRole }) {
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'transfers' | 'ledger'
  const [batches, setBatches] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [reserveQty, setReserveQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  // New Batch Modal State
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [newGroup, setNewGroup] = useState('O-');
  const [newComponent, setNewComponent] = useState('RED_BLOOD_CELLS');
  const [newUnits, setNewUnits] = useState(5);
  const [newExpiry, setNewExpiry] = useState('2026-11-30');
  const [newLocation, setNewLocation] = useState('Cold Room B - Shelf 04');
  const [requiresQA, setRequiresQA] = useState(false);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSource, setTransferSource] = useState('ORG-BANK-01');
  const [transferDest, setTransferDest] = useState('ORG-HOSP-01');
  const [transferGroup, setTransferGroup] = useState('O-');
  const [transferComponent, setTransferComponent] = useState('RED_BLOOD_CELLS');
  const [transferQty, setTransferQty] = useState(2);
  const [transferNotes, setTransferNotes] = useState('Urgent surgical mutual aid');

  // Dispatch / Receive State
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [courierName, setCourierName] = useState('LifeGuard Rapid Medical Logistics');
  const [courierPhone, setCourierPhone] = useState('+91-9876543210');
  const [departureTemp, setDepartureTemp] = useState(3.8);
  const [arrivalTemp, setArrivalTemp] = useState(4.2);
  const [sealIntegrity, setSealIntegrity] = useState('INTACT');
  const [receiverNotes, setReceiverNotes] = useState('');

  const getAuthToken = () => localStorage.getItem('bloodlink_auth_token') || ('mock_token_for_' + currentRole.id);

  const fetchInventory = () => {
    fetch('/api/inventory/batches')
      .then(res => res.json())
      .then(data => setBatches(data || []))
      .catch(err => console.error(err));

    fetch('/api/inventory/alerts')
      .then(res => res.json())
      .then(data => setAlerts(data))
      .catch(err => console.error(err));

    fetch('/api/inventory/transactions', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        setTransactions(data || []);
      })
      .catch(err => console.error(err));

    fetch('/api/transfers')
      .then(res => res.json())
      .then(data => {
        setTransfers(data || []);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchInventory();
  }, [currentRole]);

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setActionMessage(null);

    try {
      const res = await fetch('/api/inventory/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          blood_group: newGroup,
          blood_component: newComponent,
          units_total: parseInt(newUnits, 10),
          expiry_date: newExpiry,
          storage_location: newLocation,
          requires_quarantine: requiresQA
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setShowAddBatchModal(false);
      setActionMessage({ type: 'success', text: `New batch ${data.id} registered into blood bank inventory.` });
      fetchInventory();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleQAClear = async (batchId) => {
    try {
      const res = await fetch(`/api/inventory/batches/${batchId}/qa-clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ notes: 'Biological viral markers negative: Released for clinical transfusion' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setActionMessage({ type: 'success', text: `Batch ${batchId} cleared biological QA and released to AVAILABLE stock.` });
      fetchInventory();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDiscard = async (batchId) => {
    if (!confirm(`Are you sure you want to discard batch ${batchId} per hazardous biological disposal protocol?`)) return;

    try {
      const res = await fetch(`/api/inventory/batches/${batchId}/discard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ reason: 'Biological disposal protocol (expired/degraded)' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setActionMessage({ type: 'success', text: `Batch ${batchId} moved to DISCARDED / EXPIRED.` });
      fetchInventory();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleExportCSV = () => {
    const headers = ['Batch ID', 'Blood Group', 'Component', 'Available Units', 'Reserved Units', 'Total Units', 'Expiry Date', 'Status', 'Storage Location'];
    const rows = batches.map(b => [b.id, b.blood_group, b.blood_component, b.units_available, b.units_reserved, b.units_total, b.expiry_date, b.status, b.storage_location]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BloodLink_Inventory_Manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    setActionMessage(null);

    try {
      const res = await fetch('/api/inventory/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          batchId: selectedBatch.id,
          quantity: parseInt(reserveQty, 10),
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.message });
      } else {
        setActionMessage({ type: 'success', text: `Successfully reserved ${reserveQty} units from batch ${selectedBatch.id}.` });
        setSelectedBatch(null);
        fetchInventory();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleRequestTransfer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transfers/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          source_org_id: transferSource,
          destination_org_id: transferDest,
          blood_group: transferGroup,
          blood_component: transferComponent,
          quantity: parseInt(transferQty, 10),
          notes: transferNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setShowTransferModal(false);
      setActionMessage({ type: 'success', text: `Mutual aid transfer ${data.transfer_id} requested.` });
      fetchInventory();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDispatchTransfer = async (transferId) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          courier_name: courierName,
          courier_phone: courierPhone,
          departure_temperature_c: parseFloat(departureTemp)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSelectedTransfer(null);
      setActionMessage({ type: 'success', text: `Transfer ${transferId} dispatched. Cold chain temperature monitoring initialized.` });
      fetchInventory();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleReceiveTransfer = async (transferId) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          arrival_temperature_c: parseFloat(arrivalTemp),
          seal_integrity: sealIntegrity,
          notes: receiverNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSelectedTransfer(null);
      if (data.quarantined) {
        setActionMessage({
          type: 'error',
          text: `⚠️ Transfer ${transferId} QUARANTINED: ${data.message}`
        });
      } else {
        setActionMessage({
          type: 'success',
          text: `✅ Transfer ${transferId} received and verified into destination inventory (${arrivalTemp}°C, Seal Intact).`
        });
      }
      fetchInventory();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ClinicalDisclaimerBanner />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Database className="w-6 h-6 text-blood-600" />
            <span>Blood Bank Auditable Inventory & Logistics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Concurrency-safe stock reservations, cold-chain GPS tracking (2°C-6°C), and immutable ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'batches' && (
            <button
              onClick={() => setShowAddBatchModal(true)}
              className="bg-blood-600 hover:bg-blood-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Intake Batch</span>
            </button>
          )}

          {activeTab === 'transfers' && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="bg-blood-600 hover:bg-blood-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Request Inter-Facility Transfer</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            title="Download CSV Ledger"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchInventory}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('batches')}
          className={`py-2 px-4 border-b-2 transition ${
            activeTab === 'batches'
              ? 'border-blood-600 text-blood-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Stock Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`py-2 px-4 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === 'transfers'
              ? 'border-blood-600 text-blood-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Inter-Facility Transfers & Cold-Chain ({transfers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-2 px-4 border-b-2 transition ${
            activeTab === 'ledger'
              ? 'border-blood-600 text-blood-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Ledger ({transactions.length})
        </button>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs font-medium ${
          actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {actionMessage.text}
        </div>
      )}

      {/* TAB 1: Batches Table */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          {/* Low-stock & Expiry Alerts Widget (FR-INV-005) */}
          {alerts && (alerts.expiring_soon_batches?.length > 0 || alerts.critically_low_components?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.critically_low_components?.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Low Operating Reserve Alert (&lt; 5 Units Available)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {alerts.critically_low_components.map(c => (
                      <span key={c.blood_group + c.blood_component} className="text-xs font-bold px-2 py-1 rounded bg-white border border-amber-300 text-amber-950">
                        {c.blood_group} ({c.blood_component.replace(/_/g, ' ')}): {c.total_available} units left
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {alerts.expiring_soon_batches?.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-rose-900">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <span>Batches Expiring Within 7 Days (Expiring Soon)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {alerts.expiring_soon_batches.map(b => (
                      <span key={b.id} className="text-xs font-medium px-2 py-1 rounded bg-white border border-rose-300 text-rose-950">
                        {b.id} ({b.blood_group}): Exp. {b.expiry_date}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">Batch ID</th>
                    <th className="py-3.5 px-4">Blood Group</th>
                    <th className="py-3.5 px-4">Component</th>
                    <th className="py-3.5 px-4">Available / Total</th>
                    <th className="py-3.5 px-4">Reserved</th>
                    <th className="py-3.5 px-4">Expiry Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Storage Location</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {batches.map(b => {
                    const isAvailable = b.status === 'AVAILABLE';
                    const isExpired = b.status === 'EXPIRED';
                    const isQuarantined = b.status === 'QUARANTINED';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {b.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="w-7 h-7 rounded-md bg-blood-100 text-blood-800 font-black inline-flex items-center justify-center text-xs">
                            {b.blood_group}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {b.blood_component.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-slate-900">{b.units_available}</span> / {b.units_total}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {b.units_reserved}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {b.expiry_date}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            isAvailable ? 'bg-emerald-100 text-emerald-800' :
                            isExpired ? 'bg-rose-100 text-rose-800' :
                            isQuarantined ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {b.storage_location}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {isAvailable && (
                            <button
                              onClick={() => setSelectedBatch(b)}
                              className="px-3 py-1 bg-blood-600 hover:bg-blood-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                            >
                              Reserve Units
                            </button>
                          )}

                          {isQuarantined && (
                            <button
                              onClick={() => handleQAClear(b.id)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition"
                              title="Clear viral markers testing and release"
                            >
                              Clear QA & Release
                            </button>
                          )}

                          {isExpired && (
                            <button
                              onClick={() => handleDiscard(b.id)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-lg text-xs font-medium transition"
                              title="Discard expired stock"
                            >
                              Bio-Discard
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Inter-Facility Transfers & Cold-Chain */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Cold Chain Regulatory Envelope: 2.0°C – 6.0°C</h4>
                <p className="text-[11px] text-emerald-800">
                  Every mutual aid transit package is monitored via real-time cellular data loggers. Temperature excursions trigger immediate QA quarantine.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-lg border border-emerald-300 text-emerald-900">
              100% IN SPECIFICATION
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">Transfer ID</th>
                    <th className="py-3.5 px-4">Source &rarr; Destination</th>
                    <th className="py-3.5 px-4">Component & Group</th>
                    <th className="py-3.5 px-4">Quantity</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Courier / Vehicle</th>
                    <th className="py-3.5 px-4">Cold-Chain Temp</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transfers.map(x => (
                    <tr key={x.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{x.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{x.source_org_name}</div>
                        <div className="text-[11px] text-slate-500">&rarr; {x.destination_org_name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span className="px-2 py-0.5 bg-blood-100 text-blood-800 rounded font-black mr-1">{x.blood_group}</span>
                        <span>{x.blood_component.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold">{x.quantity} Units</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          x.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' :
                          x.status === 'DISPATCHED_IN_TRANSIT' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {x.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px]">
                        <div>{x.courier_name || 'Pending assignment'}</div>
                        {x.courier_phone && <div className="text-slate-400 font-mono">{x.courier_phone}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {x.departure_temperature_c ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-emerald-700 font-bold">{x.departure_temperature_c}°C</span>
                            {x.arrival_temperature_c && (
                              <span className="text-slate-500">&rarr; {x.arrival_temperature_c}°C</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {x.status === 'REQUESTED' && (
                          <button
                            onClick={() => setSelectedTransfer(x)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                          >
                            Dispatch Courier
                          </button>
                        )}
                        {x.status === 'DISPATCHED_IN_TRANSIT' && (
                          <button
                            onClick={() => setSelectedTransfer(x)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                          >
                            Receive & Check Temp
                          </button>
                        )}
                        {x.status === 'RECEIVED' && (
                          <span className="text-emerald-700 font-semibold text-xs flex items-center justify-end space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Immutable Audit Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Immutable Transaction Journal</h3>
            <span className="text-xs text-slate-500">Every inventory deduction and reservation recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Batch ID</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Performed By</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Clinical Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.id}</td>
                    <td className="py-3 px-4 font-mono">{t.batch_id}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{t.transaction_type}</span>
                    </td>
                    <td className="py-3 px-4 font-bold">{t.quantity_delta > 0 ? `+${t.quantity_delta}` : t.quantity_delta}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{t.performed_by}</td>
                    <td className="py-3 px-4 text-slate-500">{t.created_at}</td>
                    <td className="py-3 px-4 text-slate-600">{t.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reservation Dialog */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Reserve Blood Units</h3>
              <button onClick={() => setSelectedBatch(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-700">
              <div><strong>Batch ID:</strong> {selectedBatch.id}</div>
              <div><strong>Component:</strong> {selectedBatch.blood_component} ({selectedBatch.blood_group})</div>
              <div><strong>Available in Batch:</strong> {selectedBatch.units_available} units</div>
            </div>

            <form onSubmit={handleReserve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Reserve</label>
                <input
                  type="number"
                  min="1"
                  max={selectedBatch.units_available}
                  value={reserveQty}
                  onChange={(e) => setReserveQty(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Notes / Dispatch Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Allocation for AIIMS ER Request"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Batch Modal */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-blood-600" />
                <span>Intake New Blood Batch</span>
              </h3>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="O-">O- (Universal RBC)</option>
                    <option value="O+">O+</option>
                    <option value="A-">A-</option>
                    <option value="A+">A+</option>
                    <option value="B-">B-</option>
                    <option value="B+">B+</option>
                    <option value="AB-">AB-</option>
                    <option value="AB+">AB+</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Component</label>
                  <select
                    value={newComponent}
                    onChange={(e) => setNewComponent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="RED_BLOOD_CELLS">Red Blood Cells (RBC)</option>
                    <option value="WHOLE_BLOOD">Whole Blood</option>
                    <option value="PLATELETS">Platelets (SDP/RDP)</option>
                    <option value="FRESH_FROZEN_PLASMA">Fresh Frozen Plasma (FFP)</option>
                    <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Units (Bags)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={newUnits}
                    onChange={(e) => setNewUnits(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresQA}
                    onChange={(e) => setRequiresQA(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-semibold text-purple-900">
                    Place in Quarantine pending biological testing (HIV/Hepatitis/Syphilis)
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Register Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Truck className="w-5 h-5 text-blood-600" />
                <span>Request Inter-Facility Mutual Aid Stock</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {transferSource === transferDest && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                ⚠️ Source facility and destination facility cannot be the same. Select two distinct healthcare facilities.
              </div>
            )}

            <form onSubmit={handleRequestTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Source Facility (Sender)</label>
                  <select
                    value={transferSource}
                    onChange={(e) => setTransferSource(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="ORG-BANK-01">Red Cross Central Blood Bank</option>
                    <option value="ORG-HOSP-01">AIIMS Apex Emergency Trauma</option>
                    <option value="ORG-HOSP-02">Apollo Super Specialty</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination Facility (Receiver)</label>
                  <select
                    value={transferDest}
                    onChange={(e) => setTransferDest(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="ORG-HOSP-01">AIIMS Apex Emergency Trauma</option>
                    <option value="ORG-HOSP-02">Apollo Super Specialty</option>
                    <option value="ORG-BANK-01">Red Cross Central Blood Bank</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={transferGroup}
                    onChange={(e) => setTransferGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="O-">O-</option>
                    <option value="O+">O+</option>
                    <option value="A-">A-</option>
                    <option value="A+">A+</option>
                    <option value="B-">B-</option>
                    <option value="B+">B+</option>
                    <option value="AB-">AB-</option>
                    <option value="AB+">AB+</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Component</label>
                  <select
                    value={transferComponent}
                    onChange={(e) => setTransferComponent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="RED_BLOOD_CELLS">Red Blood Cells (RBC)</option>
                    <option value="WHOLE_BLOOD">Whole Blood</option>
                    <option value="PLATELETS">Platelets (SDP / RDP)</option>
                    <option value="FRESH_FROZEN_PLASMA">Fresh Frozen Plasma</option>
                    <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Justification / Procedure</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Massive trauma transfusion surge, ER reserves depleted"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSource === transferDest}
                  className="px-5 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  Submit Mutual Aid Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Transfer Action Modal (Dispatch or Receive) */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {selectedTransfer.status === 'REQUESTED' ? 'Dispatch Cold-Chain Courier' : 'Receive Transfer & Verify Temperature'}
              </h3>
              <button onClick={() => setSelectedTransfer(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {selectedTransfer.status === 'REQUESTED' ? (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designated Courier / Vehicle</label>
                  <input
                    type="text"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driver Contact Phone</label>
                  <input
                    type="text"
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Departure Temperature (°C)</label>
                    <span className="text-[10px] text-slate-500 font-mono">[2.0°C - 6.0°C Safe]</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="10.0"
                    value={departureTemp}
                    onChange={(e) => setDepartureTemp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
                <button
                  onClick={() => handleDispatchTransfer(selectedTransfer.id)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm Dispatch & Seal Container
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800">Transfer {selectedTransfer.id}</div>
                  <div className="text-[11px] text-slate-500">
                    {selectedTransfer.quantity} Unit(s) of {selectedTransfer.blood_group} ({selectedTransfer.blood_component})
                  </div>
                </div>

                {/* Temperature Input with Live Visual Feedback */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Arrival Temperature Probe (°C)</label>
                    {arrivalTemp >= 2.0 && arrivalTemp <= 6.0 ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ In-Spec (2.0°C - 6.0°C)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        ⚠️ Deviation Hazard
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0.0"
                    max="15.0"
                    value={arrivalTemp}
                    onChange={(e) => setArrivalTemp(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 font-mono font-bold ${
                      arrivalTemp >= 2.0 && arrivalTemp <= 6.0
                        ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50/50 border-rose-300 text-rose-900'
                    }`}
                  />
                </div>

                {/* Seal Integrity Selector */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Container Physical Seal Integrity</label>
                  <select
                    value={sealIntegrity}
                    onChange={(e) => setSealIntegrity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="INTACT">INTACT — Tamper-evident seal unbroken</option>
                    <option value="COMPROMISED">COMPROMISED — Seal broken / damaged (Automatic Quarantine)</option>
                  </select>
                </div>

                {/* Receiving Staff Notes */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiving Staff ID / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Received at ER Trauma Bay, verified by Charge Nurse"
                    value={receiverNotes}
                    onChange={(e) => setReceiverNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                {/* Warning if Deviation */}
                {(arrivalTemp < 2.0 || arrivalTemp > 6.0 || sealIntegrity === 'COMPROMISED') && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-snug">
                    <strong>Transfusion Safety Protocol: </strong>
                    Because temperature ({arrivalTemp}°C) is outside 2.0°C-6.0°C or seal is {sealIntegrity}, these units will be automatically quarantined from clinical use upon receipt.
                  </div>
                )}

                <button
                  onClick={() => handleReceiveTransfer(selectedTransfer.id)}
                  className={`w-full py-2.5 text-white rounded-xl font-bold shadow-xs transition ${
                    arrivalTemp >= 2.0 && arrivalTemp <= 6.0 && sealIntegrity === 'INTACT'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {arrivalTemp >= 2.0 && arrivalTemp <= 6.0 && sealIntegrity === 'INTACT'
                    ? 'Verify In-Spec & Intake to Stock'
                    : 'Log Cold-Chain Deviation & Quarantine Units'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
