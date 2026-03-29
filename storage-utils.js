/**
 * storage-utils.js — BOQ Platform v4
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES:
 *   Handles all localStorage operations: save, load, list, delete projects.
 *   Tracks usage stats (project count, session time). SaaS-ready hooks included.
 *
 * HOW IT INTEGRATES:
 *   This file is loaded AFTER the main HTML/JS. It reads/writes `window.state`
 *   which is the global state object defined in boq-estimator-v4.html.
 *   It does NOT modify any existing function — it only adds new ones.
 *
 * KEY CONCEPTS:
 *   - All projects stored under namespace 'boqv4_projects'
 *   - Each project saved as JSON with full snapshot of state + spec sizes
 *   - Usage tracking stored in 'boqv4_usage' key
 *   - SaaS hooks: userSession, planLimits, mockAPI stubs
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ============================================================
   1. CONSTANTS & CONFIG
   ============================================================ */

const STORAGE_PREFIX   = 'boqv4_';
const PROJECTS_KEY     = STORAGE_PREFIX + 'projects';
const USAGE_KEY        = STORAGE_PREFIX + 'usage';
const SESSION_KEY      = STORAGE_PREFIX + 'session';
const FREE_PLAN_LIMIT  = 10; // max saved projects on free plan

/* ============================================================
   2. USER SESSION (SaaS Hook)
   ============================================================ */

/**
 * userSession — SaaS-ready session object.
 * Replace with real auth token when backend is connected.
 * @type {Object}
 */
const userSession = {
  userId:    null,         // Set on login
  plan:      'free',       // 'free' | 'monthly' | 'annual'
  token:     null,         // JWT / access token placeholder
  expiresAt: null,
  projectCount: 0,

  /** Load session from storage (persists across browser refresh) */
  load() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch (e) {
      console.warn('[BOQ] Session load error:', e);
    }
    return this;
  },

  /** Persist session changes */
  save() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        userId: this.userId,
        plan: this.plan,
        token: this.token,
        expiresAt: this.expiresAt,
        projectCount: this.projectCount,
      }));
    } catch (e) {
      console.warn('[BOQ] Session save error:', e);
    }
  },

  /** Check if user can create more projects */
  canSaveProject() {
    if (this.plan !== 'free') return true;
    return StorageUtils.listProjects().length < FREE_PLAN_LIMIT;
  },

  /** Activate a Pro plan code (stub) */
  activateCode(code) {
    // TODO: validate via API
    if (code && code.length >= 8) {
      this.plan = 'annual';
      this.save();
      return true;
    }
    return false;
  }
};

/* ============================================================
   3. MOCK API LAYER (SaaS Hooks — Replace with real fetch calls)
   ============================================================ */

/**
 * mockAPI — Stub layer for future backend integration.
 * All methods return Promises so real API calls can be swapped in easily.
 */
const mockAPI = {
  baseURL: '/api/v1',  // Future backend base URL

  /**
   * Track a usage event. Replace with real analytics (Amplitude, PostHog, etc.)
   * @param {string} event  e.g. 'boq_calculated', 'project_saved'
   * @param {Object} data   event payload
   */
  async trackEvent(event, data = {}) {
    // Usage logged locally for now
    UsageTracker.log(event, data);
    // TODO: await fetch(`${this.baseURL}/events`, { method:'POST', body:JSON.stringify({event,...data}) })
    return { ok: true };
  },

  /**
   * Stub: save project to cloud
   * @param {Object} project
   */
  async cloudSave(project) {
    // TODO: real API call
    console.info('[BOQ API] cloudSave stub — project:', project.name);
    return { ok: true, projectId: project.id };
  },

  /**
   * Stub: verify Pro access code
   * @param {string} code
   */
  async verifyCode(code) {
    // TODO: real API call
    console.info('[BOQ API] verifyCode stub:', code);
    return { valid: code.length >= 8, plan: 'annual' };
  }
};

/* ============================================================
   4. USAGE TRACKER
   ============================================================ */

/**
 * UsageTracker — Lightweight local analytics.
 * Tracks events per session without sending any data externally.
 */
