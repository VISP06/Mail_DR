# Firestore Security Specification

## Data Invariants
1. **User Isolation**: All application data is sub-resourced under `/users/{userId}/`. A user may never read, create, update, or delete data under another user's namespace.
2. **Immutable Ownership**: The `userId` field on all sub-documents and profile documents must strictly match `request.auth.uid` on `create` and cannot be modified on `update`.
3. **Temporal Integrity**: `createdAt`, `updatedAt`, and `date` timestamps must align with server request timestamps (`request.time`).
4. **Volumetric & Schema Guards**:
   - `id` values in path variables and documents must not exceed 128 characters and must match `^[a-zA-Z0-9_\-]+$`.
   - String fields must adhere to strict `maxLength` boundaries (`name` <= 48, `description` <= 256, `color` 7-character hex).
   - Array fields (such as `protectedSenders`, `blockedSenders`, `emailIds`) must be bounded (`size() <= 500`) to prevent denial-of-wallet resource attacks.
5. **Verified Users**: Non-anonymous write operations require `request.auth.token.email_verified == true`.
6. **No Client Query Reliance**: Collection queries must be bounded to the authenticated owner's `userId`.

## The "Dirty Dozen" Payloads (Deny Matrix)
1. **Ghost Field Injection (Shadow Update)**: User profile update including unauthorized admin or billing flag `{ "isAdmin": true }`. Expected: `PERMISSION_DENIED`.
2. **User Identity Spoofing**: User `user_A` writing a category with `userId: "user_B"`. Expected: `PERMISSION_DENIED`.
3. **Path Traversal / Cross-User Poisoning**: User `user_A` attempting to write to `/users/user_B/categories/cat_1`. Expected: `PERMISSION_DENIED`.
4. **Denial-of-Wallet ID Flooding**: Creating a category with a 2KB junk character document ID. Expected: `PERMISSION_DENIED`.
5. **Overlong String Injection**: Category name exceeding 48 characters or description exceeding 256 characters. Expected: `PERMISSION_DENIED`.
6. **Invalid Hex Color**: Category color with invalid string (e.g., `red` or `#12345678`). Expected: `PERMISSION_DENIED`.
7. **Invalid Priority Enum**: Priority rule with `priority: "Urgent"`. Expected: `PERMISSION_DENIED`.
8. **Unbounded Array Flood**: `emailIds` or `protectedSenders` list containing > 500 items. Expected: `PERMISSION_DENIED`.
9. **Tampered Creation Timestamp**: Payload supplying client-crafted `createdAt` far in the future or past instead of `request.time`. Expected: `PERMISSION_DENIED`.
10. **Unauthenticated Read**: Attempting to read another user's `/users/{userId}` document without authentication. Expected: `PERMISSION_DENIED`.
11. **Unverified Email Modification**: Unverified email account attempting write mutations. Expected: `PERMISSION_DENIED`.
12. **Blanket Query Scraping**: Attempting an unrestricted collectionGroup query or query across `/users`. Expected: `PERMISSION_DENIED`.
