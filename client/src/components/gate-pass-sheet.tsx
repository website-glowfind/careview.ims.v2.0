import { renderToStaticMarkup } from 'react-dom/server';
import type { CSSProperties } from 'react';
import templateUrl from '@/assets/warehouse-gate-pass-template.jpg';
import type { GatePass } from '@/store/warehouseStore';

// The sheet is the KHealth / Careview Warehouse Gate Pass image with the entered values
// placed on its fields. Coordinates were measured on the template at 1413 × 2000 and are
// used as percentages, so the same markup renders the on-screen preview and the print page.
// Inline styles only — the print window has no Tailwind.

const W = 1413;
const H = 2000;
const box = (x1: number, y1: number, x2: number, y2: number): CSSProperties => ({
  position: 'absolute', left: `${(x1 / W) * 100}%`, top: `${(y1 / H) * 100}%`, width: `${((x2 - x1) / W) * 100}%`, height: `${((y2 - y1) / H) * 100}%`,
  display: 'flex', alignItems: 'center', overflow: 'hidden', color: '#0b2a6b', fontFamily: 'Arial, Helvetica, sans-serif', lineHeight: 1.1,
});

export const formatGpDate = (s?: string) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const ROW_CENTERS = [903, 988, 1073, 1159, 1244, 1329, 1411, 1490, 1567, 1645];

export function GatePassSheet({ pass }: { pass: GatePass }) {
  const text = (x1: number, y1: number, x2: number, y2: number, value: string, size = 1.9, extra: CSSProperties = {}) => (
    <div style={{ ...box(x1, y1, x2, y2), fontSize: `${size}cqw`, ...extra }}>{value}</div>
  );
  const tick = (x1: number, y1: number, x2: number, y2: number, on: boolean) => on && (
    <div style={{ ...box(x1, y1, x2, y2), justifyContent: 'center', fontSize: '3.6cqw', fontWeight: 700 }}>✓</div>
  );
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1447 / 2048', containerType: 'inline-size', background: '#fff' }}>
      <img src={templateUrl} alt="Warehouse Gate Pass" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {text(312, 405, 740, 445, pass.gatePassNo, 2.1, { fontWeight: 700 })}
      {text(952, 405, 1322, 445, formatGpDate(pass.date), 2.1)}
      {text(420, 483, 1320, 521, pass.requestingDepartment)}
      {text(396, 550, 1320, 588, pass.requestor)}
      {tick(367, 615, 407, 655, pass.material === 'IN')}
      {tick(606, 615, 647, 655, pass.material === 'OUT')}
      {ROW_CENTERS.map((cy, i) => {
        const l = pass.lines[i];
        if (!l) return null;
        return (
          <div key={i}>
            {text(188, cy - 38, 855, cy + 38, l.itemCode ? `${l.description}  [${l.itemCode}]` : l.description, 1.7)}
            {text(866, cy - 38, 1058, cy + 38, String(l.quantity ?? ''), 1.9, { justifyContent: 'center' })}
            {text(1070, cy - 38, 1338, cy + 38, l.remarks, 1.5)}
          </div>
        );
      })}
      {text(250, 1704, 1320, 1744, pass.destination)}
      {text(122, 1840, 660, 1878, pass.preparedBy, 1.9, { justifyContent: 'center' })}
      {text(180, 1908, 660, 1946, formatGpDate(pass.preparedDate), 1.7)}
      {text(755, 1840, 1295, 1878, pass.receivedBy || '', 1.9, { justifyContent: 'center' })}
      {text(812, 1908, 1295, 1946, formatGpDate(pass.receivedDate), 1.7)}
    </div>
  );
}

/** Opens a print window containing one A4 page per gate pass. */
export function printGatePasses(passes: GatePass[]) {
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) { alert('Allow pop-ups for this site to print the gate pass.'); return; }
  const pages = passes.map((p) => `<div class="page">${renderToStaticMarkup(<GatePassSheet pass={p} />)
    .replace(/src="([^"]+)"/, (_m, src) => `src="${new URL(src, window.location.href).href}"`)}</div>`).join('');
  w.document.write(`<!doctype html><html><head><title>Warehouse Gate Pass ${passes.map((p) => p.gatePassNo).join(', ')}</title>
    <style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}.page{width:210mm;height:297mm;page-break-after:always;overflow:hidden}.page:last-child{page-break-after:auto}
    @media screen{body{background:#e5e7eb}.page{margin:12px auto;box-shadow:0 2px 12px rgba(0,0,0,.2)}}</style></head>
    <body>${pages}<script>window.onload=()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r}))).then(()=>setTimeout(()=>window.print(),150))}</script></body></html>`);
  w.document.close();
}
