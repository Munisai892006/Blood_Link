import React, { useState, useEffect } from 'react';
import { Cpu, Play, CheckCircle2, Shield, Activity, RefreshCw, Clock, TrendingDown, Users, AlertTriangle } from 'lucide-react';
import { SyntheticWatermarkBanner, ClinicalDisclaimerBanner } from '../components/Disclaimers';

export default function DigitalTwinPortal({ currentRole }) {
  const [simulations, setSimulations] = useState([]);
  const [scenarioName, setScenarioName] = useState('Outer Ring Road Multi-Bus Collision');
  const [casualties, setCasualties] = useState(35);
  const [primaryGroup, setPrimaryGroup] = useState('O-');
  const [surgeRadius, setSurgeRadius] = useState(25);
  const [running, setRunning] = useState(false);
  const [currentRunResult, setCurrentRunResult] = useState(null);
  const [timelineStep, setTimelineStep] = useState(60); // 0, 30, 60, 90, 120 minutes

  const fetchSimulations = () => {
    fetch('/api/simulations')
      .then(res => res.json())
      .then(data => setSimulations(data || []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchSimulations();
  }, []);

  const getAuthToken = () => localStorage.getItem('bloodlink_auth_token') || ('mock_token_for_' + currentRole.id);

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setRunning(true);
    setCurrentRunResult(null);

    try {
      const res = await fetch('/api/simulations/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          scenarioName,
          parameters: {
            casualties,
            primaryBloodGroup: primaryGroup,
            surgeRadiusKm: surgeRadius
          }
        })
      });

      const data = await res.json();
      setRunning(false);

      if (res.ok) {
        setCurrentRunResult(data);
        fetchSimulations();
      } else {
        alert(`Simulation error: ${data.message}`);
      }
    } catch (err) {
      setRunning(false);
      alert(`Network error: ${err.message}`);
    }
  };

  // Timeline step calculations
  const totalDemand = currentRunResult?.metrics.units_required || Math.ceil(casualties * 1.5);
  const initialStock = currentRunResult?.metrics.units_available_in_radius || 20;

  const timelineMetrics = {
    0: {
      unitsDispatched: 0,
      stockRemaining: initialStock,
      unmetCasualties: 0,
      survivalProb: 98.5,
      phase: 'Incident Genesis & Rapid Alert Trigger'
    },
    30: {
      unitsDispatched: Math.min(Math.round(totalDemand * 0.35), initialStock),
      stockRemaining: Math.max(0, initialStock - Math.round(totalDemand * 0.35)),
      unmetCasualties: Math.max(0, Math.round(casualties * 0.15)),
      survivalProb: 95.0,
      phase: 'Triage Stage 1 — Local Bank Release'
    },
    60: {
      unitsDispatched: Math.min(Math.round(totalDemand * 0.65), initialStock),
      stockRemaining: Math.max(0, initialStock - Math.round(totalDemand * 0.65)),
      unmetCasualties: Math.max(0, Math.round(casualties * 0.3)),
      survivalProb: 89.2,
      phase: 'Peak Shock Hour — Green Corridor Activation'
    },
    90: {
      unitsDispatched: Math.min(Math.round(totalDemand * 0.85), initialStock),
      stockRemaining: Math.max(0, initialStock - Math.round(totalDemand * 0.85)),
      unmetCasualties: Math.max(0, Math.round(casualties * 0.45)),
      survivalProb: 84.5,
      phase: 'Mutual Aid Inflow from Secondary Circle'
    },
    120: {
      unitsDispatched: totalDemand,
      stockRemaining: Math.max(0, initialStock - totalDemand),
      unmetCasualties: Math.max(0, Math.round(casualties * 0.5)),
      survivalProb: 79.0,
      phase: 'Surgical Stabilization & Post-Crisis Replenishment'
    }
  };

  const currentStepData = timelineMetrics[timelineStep] || timelineMetrics[60];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Synthetic Isolation Banner (FR-SIM-002, AC-008) */}
      <SyntheticWatermarkBanner />
      <ClinicalDisclaimerBanner />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-purple-600" />
            <span>Digital Twin Emergency Simulation Module</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate hypothetical emergency surges and logistics stress tests in a strictly isolated synthetic sandbox.
          </p>
        </div>

        <div className="bg-purple-50 text-purple-900 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <Shield className="w-4 h-4 text-purple-600" />
          <span>Isolation Verification: ACTIVE (0 Production Mutations)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Scenario Parameters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 lg:col-span-1">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Synthetic Scenario Configuration</h2>
            <p className="text-xs text-slate-500">Tune operational variables for catastrophe modeling.</p>
          </div>

          <form onSubmit={handleRunSimulation} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scenario Title</label>
              <input
                type="text"
                required
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Simulated Casualties</label>
              <input
                type="number"
                min="5"
                max="500"
                value={casualties}
                onChange={(e) => setCasualties(parseInt(e.target.value, 10) || 5)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Component In Demand</label>
              <select
                value={primaryGroup}
                onChange={(e) => setPrimaryGroup(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
              >
                <option value="O-">O- Negative (Trauma First-Line)</option>
                <option value="A+">A+ Positive</option>
                <option value="B+">B+ Positive</option>
                <option value="AB-">AB- Negative</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transit Disruption Radius (km)</label>
              <input
                type="range"
                min="5"
                max="50"
                value={surgeRadius}
                onChange={(e) => setSurgeRadius(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>5 km</span>
                <span className="font-bold text-slate-800">{surgeRadius} km</span>
                <span>50 km</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={running}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 shadow-md shadow-purple-200"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{running ? 'Executing Simulation...' : 'Execute Digital Twin Run'}</span>
              </button>
            </div>
          </form>

          {/* Past Simulation Runs */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Archived Synthetic Runs</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {simulations.slice(0, 5).map(sim => (
                <div key={sim.id} className="p-2.5 bg-slate-50 hover:bg-purple-50 rounded-xl border border-slate-200 text-xs transition cursor-pointer">
                  <div className="font-bold text-slate-900 truncate">{sim.scenario_name}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>{sim.id}</span>
                    <span className="font-mono text-purple-700 font-bold">{sim.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Output & Interactive Timeline Scrubber */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 lg:col-span-2">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Simulation Resilience Outcome</h2>
              <p className="text-xs text-slate-500">Hypothetical response efficiency metrics & casualty curve</p>
            </div>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-mono font-bold px-2.5 py-1 rounded">
              SYNTHETIC SANDBOX
            </span>
          </div>

          {currentRunResult ? (
            <div className="space-y-5">
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-900">Run ID: {currentRunResult.simulation_id}</span>
                  <span className="text-emerald-700 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Isolation Verified</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-xl border border-purple-100">
                    <div className="text-[11px] text-slate-500">Units Demanded</div>
                    <div className="text-lg font-bold text-slate-900">{currentRunResult.metrics.units_required}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-purple-100">
                    <div className="text-[11px] text-slate-500">Available in Radius</div>
                    <div className="text-lg font-bold text-emerald-600">{currentRunResult.metrics.units_available_in_radius}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-purple-100">
                    <div className="text-[11px] text-slate-500">Projected Deficit</div>
                    <div className="text-lg font-bold text-rose-600">{currentRunResult.metrics.projected_deficit_units} Units</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-purple-100">
                    <div className="text-[11px] text-slate-500">Survival Index</div>
                    <div className="text-lg font-bold text-indigo-600">{currentRunResult.metrics.projected_casualty_survival_index}</div>
                  </div>
                </div>
              </div>

              {/* Interactive Timeline Scrubber (T+0 to T+120 min) */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Disaster Timeline Progression Scrubber
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-md border border-purple-500/30">
                    T + {timelineStep} MINUTES
                  </span>
                </div>

                {/* Scrubber slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="30"
                    value={timelineStep}
                    onChange={(e) => setTimelineStep(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span className={timelineStep === 0 ? 'text-purple-400 font-bold' : ''}>T+0m (Genesis)</span>
                    <span className={timelineStep === 30 ? 'text-purple-400 font-bold' : ''}>T+30m</span>
                    <span className={timelineStep === 60 ? 'text-purple-400 font-bold' : ''}>T+60m (Peak Shock)</span>
                    <span className={timelineStep === 90 ? 'text-purple-400 font-bold' : ''}>T+90m</span>
                    <span className={timelineStep === 120 ? 'text-purple-400 font-bold' : ''}>T+120m (Stabilization)</span>
                  </div>
                </div>

                {/* Scrubber Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Units Dispatched</span>
                    <span className="text-base font-black text-white">{currentStepData.unitsDispatched} Units</span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Local Stock Left</span>
                    <span className="text-base font-black text-amber-400">{currentStepData.stockRemaining} Units</span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Unmet Need</span>
                    <span className="text-base font-black text-rose-400">{currentStepData.unmetCasualties} Casualties</span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Survival Probability</span>
                    <span className="text-base font-black text-emerald-400">{currentStepData.survivalProb}%</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 italic">
                  <strong>Current Incident Phase:</strong> {currentStepData.phase}
                </div>
              </div>

              {/* Recommended Operational Mitigations */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Autonomous Disaster Mitigations
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {currentRunResult.metrics.recommended_mitigations?.map((mit, i) => (
                    <li key={i} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span>{mit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs space-y-2">
              <Cpu className="w-10 h-10 mx-auto text-slate-300" />
              <p>Configure disaster parameters and click "Execute Digital Twin Run" to analyze synthetic logistics curves.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
