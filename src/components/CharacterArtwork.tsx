export const CHARACTER_ARTWORK_SRC = '/assets/characters/blank-character.svg' as const;

interface CharacterArtworkProps {
  kind: 'avatar' | 'portrait';
  label: string;
  className?: string;
  decorative?: boolean;
}

export function CharacterArtwork({
  kind,
  label,
  className = '',
  decorative = false,
}: CharacterArtworkProps) {
  return (
    <img
      className={`character-artwork is-${kind} ${className}`.trim()}
      src={CHARACTER_ARTWORK_SRC}
      alt={decorative ? '' : label}
      aria-hidden={decorative || undefined}
      data-artwork-kind={kind}
      draggable={false}
    />
  );
}
