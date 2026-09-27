'use client';
import { Action, useResource } from '@/components/client-ui';
export function FollowButton({ id }: { id: string }) {
  const query = useResource<{ following: boolean }>(`follows/${id}`);
  const following = query.data?.following ?? false;
  return (
    <Action path={`follows/${id}`} method={following ? 'DELETE' : 'POST'}>
      {following ? '팔로우 해제' : '팔로우'}
    </Action>
  );
}
