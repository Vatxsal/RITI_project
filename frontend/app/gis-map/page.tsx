"use client";

import { type CSSProperties, useMemo, useState } from 'react';
import Map from '@/components/dashboard/Map';

type PredicateType = 'attribute' | 'spatial';

type Predicate = {
  id: number;
  type: PredicateType;
  field: string;
  op: string;
  value: string;
};

type LayerState = {
  govtSchools: boolean;
  healthInstitutes: boolean;
  ayush: boolean;
  policeStations: boolean;
  anganwadi: boolean;
};

const ATTRIBUTE_FIELDS = ['Population', 'Aspiration count'];
const ATTRIBUTE_OPS = ['>', '<', '≥', '≤', '='];
const SPATIAL_LAYER_OPTIONS = ['Primary Schools', 'Govt Schools', 'Health Institutes', 'AYUSH', 'Police Stations', 'Anganwadi'];

const INITIAL_PREDICATES: Predicate[] = [
  { id: 1, type: 'attribute', field: 'Population', op: '>', value: '3000' },
  { id: 2, type: 'spatial', field: 'Primary Schools', op: 'Does NOT have layer (within km)', value: '3' },
  { id: 3, type: 'attribute', field: 'Aspiration count', op: '≥', value: '5' },
];

const INITIAL_LAYERS: LayerState = {
  govtSchools: true,
  healthInstitutes: true,
  ayush: false,
  policeStations: false,
  anganwadi: false,
};

