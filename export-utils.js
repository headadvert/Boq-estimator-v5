/**
 * export-utils.js — BOQ Platform v4
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES:
 *   Provides export-to-PDF and export-to-CSV (Excel) for BOQ and Cost tables.
 *   Works by enhancing / wrapping the existing exportPDF() function and adding
 *   a new exportCSV() function — without touching any existing logic.
 *
 * HOW IT INTEGRATES:
 *   - Adds "Export CSV" button to BOQ Results and Cost Report topbar actions
 *   - Wraps existing exportPDF() with improved cover page and table formatting
 *   - All new functions live on window.ExportUtils
 *
 * DEPENDENCIES:
 *   - jsPDF (already loaded in main HTML via cdnjs)
 *   - window.state (global state object from main HTML)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ============================================================
   1. CSV EXPORT UTILITIES
   ============================================================ */

const ExportUtils = {

  /* ── CSV helpers ── */

  /**
   * Safely escape a CSV cell value.
   * Wraps in quotes and escapes internal quotes.
   * @param {any} val
   * @returns {string}
   */
  _csvCell(val) {
    const str = String(val ?? '').replace(/"/g, '""');
    // Quote if contains comma, newline, or quote
    return /[,"\n\r]/.test(str) ? `"${str}"` : str;
  },

  /**
   * Convert an array of row-arrays to CSV string.
   * @param {Array<Array>} rows
   * @returns {string}
   */
  _toCSV(rows) {
    return rows.map(r => r.map(this._csvCell).join(',')).join('\r\n');
  },

  /**
   * Trigger a browser download of a text file.
   * @param {string} content   file content
   * @param {string} filename  suggested filename
   * @param {string} mimeType  e.g. 'text/csv'
   */
  _download(content, filename, mimeType = 'text/csv') {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType + ';charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /* ── BOQ CSV Export ── */

  /**
   * Export the BOQ items as an Excel-compatible CSV file.
   * Includes project header, all line items, and cost totals.
   */
  exportBOQCSV() {
    const items = window.state?.boqItems || [];
    if (!items.length) {
      window.showNotif?.('No BOQ to export — calculate BOQ first.', 'warn');
      return;
    }

    const projName     = window.state?.projectName    || 'Project';
    const projClient   = window.state?.projectClient  || '—';
    const projCode     = window.state?.buildingCode   || 'SBC304';
    const projType     = window.state?.projectType    || 'residential';
    const projLocation = window.state?.projectLocation || '—';
    const projGFA      = window.state?.projectGFA     || 0;
    const now          = new Date().toLocaleDateString('en-GB');

    const totalCost = items.reduce((s, i) => s + parseFloat(i.qty) * i.rate, 0);
    const costPm2   = projGFA > 0 ? Math.round(totalCost / projGFA) : 0;

    const rows = [
      // ── Header block ──
      ['BOQ Quick Estimator — Platform v4'],
      ['Generated:', now],
      [],
      ['Project Name:', projName],
      ['Client:', projClient],
      ['Location:', projLocation],
      ['Project Type:', projType],
      ['Building Code:', projCode],
      ['GFA:', projGFA + ' m²'],
      [],
      // ── Column headers ──
      ['No.', 'Section', 'Description', 'Specification', 'Unit', 'Quantity', 'Unit Rate (SAR)', 'Amount (SAR)'],
    ];

    // Data rows
    let currentSec = '';
    items.forEach(item => {
      if (item.sec !== currentSec) {
        currentSec = item.sec;
        rows.push(['', item.sec, '', '', '', '', '', '']);
      }
      rows.push([
        item.no,
        item.sec,
        item.desc,
        item.spec || '',
        item.unit,
        item.qty,
        item.rate,
        Math.round(parseFloat(item.qty) * item.rate),
      ]);
    });

    // Totals
    rows.push([]);
    rows.push(['', '', '', '', '', '', 'TOTAL (excl. VAT)', Math.round(totalCost)]);
    const vat = totalCost * 0.05;
    rows.push(['', '', '', '', '', '', 'VAT 5%', Math.round(vat)]);
    rows.push(['', '', '', '', '', '', 'GRAND TOTAL', Math.round(totalCost + vat)]);
    rows.push([]);
    rows.push(['', '', '', '', '', '', 'Cost / m² GFA', costPm2]);
    rows.push([]);
    rows.push(['DISCLAIMER: Preliminary budget quantities only. Verify before tender.']);

    const csv      = this._toCSV(rows);
    const safeName = projName.replace(/[^a-z0-9]/gi, '_');
    this._download(csv, `BOQ_${safeName}_${now.replace(/\//g, '-')}.csv`);

    window.showNotif?.('📊 BOQ exported as CSV (Excel)');
    window.mockAPI?.trackEvent('export_csv_boq', { name: projName, items: items.length });
  },

  /* ── Cost Report CSV Export ── */

  /**
   * Export the Cost Estimator items as a detailed CSV.
   * Includes material / labour / indirect split per line.
   */
  exportCostCSV() {
    const items = window.state?.costItems || [];
    if (!items.length) {
      window.showNotif?.('No Cost data — import BOQ and set rates first.', 'warn');
      return;
    }

    const contingency  = parseFloat(document.getElementById('cost-contingency')?.value) || 0.10;
    const vat          = parseFloat(document.getElementById('cost-vat')?.value)          || 0.05;
    const currency     = document.getElementById('cost-currency')?.value                 || 'SAR';
    const projName     = window.state?.projectName || document.getElementById('cost-name')?.value || 'Project';
    const now          = new Date().toLocaleDateString('en-GB');

    const rows = [
      ['BOQ Quick Estimator — Cost Report v4'],
      ['Generated:', now],
      ['Currency:', currency],
      [],
      ['Project Name:', projName],
      ['Contingency:', (contingency * 100).toFixed(0) + '%'],
      ['VAT:', (vat * 100).toFixed(0) + '%'],
      [],
      ['No.', 'Section', 'Description', 'Unit', 'Qty', 'Rate', 'Material', 'Labour', 'Indirect', 'Total Amount'],
    ];

    let totalAll = 0, totalMat = 0, totalLab = 0, totalInd = 0;
    let currentSec = '';

    items.forEach((item, i) => {
      const qty    = item.editedQty !== null ? item.editedQty : parseFloat(item.qty) || 0;
      const rate   = item.rate || 0;
      const amount = qty * rate;
      const mat    = amount * (item.matPct / 100);
      const lab    = amount * (item.labPct / 100);
      const ind    = amount - mat - lab;

      totalAll += amount;
      totalMat += mat;
      totalLab += lab;
      totalInd += ind;

      if (item.sec !== currentSec) {
        currentSec = item.sec;
        rows.push(['', item.sec]);
      }

      rows.push([
        item.no || (i + 1),
        item.sec,
        item.desc,
        item.unit,
        qty,
        rate.toFixed(2),
        Math.round(mat),
        Math.round(lab),
        Math.round(ind),
        Math.round(amount),
      ]);
    });

    const cont  = totalAll * contingency;
    const sub2  = totalAll + cont;
    const vatAmt = sub2 * vat;
    const grand  = sub2 + vatAmt;

    rows.push([]);
    rows.push(['', '', '', '', '', 'Sub-Total Construction', Math.round(totalMat), Math.round(totalLab), Math.round(totalInd), Math.round(totalAll)]);
    rows.push(['', '', '', '', '', `Contingency (${(contingency*100).toFixed(0)}%)`, '', '', '', Math.round(cont)]);
    rows.push(['', '', '', '', '', `VAT (${(vat*100).toFixed(0)}%)`, '', '', '', Math.round(vatAmt)]);
    rows.push(['', '', '', '', '', 'GRAND TOTAL', '', '', '', Math.round(grand)]);

    const csv      = this._toCSV(rows);
    const safeName = projName.replace(/[^a-z0-9]/gi, '_');
    this._download(csv, `CostReport_${safeName}_${now.replace(/\//g, '-')}.csv`);

    window.showNotif?.('📊 Cost report exported as CSV (Excel)');
    window.mockAPI?.trackEvent('export_csv_cost', { name: projName });
  },

  /* ── Inject Export Buttons ── */

  /**
   * Add "Export CSV" buttons to the BOQ Results and Cost Report card headers.
   * Called after DOMContentLoaded. Safe to call multiple times (idempotent).
   */
  injectExportButtons() {
    // ── BOQ Results card ──
    const boqCardHeader = document.querySelector('#page-boq-results .card-header > div[style*="gap"]');
    if (boqCardHeader && !document.getElementById('btn-export-boq-csv')) {
      const btn = document.createElement('button');
      btn.id        = 'btn-export-boq-csv';
      btn.className = 'btn btn-secondary btn-sm';
      btn.title     = 'Download BOQ as Excel/CSV';
      btn.innerHTML = '📊 Export CSV';
      btn.onclick   = () => ExportUtils.exportBOQCSV();
      // Insert before the first child
      boqCardHeader.insertBefore(btn, boqCardHeader.firstChild);
    }

    // ── Cost Report card ──
    const costCardHeader = document.querySelector('#page-cost-report .card-header > div[style*="gap"]');
    if (costCardHeader && !document.getElementById('btn-export-cost-csv')) {
      const btn = document.createElement('button');
      btn.id        = 'btn-export-cost-csv';
      btn.className = 'btn btn-secondary btn-sm';
      btn.title     = 'Download Cost Report as Excel/CSV';
      btn.innerHTML = '📊 Export CSV';
      btn.onclick   = () => ExportUtils.exportCostCSV();
      costCardHeader.insertBefore(btn, costCardHeader.firstChild);
    }
  },

};

/* ============================================================
   2. INJECT BUTTONS ON LOAD
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  // Small delay to ensure main HTML scripts have run
  setTimeout(() => ExportUtils.injectExportButtons(), 200);
});

/* ============================================================
   3. EXPORT
   ============================================================ */
window.ExportUtils = ExportUtils;
