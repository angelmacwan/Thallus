/* ── Design System Tokens ────────────────────────────────────────────────── */
:root {
  /* Surface hierarchy */
  --surface: #f8f9f9;
  --surface-bright: #f8f9f9;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f3f4f4;
  --surface-container: #edeeee;
  --surface-container-high: #e7e8e8;
  --surface-container-highest: #e1e3e3;
  --surface-dim: #d9dada;

  /* Primary – deep navy */
  --primary: #12283c;
  --primary-container: #293e53;
  --on-primary: #ffffff;
  --primary-fixed: #cfe5ff;
  --primary-fixed-dim: #b3c9e2;

  /* Secondary – slate */
  --secondary: #506071;
  --secondary-container: #d3e4f8;
  --on-secondary: #ffffff;
  --on-secondary-container: #566677;

  /* Tertiary – warm amber (accent-only, max 5% screen) */
  --tertiary-fixed: #ffdcc5;
  --tertiary-fixed-dim: #ffb783;
  --on-tertiary-fixed: #301400;

  /* On-surface tokens */
  --on-surface: #191c1c;
  --on-surface-variant: #43474c;
  --on-background: #191c1c;

  /* Outline */
  --outline: #74777d;
  --outline-variant: #c4c6cd;

  /* Error */
  --error: #ba1a1a;
  --error-container: #ffdad6;
  --on-error: #ffffff;

  /* Legacy aliases for components that still reference them */
  --accent-color: #12283c;
  --text-primary: #191c1c;
  --text-secondary: #506071;
  --success-color: #2d6a4f;
  --danger-color: #ba1a1a;
  --border-color: #e7e8e8;
  --panel-bg: #ffffff;
  --bg-color: #f8f9f9;

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #12283c 0%, #293e53 100%);

  /* Shadows (ambient tonal, no harsh drops) */
  --shadow-lg: 0 40px 40px -10px rgba(25, 28, 28, 0.06);
  --shadow-sm: 0 2px 12px rgba(25, 28, 28, 0.04);
}

/* ── Reset ───────────────────────────────────────────────────────────────── */
* {
  scroll-behavior: smooth;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ── Base ────────────────────────────────────────────────────────────────── */
body {
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  background-color: var(--surface);
  color: var(--on-surface);
  line-height: 1.5;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.font-headline {
  font-family: 'Manrope', sans-serif;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  vertical-align: middle;
}

a {
  color: var(--primary);
  text-decoration: none;

}

a:hover {
  text-decoration: underline;
}

button {
  cursor: pointer;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 1rem;
}

/* ── App layout ──────────────────────────────────────────────────────────── */
.app-container {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.sidebar {
  width: 240px;
  min-width: 240px;
  height: 100vh;
  background: var(--surface-container-low);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  position: sticky;
  top: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2.5rem;
  padding-left: 0.375rem;
}

.sidebar-logo-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--on-primary);
  flex-shrink: 0;
}

.sidebar-brand-name {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.03em;
  color: var(--primary);
  line-height: 1.1;
}

.sidebar-brand-sub {
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  color: var(--outline);
  font-weight: 600;
  text-transform: uppercase;
  margin-top: 2px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sidebar-nav-btn {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--secondary);
  background: transparent;
  border: none;
  text-align: left;
}

.sidebar-nav-btn:hover {
  background: var(--surface-container);
  color: var(--on-surface);
}

.sidebar-nav-btn.active {
  background: var(--surface-container-lowest);
  color: var(--primary);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.sidebar-nav-btn.danger {
  color: var(--outline);
}

.sidebar-nav-btn.danger:hover {
  background: rgba(186, 26, 26, 0.07);
  color: var(--error);
}

/* ── Main content ────────────────────────────────────────────────────────── */
.main-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--surface);
  padding: 2rem 2.5rem;
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--gradient-primary);
  color: var(--on-primary);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  transition: opacity 0.2s, transform 0.15s;
  box-shadow: 0 2px 16px rgba(18, 40, 60, 0.18);
  cursor: pointer;
  border: none;
}

.btn:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

.btn:active {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-tertiary {
  background: var(--tertiary-fixed);
  color: var(--on-tertiary-fixed);
  box-shadow: var(--shadow-sm);
}

.btn-tertiary:hover {
  background: var(--tertiary-fixed-dim);
  opacity: 1;
}

.btn-secondary {
  background: var(--surface-container-high);
  color: var(--primary);
  box-shadow: none;
}

.btn-secondary:hover {
  background: var(--surface-container);
  opacity: 1;
}

/* ── Cards ───────────────────────────────────────────────────────────────── */
.card {
  background: var(--surface-container-lowest);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-lg);
  transition: background 0.2s;
}

.card:hover {
  background: var(--surface-bright);
}

.admin-dashboard {
  max-width: 1380px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.admin-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.95fr);
  gap: 1.1rem;
  padding: 1.6rem;
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(255, 183, 131, 0.18), transparent 32%),
    linear-gradient(135deg, #102638 0%, #183247 48%, #244258 100%);
  box-shadow: 0 30px 70px rgba(10, 25, 38, 0.16);
  color: #f5f7fa;
}

