/**
 * features-v4.js — BOQ Platform v4
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES:
 *   Additive feature layer — ALL new features live here.
 *   Nothing in boq-estimator-v4.html is modified by this file.
 *
 * FEATURES IN THIS FILE:
 *   1. Smart Presets Dropdown (Residential / Commercial / Villa)
 *   2. Live Cost Optimization Suggestions (rule-based)
 *   3. Sticky Summary Panel (non-destructive UI enhancement)
 *   4. Input Debouncing (performance safety)
 *   5. SaaS Hooks (plan banners, usage stats display)
 *
 * INTEGRATION PATTERN:
 *   Each feature follows: inject HTML → attach event listeners → patch/wrap
 *   existing functions where needed. No existing code is deleted or changed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ============================================================
   1. SMART PRESETS
   ============================================================ */

/**
 * Preset configurations for common KSA project types.
 * Each preset fills in project info, selects project type & code,
 * and sets spec sizes.
 */
const PRESETS = {

  residential_villa: {
    label:       '🏠 Residential Villa',
    description: 'Standard KSA villa — SBC 304, 4 bedrooms',
    projectType: 'residential',
    buildingCode: 'SBC304',
    projectInfo: {
      'proj-location': 'Eastern Province, KSA',
      'proj-ref':      'BOQ-VILLA-001',
      'proj-gfa':      '450',
      'proj-notes':    'Standard residential villa — ground + 1 floor. SBC 304 compliant.',
    },
    specSizes: {
      'sz-slab':       '0.15',
      'sz-found':      '0.75',
      'sz-col':        '0.40',
      'sz-rebar':      '16',
      'sz-ext-block':  '0.20',
      'sz-int-block':  '0.15',
      'sz-tile':       '0.60',
      'sz-plaster':    '0.015',
      'sz-cable':      '4.0',
      'sz-pipe':       '0.022',
      'sz-ac':         '2.0',
    },
    rooms: [
      { name:'Living Room',      l:7,   w:5,   h:3.2, doors:2, windows:3, mepElec:true,  mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Majlis',           l:6,   w:5,   h:3.5, doors:2, windows:3, mepElec:true,  mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Master Bedroom',   l:5.5, w:4.5, h:3.2, doors:1, windows:2, mepElec:true,  mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Bedroom 2',        l:4.5, w:3.5, h:3.2, doors:1, windows:1, mepElec:true,  mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Bedroom 3',        l:4,   w:3.5, h:3.2, doors:1, windows:1, mepElec:true,  mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Bedroom 4',        l:4,   w:3.5, h:3.2, doors:1, windows:1, mepElec:true,  mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Kitchen',          l:4,   w:3,   h:3.2, doors:1, windows:1, mepElec:true,  mepPlumb:true,  mepHVAC:true, mepFire:true  },
      { name:'Master Bathroom',  l:3,   w:2.5, h:2.8, doors:1, windows:0, mepElec:true,  mepPlumb:true,  mepHVAC:false,mepFire:false },
      { name:'Family Bathroom',  l:2.5, w:2,   h:2.8, doors:1, windows:0, mepElec:true,  mepPlumb:true,  mepHVAC:false,mepFire:false },
      { name:'Garage',           l:6,   w:3,   h:3.0, doors:1, windows:0, mepElec:true,  mepPlumb:false, mepHVAC:false,mepFire:true  },
    ],
  },

  commercial_office: {
    label:       '🏢 Commercial Office',
    description: 'Mid-rise office — SBC 304, open plan',
    projectType: 'commercial',
    buildingCode: 'SBC304',
    projectInfo: {
      'proj-location': 'Dammam / Riyadh, KSA',
      'proj-ref':      'BOQ-COMM-001',
      'proj-gfa':      '1200',
      'proj-notes':    'Commercial office — 3 floors. Enhanced MEP scope.',
    },
    specSizes: {
      'sz-slab':       '0.20',
      'sz-found':      '1.00',
      'sz-col':        '0.50',
      'sz-rebar':      '20',
      'sz-ext-block':  '0.20',
      'sz-int-block':  '0.10',
      'sz-tile':       '0.80',
      'sz-plaster':    '0.015',
      'sz-cable':      '6.0',
      'sz-pipe':       '0.028',
      'sz-ac':         '2.5',
    },
    rooms: [
      { name:'Reception / Lobby',    l:10, w:8,  h:4.0, doors:3, windows:4, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true },
      { name:'Open Office Floor 1',  l:20, w:15, h:3.5, doors:4, windows:8, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true },
      { name:'Open Office Floor 2',  l:20, w:15, h:3.5, doors:4, windows:8, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true },
      { name:'Board Room',           l:8,  w:6,  h:3.5, doors:1, windows:3, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true },
      { name:'Meeting Room 1',       l:5,  w:4,  h:3.2, doors:1, windows:2, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true },
      { name:'Meeting Room 2',       l:5,  w:4,  h:3.2, doors:1, windows:2, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true },
      { name:"Server / IT Room",     l:4,  w:3,  h:3.5, doors:1, windows:0, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true },
      { name:'Male Toilets',         l:5,  w:3,  h:3.0, doors:1, windows:1, mepElec:true, mepPlumb:true,  mepHVAC:false,mepFire:false},
      { name:'Female Toilets',       l:5,  w:3,  h:3.0, doors:1, windows:1, mepElec:true, mepPlumb:true,  mepHVAC:false,mepFire:false},
      { name:'Pantry / Canteen',     l:6,  w:4,  h:3.2, doors:1, windows:2, mepElec:true, mepPlumb:true,  mepHVAC:true, mepFire:true },
      { name:'Storage / Archive',    l:5,  w:4,  h:3.2, doors:1, windows:0, mepElec:true, mepPlumb:false, mepHVAC:false,mepFire:true },
    ],
  },

  luxury_villa: {
    label:       '🏡 Luxury Villa',
    description: 'High-spec villa — EC2, premium finishes',
    projectType: 'residential',
    buildingCode: 'EC2',
    projectInfo: {
      'proj-location': 'Al Khobar / Dhahran, KSA',
      'proj-ref':      'BOQ-LUX-001',
      'proj-gfa':      '750',
      'proj-notes':    'Luxury villa — ground + 1 floor + roof terrace. Premium spec.',
    },
    specSizes: {
      'sz-slab':       '0.20',
      'sz-found':      '1.00',
      'sz-col':        '0.50',
      'sz-rebar':      '20',
      'sz-ext-block':  '0.25',
      'sz-int-block':  '0.15',
      'sz-tile':       '0.80',
      'sz-plaster':    '0.020',
      'sz-cable':      '6.0',
      'sz-pipe':       '0.028',
      'sz-ac':         '2.5',
    },
    rooms: [
      { name:'Grand Entrance',        l:6,   w:5,   h:5.0, doors:2, windows:3, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Formal Majlis',         l:9,   w:7,   h:4.0, doors:2, windows:4, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Family Living',         l:8,   w:6,   h:3.5, doors:2, windows:4, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Dining Room',           l:7,   w:5,   h:3.5, doors:2, windows:3, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Master Suite',          l:7,   w:6,   h:3.5, doors:1, windows:3, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Master Bathroom',       l:4,   w:3.5, h:3.2, doors:1, windows:1, mepElec:true, mepPlumb:true,  mepHVAC:true, mepFire:false },
      { name:'Master Walk-in Closet', l:3.5, w:3,   h:3.2, doors:1, windows:0, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:false },
      { name:'Bedroom 2 En-suite',    l:5.5, w:4.5, h:3.2, doors:1, windows:2, mepElec:true, mepPlumb:true,  mepHVAC:true, mepFire:true  },
      { name:'Bedroom 3',             l:5,   w:4,   h:3.2, doors:1, windows:2, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Bedroom 4 (Guest)',     l:5,   w:4,   h:3.2, doors:1, windows:2, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Kitchen',               l:6,   w:4,   h:3.5, doors:1, windows:2, mepElec:true, mepPlumb:true,  mepHVAC:true, mepFire:true  },
      { name:'Laundry / Utility',     l:3,   w:2.5, h:2.8, doors:1, windows:1, mepElec:true, mepPlumb:true,  mepHVAC:false,mepFire:false },
      { name:'Home Cinema',           l:6,   w:5,   h:3.5, doors:1, windows:0, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Gym',                   l:5,   w:4,   h:3.2, doors:1, windows:2, mepElec:true, mepPlumb:false, mepHVAC:true, mepFire:true  },
      { name:'Driver\'s Room',        l:3.5, w:3,   h:2.8, doors:1, windows:1, mepElec:true, mepPlumb:true,  mepHVAC:true, mepFire:false },
      { name:'Garage (3 cars)',        l:9,   w:4,   h:3.5, doors:1, windows:0, mepElec:true, mepPlumb:false, mepHVAC:false,mepFire:true  },
    ],
  },
};

/* ──────────────────────────────────────────────
   Inject Preset Dropdown UI into Setup page
   ────────────────────────────────────────────── */

function injectPresetDropdown() {
  const setupHeader = document.querySelector('#page-setup .section-header');
  if (!setupHeader || document.getElementById('preset-selector')) return;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin-bottom:20px';
  wrapper.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="font-size:11px;font-weight:700;color:var(--muted);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;white-space:nowrap">
          ⚡ Smart Presets
        </div>
        <select id="preset-selector" class="form-control" style="max-width:280px;flex:1" onchange="applyPreset(this.value)">
          <option value="">— Select a preset to auto-fill —</option>
          <option value="residential_villa">🏠 Residential Villa (SBC 304 · 4 Bed)</option>
          <option value="commercial_office">🏢 Commercial Office (SBC 304 · 3 Floors)</option>
          <option value="luxury_villa">🏡 Luxury Villa (EC2 · Premium Spec)</option>
        </select>
        <span style="font-size:11px;color:var(--muted)">Auto-fills project type, spec sizes & rooms</span>
        <span class="badge-tag badge-new">NEW</span>
      </div>
    </div>
  `;

  setupHeader.insertAdjacentElement('afterend', wrapper);
}

/**
 * Apply a preset to the app.
 * Fills project info, selects type/code, sets spec sizes, loads rooms.
 * @param {string} presetKey
 */
function applyPreset(presetKey) {
  if (!presetKey) return;
  const preset = PRESETS[presetKey];
  if (!preset) return;

  // 1. Fill project info fields
  Object.entries(preset.projectInfo).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  // 2. Select project type
  const typeCards = document.querySelectorAll('#project-type-grid .radio-card');
  typeCards.forEach(c => {
    c.classList.toggle('selected', c.dataset.val === preset.projectType);
  });
  if (window.state) window.state.projectType = preset.projectType;

  // 3. Select building code
  const codeCards = document.querySelectorAll('#code-grid .radio-card');
  codeCards.forEach(c => {
    c.classList.toggle('selected', c.dataset.val === preset.buildingCode);
  });
  if (window.state) window.state.buildingCode = preset.buildingCode;

  // 4. Set spec sizes
  Object.entries(preset.specSizes).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  // Update sizes code label
  const lbl = document.getElementById('sizes-code-label');
  if (lbl) lbl.textContent = preset.buildingCode;

  // 5. Load preset rooms
  if (window.state) {
    window.state.rooms = [];
    window.roomCounter = 0;
  }

  preset.rooms.forEach(r => {
    if (window.addRoom) {
      window.addRoom(r);
    }
  });

  // 6. Feedback
  if (window.showNotif) window.showNotif(`⚡ Preset loaded: ${preset.label} — ${preset.rooms.length} rooms ready`);
  if (window.mockAPI) window.mockAPI.trackEvent('preset_applied', { preset: presetKey });

  // Reset dropdown
  document.getElementById('preset-selector').value = '';
}

window.applyPreset = applyPreset;

/* ============================================================
   2. LIVE COST OPTIMIZATION SUGGESTIONS
   ============================================================ */

/**
 * Optimization rules — each rule is a function that receives the
 * current app state and spec sizes, and returns a suggestion object
 * or null if the rule doesn't apply.
 *
 * @typedef {{ title: string, detail: string, saving: string, icon: string, severity: 'high'|'medium'|'low' }} Suggestion
 */
const OPT_RULES = [

  // Rule 1: Slab too thick for residential
  function slabThicknessRule(state, sz) {
    if (state.projectType === 'residential' && sz.slabThk >= 0.20) {
      return {
        icon: '🏗️',
        title: 'Slab thickness above residential standard',
        detail: `Your slab is set to ${sz.slabThk * 1000}mm. For a residential project under SBC 304, 150mm is code-compliant and reduces concrete volume by ~${Math.round((sz.slabThk - 0.15) / sz.slabThk * 100)}%.`,
        saving: `Estimated saving: SAR 45–85/m² on concrete & rebar`,
        severity: 'high',
      };
    }
    return null;
  },

  // Rule 2: Large tile — high waste risk
  function tileSizeRule(state, sz) {
    if (sz.tileSize >= 0.80) {
      return {
        icon: '🪟',
        title: 'Large-format tiles increase waste & cost',
        detail: `${sz.tileSize * 1000}×${sz.tileSize * 1000}mm tiles have higher cutting waste (8–12%) vs 600×600mm (3–5%). Locally manufactured 600×600mm tiles cost 30–40% less.`,
        saving: `Estimated saving: SAR 40–60/m² of tiled area`,
        severity: 'medium',
      };
    }
    return null;
  },

  // Rule 3: HVAC capacity possibly oversized for residential
  function hvacCapacityRule(state, sz) {
    if (state.projectType === 'residential' && sz.acCapacity >= 2.5) {
      return {
        icon: '❄️',
        title: 'A/C capacity may be oversized for residential',
        detail: `${sz.acCapacity} TR per room is standard for commercial. For a ${state.projectType} project, 2.0 TR covers rooms up to 25m² — reducing unit cost and electricity load.`,
        saving: `Estimated saving: SAR 80–120 per A/C unit`,
        severity: 'medium',
      };
    }
    return null;
  },

  // Rule 4: High rebar dia for residential
  function rebarRule(state, sz) {
    if (state.projectType === 'residential' && sz.rebarDia >= 20) {
      return {
        icon: '🔩',
        title: 'Rebar diameter above typical residential spec',
        detail: `T${sz.rebarDia} main bars are used in heavy commercial / transfer slabs. For standard residential frame (SBC 304), T16 is code-minimum and reduces rebar tonnage.`,
        saving: `Estimated saving: SAR 180–280/tonne on rebar`,
        severity: 'medium',
      };
    }
    return null;
  },

  // Rule 5: Block partitions — suggest drywall for commercial
  function partitionRule(state, sz) {
    if (['commercial', 'hospitality'].includes(state.projectType) && sz.intBlock >= 0.15) {
      return {
        icon: '🧱',
        title: 'Consider drywall for internal partitions',
        detail: `For ${state.projectType} projects, 75mm metal-stud drywall is faster to install, lighter (reducing slab design load), and 20–30% cheaper than ${sz.intBlock * 1000}mm blockwork.`,
        saving: `Estimated saving: SAR 120–180/m² of partition area`,
        severity: 'high',
      };
    }
    return null;
  },

  // Rule 6: Large GFA with no MEP in some rooms
  function mepCoverageRule(state, sz) {
    if (!state.rooms || state.rooms.length === 0) return null;
    const noElec = state.rooms.filter(r => !r.mepElec).length;
    if (noElec > 0) {
      return {
        icon: '⚡',
        title: `${noElec} room(s) have no electrical scope`,
        detail: `Rooms without electrical selected will not be included in wiring, socket and lighting quantities. Confirm this is intentional (e.g. stores, plant rooms).`,
        saving: `Check: may under-estimate electrical BOQ`,
        severity: 'low',
      };
    }
    return null;
  },

  // Rule 7: Foundation depth — oversized for simple residential
  function foundationRule(state, sz) {
    if (state.projectType === 'residential' && sz.foundDepth >= 1.50) {
      return {
        icon: '⛏️',
        title: 'Deep foundation specified for standard residential',
        detail: `1500mm+ deep raft foundation is typically for heavy structures or poor soil. For standard residential on normal ground, 750mm strip/raft reduces excavation and concrete volumes significantly.`,
        saving: `Estimated saving: SAR 60–120/m² on foundation scope`,
        severity: 'high',
      };
    }
    return null;
  },

  // Rule 8: Many rooms but small floor areas — suggest open plan
  function openPlanRule(state, sz) {
    if (!state.rooms || state.rooms.length === 0) return null;
    const smallRooms = state.rooms.filter(r => r.l * r.w < 9).length;
    if (smallRooms > state.rooms.length * 0.5) {
      return {
        icon: '📐',
        title: 'Many small rooms — consider open plan',
        detail: `${smallRooms} of your ${state.rooms.length} rooms are under 9m². Removing some partition walls reduces blockwork, plaster, and MEP scope. Open-plan living areas also reduce A/C unit count.`,
        saving: `Potential saving: 8–15% on finishes & MEP`,
        severity: 'low',
      };
    }
    return null;
  },
];

/**
 * Run all optimization rules and return active suggestions.
 * @returns {Array<Suggestion>}
 */
function runOptimizationRules() {
  if (!window.state) return [];
  const sz = typeof getSizes === 'function' ? getSizes() : {};
  return OPT_RULES.map(rule => {
    try { return rule(window.state, sz); }
    catch (e) { return null; }
  }).filter(Boolean);
}

/**
 * Render the optimization panel.
 * Panel is injected into #page-boq-results after the BOQ table.
 */
function renderOptimizationPanel() {
  let panel = document.getElementById('opt-suggestions-panel');

  // Create panel if it doesn't exist
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'opt-suggestions-panel';
    panel.style.marginBottom = '20px';

    const resultsPage = document.getElementById('page-boq-results');
    if (!resultsPage) return;

    // Insert before the CTA card
    const cta = resultsPage.querySelector('.cta-card');
    if (cta) {
      resultsPage.insertBefore(panel, cta);
    } else {
      resultsPage.appendChild(panel);
    }
  }

  const suggestions = runOptimizationRules();

  if (!suggestions.length) {
    panel.innerHTML = `
      <div class="alert alert-success" style="margin-bottom:12px">
        ✓ No major optimization opportunities found — spec is well-calibrated for this project type.
      </div>
    `;
    return;
  }

  const severityColor = { high: 'var(--red)', medium: 'var(--accent)', low: 'var(--accent3)' };
  const severityBg    = { high: 'rgba(232,91,91,.08)', medium: 'rgba(232,184,75,.08)', low: 'rgba(91,141,238,.08)' };

  const cards = suggestions.map((s, i) => `
    <div style="background:${severityBg[s.severity]};border:1px solid ${severityColor[s.severity]}33;border-radius:10px;padding:16px;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:24px;flex-shrink:0;margin-top:2px">${s.icon}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:5px">${s.title}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:6px">${s.detail}</div>
        <div style="font-size:11px;font-weight:700;color:${severityColor[s.severity]};font-family:var(--mono)">${s.saving}</div>
      </div>
      <div style="flex-shrink:0">
        <span style="font-size:9px;font-weight:700;padding:3px 7px;border-radius:20px;background:${severityColor[s.severity]}22;color:${severityColor[s.severity]};font-family:var(--mono);text-transform:uppercase">
          ${s.severity}
        </span>
      </div>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <div class="card-title">💡 Cost Optimization Suggestions</div>
        <span style="font-size:11px;color:var(--muted)">${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''} found</span>
      </div>
      ${cards}
      <div style="padding-top:8px;font-size:11px;color:var(--muted)">
        ℹ These suggestions are rule-based and advisory. Always confirm with the engineer of record before changing structural specifications.
      </div>
    </div>
  `;
}

/**
 * Patch calculateBOQ() to also render optimization suggestions.
 * Wraps the existing function — does not replace it.
 */
(function patchCalculateBOQ() {
  const _orig = window.calculateBOQ;
  if (!_orig) return;

  window.calculateBOQ = function(silent = false) {
    _orig.call(this, silent);
    // Render suggestions after BOQ is calculated
    if (!silent) {
      setTimeout(renderOptimizationPanel, 100);
    }
  };
})();

/* ============================================================
   3. STICKY SUMMARY PANEL
   ============================================================ */

/**
 * Sticky summary panel — shows total BOQ cost, project name, and rooms count.
 * Appears on the right side of the screen after BOQ is calculated.
 * Does NOT overlap or move any existing UI.
 */
function createStickyPanel() {
  if (document.getElementById('sticky-summary')) return;

  const panel = document.createElement('div');
  panel.id = 'sticky-summary';
  panel.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 990;
    background: var(--surface);
    border: 1px solid rgba(232,184,75,.35);
    border-radius: 14px;
    padding: 16px 20px;
    min-width: 220px;
    box-shadow: 0 8px 32px rgba(0,0,0,.5);
    display: none;
    animation: slideIn .3s ease;
    backdrop-filter: blur(8px);
  `;

  panel.innerHTML = `
    <div style="font-size:9px;font-weight:700;color:var(--muted);font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">
      LIVE SUMMARY
    </div>
    <div style="margin-bottom:8px">
      <div style="font-size:10px;color:var(--muted);font-family:var(--mono)">BOQ VALUE</div>
      <div id="sticky-total" style="font-size:20px;font-weight:700;color:var(--accent2);font-family:var(--mono)">SAR —</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div>
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono)">ROOMS</div>
        <div id="sticky-rooms" style="font-size:14px;font-weight:700;color:var(--text)">0</div>
      </div>
      <div>
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono)">ITEMS</div>
        <div id="sticky-items" style="font-size:14px;font-weight:700;color:var(--text)">0</div>
      </div>
    </div>
    <div id="sticky-code" style="font-size:10px;color:var(--muted);font-family:var(--mono);border-top:1px solid var(--border);padding-top:8px">—</div>
    <button onclick="document.getElementById('sticky-summary').style.display='none'" style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;line-height:1">×</button>
  `;

  document.body.appendChild(panel);
}

/**
 * Update the sticky panel with current state values.
 * Called after BOQ calculation completes.
 */
function updateStickyPanel() {
  const panel = document.getElementById('sticky-summary');
  if (!panel || !window.state) return;

  const items    = window.state.boqItems || [];
  const total    = items.reduce((s, i) => s + parseFloat(i.qty) * i.rate, 0);
  const rooms    = window.state.rooms?.length || 0;

  if (total === 0 && rooms === 0) return;

  document.getElementById('sticky-total').textContent = total > 0
    ? 'SAR ' + Math.round(total / 1000) + 'K'
    : 'SAR —';
  document.getElementById('sticky-rooms').textContent = rooms;
  document.getElementById('sticky-items').textContent = items.length;
  document.getElementById('sticky-code').textContent  =
    (window.state.buildingCode || '—') + ' · ' + (window.state.projectType || '—');

  panel.style.display = total > 0 ? 'block' : 'none';
}

/**
 * Patch calculateBOQ() to also update the sticky panel.
 * Additional wrapper on top of the one in the optimization section.
 */
(function patchCalculateBOQForSticky() {
  const _orig = window.calculateBOQ;
  if (!_orig) return;

  window.calculateBOQ = function(silent = false) {
    _orig.call(this, silent);
    setTimeout(updateStickyPanel, 150);
  };
})();

/* ============================================================
   4. DEBOUNCED INPUTS (Performance Safety)
   ============================================================ */

/**
 * Debounce utility.
 * @param {Function} fn    function to debounce
 * @param {number}   wait  milliseconds to wait
 * @returns {Function}
 */
function debounce(fn, wait = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Apply debouncing to spec size selectors so BOQ doesn't recalculate
 * on every rapid change. Replaces inline onchange with debounced version.
 */
function applyDebouncedSizeListeners() {
  const sizeSelects = document.querySelectorAll('.size-select');
  const debouncedRecalc = debounce(() => {
    if (window.recalcBOQ) window.recalcBOQ();
  }, 400);

  sizeSelects.forEach(sel => {
    // Remove inline handler to avoid double-firing
    sel.removeAttribute('onchange');
    sel.addEventListener('change', debouncedRecalc);
  });
}

/**
 * Apply debouncing to cost quantity/rate inputs for smoother edits.
 */
function applyDebouncedCostInputs() {
  const costTable = document.getElementById('qty-tbody');
  if (!costTable) return;

  // Use event delegation on the container
  const tableWrapper = document.querySelector('#page-quantities .card');
  if (!tableWrapper) return;

  // Patch updateCostQty and updateCostRate to be debounced
  const origQty  = window.updateCostQty;
  const origRate = window.updateCostRate;

  if (origQty && !origQty.__debounced) {
    const dQty  = debounce(origQty, 250);
    window.updateCostQty = function(i, val) { dQty(i, val); };
    window.updateCostQty.__debounced = true;
  }

  if (origRate && !origRate.__debounced) {
    const dRate = debounce(origRate, 250);
    window.updateCostRate = function(i, val) { dRate(i, val); };
    window.updateCostRate.__debounced = true;
  }
}

/* ============================================================
   5. SaaS HOOKS — Plan Banner & Usage Display
   ============================================================ */

/**
 * Render a persistent plan banner at the top of the sidebar bottom area.
 * Shows free plan usage or Pro badge.
 */
function renderPlanBanner() {
  const upgradeCard = document.querySelector('.upgrade-card');
  if (!upgradeCard || !window.userSession) return;

  const plan    = window.userSession.plan || 'free';
  const saved   = window.StorageUtils ? window.StorageUtils.listProjects().length : 0;
  const usage   = window.UsageTracker ? window.UsageTracker.getSummary() : null;

  if (plan === 'free') {
    // Enhance existing upgrade card with usage stats
    const usageHtml = usage
      ? `<div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-family:var(--mono);text-align:left">
           Projects saved: ${saved} / 10 · Sessions: ${usage.sessions}
         </div>`
      : '';

    // Find existing p tag and inject usage before it
    const p = upgradeCard.querySelector('p');
    if (p && !upgradeCard.querySelector('.usage-stats')) {
      const div = document.createElement('div');
      div.className = 'usage-stats';
      div.innerHTML = usageHtml;
      upgradeCard.insertBefore(div, p);
    }
  } else {
    // Pro user — show badge instead of upgrade card
    upgradeCard.innerHTML = `
      <h4 style="color:var(--accent2)">✦ Pro Active</h4>
      <p style="color:var(--muted)">Unlimited projects · All tools · Priority support</p>
      <div style="font-size:10px;color:var(--muted);font-family:var(--mono)">Plan: ${plan}</div>
    `;
  }
}

/**
 * Inject a "Pro Access Code" activation widget into the upgrade card.
 * SaaS Hook: ready to wire up to real access code validation.
 */
function injectProCodeWidget() {
  const upgradeCard = document.querySelector('.upgrade-card');
  if (!upgradeCard || document.getElementById('pro-code-form')) return;

  const widget = document.createElement('div');
  widget.id = 'pro-code-form';
  widget.style.cssText = 'margin-top:10px;border-top:1px solid rgba(232,184,75,.2);padding-top:10px';
  widget.innerHTML = `
    <div style="font-size:10px;color:var(--muted);margin-bottom:6px;font-family:var(--mono)">HAVE A CODE?</div>
    <div style="display:flex;gap:4px">
      <input id="pro-code-input" class="form-control" style="font-size:11px;padding:6px 10px" placeholder="Enter access code…" />
      <button class="btn btn-primary btn-sm" onclick="activateProCode()" style="white-space:nowrap;flex-shrink:0">→</button>
    </div>
  `;
  upgradeCard.appendChild(widget);
}

/**
 * Activate Pro code (SaaS Hook).
 * Calls mockAPI.verifyCode and updates userSession.
 */
async function activateProCode() {
  const input = document.getElementById('pro-code-input');
  const code  = input?.value?.trim();
  if (!code) {
    window.showNotif?.('Enter your access code first.', 'warn');
    return;
  }

  window.showNotif?.('Verifying code…');
  const result = await window.mockAPI?.verifyCode(code);

  if (result?.valid && window.userSession) {
    window.userSession.plan = result.plan || 'annual';
    window.userSession.save();
    window.showNotif?.('✦ Pro access activated! Enjoy unlimited projects.');
    renderPlanBanner();
  } else {
    window.showNotif?.('Invalid or expired code. Contact support.', 'warn');
  }
}

window.activateProCode = activateProCode;

/* ============================================================
   6. SECTION SPACING ENHANCEMENT (Non-destructive UI)
   ============================================================ */

/**
 * Adds subtle section separators between major card groups on pages
 * that have multiple stacked cards. No existing elements are modified.
 */
function enhanceSectionSpacing() {
  // Add a visual divider label between structural and MEP spec sizes
  const structSection = document.querySelector('.size-config');
  if (structSection && !document.getElementById('spec-divider-label')) {
    // Already has size-config-title — just ensure spacing is good
    document.querySelectorAll('.size-config').forEach((sc, i) => {
      sc.style.marginBottom = '16px';
    });
  }

  // Add subtle card hover glow on tool cards
  const style = document.createElement('style');
  style.id = 'v4-spacing-enhancements';
  style.textContent = `
    /* NEW in features-v4.js — Non-destructive spacing enhancements */
    .tool-card:hover {
      box-shadow: 0 0 0 1px rgba(232,184,75,.25), 0 8px 24px rgba(0,0,0,.3);
    }
    .room-card {
      transition: border-color .2s;
    }
    .room-card:hover {
      border-color: rgba(232,184,75,.3);
    }
    .stat-card {
      transition: transform .2s, box-shadow .2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,.3);
    }
    /* Sticky panel animation */
    #sticky-summary {
      transition: opacity .2s, transform .2s;
    }
    /* Optimization panel icon */
    #opt-suggestions-panel .card {
      border-color: rgba(232,184,75,.25);
    }
    /* Preset dropdown highlight */
    #preset-selector:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(232,184,75,.15);
    }
  `;

  if (!document.getElementById('v4-spacing-enhancements')) {
    document.head.appendChild(style);
  }
}

/* ============================================================
   7. INITIALISE ALL FEATURES
   ============================================================ */

function initFeaturesV4() {
  // Preset dropdown
  injectPresetDropdown();

  // Sticky panel
  createStickyPanel();

  // UI enhancements
  enhanceSectionSpacing();

  // Debounced inputs (after a tick to let main DOM settle)
  setTimeout(() => {
    applyDebouncedSizeListeners();
    applyDebouncedCostInputs();
  }, 300);

  // SaaS hooks — only if StorageUtils is already loaded
  if (window.StorageUtils && window.userSession) {
    setTimeout(() => {
      renderPlanBanner();
      injectProCodeWidget();
    }, 200);
  } else {
    // Wait for storage-utils.js to load
    window.addEventListener('storage-utils-ready', () => {
      renderPlanBanner();
      injectProCodeWidget();
    });
  }
}

document.addEventListener('DOMContentLoaded', initFeaturesV4);

/* ============================================================
   8. EXPORTS
   ============================================================ */
window.PRESETS               = PRESETS;
window.runOptimizationRules  = runOptimizationRules;
window.renderOptimizationPanel = renderOptimizationPanel;
window.updateStickyPanel     = updateStickyPanel;
window.debounce              = debounce;
