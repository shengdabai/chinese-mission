/** Panel level persists; assistance evidence is consumed at each submission. */
export function createHintEvidence() {
  const viewedLevels = new Set<number>();
  let pendingLevel = 0;
  return {
    view(level: number) {
      viewedLevels.add(level);
      pendingLevel = Math.max(pendingLevel, level);
    },
    consume() {
      const level = pendingLevel;
      pendingLevel = 0;
      return level;
    },
    get usageCount() { return viewedLevels.size; },
  };
}
