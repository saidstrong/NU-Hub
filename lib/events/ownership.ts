export function isEventOwner(createdBy: string | null, userId: string): boolean {
  return createdBy === userId;
}