.admin-hero::after {
  content: '';
  position: absolute;
  inset: auto -10% -25% auto;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  filter: blur(8px);
}

.admin-hero-copy,
.admin-hero-aside {
  position: relative;
  z-index: 1;
}

.admin-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
}

.admin-title {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 0.98;
  letter-spacing: -0.055em;
  margin: 0;
  max-width: 11ch;
  color: #ffffff;
}

.admin-subtitle {
  max-width: 62ch;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.98rem;
  line-height: 1.7;
}

.admin-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.75rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: #f5f7fa;
}

.admin-secondary-button:hover {
  background: rgba(255, 255, 255, 0.14);
}

.admin-hero-aside {
  display: grid;
  gap: 0.9rem;
  align-content: stretch;
}

.admin-hero .admin-insight-card {
  background: rgba(8, 18, 28, 0.32);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: #ffffff;
}

.admin-hero .admin-eyebrow,
.admin-hero .admin-insight-value,
.admin-hero .admin-insight-detail,
.admin-hero .admin-insight-header {
  color: #ffffff;
}

.admin-hero .admin-insight-detail {
  color: rgba(255, 255, 255, 0.82);
}

.admin-hero .admin-insight-header svg {
  color: rgba(255, 255, 255, 0.92);
}

.admin-hero .admin-tone-gold.admin-insight-card .admin-eyebrow,
.admin-hero .admin-tone-gold.admin-insight-card .admin-insight-value,
.admin-hero .admin-tone-gold.admin-insight-card .admin-insight-detail,
.admin-hero .admin-tone-gold.admin-insight-card .admin-insight-header {
  color: #ffffff;
}

.admin-hero .admin-tone-gold.admin-insight-card .admin-insight-detail {
  color: rgba(255, 255, 255, 0.82);
}

.admin-hero .admin-tone-gold.admin-insight-card .admin-insight-header svg {
  color: rgba(255, 255, 255, 0.92);
}

.admin-hero .admin-tone-crimson.admin-insight-card .admin-eyebrow,
.admin-hero .admin-tone-crimson.admin-insight-card .admin-insight-value,
.admin-hero .admin-tone-crimson.admin-insight-card .admin-insight-detail,
.admin-hero .admin-tone-crimson.admin-insight-card .admin-insight-header {
  color: var(--primary);
}

.admin-hero .admin-tone-crimson.admin-insight-card .admin-insight-header svg {
  color: var(--accent-color);
}

.admin-eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.admin-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.admin-metric-card,
.admin-insight-card,
.admin-brief-card,
.admin-section-card {
  border: 1px solid rgba(18, 40, 60, 0.08);
}

.admin-metric-card {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.2rem;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(247, 249, 250, 0.95));
  box-shadow: 0 18px 32px rgba(18, 40, 60, 0.06);
}

.admin-metric-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(18, 40, 60, 0.08);
  color: var(--accent-color);
  flex-shrink: 0;
}

.admin-metric-value,
.admin-insight-value {
  margin: 0.35rem 0 0;
  font-family: 'Manrope', sans-serif;
  font-size: clamp(1.45rem, 2vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.05em;
  color: var(--primary);
}

.admin-metric-detail,
.admin-insight-detail,
.admin-brief-copy,
.admin-section-subtitle,
.admin-modal-copy {
  margin: 0.35rem 0 0;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.9rem;
}

.admin-tone-navy .admin-metric-icon-wrap,
.admin-tone-navy.admin-insight-card {
  background-color: rgba(18, 40, 60, 0.08);
}

.admin-tone-emerald .admin-metric-icon-wrap {
  background: rgba(22, 101, 52, 0.1);
  color: #166534;
}

.admin-tone-gold .admin-metric-icon-wrap,
.admin-tone-gold.admin-insight-card {
  background: rgba(217, 119, 6, 0.08);
  color: #b45309;
}

.admin-tone-slate .admin-metric-icon-wrap {
  background: rgba(71, 85, 105, 0.1);
  color: #334155;
}

.admin-tone-crimson.admin-insight-card {
  background: linear-gradient(180deg, rgba(255, 248, 247, 0.98), rgba(255, 239, 237, 0.96));
  color: #991b1b;
}

.admin-insight-card {
  padding: 1.1rem 1.15rem;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(250, 247, 241, 0.95));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.admin-insight-header,
.admin-brief-header,
.admin-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.admin-brief-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.85fr);
  gap: 1rem;
}

.admin-brief-card {
  padding: 1.1rem;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 247, 249, 0.98));
}

.admin-brief-card-accent {
  padding: 1.1rem;
  background:
    radial-gradient(circle at top right, rgba(255, 183, 131, 0.2), transparent 34%),
    linear-gradient(180deg, #fffdf8, #f5f8fb);
}

.admin-brief-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  margin-top: 0.6rem;
}