const UsageTracker = {
  /**
   * Log an event to localStorage usage record.
   * @param {string} event
   * @param {Object} data
   */
  log(event, data = {}) {
    try {
      const raw  = localStorage.getItem(USAGE_KEY);
      const rec  = raw ? JSON.parse(raw) : { events: [], sessions: 0, firstSeen: Date.now() };
      rec.events.push({ event, data, ts: Date.now() });
      // Keep last 200 events only
      if (rec.events.length > 200) rec.events = rec.events.slice(-200);
      localStorage.setItem(USAGE_KEY, JSON.stringify(rec));
    } catch (e) {
      // Silent fail — tracking is non-critical
    }
  },

  /** Return summary of usage stats */
  getSummary() {
    try {
      const raw = localStorage.getItem(USAGE_KEY);
      if (!raw) return null;
      const rec = JSON.parse(raw);
      return {
        totalEvents:  rec.events.length,
        sessions:     rec.sessions || 0,
        firstSeen:    new Date(rec.firstSeen).toLocaleDateString(),
        lastActivity: rec.events.length ? new Date(rec.events.at(-1).ts).toLocaleString() : '—',
      };
    } catch (e) {
      return null;
    }
  },

  /** Increment session counter on page load */
  bumpSession() {
    try {
      const raw = localStorage.getItem(USAGE_KEY);
      const rec = raw ? JSON.parse(raw) : { events: [], sessions: 0, firstSeen: Date.now() };
      rec.sessions = (rec.sessions || 0) + 1;
      localStorage.setItem(USAGE_KEY, JSON.stringify(rec));
    } catch (e) {}
  }
};

/* ============================================================
   5. CORE STORAGE UTILITIES
   ============================================================ */

