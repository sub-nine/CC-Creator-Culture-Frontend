import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { Form } from '@/components/client-ui';
it('입력 내용을 전달하고 저장 실패 메시지를 표시한다', async () => {
  const submit = vi.fn().mockRejectedValue(new Error('재고가 부족해요.'));
  render(
    <Form
      fields={[{ name: 'name', label: '상품명', required: true }]}
      onSubmit={submit}
    />,
  );
  fireEvent.change(screen.getByLabelText('상품명 *'), {
    target: { value: '작은 정원' },
  });
  fireEvent.submit(
    screen.getByRole('button', { name: '저장' }).closest('form')!,
  );
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('재고가 부족해요.'),
  );
  expect(submit).toHaveBeenCalledWith({ name: '작은 정원' });
});