@media (max-width: 860px) {
  .admin-brief-metrics {
    grid-template-columns: 1fr;
  }
}

.admin-brief-metrics .admin-metric-card {
  padding: 0.9rem;
  gap: 0.75rem;
  box-shadow: none;
  border-radius: 16px;
}

/* Compact variant for metric cards inside the executive scorecard */
.admin-brief-metrics .admin-metric-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 12px;
}

.admin-brief-metrics .admin-eyebrow {
  font-size: 0.65rem;
}

.admin-brief-metrics .admin-metric-value {
  font-size: 1.05rem;
  margin-top: 0.18rem;
}

.admin-brief-metrics .admin-metric-detail {
  font-size: 0.82rem;
  margin-top: 0.18rem;
  color: rgba(0, 0, 0, 0.6);
}

.admin-brief-title,
.admin-section-title {
  margin: 0.12rem 0 0;
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--primary);
}

.admin-brief-title {
  font-size: 1.02rem;
}

.admin-brief-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.admin-brief-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.75rem 0.85rem;
  border-radius: 14px;
  background: rgba(18, 40, 60, 0.04);
  color: var(--primary);
  font-size: 0.92rem;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(18, 40, 60, 0.08);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.admin-badge-navy {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.16);
}

.admin-badge-success {
  background: rgba(22, 101, 52, 0.08);
}

.admin-badge-danger {
  background: rgba(153, 27, 27, 0.08);
}

.admin-badge-info {
  background: rgba(29, 78, 216, 0.08);
}

.admin-section-card {
  padding: 0;
  overflow: hidden;
  border-radius: 24px;
  box-shadow: 0 14px 32px rgba(18, 40, 60, 0.06);
}

.admin-section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem 1.3rem;
  color: var(--text-primary);
  text-align: left;
}

.admin-section-heading,
.admin-section-meta {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.admin-section-heading {
  min-width: 0;
}

.admin-section-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(18, 40, 60, 0.07);
  flex-shrink: 0;
}

.admin-section-title {
  font-size: 1.02rem;
}

.admin-section-subtitle {
  font-size: 0.84rem;
}

.admin-section-body {
  border-top: 1px solid rgba(18, 40, 60, 0.08);
}

.admin-add-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid rgba(18, 40, 60, 0.08);
  background: linear-gradient(180deg, rgba(248, 249, 249, 0.9), rgba(255, 255, 255, 0.95));
}

.admin-input {
  min-height: 40px;
  padding: 0.55rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(18, 40, 60, 0.12);
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-primary);
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.admin-input:focus {
  border-color: rgba(18, 40, 60, 0.3);
  box-shadow: 0 0 0 4px rgba(18, 40, 60, 0.08);
}

.admin-add-button,
.admin-danger-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 40px;
  padding: 0.55rem 0.95rem;
  border-radius: 12px;
  color: #fff;
  font-weight: 700;
  font-size: 0.84rem;
}

.admin-add-button {
  background: var(--gradient-primary);
}

.admin-add-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.admin-table-wrap {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.admin-table thead tr {
  background: linear-gradient(180deg, rgba(237, 238, 238, 0.95), rgba(247, 248, 248, 0.96));
}

.admin-table-head,
.admin-table-cell {
  white-space: nowrap;
  text-align: left;
  vertical-align: middle;
}

.admin-table-head {
  padding: 0.82rem 1rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(18, 40, 60, 0.08);
}

.admin-table-cell {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(18, 40, 60, 0.06);
}

.admin-table tbody tr:hover {
  background: rgba(18, 40, 60, 0.025);
}

.admin-row-editing {
  background: rgba(18, 40, 60, 0.06);
}

.admin-table-actions-head,
.admin-table-actions {
  text-align: right;
}

.admin-action-group,
.admin-modal-actions {
  display: flex;
  gap: 0.45rem;
  justify-content: flex-end;
}

.admin-modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(7, 14, 22, 0.45);
  backdrop-filter: blur(8px);
}

.admin-modal {
  padding: 1.4rem;
  border-radius: 24px;
}

@media (max-width: 1180px) {

  .admin-hero,
  .admin-brief-grid,
  .admin-metrics-grid {
    grid-template-columns: 1fr 1fr;
  }

  .admin-brief-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .main-content {
    padding: 1.25rem;
  }

  .admin-hero,
  .admin-metrics-grid {
    grid-template-columns: 1fr;
  }

  .admin-hero {
    padding: 1.25rem;
  }

  .admin-section-toggle {
    align-items: flex-start;
  }

  .admin-section-meta {
    flex-shrink: 0;
  }
}

@media (max-width: 640px) {
  .admin-dashboard {
    gap: 1rem;
  }

  .admin-title {
    max-width: none;
  }

  .admin-section-toggle {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-section-meta,
  .admin-hero-actions,
  .admin-modal-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .admin-table-head,
  .admin-table-cell {
    padding-left: 0.8rem;
    padding-right: 0.8rem;
  }
}

.landing-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 220, 197, 0.7), transparent 34%),
    linear-gradient(180deg, #f7f4ef 0%, #eef2f0 54%, #e8eceb 100%);
  color: var(--on-surface);
}

