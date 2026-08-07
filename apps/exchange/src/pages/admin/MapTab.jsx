// ─────────────────────────────────────────────────────────────────────────────
// WIRING MAP
//
// Draws every pointer and role grant between the core contracts and colours
// each one by whether it currently reads what it is supposed to. Everything
// here is derived from EDGES in wiring.js - this file renders, it does not
// decide what is wired to what.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Lock, X, Undo2 } from 'lucide-react';
import { useReadContracts } from 'wagmi';
import {
  ReactFlow, Background, Controls, MiniMap,
  Handle, Position, useNodesState, useEdgesState, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ADDRESSES } from '../../contracts';
import { Btn, CopyAddr, TxStatus, Label, useWrite, useCodeHashes, hashState } from './ui';
import {
  NODES, EDGES, OWNED_NODES, NODE_BY_KEY,
  addrOf, isSet, sameAddr, resolveArgs, edgeReady, edgeStatus, expectedLabel,
  SEVERITY_RANK,
} from './wiring';

// ── Status vocabulary ─────────────────────────────────────────────────────────
// A fault's weight is its edge severity. 'skipped' means the map could not
// check it (an address in the path is not configured), never a silent pass.

const SEVERITY_STYLE = {
  critical: { stroke: '#dc2626', text: 'text-red-600',   dot: 'bg-red-600',   pill: 'bg-red-50 text-red-700 border-red-200'       },
  degraded: { stroke: '#f59e0b', text: 'text-amber-600', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  optional: { stroke: '#9ca3af', text: 'text-gray-500',  dot: 'bg-gray-400',  pill: 'bg-gray-50 text-gray-600 border-gray-200'    },
};
const OK_STROKE      = '#16a34a';
const SKIPPED_STROKE = '#d1d5db';
const ABSENT_STROKE  = '#8b5cf6';

// ── Custom node ───────────────────────────────────────────────────────────────

function ContractNode({ data }) {
  const { label, address, deployed, worstFault, ownerSplit, drift, selected } = data;

  const ring =
    !deployed              ? 'border-gray-200 border-dashed bg-gray-50'
    : worstFault === 'critical' ? 'border-red-500 bg-white'
    : worstFault === 'degraded' ? 'border-amber-400 bg-white'
    : ownerSplit               ? 'border-amber-400 bg-white'
    : 'border-gray-200 bg-white';

  return (
    <div
      className={`rounded-xl border-2 px-3 py-2 shadow-sm min-w-[150px] transition-all ${ring} ${selected ? 'ring-2 ring-hub-green ring-offset-2' : ''}`}
    >
      <Handle type="target" position={Position.Top}    className="!bg-gray-300 !w-1.5 !h-1.5 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-1.5 !h-1.5 !border-0" />
      <Handle type="target" position={Position.Left}   className="!bg-gray-300 !w-1.5 !h-1.5 !border-0" id="l" />
      <Handle type="source" position={Position.Right}  className="!bg-gray-300 !w-1.5 !h-1.5 !border-0" id="r" />

      <div className="flex items-center gap-1.5">
        {drift !== 'none' && (
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${drift === 'ok' ? 'bg-hub-green' : drift === 'stale' ? 'bg-amber-400' : 'bg-gray-300'}`}
            title={drift === 'ok' ? 'Implementation up to date' : drift === 'stale' ? 'Implementation drift - upgrade available' : 'Implementation not checked'}
          />
        )}
        <span className="text-xs font-black uppercase tracking-widest text-gray-800 truncate">{label}</span>
      </div>

      {deployed
        ? <span className="text-[10px] font-mono text-gray-400">{address.slice(0, 8)}…{address.slice(-6)}</span>
        : <span className="text-[10px] font-medium text-gray-400 italic">not deployed</span>}

      {(worstFault || ownerSplit) && (
        <div className="flex items-center gap-1 mt-1">
          {worstFault && (
            <span className={`text-[9px] font-black uppercase tracking-widest ${SEVERITY_STYLE[worstFault].text}`}>
              {worstFault}
            </span>
          )}
          {ownerSplit && (
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600" title="owner() does not match Treasury.owner()">
              owner split
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { contract: ContractNode };

// ── Fault row ─────────────────────────────────────────────────────────────────

function FaultRow({ fault, onFix, busy }) {
  const style = SEVERITY_STYLE[fault.severity];
  const fromLabel = NODE_BY_KEY[fault.from]?.label ?? fault.from;
  const toLabel   = fault.to ? (NODE_BY_KEY[fault.to]?.label ?? fault.to) : null;

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${style.pill}`}>
              {fault.severity}
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-gray-700">
              {fromLabel}{toLabel ? ` -> ${toLabel}` : ''}
            </span>
          </div>
          <p className="text-xs font-mono text-gray-500 mt-1">{fault.label}</p>
        </div>
        {fault.fix
          ? <Btn onClick={() => onFix(fault)} disabled={busy}>Fix</Btn>
          : <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <Lock size={11} /> No fix path
            </span>}
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">{fault.breaks}</p>

      {!fault.fix && fault.noFix && (
        <p className="text-xs text-gray-400 leading-relaxed italic">{fault.noFix}</p>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 self-center">Reads</span>
        <span className="min-w-0">
          {typeof fault.value === 'boolean'
            ? <span className={`text-xs font-mono ${fault.value ? 'text-hub-green' : 'text-red-500'}`}>{String(fault.value)}</span>
            : <CopyAddr address={fault.value} />}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 self-center">Expects</span>
        <span className="min-w-0">
          {typeof fault.expected === 'string' && fault.expected.startsWith('0x')
            ? <CopyAddr address={fault.expected} />
            : <span className="text-xs font-mono text-gray-600">{fault.expected}</span>}
        </span>
      </div>
    </div>
  );
}

// ── Node inspector ────────────────────────────────────────────────────────────

function Inspector({ nodeKey, checks, ownerInfo, onClose }) {
  const node = NODE_BY_KEY[nodeKey];
  if (!node) return null;

  const outgoing = checks.filter(c => c.from === nodeKey);
  const incoming = checks.filter(c => c.to === nodeKey);
  const owner    = ownerInfo[nodeKey];

  const Row = ({ c, direction }) => {
    const other = direction === 'out' ? c.to : c.from;
    const otherLabel = other ? (NODE_BY_KEY[other]?.label ?? other) : '-';
    const colour =
      c.status === 'ok'      ? 'bg-hub-green'
      : c.status === 'skipped' ? 'bg-gray-300'
      : c.status === 'absent'  ? 'bg-violet-500'
      : SEVERITY_STYLE[c.severity].dot;
    return (
      <div className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${colour}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono text-gray-700 truncate">{c.label}</p>
          <p className="text-[10px] text-gray-400">
            {direction === 'out' ? `-> ${otherLabel}` : `<- ${otherLabel}`}
            {c.status === 'skipped' && ' (not checked - address unset)'}
            {c.status === 'absent'  && ' (not on deployed implementation)'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-4 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-tighter text-gray-900">{node.label}</h3>
          <div className="mt-1"><CopyAddr address={addrOf(nodeKey)} /></div>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>

      {owner && (
        <div>
          <Label>Owner</Label>
          <CopyAddr address={owner.value} />
          {owner.split && (
            <p className="text-xs text-amber-600 mt-1 leading-relaxed">
              Does not match Treasury.owner(). The Treasury owner wallet cannot call setters on this contract.
            </p>
          )}
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <Label>Points at ({outgoing.length})</Label>
          {outgoing.map(c => <Row key={c.id} c={c} direction="out" />)}
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <Label>Pointed at by ({incoming.length})</Label>
          {incoming.map(c => <Row key={c.id} c={c} direction="in" />)}
        </div>
      )}

      {outgoing.length === 0 && incoming.length === 0 && (
        <p className="text-xs text-gray-400">No wiring tracked for this contract.</p>
      )}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function MapTab() {
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();
  const [selected, setSelected] = useState(null);

  // Only read edges whose whole address path is configured. Everything else is
  // reported as 'not checked' rather than quietly counted as healthy.
  const readable = useMemo(() => EDGES.filter(edgeReady), []);

  const { data: edgeData, refetch: refetchEdges, isLoading: edgesLoading } = useReadContracts({
    contracts: readable.map(e => ({
      address:      addrOf(e.read.on),
      abi:          e.read.abi,
      functionName: e.read.fn,
      args:         resolveArgs(e.read.args),
    })),
  });

  const ownable = useMemo(() => OWNED_NODES.filter(n => isSet(addrOf(n.key))), []);

  const { data: ownerData, refetch: refetchOwners } = useReadContracts({
    contracts: ownable.map(n => ({ address: addrOf(n.key), abi: n.abi, functionName: 'owner' })),
  });

  const hashes = useCodeHashes(true);

  const refetch = useCallback(() => { refetchEdges(); refetchOwners(); }, [refetchEdges, refetchOwners]);
  useEffect(() => { if (isConfirmed) refetch(); }, [isConfirmed, refetch]);

  // ── Evaluate every edge ─────────────────────────────────────────────────────
  const checks = useMemo(() => {
    const byId = {};
    readable.forEach((e, i) => {
      byId[e.id] = { value: edgeData?.[i]?.result, failed: edgeData?.[i]?.status === 'failure' };
    });

    return EDGES.map(e => {
      const { value, failed } = byId[e.id] ?? {};
      return {
        ...e,
        value,
        status: edgeStatus(e, value, !!failed),
        expected: expectedLabel(e),
      };
    });
  }, [readable, edgeData]);

  // ── Ownership drift, measured against Treasury.owner() ──────────────────────
  const ownerInfo = useMemo(() => {
    const out = {};
    ownable.forEach((n, i) => {
      out[n.key] = {
        value:   ownerData?.[i]?.result,
        // An immutable, non-Ownable deployment has no owner() to compare.
        missing: ownerData?.[i]?.status === 'failure',
      };
    });
    const canonical = out.TREASURY?.value;
    Object.keys(out).forEach(k => {
      const v = out[k].value;
      out[k].split = !!canonical && !!v && !sameAddr(v, canonical);
    });
    return out;
  }, [ownable, ownerData]);

  const faults = useMemo(
    () => checks
      .filter(c => c.status === 'fault')
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
    [checks],
  );

  const healthy = checks.filter(c => c.status === 'ok').length;
  const skipped = checks.filter(c => c.status === 'skipped').length;
  const absent  = checks.filter(c => c.status === 'absent');
  const ownerSplits  = Object.entries(ownerInfo).filter(([, v]) => v.split).map(([k]) => k);
  const ownerMissing = Object.entries(ownerInfo).filter(([, v]) => v.missing).map(([k]) => k);

  // ── Graph ───────────────────────────────────────────────────────────────────
  const worstByNode = useMemo(() => {
    const out = {};
    faults.forEach(f => {
      const cur = out[f.from];
      if (!cur || SEVERITY_RANK[f.severity] < SEVERITY_RANK[cur]) out[f.from] = f.severity;
    });
    return out;
  }, [faults]);

  const initialNodes = useMemo(() => NODES.map(n => ({
    id: n.key,
    type: 'contract',
    position: n.pos,
    data: {
      label:      n.label,
      address:    addrOf(n.key),
      deployed:   isSet(addrOf(n.key)),
      worstFault: worstByNode[n.key] ?? null,
      ownerSplit: !!ownerInfo[n.key]?.split,
      drift:      n.hashKey ? hashState(hashes, n.key) : 'none',
      selected:   selected === n.key,
    },
  })), [worstByNode, ownerInfo, hashes, selected]);

  const flowEdges = useMemo(() => checks
    .filter(c => c.to && isSet(addrOf(c.from)) && isSet(addrOf(c.to)))
    .map(c => {
      const fault = c.status === 'fault';
      const stroke =
        c.status === 'ok'      ? OK_STROKE
        : c.status === 'skipped' ? SKIPPED_STROKE
        : c.status === 'absent'  ? ABSENT_STROKE
        : SEVERITY_STYLE[c.severity].stroke;
      return {
        id: c.id,
        source: c.from,
        target: c.to,
        label: c.label,
        type: 'smoothstep',
        animated: fault && c.severity === 'critical',
        style: {
          stroke,
          strokeWidth: fault ? 2.5 : 1.5,
          strokeDasharray:
            c.status === 'skipped' || c.status === 'absent' || (fault && c.severity !== 'critical')
              ? '6 4' : undefined,
        },
        labelStyle: { fontSize: 9, fill: fault ? stroke : '#9ca3af', fontFamily: 'ui-monospace, monospace' },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
        labelBgPadding: [3, 1],
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 },
      };
    }), [checks]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Keep live status on the nodes without discarding positions the user dragged.
  useEffect(() => {
    setRfNodes(cur => cur.map(n => {
      const next = initialNodes.find(x => x.id === n.id);
      return next ? { ...n, data: next.data } : n;
    }));
  }, [initialNodes, setRfNodes]);

  useEffect(() => { setRfEdges(flowEdges); }, [flowEdges, setRfEdges]);

  const onNodeClick = useCallback((_, node) => setSelected(cur => (cur === node.id ? null : node.id)), []);

  // ── Layout reset ────────────────────────────────────────────────────────────
  // Dragged positions live in component state only, so putting the graph back
  // is a matter of restoring the authored pos from NODES and refitting. fitView
  // has to wait for the position commit, hence the pending flag.
  const [rfInstance, setRfInstance] = useState(null);
  const [pendingFit, setPendingFit] = useState(false);

  const moved = rfNodes.some(n => {
    const home = NODE_BY_KEY[n.id]?.pos;
    return home && (n.position.x !== home.x || n.position.y !== home.y);
  });

  const resetLayout = useCallback(() => {
    setRfNodes(cur => cur.map(n => {
      const home = NODE_BY_KEY[n.id]?.pos;
      return home ? { ...n, position: { ...home } } : n;
    }));
    setPendingFit(true);
  }, [setRfNodes]);

  useEffect(() => {
    if (!pendingFit || !rfInstance) return;
    rfInstance.fitView({ duration: 300 });
    setPendingFit(false);
  }, [pendingFit, rfInstance]);

  const applyFix = useCallback(fault => {
    if (!fault.fix) return;
    writeContract({
      address:      addrOf(fault.fix.on),
      abi:          fault.fix.abi,
      functionName: fault.fix.fn,
      args:         resolveArgs(fault.fix.args),
    });
  }, [writeContract]);

  const busy = isPending || isConfirming;

  return (
    <div className="space-y-6">

      {/* ── Summary strip ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest">
            <span className={`w-2 h-2 rounded-full ${faults.length ? 'bg-red-500' : 'bg-hub-green'}`} />
            <span className={faults.length ? 'text-red-600' : 'text-hub-green'}>
              {edgesLoading ? 'Checking…' : `${faults.length} fault${faults.length === 1 ? '' : 's'}`}
            </span>
          </span>
          <span className="text-xs font-medium text-gray-400">{healthy} links healthy</span>
          {absent.length > 0 && (
            <span className="text-xs font-black uppercase tracking-widest text-violet-600">
              {absent.length} behind source
            </span>
          )}
          {skipped > 0 && <span className="text-xs font-medium text-gray-400">{skipped} not checked</span>}
          {ownerSplits.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-amber-600">
              <AlertTriangle size={12} /> {ownerSplits.length} owner split{ownerSplits.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={resetLayout} disabled={!moved} variant="ghost">
            <span className="flex items-center gap-1.5"><Undo2 size={12} /> Reset layout</span>
          </Btn>
          <Btn onClick={refetch} variant="ghost"><RefreshCw size={12} /></Btn>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="h-[560px] border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onInit={setRfInstance}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: false }}
          minZoom={0.2}
        >
          <Background gap={16} size={1} color="#e5e7eb" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeStrokeWidth={3} />
        </ReactFlow>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 flex-wrap text-[10px] font-black uppercase tracking-widest text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-hub-green" /> wired</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-red-600" /> critical fault</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-amber-500" /> degraded</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-violet-500" /> behind source</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-gray-300" /> not checked</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> implementation drift</span>
      </div>

      {/* ── Inspector ── */}
      {selected && (
        <Inspector nodeKey={selected} checks={checks} ownerInfo={ownerInfo} onClose={() => setSelected(null)} />
      )}

      {/* ── Behind source ── */}
      {absent.length > 0 && (
        <div>
          <Label>Behind source</Label>
          <div className="border border-violet-200 bg-violet-50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-violet-800 leading-relaxed">
              These getters reverted, which means they do not exist on the implementation currently behind the
              proxy. The contract source in this repo is ahead of what is deployed. There is nothing to set -
              the wiring only becomes checkable after the implementation is upgraded.
            </p>
            {absent.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-violet-700 w-32 shrink-0">
                  {NODE_BY_KEY[c.from]?.label ?? c.from}
                </span>
                <span className="text-xs font-mono text-violet-600">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ownership ── */}
      {(ownerSplits.length > 0 || ownerMissing.length > 0) && (
        <div>
          <Label>Ownership</Label>
          <div className="space-y-3">
            {ownerSplits.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
                <p className="text-xs text-amber-800 leading-relaxed">
                  These contracts report a different owner() than the Treasury. Nothing breaks today - the next
                  setter call from the Treasury owner wallet reverts. This console gates on Treasury.owner(),
                  so a wallet that can open this page cannot necessarily configure these.
                </p>
                {ownerSplits.map(k => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-widest text-amber-700 w-32 shrink-0">
                      {NODE_BY_KEY[k]?.label ?? k}
                    </span>
                    <CopyAddr address={ownerInfo[k].value} />
                  </div>
                ))}
              </div>
            )}
            {ownerMissing.length > 0 && (
              <div className="border border-gray-100 rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-500 leading-relaxed">
                  No owner() to read. Either an immutable deployment or an implementation that predates
                  Ownable. Nothing on it can be reconfigured.
                </p>
                {ownerMissing.map(k => (
                  <span key={k} className="inline-block text-xs font-black uppercase tracking-widest text-gray-500 mr-4">
                    {NODE_BY_KEY[k]?.label ?? k}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Faults ── */}
      <div>
        <Label>Faults</Label>
        {faults.length === 0 ? (
          <div className="border border-gray-100 rounded-xl p-6 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-hub-green">Everything tracked is wired</p>
            {skipped > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {skipped} link{skipped === 1 ? '' : 's'} could not be checked because an address in the path is unset.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {faults.map(f => <FaultRow key={f.id} fault={f} onFix={applyFix} busy={busy} />)}
          </div>
        )}
      </div>

      {/* ── Not checked ── */}
      {skipped > 0 && (
        <div>
          <Label>Not checked</Label>
          <div className="border border-gray-100 rounded-xl p-4 space-y-1">
            {checks.filter(c => c.status === 'skipped').map(c => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                <span className="text-xs font-mono text-gray-500">
                  {NODE_BY_KEY[c.from]?.label ?? c.from} . {c.label}
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-1 leading-relaxed">
              An address these depend on is not configured in .env, so the map cannot tell whether they are
              correct. They are not counted as healthy.
            </p>
          </div>
        </div>
      )}

      <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
    </div>
  );
}
