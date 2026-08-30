import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { resolveImageAsset } from '../../assets/assetRegistry';
import { clearAllData } from '../../sillytavern/database';
import { CharacterManager } from './characters/CharacterManager';
import { TavernOrchestrator } from './components/TavernOrchestrator';
import { TavernProvider } from './runtime/TavernProvider';
import type { TavernTransport } from './runtime/tavern-transport';

const transport: TavernTransport = {
  mode: 'local',
  async *stream() {
    yield '<maintext>测试回复</maintext><option>继续</option><sum>测试</sum>';
  },
};

beforeEach(async () => clearAllData());
afterEach(async () => clearAllData());

function renderOrchestrator() {
  return render(
    <TavernProvider transport={transport}>
      <TavernOrchestrator open onClose={vi.fn()} />
    </TavernProvider>,
  );
}

test('保留的角色卡管理视图始终使用可替换空白头像', async () => {
  render(
    <TavernProvider transport={transport}>
      <CharacterManager />
    </TavernProvider>,
  );

  const character = await screen.findByRole('article', { name: '角色卡 迷迭香' });
  expect(within(character).getByRole('img', { name: '迷迭香角色卡缩略图' })).toHaveAttribute(
    'src',
    resolveImageAsset('rosmontisPortrait'),
  );
});

test('批量世界书导入分别报告成功与失败并保留成功项', async () => {
  const user = userEvent.setup();
  renderOrchestrator();
  await screen.findByText('雨幕回声');
  await user.click(screen.getByRole('tab', { name: /^世界书/ }));

  const input = screen.getByLabelText('批量导入世界书 JSON');
  const validBook = new File([JSON.stringify({
    name: '冰原异常记录', entries: {}, settings: { recursive_scanning: true },
  })], 'icefield.json', { type: 'application/json' });
  const invalidBook = new File(['not-json'], 'damaged.json', { type: 'application/json' });
  await user.upload(input, [validBook, invalidBook]);

  const report = await screen.findByRole('status');
  expect(report).toHaveTextContent('成功 1 项');
  expect(report).toHaveTextContent('失败 1 项');
  expect(await screen.findByText('冰原异常记录')).toBeVisible();
});

test('预设提示词顺序按钮会保存并在重新打开时保持顺序', async () => {
  const user = userEvent.setup();
  renderOrchestrator();
  await screen.findByText('雨幕回声');
  await user.click(screen.getByRole('tab', { name: /^预设/ }));
  await user.click(screen.getByRole('button', { name: '编辑预设 认知战术叙事' }));
  await user.click(screen.getByRole('tab', { name: '提示词顺序' }));

  const firstItem = screen.getByRole('listitem', { name: /Main Prompt/ });
  await user.click(within(firstItem).getByRole('button', { name: '下移 Main Prompt' }));
  await user.click(screen.getByRole('button', { name: '保存预设' }));
  await user.click(screen.getByRole('button', { name: '关闭预设编辑器' }));
  await user.click(screen.getByRole('button', { name: '编辑预设 认知战术叙事' }));
  await user.click(screen.getByRole('tab', { name: '提示词顺序' }));

  const order = screen.getAllByRole('listitem').map((item) => item.getAttribute('data-identifier'));
  expect(order.slice(0, 2)).toEqual(['worldInfoBefore', 'main']);
});