.landing-shell {
  position: relative;
  z-index: 1;
  max-width: 1180px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

.landing-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(10px);
  opacity: 0.6;
  pointer-events: none;
}

.landing-orb-left {
  top: -100px;
  left: -80px;
  width: 280px;
  height: 280px;
  background: rgba(255, 183, 131, 0.35);
}

.landing-orb-right {
  right: -120px;
  top: 140px;
  width: 360px;
  height: 360px;
  background: rgba(18, 40, 60, 0.11);
}

.landing-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 4.5rem;
}

.landing-brandmark {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.landing-brandmark-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  color: var(--on-primary);
  box-shadow: 0 14px 30px rgba(18, 40, 60, 0.14);
}

.landing-brandmark-name {
  font-family: 'Manrope', sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--primary);
}

.landing-brandmark-subtitle {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--outline);
  margin-top: 0.15rem;
}

.landing-login-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0.7rem 1rem;
  border: 1px solid rgba(18, 40, 60, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  color: var(--primary);
  font-weight: 700;
  text-decoration: none;
}

.landing-login-link:hover {
  text-decoration: none;
  background: rgba(255, 255, 255, 0.75);
}

.landing-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 1.5rem;
  align-items: stretch;
  margin-bottom: 1.5rem;
}

.landing-copy,
.landing-panel,
.landing-waitlist {
  border: 1px solid rgba(18, 40, 60, 0.08);
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 40px rgba(18, 40, 60, 0.08);
}

.landing-copy {
  padding: 2.4rem;
  border-radius: 32px;
}

.landing-kicker,
.landing-panel-label {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--secondary);
  margin-bottom: 1rem;
}

.landing-title {
  max-width: 11ch;
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2.9rem, 7vw, 5.8rem);
  line-height: 0.95;
  letter-spacing: -0.07em;
  color: var(--primary);
  margin-bottom: 1.25rem;
}

.landing-description {
  max-width: 58ch;
  font-size: 1.05rem;
  line-height: 1.75;
  color: var(--text-secondary);
  margin-bottom: 1.75rem;
}

.landing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;

}

.landing-primary-cta,
.landing-secondary-cta {
  text-decoration: none;
}

.landing-primary-cta:hover,
.landing-secondary-cta:hover {
  text-decoration: none;
}

.landing-trust-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(18, 40, 60, 0.08);
}

.landing-trust-row div {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 40, 60, 0.06);
}

.landing-trust-number {
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 0.1rem;
}

.landing-trust-row p {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.landing-panel {
  padding: 1.6rem;
  border-radius: 28px;
}

.landing-capability-list {
  display: grid;
  gap: 0.9rem;
}

.landing-capability-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem;
  padding: 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 40, 60, 0.06);
}

.landing-capability-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(18, 40, 60, 0.08);
  color: var(--primary);
}

.landing-capability-card h2 {
  font-size: 0.98rem;
  margin-bottom: 0.3rem;
  color: var(--primary);
}

.landing-capability-card p {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.landing-waitlist {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  gap: 1.5rem;
  align-items: center;
  padding: 1.8rem;
  border-radius: 28px;
}

.landing-waitlist h2 {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  line-height: 1.05;
  letter-spacing: -0.05em;
  margin-bottom: 0.9rem;
  color: var(--primary);
}

.landing-waitlist-copy {
  max-width: 56ch;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 1.2rem;
}

.landing-benefits {
  display: grid;
  gap: 0.65rem;
}

.landing-benefits div {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary);
}

.landing-waitlist-form {
  display: grid;
  gap: 0.8rem;
  padding: 1.25rem;
  border-radius: 24px;
  background: rgba(248, 249, 249, 0.84);
  border: 1px solid rgba(18, 40, 60, 0.08);
}

.landing-waitlist-form label {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--secondary);
}

.landing-waitlist-form input {
  width: 100%;
  height: 52px;
  padding: 0 0.95rem;
  border-radius: 14px;
  border: 1px solid rgba(18, 40, 60, 0.14);
  background: #ffffff;
  color: var(--on-surface);
  font: inherit;
}

.landing-waitlist-form input:focus {
  outline: 2px solid rgba(18, 40, 60, 0.12);
  border-color: var(--primary);
}

.landing-submit {
  width: 100%;
  min-height: 50px;
}

.landing-form-status {
  font-size: 0.92rem;
  line-height: 1.5;
}

.landing-form-status-success {
  color: var(--success-color);
}

.landing-form-status-error {
  color: var(--danger-color);
}

.auth-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 220, 197, 0.72), transparent 30%),
    radial-gradient(circle at bottom right, rgba(18, 40, 60, 0.08), transparent 32%),
    linear-gradient(180deg, #f7f4ef 0%, #edf1f0 52%, #e6ebea 100%);
}

