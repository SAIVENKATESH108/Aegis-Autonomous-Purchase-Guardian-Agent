import { useState } from 'react';
import { X, Cpu, Layers, GitBranch, Zap } from 'lucide-react';
import { useGuardianStore } from '../store/useGuardianStore';

export const ArchitectureModal: React.FC = () => {
  const { isArchitectureModalOpen, setIsArchitectureModalOpen } = useGuardianStore();
  const [activeTab, setActiveTab] = useState<'diagram' | 'patterns' | 'agents' | 'datastructures'>('diagram');

  if (!isArchitectureModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-surface rounded-3xl max-w-4xl w-full border border-border shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-subtle/50 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/aegis-logo.png"
              alt="Aegis Logo"
              className="w-10 h-10 rounded-full object-cover shadow-sm border border-emerald-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-navy-900 tracking-tight">
                  Aegis System Architecture & Design Patterns
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Hackathon Blueprint
                </span>
              </div>
              <p className="text-xs text-navy-600">
                Strands Agents SDK + Amazon Bedrock + Strategy, Factory, Repository, Observer, and Min-Heap
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsArchitectureModalOpen(false)}
            className="p-1.5 rounded-xl text-navy-600 hover:text-navy-900 hover:bg-subtle transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-border bg-white shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('diagram')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'diagram'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-navy-600 hover:text-navy-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Architecture Diagram</span>
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'patterns'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-navy-600 hover:text-navy-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Design Patterns</span>
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'agents'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-navy-600 hover:text-navy-900'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Strands Agents Loop</span>
          </button>
          <button
            onClick={() => setActiveTab('datastructures')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'datastructures'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-navy-600 hover:text-navy-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Data Structures (Min-Heap & LRU)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* TAB 1: Real Diagram */}
          {activeTab === 'diagram' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border overflow-hidden bg-navy-950 p-2 shadow-inner">
                <img
                  src="/aegis-architecture-diagram.png"
                  alt="Aegis Architecture Diagram"
                  className="w-full h-auto max-h-[480px] object-contain mx-auto rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-subtle p-3.5 rounded-xl border border-border">
                  <div className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                    <span className="text-sm">📥</span> 1. Ingestion Layer
                  </div>
                  <p className="text-[11px] text-navy-600 mt-1 leading-relaxed">
                    Unstructured receipt text / JSON dispatches through <code className="font-mono text-emerald-800">ReceiptParserFactory</code> to <code className="font-mono text-emerald-800">IngestionAgent</code>.
                  </p>
                </div>
                <div className="bg-subtle p-3.5 rounded-xl border border-border">
                  <div className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                    <span className="text-sm">⚖️</span> 2. Triage & Strategy
                  </div>
                  <p className="text-[11px] text-navy-600 mt-1 leading-relaxed">
                    <code className="font-mono text-emerald-800">TriageAgent</code> runs Strategy rules: <code className="font-mono text-emerald-800">ReturnWindowRule</code>, <code className="font-mono text-emerald-800">WarrantyExpiringRule</code>, and <code className="font-mono text-emerald-800">RecallMatchRule</code>.
                  </p>
                </div>
                <div className="bg-subtle p-3.5 rounded-xl border border-border">
                  <div className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                    <span className="text-sm">✍️</span> 3. Drafting & Publishing
                  </div>
                  <p className="text-[11px] text-navy-600 mt-1 leading-relaxed">
                    Bedrock-powered <code className="font-mono text-emerald-800">DraftAgent</code> pre-fills claim letter; <code className="font-mono text-emerald-800">EscalationPublisher</code> notifies In-App Feed and Telegram.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Design Patterns */}
          {activeTab === 'patterns' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-white p-4 rounded-2xl border border-border shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    FP
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-navy-900">Factory Pattern</h4>
                    <span className="text-[10px] font-mono text-emerald-700">ReceiptParserFactory</span>
                  </div>
                </div>
                <p className="text-xs text-navy-600 leading-relaxed">
                  Decouples receipt inputs from parser implementations. Dispatches unstructured plaintext or e-commerce JSON to <code className="font-mono">TextReceiptParser</code> or <code className="font-mono">JsonReceiptParser</code> without exposing instantiation logic.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center font-bold text-xs">
                    RP
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-navy-900">Repository Pattern</h4>
                    <span className="text-[10px] font-mono text-navy-700">ItemRepository</span>
                  </div>
                </div>
                <p className="text-xs text-navy-600 leading-relaxed">
                  Strictly encapsulates all SQLite database operations via SQLAlchemy ORM. Zero raw SQL or database queries exist outside this class, guaranteeing separation of concerns and atomic sync with the Min-Heap.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                    OP
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-navy-900">Observer Pattern</h4>
                    <span className="text-[10px] font-mono text-amber-700">EscalationPublisher</span>
                  </div>
                </div>
                <p className="text-xs text-navy-600 leading-relaxed">
                  Maintains a subscriber list for alerts. Notifies <code className="font-mono">InAppFeedNotifier</code> (for real-time dashboard updates) and <code className="font-mono">TelegramNotifier</code> (for external mobile alerts) whenever an escalation is generated.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                    SP
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-navy-900">Strategy Pattern</h4>
                    <span className="text-[10px] font-mono text-purple-700">TriageRule</span>
                  </div>
                </div>
                <p className="text-xs text-navy-600 leading-relaxed">
                  Defines interchangeable rule algorithms (<code className="font-mono">ReturnWindowRule</code>, <code className="font-mono">WarrantyExpiringRule</code>, <code className="font-mono">RecallMatchRule</code>) conforming to <code className="font-mono">evaluate(item) -&gt; Escalation | None</code>.
                </p>
              </div>

            </div>
          )}

          {/* TAB 3: Strands Agents */}
          {activeTab === 'agents' && (
            <div className="space-y-3">
              <div className="bg-subtle p-4 rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                    <span className="text-sm">🤖</span> 1. IngestionAgent (Strands Agents SDK)
                  </span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-border">
                    Entity Normalization
                  </span>
                </div>
                <p className="text-xs text-navy-600">
                  Processes receipts through the factory, extracts merchant, price, item name, return policy window, and warranty timeline with Bedrock LLM refinement.
                </p>
              </div>

              <div className="bg-subtle p-4 rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                    <span className="text-sm">⚖️</span> 2. TriageAgent (Autonomous Decision Loop)
                  </span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-border">
                    Silent vs. Escalate Contract
                  </span>
                </div>
                <p className="text-xs text-navy-600">
                  Enforces zero user disturbance for routine items. Only produces an escalation when return window is &lt;= 5 days or CPSC recall match is detected.
                </p>
              </div>

              <div className="bg-subtle p-4 rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                    <span className="text-sm">🔍</span> 3. RecallCheckAgent (Federal CPSC Integration)
                  </span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-border">
                    saferproducts.gov API
                  </span>
                </div>
                <p className="text-xs text-navy-600">
                  Scans the live federal safety registry with query caching, model matching, and deterministic test fallback fixtures for 100% demo uptime.
                </p>
              </div>

              <div className="bg-subtle p-4 rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-navy-900 flex items-center gap-1.5">
                    <span className="text-sm">✍️</span> 4. DraftAgent (Amazon Bedrock Claude Haiku)
                  </span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-border">
                    1-Click Action Drafting
                  </span>
                </div>
                <p className="text-xs text-navy-600">
                  Synthesizes professional return requests (with RMA & label requests) and urgent safety recall claims complete with CPSC identifier and remedy demands.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Data Structures */}
          {activeTab === 'datastructures' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-border shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h4 className="font-bold text-sm text-navy-900">Min-Heap (Python heapq)</h4>
                    <span className="text-[10px] font-mono text-emerald-700">O(log n) Priority Queue</span>
                  </div>
                </div>
                <p className="text-xs text-navy-600 leading-relaxed">
                  Keyed by <code className="font-mono">min(return_deadline, warranty_deadline)</code>.
                  Allows O(1) peek of the next impending deadline and O(log n) insertion/removal. Completely eliminates full table database scans on triage sweeps and dashboard renders.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-border shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💾</span>
                  <div>
                    <h4 className="font-bold text-sm text-navy-900">LRU Product Cache</h4>
                    <span className="text-[10px] font-mono text-navy-700">O(1) In-Memory Lookup with TTL</span>
                  </div>
                </div>
                <p className="text-xs text-navy-600 leading-relaxed">
                  Maintains an OrderedDict cache with capacity eviction and time-to-live expiration for CPSC Recall API queries. Prevents redundant federal API network traffic and accelerates recall checks.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-subtle/50 flex justify-between items-center shrink-0">
          <span className="text-xs text-navy-600">
            Aegis — Autonomous Purchase Guardian Agent
          </span>
          <button
            onClick={() => setIsArchitectureModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
