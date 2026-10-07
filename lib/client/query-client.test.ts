import assert from 'node:assert/strict';
import test from 'node:test';
import { makeQueryClient } from './query-client';

test('failed writes are not automatically repeated', async () => {
  const client = makeQueryClient();
  let attempts = 0;
  const mutation = client.getMutationCache().build(client, { mutationFn: async () => { attempts++; throw new Error('Connection lost after write'); } });
  try {
    await assert.rejects(mutation.execute(undefined), /Connection lost/);
    assert.equal(attempts, 1);
  } finally { client.clear(); }
});

test('cached data becomes stale after thirty seconds', () => {
  const client = makeQueryClient();
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  try {
    client.setQueryData(['freshness'], { count: 1 });
    const query = client.getQueryCache().find({ queryKey: ['freshness'] })!;
    const staleTime = client.getDefaultOptions().queries?.staleTime as number;
    assert.equal(query.isStaleByTime(staleTime), false);
    now += 30_001;
    assert.equal(query.isStaleByTime(staleTime), true);
  } finally { Date.now = realNow; client.clear(); }
});