.auth-shell {
  position: relative;
  z-index: 1;
  max-width: 1180px;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
}

.auth-back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 1.25rem;
  color: var(--primary);
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;
}

.auth-back-link:hover {
  text-decoration: none;
  opacity: 0.82;
}

.auth-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
  gap: 1.5rem;
  align-items: stretch;
}

.auth-panel {
  border: 1px solid rgba(18, 40, 60, 0.08);
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 40px rgba(18, 40, 60, 0.08);
}

.auth-story-panel {
  border-radius: 32px;
  padding: 2.4rem;
  display: flex;
  flex-direction: column;
}

.auth-brandmark {
  margin-bottom: 2rem;
}

.auth-kicker {
  margin-bottom: 0.9rem;
}

.auth-title {
  max-width: 11ch;
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2.8rem, 6vw, 5.2rem);
  line-height: 0.95;
  letter-spacing: -0.07em;
  color: var(--primary);
  margin-bottom: 1.15rem;
}

.auth-description {
  max-width: 52ch;
  font-size: 1rem;
  line-height: 1.75;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.auth-highlight-list {
  display: grid;
  gap: 0.85rem;
  margin-bottom: 1.5rem;
}

.auth-highlight-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: start;
  padding: 0.95rem 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(18, 40, 60, 0.06);
  color: var(--primary);
}

.auth-highlight-item span {
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.auth-metrics-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(18, 40, 60, 0.08);
}

.auth-metrics-row>div {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: start;
}

.auth-metrics-row svg {
  color: var(--primary);
}

.auth-metrics-row p {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 0.2rem;
}

.auth-metrics-row span {
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.auth-form-panel {
  border-radius: 28px;
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.auth-mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 0.35rem;
  border-radius: 18px;
  background: rgba(18, 40, 60, 0.05);
}

.auth-mode-button {
  min-height: 46px;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  color: var(--secondary);
  font-size: 0.9rem;
  font-weight: 700;
  transition: background 0.18s, color 0.18s, transform 0.18s;
}

.auth-mode-button.active {
  background: rgba(255, 255, 255, 0.92);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.auth-mode-button:hover {
  color: var(--primary);
}

.auth-form-header {
  padding: 0.4rem 0.2rem 0;
}

.auth-form-header h2 {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2rem, 4vw, 2.9rem);
  line-height: 1;
  letter-spacing: -0.05em;
  color: var(--primary);
  margin-bottom: 0.85rem;
}

.auth-form-header p:last-child {
  font-size: 0.96rem;
  line-height: 1.65;
  color: var(--text-secondary);
}

.auth-status {
  padding: 0.95rem 1rem;
  border-radius: 18px;
  border: 1px solid transparent;
}

.auth-status p {
  font-size: 0.92rem;
  line-height: 1.55;
}

.auth-status-label {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
}

.auth-status-success {
  background: rgba(45, 106, 79, 0.09);
  border-color: rgba(45, 106, 79, 0.16);
  color: var(--success-color);
}

.auth-status-warning,
.auth-status-error {
  color: var(--danger-color);
}

.auth-status-warning {
  background: rgba(186, 26, 26, 0.08);
  border-color: rgba(186, 26, 26, 0.18);
}

.auth-status-error {
  background: rgba(186, 26, 26, 0.05);
  border-color: rgba(186, 26, 26, 0.1);
}

.auth-form {
  display: grid;
  gap: 0.15rem;
}

.auth-form-group {
  margin-bottom: 1rem;
}

.auth-input {
  min-height: 54px;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(18, 40, 60, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.auth-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(18, 40, 60, 0.1);
}

.auth-password-wrap {
  position: relative;
}

.auth-password-wrap svg {
  position: absolute;
  top: 50%;
  left: 0.95rem;
  transform: translateY(-50%);
  color: var(--outline);
  pointer-events: none;
}

.auth-input-password {
  padding-left: 2.75rem;
}

.auth-submit {
  width: 100%;
  min-height: 52px;
  margin-top: 0.5rem;
}

.auth-footnote {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.auth-inline-toggle {
  margin-left: 0.35rem;
  color: var(--primary);
  font-weight: 700;
}

.auth-inline-toggle:hover {
  text-decoration: underline;
}

/* OTP input — large monospace digit display */
.auth-otp-input {
  font-size: 1.6rem;
  font-family: monospace;
  letter-spacing: 0.35em;
  text-align: center;
  padding: 0.75rem 1rem;
}

/* Forgot password text-button */
.auth-forgot-link {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: right;
  cursor: pointer;
}

.auth-forgot-link:hover {
  color: var(--primary);
}

/* Resend / change-email row beneath OTP form */
.auth-resend-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.auth-resend-row .auth-inline-toggle {
  margin-left: 0;
  font-weight: 500;
}

.auth-resend-sep {
  color: var(--text-secondary);
  opacity: 0.5;
}

/* ── Landing Extended Sections ────────────────────────────────────────── */

.landing-subline {
  font-family: 'Manrope', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--primary);
  margin-bottom: 1.75rem;
}

.landing-section {
  border: 1px solid rgba(18, 40, 60, 0.08);
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 40px rgba(18, 40, 60, 0.08);
  border-radius: 28px;
  padding: 2.4rem;
  margin-bottom: 1.5rem;
}

.landing-section-header {
  margin-bottom: 2rem;
}

.landing-section-header h2,
.landing-section-h2 {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  line-height: 1.07;
  letter-spacing: -0.05em;
  color: var(--primary);
  margin-bottom: 0.6rem;
}

.landing-section-header>p:not(.landing-panel-label) {
  max-width: 62ch;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* Contrast statement */
.landing-contrast-statement {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(1.25rem, 2.4vw, 1.8rem);
  line-height: 1.35;
  letter-spacing: -0.03em;
  color: var(--text-secondary);
  max-width: 72ch;
  margin: 0 auto 2rem;
  text-align: center;
}

.landing-contrast-statement strong {
  color: var(--primary);
}

/* Pillars */
.landing-pillars-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.landing-pillar {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(18, 40, 60, 0.07);
}

.landing-pillar-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(18, 40, 60, 0.07);
  color: var(--primary);
  flex-shrink: 0;
}

.landing-pillar h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.3rem;
}

.landing-pillar p {
  font-size: 0.87rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

/* Modes */
.landing-modes-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;
}

.landing-mode-card {
  border-radius: 22px;
  padding: 1.75rem;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 40, 60, 0.08);
}

