import LetterGlitch from './components/LetterGlitch';

// Fond du héros de l'accueil (composant LetterGlitch de React Bits), réglages de l'exemple.
export default function GlitchBackground() {
  return (
    <LetterGlitch
      glitchColors={['#ffffff', '#30bc77']}
      glitchAmount={0.5}
      speed={1}
      flow={0.5}
      clickEffect="tear"
      fontSize={13}
      spacing={0.8}
      characters="01"
    />
  );
}
