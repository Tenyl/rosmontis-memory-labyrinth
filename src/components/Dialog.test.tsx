import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button id="test-dossier-open" onClick={() => setOpen(true)}>打开档案</button>
      <Dialog id="test-dossier-dialog" title="档案详情" open={open} onClose={() => setOpen(false)}>
        <button id="test-dossier-primary">确认</button>
      </Dialog>
    </>
  );
}

test('traps focus, closes with Escape, and restores trigger focus', async () => {
  const user = userEvent.setup();
  render(<DialogHarness />);
  const trigger = screen.getByRole('button', { name: '打开档案' });

  await user.click(trigger);
  expect(screen.getByRole('dialog', { name: '档案详情' })).toBeVisible();
  await user.keyboard('{Escape}');

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
