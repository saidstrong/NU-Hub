export function isCommunityOwner(createdBy: string, userId: string): boolean {
  return createdBy === userId;
}
