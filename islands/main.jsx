import { createRoot } from 'react-dom/client';
import HeroTitle from './HeroTitle';
import GlitchBackground from './GlitchBackground';

// Les îlots React du site : chaque élément du HTML portant data-island="nom" reçoit le composant
// correspondant, le reste de la page reste du HTML ordinaire. Pour en ajouter un : créer le composant
// dans islands/, l'enregistrer ici, poser <div data-island="nom"></div> dans la page, puis
// « npm run build:islands » (le résultat est écrit dans assets/islands/ et commité).
const ISLANDS = {
  'hero-title': HeroTitle,
  glitch: GlitchBackground,
};

document.querySelectorAll('[data-island]').forEach(el => {
  const Island = ISLANDS[el.dataset.island];
  if (Island) createRoot(el).render(<Island data={el.dataset} />);
});