.landing-mode-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.landing-mode-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--gradient-primary);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 800;
}

.landing-mode-card h3 {
  font-family: 'Manrope', sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--primary);
  margin-bottom: 0;
}

.landing-mode-card>p {
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--text-secondary);
  margin-bottom: 1.25rem;
}

.landing-mode-features {
  list-style: none;
  display: grid;
  gap: 0.55rem;
}

.landing-mode-features li {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--on-surface-variant);
}

.landing-mode-features li svg {
  color: var(--primary);
  flex-shrink: 0;
  margin-top: 0.15rem;
}

/* Use cases */
.landing-usecases-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.landing-usecase-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 40, 60, 0.07);
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--primary);
  font-weight: 500;
}

.landing-usecase-item svg {
  color: var(--secondary);
  flex-shrink: 0;
  margin-top: 0.2rem;
}

/* How it works */
.landing-how-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.landing-step {
  padding: 1.25rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 40, 60, 0.07);
}

.landing-step-num {
  font-family: 'Manrope', sans-serif;
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.06em;
  color: rgba(18, 40, 60, 0.12);
  line-height: 1;
  margin-bottom: 0.7rem;
}

.landing-step h3 {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.4rem;
}

.landing-step p {
  font-size: 0.87rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Simulation loop diagram */
.sim-loop-diagram {
  border-radius: 20px;
  padding: 1.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(18, 40, 60, 0.07);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sim-loop-diagram svg {
  width: 100%;
  max-width: 480px;
  height: auto;
}

/* Analysis cards */
.landing-analysis-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.landing-analysis-card {
  padding: 1.5rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 40, 60, 0.08);
}

.landing-analysis-card-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(18, 40, 60, 0.07);
  color: var(--primary);
  margin-bottom: 1rem;
}

.landing-analysis-card h3 {
  font-family: 'Manrope', sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--primary);
  margin-bottom: 0.35rem;
}

.landing-analysis-card>p {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.landing-analysis-list {
  list-style: none;
  display: grid;
  gap: 0.45rem;
}

.landing-analysis-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--on-surface-variant);
}

.landing-analysis-list li::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--secondary);
  flex-shrink: 0;
  margin-top: 0.45em;
}

/* When + Why side-by-side */
.landing-when-why-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  align-items: start;
}

.landing-when-why-grid .landing-section {
  margin-bottom: 0;
}

.landing-when-list {
  list-style: none;
  display: grid;
  gap: 0.6rem;
  margin-top: 1.25rem;
}

.landing-when-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(18, 40, 60, 0.07);
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--primary);
}

.landing-when-list li svg {
  flex-shrink: 0;
  color: var(--primary);
  margin-top: 0.1rem;
}

.landing-why-copy {
  font-size: 0.96rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 1.25rem;
}

/* System traits */
.landing-system-traits {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.landing-trait {
  text-align: center;
  padding: 1rem 0.75rem;
  border-radius: 16px;
  background: rgba(18, 40, 60, 0.04);
  border: 1px solid rgba(18, 40, 60, 0.07);
}

.landing-trait-value {
  font-family: 'Manrope', sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--primary);
  margin-bottom: 0.3rem;
}

.landing-trait-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Principles */
.landing-principles-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.landing-principle {
  padding: 1.4rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(18, 40, 60, 0.07);
}

.landing-principle h3 {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--primary);
  margin-bottom: 0.35rem;
}

.landing-principle p {
  font-size: 0.87rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Sample Reports */
.landing-reports-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.landing-report-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1.1rem;
  border-radius: 50px;
  border: 1px solid rgba(18, 40, 60, 0.13);
  background: rgba(255, 255, 255, 0.7);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  font-family: inherit;
}

