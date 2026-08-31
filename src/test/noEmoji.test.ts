import packageJson from '../../package.json?raw';

const sourceModules = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

test('production source uses Lucide only and contains no visible emoji glyphs', () => {
  expect(packageJson).toContain('"lucide-react"');
  expect(packageJson).not.toContain('"@phosphor-icons/react"');

  for (const [path, source] of Object.entries(sourceModules)) {
    if (path.includes('.test.')) continue;
    expect(source, `${path} must not import Phosphor`).not.toContain('@phosphor-icons/react');
    expect(source, `${path} must not contain emoji`).not.toMatch(/\p{Extended_Pictographic}/u);
  }
});
