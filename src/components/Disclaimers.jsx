import React from 'react';
import { AlertCircle, ShieldAlert, Cpu } from 'lucide-react';

export function ClinicalDisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-lg mb-6 shadow-xs">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0 mr-3" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold text-amber-950">Mandatory Medical & Clinical Disclaimer: </strong>
          BloodLink 3.0 is an operational information, donor coordination, and inventory visibility platform. 
          It does <strong>not</strong> perform clinical eligibility assessment, laboratory cross-matching, or blood transfusion decisions. 
          All final medical approvals remain the sole responsibility of certified healthcare personnel and official blood-bank laboratories.
        </div>
      </div>
    </div>
  );
}

export function SyntheticWatermarkBanner() {
  return (
    <div className="bg-purple-50 border-2 border-dashed border-purple-400 p-3.5 rounded-xl mb-6 shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-600 rounded-lg text-white">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="text-xs text-purple-950">
          <div className="font-bold tracking-wide uppercase text-purple-900 flex items-center space-x-2">
            <span>Isolated Digital Twin Simulation Sandbox</span>
            <span className="bg-purple-200 text-purple-800 text-[10px] px-2 py-0.5 rounded font-black">SYNTHETIC DATA ONLY</span>
          </div>
          <p className="mt-0.5 text-purple-800">
            All records, disaster metrics, and donor outreach in this tab execute in a sandboxed synthetic namespace. 
            <strong> Zero modifications</strong> are performed on real patients, actual donor queues, or live hospital inventory (FR-SIM-003 / AC-008).
          </p>
        </div>
      </div>
    </div>
  );
}