const StorageUtils = {

  /* ── Helpers ── */

  /** Load all saved projects as an array */
  listProjects() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[BOQ] listProjects error:', e);
      return [];
    }
  },

  /** Persist the projects array */
  _persist(projects) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  },

  /* ── Spec Sizes Snapshot ── */

  /**
   * Capture current spec sizes from DOM into a plain object.
   * Safe to call even before page fully renders (returns defaults).
   * @returns {Object}
   */
  captureSpecSizes() {
    const g = (id, fallback) => {
      const el = document.getElementById(id);
      return el ? el.value : fallback;
    };
    return {
      slabThk:   g('sz-slab',      '0.15'),
      foundDepth: g('sz-found',    '0.75'),
      colSize:   g('sz-col',       '0.40'),
      rebarDia:  g('sz-rebar',     '16'),
      extBlock:  g('sz-ext-block', '0.20'),
      intBlock:  g('sz-int-block', '0.15'),
      tileSize:  g('sz-tile',      '0.60'),
      plasterThk: g('sz-plaster', '0.015'),
      cableSize: g('sz-cable',     '4.0'),
      pipeSize:  g('sz-pipe',      '0.022'),
      acCapacity: g('sz-ac',       '2.0'),
    };
  },

  /**
   * Restore spec sizes from a saved snapshot to DOM.
   * @param {Object} sizes
   */
  restoreSpecSizes(sizes) {
    if (!sizes) return;
    const s = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };
    s('sz-slab',      sizes.slabThk);
    s('sz-found',     sizes.foundDepth);
    s('sz-col',       sizes.colSize);
    s('sz-rebar',     sizes.rebarDia);
    s('sz-ext-block', sizes.extBlock);
    s('sz-int-block', sizes.intBlock);
    s('sz-tile',      sizes.tileSize);
    s('sz-plaster',   sizes.plasterThk);
    s('sz-cable',     sizes.cableSize);
    s('sz-pipe',      sizes.pipeSize);
    s('sz-ac',        sizes.acCapacity);
  },

  /* ── Project Setup Snapshot ── */

  captureProjectSetup() {
    const g = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };
    return {
      projName:     g('proj-name'),
      projClient:   g('proj-client'),
      projLocation: g('proj-location'),
      projQS:       g('proj-qs'),
      projRef:      g('proj-ref'),
      projGFA:      g('proj-gfa'),
      projNotes:    g('proj-notes'),
    };
  },

  restoreProjectSetup(setup) {
    if (!setup) return;
    const s = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };
    s('proj-name',     setup.projName);
    s('proj-client',   setup.projClient);
    s('proj-location', setup.projLocation);
    s('proj-qs',       setup.projQS);
    s('proj-ref',      setup.projRef);
    s('proj-gfa',      setup.projGFA);
    s('proj-notes',    setup.projNotes);
  },

  /* ── Save Project ── */

  /**
   * Save the current project to localStorage.
   * Enforces free plan limit.
   * @returns {{ ok: boolean, message: string, project?: Object }}
   */
  saveProject() {
    // Plan limit check
    if (!userSession.canSaveProject()) {
      return {
        ok: false,
        message: `Free plan limit reached (${FREE_PLAN_LIMIT} projects). Upgrade to Pro for unlimited saves.`
      };
    }

    const projects = this.listProjects();
    const id = 'proj_' + Date.now();

    // Build full project snapshot
    const project = {
      id,
      name:        window.state?.projectName || 'Untitled Project',
      type:        window.state?.projectType || 'residential',
      code:        window.state?.buildingCode || 'SBC304',
      savedAt:     Date.now(),
      savedAtStr:  new Date().toLocaleString('en-GB'),
      version:     'v4',

      // Core state
      state:       {
        projectType:     window.state?.projectType,
        buildingCode:    window.state?.buildingCode,
        projectName:     window.state?.projectName,
        projectClient:   window.state?.projectClient,
        projectLocation: window.state?.projectLocation,
        projectQS:       window.state?.projectQS,
        projectRef:      window.state?.projectRef,
        projectGFA:      window.state?.projectGFA,
        projectNotes:    window.state?.projectNotes,
        rooms:           JSON.parse(JSON.stringify(window.state?.rooms || [])),
        boqItems:        JSON.parse(JSON.stringify(window.state?.boqItems || [])),
        costItems:       JSON.parse(JSON.stringify(window.state?.costItems || [])),
        costType:        window.state?.costType,
        contingency:     window.state?.contingency,
        vat:             window.state?.vat,
        currency:        window.state?.currency,
      },

      // Spec sizes from DOM
      specSizes: this.captureSpecSizes(),

      // Project info from DOM (catches unsaved form edits too)
      setup: this.captureProjectSetup(),

      // Quick stats for the saved list display
      stats: {
        rooms:      window.state?.rooms?.length || 0,
        boqItems:   window.state?.boqItems?.length || 0,
        totalCost:  window.state?.boqItems?.reduce(
                      (s, i) => s + parseFloat(i.qty) * i.rate, 0) || 0,
      }
    };

    projects.push(project);
    this._persist(projects);
    userSession.projectCount = projects.length;
    userSession.save();

    // Track usage
    mockAPI.trackEvent('project_saved', { name: project.name, rooms: project.stats.rooms });

    return { ok: true, message: `Project "${project.name}" saved.`, project };
  },

  /* ── Load Project ── */

  /**
   * Load a saved project by ID into the app state.
   * Restores rooms, BOQ items, spec sizes, and project info.
   * @param {string} projectId
   * @returns {{ ok: boolean, message: string }}
   */
  loadProject(projectId) {
    const projects = this.listProjects();
    const p = projects.find(pr => pr.id === projectId);
    if (!p) return { ok: false, message: 'Project not found.' };

    // Restore state object
    if (p.state && window.state) {
      Object.assign(window.state, p.state);
    }

    // Restore DOM fields for project info
    this.restoreProjectSetup(p.setup || p.state);

    // Restore spec sizes
    this.restoreSpecSizes(p.specSizes);

    // Update UI counters
    if (window.updateRoomCount) window.updateRoomCount();
    if (window.renderRooms) window.renderRooms();

    // Update topbar
    const tb = document.getElementById('topbar-project');
    if (tb) tb.textContent = p.state?.projectName || p.name;

    const dc = document.getElementById('dash-current');
    if (dc) dc.textContent = p.state?.projectName || p.name;

    // Rebuild BOQ table if items exist
    if (p.state?.boqItems?.length > 0 && window.state.boqItems.length > 0) {
      // Re-render existing BOQ result by rebuilding tbody
      StorageUtils._rebuildBOQTable();
    }

    // Rebuild cost table if items exist
    if (p.state?.costItems?.length > 0 && window.renderQtyTable) {
      window.renderQtyTable();
    }

    mockAPI.trackEvent('project_loaded', { name: p.name });
    return { ok: true, message: `Project "${p.name}" loaded.` };
  },

  /**
   * Rebuild the BOQ table from state after loading a project.
   * Mirrors the render logic in calculateBOQ() but for already-computed items.
   * @private
   */
  _rebuildBOQTable() {
    const tbody = document.getElementById('boq-tbody');
    if (!tbody || !window.state?.boqItems?.length) return;

    let currentSec = '';
    let html = '';
    window.state.boqItems.forEach(item => {
      if (item.sec !== currentSec) {
        currentSec = item.sec;
        html += `<tr class="section-row"><td colspan="6">${item.sec}</td></tr>`;
      }
      html += `<tr>
        <td><span style="font-family:var(--mono);font-size:11px;color:var(--muted)">${item.no}</span></td>
        <td>${item.desc}</td>
        <td style="font-size:11px;color:var(--muted)">${item.spec || ''}</td>
        <td style="font-family:var(--mono)">${item.unit}</td>
        <td class="qty-cell">${item.qty}</td>
        <td style="font-size:11px;color:var(--muted)">Rate: SAR ${Number(item.rate).toLocaleString()}/unit</td>
      </tr>`;
    });

    const total = window.state.boqItems.reduce((s, i) => s + parseFloat(i.qty) * i.rate, 0);
    html += `<tr class="total-row">
      <td colspan="4">TOTAL BOQ ESTIMATE</td><td></td>
      <td style="font-family:var(--mono);font-size:14px;color:var(--accent)">SAR ${Math.round(total).toLocaleString()}</td>
    </tr>`;
    tbody.innerHTML = html;
  },

  /* ── Delete Project ── */

  /**
   * Delete a saved project by ID.
   * @param {string} projectId
   * @returns {{ ok: boolean }}
   */
  deleteProject(projectId) {
    const projects = this.listProjects().filter(p => p.id !== projectId);
    this._persist(projects);
    mockAPI.trackEvent('project_deleted', { id: projectId });
    return { ok: true };
  },

  /* ── Render Saved Projects List ── */

  /**
   * Render the saved projects grid into #saved-list.
   * Called whenever the Saved Projects page is opened.
   */
  renderSavedList() {
    const container = document.getElementById('saved-list');
    if (!container) return;

    const projects = this.listProjects();

    // Update nav badge
    const badges = document.querySelectorAll('.nav-item');
    badges.forEach(b => {
      if (b.textContent.includes('Saved Projects')) {
        const badge = b.querySelector('.badge');
        if (badge) badge.textContent = projects.length;
      }
    });

    // Update dashboard counter
    const dp = document.getElementById('dash-projects');
    if (dp) dp.textContent = projects.length;

    if (projects.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info">No saved projects yet. Complete a BOQ, then click <strong>Save Project</strong> in the top bar.</div>
      `;
      return;
    }

    const planUsed  = userSession.plan === 'free' ? projects.length : null;
    const planLimit = userSession.plan === 'free' ? FREE_PLAN_LIMIT : null;

    const progressHtml = planUsed !== null ? `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:6px;font-family:var(--mono)">
          <span>FREE PLAN USAGE</span>
          <span>${planUsed} / ${planLimit} projects</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(planUsed/planLimit*100)}%"></div></div>
        ${planUsed >= planLimit ? `<div class="alert alert-warn" style="margin-top:8px">Limit reached. <a href="#" onclick="document.querySelector('.btn-upgrade').click()" style="color:var(--accent)">Upgrade to Pro →</a></div>` : ''}
      </div>
    ` : '';

    const cards = projects
      .slice()
      .reverse()  // Most recent first
      .map(p => {
        const totalK = p.stats?.totalCost > 0
          ? `SAR ${Math.round(p.stats.totalCost / 1000)}K`
          : '—';
        const typeIcon = {
          residential: '🏠', commercial: '🏢', mixed: '🏙️',
          industrial: '🏭', hospitality: '🏨', healthcare: '🏥'
        }[p.type] || '📋';

        return `
          <div class="card card-sm" style="margin-bottom:12px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div style="font-size:28px;flex-shrink:0">${typeIcon}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
              <div style="font-size:11px;color:var(--muted);font-family:var(--mono)">
                ${p.state?.projectType || p.type} · ${p.code} · ${p.stats?.rooms || 0} rooms · ${p.stats?.boqItems || 0} BOQ items
              </div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px">Saved: ${p.savedAtStr}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:18px;font-weight:700;color:var(--accent2);font-family:var(--mono)">${totalK}</div>
              <div style="font-size:10px;color:var(--muted)">total BOQ value</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-secondary btn-sm" onclick="StorageUtils.loadAndOpen('${p.id}')">📂 Load</button>
              <button class="btn btn-ghost btn-sm" onclick="StorageUtils.confirmDelete('${p.id}','${p.name.replace(/'/g,'\\\'')}')" style="color:var(--red);border-color:rgba(232,91,91,.3)">🗑</button>
            </div>
          </div>
        `;
      }).join('');

    container.innerHTML = progressHtml + cards;
  },

  /**
   * Load a project and navigate to the dashboard.
   * @param {string} projectId
   */
  loadAndOpen(projectId) {
    const result = this.loadProject(projectId);
    if (result.ok) {
      if (window.showNotif) window.showNotif(result.message);
      if (window.showPage) window.showPage('dashboard');
    } else {
      if (window.showNotif) window.showNotif(result.message, 'warn');
    }
  },

  /**
   * Confirm deletion with a modal then delete.
   * @param {string} projectId
   * @param {string} projectName
   */
  confirmDelete(projectId, projectName) {
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) return;
    this.deleteProject(projectId);
    this.renderSavedList();
    if (window.showNotif) window.showNotif(`"${projectName}" deleted.`, 'warn');
  }
};

/* ============================================================
   6. INJECT UI — Save / Load BUTTONS into topbar
   ============================================================ */

/**
 * Inject Save Project and Load Project buttons into the existing topbar.
 * This is purely additive — existing topbar buttons are untouched.
 * Injected after DOMContentLoaded.
 */
function injectStorageButtons() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions) return;

  // Avoid duplicate injection
  if (document.getElementById('btn-save-project')) return;

  // Create wrapper
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:6px;align-items:center;margin-right:4px;border-right:1px solid var(--border);padding-right:10px';
  wrap.innerHTML = `
    <button id="btn-save-project" class="btn btn-success btn-sm" title="Save current project to local storage" onclick="handleSaveProject()">
      💾 Save Project
    </button>
    <button id="btn-load-project" class="btn btn-ghost btn-sm" title="Browse saved projects" onclick="handleLoadProject()">
      📂 Projects
    </button>
  `;

  // Insert before the first existing button
  actions.insertBefore(wrap, actions.firstChild);
}

/** Called by Save Project button */
function handleSaveProject() {
  if (!window.state?.projectName && !window.state?.rooms?.length) {
    window.showNotif?.('Set up a project first before saving.', 'warn');
    return;
  }
  const result = StorageUtils.saveProject();
  if (result.ok) {
    window.showNotif?.(`💾 ${result.message}`);
    StorageUtils.renderSavedList();
  } else {
    window.showNotif?.(result.message, 'warn');
  }
}

/** Called by Load Project button — navigates to saved projects page */
function handleLoadProject() {
  StorageUtils.renderSavedList();
  window.showPage?.('saved');
}

/* ============================================================
   7. PATCH showPage — Render saved list on navigation
   ============================================================ */

/**
 * Wrap the existing showPage() to call renderSavedList() when navigating
 * to the saved page. This avoids modifying the original function.
 */
(function patchShowPage() {
  const _origShowPage = window.showPage;
  if (!_origShowPage) return;

  window.showPage = function(id) {
    _origShowPage(id);
    if (id === 'saved') {
      StorageUtils.renderSavedList();
    }
  };
})();

/* ============================================================
   8. INITIALISE ON LOAD
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  // Boot session
  userSession.load();
  UsageTracker.bumpSession();

  // Inject buttons into topbar
  injectStorageButtons();

  // Initial render of saved list (in case saved page is visited)
  StorageUtils.renderSavedList();

  // Update dashboard stats
  const dp = document.getElementById('dash-projects');
  if (dp) dp.textContent = StorageUtils.listProjects().length;

  // Track page view
  mockAPI.trackEvent('page_view', { page: 'boq_estimator_v4' });
});

/* ============================================================
   9. EXPORT (for use by other modules)
   ============================================================ */
window.StorageUtils  = StorageUtils;
window.userSession   = userSession;
window.mockAPI       = mockAPI;
window.UsageTracker  = UsageTracker;
