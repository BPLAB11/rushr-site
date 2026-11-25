import { createRoot } from 'react-dom/client';
import AnalyticsDashboard from './AnalyticsDashboard';
import './analytics.css';

// Monte l'onglet Analytics de l'admin la première fois qu'il est affiché (évite de charger les stats inutilement).
let mounted = false;
function mount() {
  if (mounted) return;
  const el = document.getElementById('analytics-root');
  if (!el || !window.BPL_ADMIN) return;
  mounted = true;
  createRoot(el).render(<AnalyticsDashboard />);
}

document.addEventListener('bpl:view', (e) => { if (e.detail === 'analytics') mount(); });
if (window.curView === 'analytics') mount();
