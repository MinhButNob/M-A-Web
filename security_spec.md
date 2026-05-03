# Security Specification for Nexus M&A

## 1. Data Invariants
- A User profile must match the authenticated user's ID and email.
- A Deal must have an ownerId that exists and matches the creator's ID.
- Once a Deal is 'closed', it cannot be modified by the owner (only admin).
- Valuation and Financial fields must be strings (formatted as currency usually) and follow size limits.

## 2. The "Dirty Dozen" Payloads (Denial Expected)
1. Creating a user profile with a different UID than `request.auth.uid`.
2. Updating own role to 'admin' via client SDK.
3. Creating a deal with `ownerId` set to another user.
4. Reading a private user profile of another user.
5. Deleting a deal owned by someone else.
6. Updating `createdAt` timestamp on an existing deal.
7. Injecting 1MB string into `deal.title`.
8. Updating a 'closed' deal.
9. Listing all user profiles (blanket read).
10. Creating a deal without being signed in.
11. Updating `isVerified` status of own user profile.
12. Fetching a deal that is 'under-review' by a non-owner/non-admin.

## 3. The Test Runner
(I will implement `firestore.rules` first using the provided patterns)