.landing-report-tab:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.landing-report-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.landing-report-body {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 1.25rem;
  align-items: start;
}

.landing-report-overview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.landing-report-context {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--secondary);
}

.landing-report-goal {
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--text-secondary);
}

.landing-report-impact {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
}

.landing-report-stat {
  padding: 0.8rem 0.7rem;
  border-radius: 14px;
  border: 1px solid transparent;
  text-align: center;
}

.landing-report-stat-ok {
  background: rgba(34, 197, 94, 0.09);
  border-color: rgba(34, 197, 94, 0.22);
}

.landing-report-stat-warn {
  background: rgba(245, 158, 11, 0.09);
  border-color: rgba(245, 158, 11, 0.22);
}

.landing-report-stat-danger {
  background: rgba(239, 68, 68, 0.09);
  border-color: rgba(239, 68, 68, 0.22);
}

.landing-report-stat-neutral {
  background: rgba(18, 40, 60, 0.05);
  border-color: rgba(18, 40, 60, 0.1);
}

.landing-report-stat-value {
  display: block;
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--primary);
  margin-bottom: 0.2rem;
}

.landing-report-stat-label {
  display: block;
  font-size: 0.73rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.landing-report-recs {
  padding: 1.1rem;
  border-radius: 16px;
  background: rgba(18, 40, 60, 0.04);
  border: 1px solid rgba(18, 40, 60, 0.07);
}

.landing-report-recs-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 0.6rem;
}

.landing-report-recs ol {
  padding-left: 1.15rem;
  display: grid;
  gap: 0.45rem;
  margin: 0;
}

.landing-report-recs li {
  font-size: 0.87rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.landing-report-segments {
  display: grid;
  gap: 0.75rem;
}

.landing-report-segment {
  padding: 1.1rem 1.25rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 40, 60, 0.08);
}

.landing-report-segment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}

.landing-report-segment-name {
  font-family: 'Manrope', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--primary);
  letter-spacing: -0.02em;
}

.landing-report-reaction {
  font-size: 0.73rem;
  font-weight: 600;
  padding: 0.2rem 0.65rem;
  border-radius: 50px;
  white-space: nowrap;
}

.landing-report-reaction-negative {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}

.landing-report-reaction-mixed {
  background: rgba(245, 158, 11, 0.1);
  color: #92400e;
}

.landing-report-reaction-positive {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.landing-report-reaction-neutral {
  background: rgba(18, 40, 60, 0.07);
  color: var(--text-secondary);
}

.landing-report-segment-stat {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
}

.landing-report-segment-stat-value {
  font-family: 'Manrope', sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--primary);
  line-height: 1;
}

.landing-report-segment-stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.landing-report-segment-note {
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

/* CTA section */
.landing-cta-section {
  text-align: center;
  padding: 3.5rem 2rem;
}

.landing-cta-section h2 {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(1.75rem, 3.5vw, 2.8rem);
  line-height: 1.1;
  letter-spacing: -0.05em;
  color: var(--primary);
  margin-bottom: 1rem;
}

.landing-cta-section p {
  max-width: 56ch;
  margin: 0 auto 2rem;
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

.landing-actions-centered {
  justify-content: center;
}

/* Footer */
.landing-footer {
  text-align: center;
  padding: 2.5rem 0 0.5rem;
}

.landing-footer-brand {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--primary);
  margin-bottom: 0.35rem;
}

.landing-footer p:last-child {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 52ch;
  margin: 0 auto;
  line-height: 1.6;
}

.landing-footer-contact {
  margin-top: 0.85rem;
}

.landing-footer-contact a {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--secondary);
  text-decoration: none;
}

.landing-footer-contact a:hover {
  color: var(--primary);
  text-decoration: underline;
}

@media (max-width: 900px) {

  .landing-hero-grid,
  .landing-waitlist,
  .landing-modes-grid,
  .landing-when-why-grid,
  .landing-analysis-grid,
  .landing-report-body,
  .auth-layout {
    grid-template-columns: 1fr;
  }

  .landing-report-impact {
    grid-template-columns: repeat(2, 1fr);
  }

  .landing-how-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .landing-pillars-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .landing-section {
    padding: 1.75rem;
  }

  .landing-cta-section {
    padding: 2.5rem 1.5rem;
  }

  .landing-shell {
    padding-top: 1.25rem;
  }

  .auth-shell {
    padding-top: 1.25rem;
  }

  .landing-title {
    max-width: none;
  }

  .auth-title {
    max-width: none;
  }

  .landing-copy,
  .auth-story-panel {
    padding: 1.5rem;
  }

  .landing-panel,
  .landing-waitlist,
  .auth-form-panel {
    padding: 1.25rem;
  }

  .auth-metrics-row {
    margin-top: 0;
  }
}

