import RotatingText from './components/RotatingText';
import useLang from './useLang';

// Titre de l'accueil : une phrase fixe, puis le mot qui défile (composant RotatingText de React Bits).
// Les textes viennent du HTML (data-prefix-fr / -en, data-words-fr / -en) et suivent la langue de la page.
export default function HeroTitle({ data }) {
  const lang = useLang();
  const prefix = data[lang === 'en' ? 'prefixEn' : 'prefixFr'] || '';
  const words = (data[lang === 'en' ? 'wordsEn' : 'wordsFr'] || '').split(',').map(w => w.trim()).filter(Boolean);

  return (
    <>
      <span className="rot-prefix">{prefix}</span>
      {words.length > 0 && (
        <RotatingText
          key={lang}
          texts={words}
          effect="blur"
          direction="down"
          highlight={false}
          staggerFrom="center"
          staggerDuration={0.03}
          splitLevelClassName="rt-split"
          rotationInterval={2400}
          blur={16}
        />
      )}
    </>
  );
}
