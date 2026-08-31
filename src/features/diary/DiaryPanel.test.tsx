import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { clearAllData } from '../../sillytavern/database';
import { saveDiaryEntry } from '../../diary/repository';
import { DiaryPanel } from './DiaryPanel';

afterEach(async () => {
  await clearAllData();
});

test('shows an approachable empty state', async () => {
  render(<DiaryPanel />);
  expect(await screen.findByText('手记还没有写下第一行')).toBeVisible();
});

test('opens an entry, shows its placeholder and saves the doctor note', async () => {
  const user = userEvent.setup();
  await saveDiaryEntry({
    id: 'diary-visible', triggerKey: 'floor-completed:visible:1', title: '离开表层残响以后',
    body: '我没有把那阵雨忘掉。', source: 'local', createdAt: '2026-08-31T00:00:00.000Z',
    runId: 'run-visible', floor: 1, illustrationAssetId: 'diaryIllustration', doctorNote: '',
    updatedAt: '2026-08-31T00:00:00.000Z',
  });

  render(<DiaryPanel />);
  await user.click(await screen.findByRole('button', { name: /离开表层残响以后/ }));
  expect(screen.getAllByText('本地预设')).toHaveLength(2);
  expect(screen.getByAltText('迷迭香手记插图资源占位图')).toBeVisible();
  const note = screen.getByRole('textbox', { name: '博士的批注' });
  await user.type(note, '我会替你记住。');
  await user.click(screen.getByRole('button', { name: '保存博士的批注' }));
  expect(await screen.findByText('批注已保存')).toBeVisible();
  expect(document.querySelector('#btn-diary-save-note')).toBeTruthy();
});