@media (max-width: 640px) {
  body {
    overflow-x: hidden;
  }

  .landing-topbar,
  .landing-actions,
  .landing-trust-row {
    grid-template-columns: 1fr;
  }

  .landing-topbar {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 2.5rem;
  }

  .landing-brandmark-icon {
    width: 46px;
    height: 46px;
  }

  .landing-copy {
    border-radius: 24px;
  }

  .landing-panel,
  .landing-waitlist,
  .landing-waitlist-form,
  .auth-story-panel,
  .auth-form-panel {
    border-radius: 22px;
  }

  .landing-trust-row {
    display: grid;
  }

  .auth-metrics-row,
  .auth-mode-switch {
    grid-template-columns: 1fr;
  }

  .landing-login-link,
  .landing-primary-cta,
  .landing-secondary-cta,
  .auth-back-link {
    width: 100%;
    justify-content: center;
  }

  .landing-capability-card,
  .auth-highlight-item {
    grid-template-columns: 1fr;
  }

  .landing-pillars-grid,
  .landing-usecases-grid,
  .landing-how-grid,
  .landing-analysis-grid,
  .landing-principles-grid,
  .landing-system-traits {
    grid-template-columns: 1fr;
  }

  .landing-section {
    padding: 1.4rem;
    border-radius: 22px;
  }

  .landing-cta-section {
    padding: 2rem 1.25rem;
  }
}

/* ── Inputs ──────────────────────────────────────────────────────────────── */
.input-field {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--surface-container-low);
  border: none;
  border-radius: 8px;
  color: var(--on-surface);
  font-family: 'Inter', sans-serif;
  font-size: 0.9375rem;
  transition: box-shadow 0.2s;
  outline: none;
}

.input-field:focus {
  box-shadow: 0 0 0 2px rgba(18, 40, 60, 0.3);
}

.input-field::placeholder {
  color: var(--outline);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── Status chips ────────────────────────────────────────────────────────── */
.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.65rem;
  border-radius: 100px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.chip-completed {
  background: var(--secondary-container);
  color: var(--on-secondary-container);
}

.chip-running {
  background: var(--surface-container-high);
  color: var(--on-surface-variant);
}

.chip-error {
  background: var(--error-container);
  color: var(--error);
}

/* ── Typography ──────────────────────────────────────────────────────────── */
.text-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--outline);
}

h1,
h2,
h3,
h4 {
  color: var(--on-surface);
}

/* ── Fade ────────────────────────────────────────────────────────────────── */
.fade-in {
  animation: fadeIn 0.35s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Chat bubbles ────────────────────────────────────────────────────────── */
.chat-bubble {
  max-width: 82%;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.65;
}

.chat-bubble.user {
  align-self: flex-end;
  background: var(--gradient-primary);
  color: var(--on-primary);
  border-bottom-right-radius: 4px;
}

.chat-bubble.agent {
  align-self: flex-start;
  background: var(--surface-container-low);
  color: var(--on-surface);
  border-bottom-left-radius: 4px;
}

.chat-bubble p {
  margin: 0;
}

.chat-bubble p+p {
  margin-top: 0.5rem;
}

.chat-bubble ul,
.chat-bubble ol {
  padding-left: 1.25rem;
}

.chat-bubble code {
  background: rgba(0, 0, 0, 0.08);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.85em;
}

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--outline-variant);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--outline);
}

/* ── Spin ────────────────────────────────────────────────────────────────── */
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

/* ── Editorial report content ────────────────────────────────────────────── */
.editorial-content h1 {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 2.1rem;
  line-height: 1.25;
  color: var(--primary);
  letter-spacing: -0.02em;
  margin-bottom: 1.75rem;
}

.editorial-content h2 {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 1.4rem;
  color: var(--primary);
  margin-top: 2.25rem;
  margin-bottom: 0.85rem;
}

.editorial-content p {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--on-surface-variant);
  margin-bottom: 1.1rem;
}

.editorial-content ul {
  list-style-type: none;
  margin-bottom: 1.1rem;
}

.editorial-content ul li {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.45rem;
  color: var(--on-surface-variant);
  line-height: 1.65;
}

.editorial-content ul li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 5px;
  height: 5px;
  background: var(--primary);
  border-radius: 50%;
}

.editorial-content ol {
  counter-reset: editorial-counter;
  list-style: none;
  margin-bottom: 1.1rem;
  padding-left: 0;
}

.editorial-content ol li {
  counter-increment: editorial-counter;
  padding-left: 2rem;
  position: relative;
  margin-bottom: 0.45rem;
  color: var(--on-surface-variant);
  line-height: 1.65;
}

.editorial-content ol li::before {
  content: counter(editorial-counter) ".";
  position: absolute;
  left: 0;
  font-weight: 700;
  color: var(--primary);
}

/* ── Log console ─────────────────────────────────────────────────────────── */
.log-console {
  background: #0f1a24;
  border-radius: 10px;
  padding: 1rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.78rem;
  line-height: 1.65;
  color: var(--primary-fixed-dim);
  overflow-y: auto;
}