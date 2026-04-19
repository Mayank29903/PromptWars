const userTokens = new Map();

export function registerToken(userId, queuePointId, tokenId) {
  if (!userTokens.has(userId)) userTokens.set(userId, new Map());
  userTokens.get(userId).set(queuePointId, tokenId);
}

export function removeToken(userId, queuePointId) {
  userTokens.get(userId)?.delete(queuePointId);
}

export function getUsersForQueuePoint(queuePointId) {
  const result = [];
  for (const [userId, tokenMap] of userTokens.entries()) {
    if (tokenMap.has(queuePointId)) {
      result.push({ userId, tokenId: tokenMap.get(queuePointId) });
    }
  }
  return result;
}