export default function GISPage() {
  const [predicates, setPredicates] = useState<Predicate[]>(INITIAL_PREDICATES);
  const [matchedCount, setMatchedCount] = useState(87);
  const [matchedDistricts, setMatchedDistricts] = useState(4);
  const [layers, setLayers] = useState<LayerState>(INITIAL_LAYERS);

  const activeLayers = useMemo(() => layers, [layers]);
  const populationAffected = useMemo(() => `~${(matchedCount * 0.024).toFixed(1)} L population affected`, [matchedCount]);

  function updatePredicate(id: number, patch: Partial<Predicate>) {
    setPredicates((current) => current.map((predicate) => (predicate.id === id ? { ...predicate, ...patch } : predicate)));
  }

  function removePredicate(id: number) {
    setPredicates((current) => current.filter((predicate) => predicate.id !== id));
  }

  function addPredicate() {
    setPredicates((current) => [
      ...current,
      { id: Date.now(), type: 'attribute', field: 'Population', op: '>', value: '' },
    ]);
  }

  async function runFilter() {
    const spatialCount = predicates.filter((predicate) => predicate.type === 'spatial').length;
    const attributeCount = predicates.length - spatialCount;
    const activeLayerCount = Object.values(layers).filter(Boolean).length;

    setMatchedCount(Math.max(12, 87 - attributeCount * 4 - spatialCount * 11 + activeLayerCount * 3));
    setMatchedDistricts(Math.max(1, Math.min(41, 4 + activeLayerCount - spatialCount)));
  }

  return (
    <div style={pageShellStyle}>
      <div style={titleShellStyle}>
        <div style={titleStyle}>GIS &amp; Filter Builder</div>
        <div style={subtitleStyle}>Compose spatial filters like "GPs without primary school within 3 km AND population &gt; 3000" and see matches mapped instantly.</div>
      </div>

      <div style={splitShellStyle}>
        <aside style={sidebarStyle}>
          <div style={labelStyle}>Filter Builder</div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
            {predicates.map((predicate) => (
              <div key={predicate.id} style={predicateCardStyle}>
                {predicate.type === 'attribute' ? (
                  <>
                    <div style={rowStyle}>
                      <select value={predicate.field} onChange={(event) => updatePredicate(predicate.id, { field: event.target.value })} style={inputStyle}>
                        {ATTRIBUTE_FIELDS.map((field) => <option key={field} value={field}>{field}</option>)}
                      </select>
                      <button type="button" onClick={() => removePredicate(predicate.id)} style={removeButtonStyle}>×</button>
                    </div>
                    <div style={{ ...rowStyle, marginTop: 8 }}>
                      <select value={predicate.op} onChange={(event) => updatePredicate(predicate.id, { op: event.target.value })} style={{ ...inputStyle, width: 70, flexShrink: 0 }}>
                        {ATTRIBUTE_OPS.map((op) => <option key={op} value={op}>{op}</option>)}
                      </select>
                      <input value={predicate.value} onChange={(event) => updatePredicate(predicate.id, { value: event.target.value })} type="text" style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={rowStyle}>
                      <select value={predicate.op} onChange={(event) => updatePredicate(predicate.id, { op: event.target.value })} style={inputStyle}>
                        <option value="Does NOT have layer (within km)">Does NOT have layer (within km)</option>
                      </select>
                      <button type="button" onClick={() => removePredicate(predicate.id)} style={removeButtonStyle}>×</button>
                    </div>
                    <div style={{ ...rowStyle, marginTop: 8 }}>
                      <select value={predicate.field} onChange={(event) => updatePredicate(predicate.id, { field: event.target.value })} style={{ ...inputStyle, flex: 1 }}>
                        {SPATIAL_LAYER_OPTIONS.map((field) => <option key={field} value={field}>{field}</option>)}
                      </select>
                      <input value={predicate.value} onChange={(event) => updatePredicate(predicate.id, { value: event.target.value })} type="text" style={{ ...inputStyle, width: 60, flexShrink: 0 }} />
                    </div>
                  </>
                )}
              </div>
            ))}

            <button type="button" onClick={addPredicate} style={addButtonStyle}>+ Add predicate</button>
            <button type="button" onClick={runFilter} style={runButtonStyle}>Run filter</button>

            <div style={matchLineStyle}>
              <span style={matchNumberStyle}>{matchedCount}</span> GPs match across {matchedDistricts} districts
            </div>

            <div style={sectionLabelStyle}>GIS LAYERS</div>
            <div style={{ marginTop: 12 }}>
              {[
                { key: 'govtSchools', label: 'Govt Schools', color: '#3B82F6' },
                { key: 'healthInstitutes', label: 'Health Institutes', color: '#EF4444' },
                { key: 'ayush', label: 'AYUSH', color: '#22C55E' },
                { key: 'policeStations', label: 'Police Stations', color: '#8B5CF6' },
                { key: 'anganwadi', label: 'Anganwadi', color: '#F59E0B' },
              ].map((layer) => (
                <label key={layer.key} style={layerItemStyle}>
                  <input
                    type="checkbox"
                    checked={layers[layer.key as keyof LayerState]}
                    onChange={(event) => setLayers((current) => ({ ...current, [layer.key]: event.target.checked }))}
                    style={{ width: 14, height: 14, accentColor: layer.color }}
                  />
                  <span style={{ ...dotStyle, background: layer.color }} />
                  <span>{layer.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <section style={mapPanelStyle}>
          <div style={mapCanvasWrapStyle}>
            <Map compact predicates={predicates} activeLayers={activeLayers} style={{ height: '100%' }} />
          </div>

          <div style={matchedCardWrapStyle}>
            <div style={matchedCardStyle}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Matched GPs</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#1a2744', lineHeight: 1.05 }}>{matchedCount}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>{populationAffected}</div>
            </div>
          </div>

          <div style={legendWrapStyle}>
            <div style={legendCardStyle}>
              <div style={legendTitleStyle}>LEGEND</div>
              {[
                { label: 'Matched GP', color: '#f97316' },
                { label: 'Govt School', color: '#3B82F6' },
                { label: 'AYUSH', color: '#22C55E' },
                { label: 'Health Institute', color: '#EF4444' },
              ].map((item) => (
                <div key={item.label} style={legendRowStyle}>
                  <span style={{ ...dotStyle, background: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const pageShellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 64px)',
  background: '#f8fafc',
  overflow: 'hidden',
  color: '#1a2744',
};

const titleShellStyle: CSSProperties = {
  padding: '20px 24px 0',
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: '#1a2744',
  lineHeight: 1.15,
};

const subtitleStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: '#64748b',
  fontStyle: 'italic',
};

const splitShellStyle: CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  marginTop: 16,
};

const sidebarStyle: CSSProperties = {
  width: 300,
  flexShrink: 0,
  background: '#ffffff',
  borderRight: '1px solid #e2e8f0',
  padding: 20,
  overflowY: 'auto',
};

const mapPanelStyle: CSSProperties = {
  position: 'relative',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
};

const mapCanvasWrapStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
};

const matchedCardWrapStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  pointerEvents: 'none',
};

const matchedCardStyle: CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  padding: '16px 20px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
};

const legendWrapStyle: CSSProperties = {
  position: 'absolute',
  bottom: 20,
  left: 16,
  zIndex: 10,
  pointerEvents: 'none',
};

const legendCardStyle: CSSProperties = {
  background: '#ffffff',
  borderRadius: 10,
  padding: '14px 16px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const legendTitleStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 8,
};

const legendRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: '#374151',
  marginBottom: 6,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const sectionLabelStyle: CSSProperties = {
  marginTop: 20,
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const predicateCardStyle: CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 10,
  marginBottom: 8,
  background: '#ffffff',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

const inputStyle: CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  background: '#ffffff',
  color: '#1a2744',
  width: '100%',
  minWidth: 0,
};

const removeButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  background: '#ffffff',
  color: '#64748b',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
  flexShrink: 0,
};

const addButtonStyle: CSSProperties = {
  width: '100%',
  border: '1px dashed #cbd5e1',
  borderRadius: 8,
  padding: '8px 12px',
  background: 'transparent',
  color: '#64748b',
  fontSize: 13,
  cursor: 'pointer',
};

const runButtonStyle: CSSProperties = {
  width: '100%',
  background: '#f97316',
  color: '#ffffff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 12px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  marginTop: 8,
};

const matchLineStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: '#1a2744',
  fontWeight: 600,
};

const matchNumberStyle: CSSProperties = {
  color: '#f97316',
  fontWeight: 800,
};

const layerItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
  fontSize: 13,
  color: '#1a2744',
  cursor: 'pointer',
};

const dotStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
};
