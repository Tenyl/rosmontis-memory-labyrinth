import { useContext } from 'react';
import { TavernContext } from './TavernProvider';

export function useTavern() {
  const value = useContext(TavernContext);
  if (!value) throw new Error('useTavern 必须在 TavernProvider 内使用');
  return value;
}
