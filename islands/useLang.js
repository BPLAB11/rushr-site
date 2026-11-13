import { useEffect, useState } from 'react';

// La langue de la page (attribut lang de <html>, posé par les boutons FR / EN du site).
const current = () => (document.documentElement.lang === 'en' ? 'en' : 'fr');

export default function useLang() {
  const [lang, setLang] = useState(current);
  useEffect(() => {
    const watcher = new MutationObserver(() => setLang(current()));
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    setLang(current());
    return () => watcher.disconnect();
  }, []);
  return lang;
}
