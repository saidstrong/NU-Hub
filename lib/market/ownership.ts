export function isListingOwner(sellerId: string, userId: string): boolean {
  return sellerId === userId;
}
