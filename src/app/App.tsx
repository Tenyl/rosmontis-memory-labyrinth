import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { createAppRouter } from './router';
import { TavernProvider } from '../features/tavern/runtime/TavernProvider';

export function App() {
  const [router] = useState(createAppRouter);
  return <TavernProvider><RouterProvider router={router} /></TavernProvider>;
}
