import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  localStorage.clear();
});
