# MongoDB to Supabase User Authentication Migration

## Overview
This document describes the migration of user authentication from MongoDB to Supabase for the disruptive-product-database project.

## Migration Date
June 13, 2026

## What Was Migrated
All user authentication operations have been migrated from MongoDB to Supabase:
- User login
- User logout
- User profile updates
- User lookups by ID
- IT access verification
- User reference resolution in SPF requests

## Files Changed

### Core Supabase Integration
- **lib/supabase-admin.ts**
  - Added `validateUser()` function for password validation using bcryptjs
  - Added error handling to all Supabase functions
  - Functions: `getUserById()`, `getUserByEmail()`, `updateUser()`, `updateUserByEmail()`, `getUsersByIds()`

### Authentication APIs
- **pages/api/login.ts**
  - Removed MongoDB imports (`connectToDatabase`, `ObjectId`)
  - Replaced MongoDB user lookup with `getUserByEmail()`
  - Replaced MongoDB password validation with `validateUser()`
  - Replaced MongoDB update operations with `updateUserByEmail()`
  - Added try-catch block for error handling

- **pages/api/logout.ts**
  - No changes needed (only clears session cookie)

- **pages/api/me.ts**
  - Already using Supabase (`getUserById()`)

### User Management APIs
- **pages/api/api-keys.ts**
  - Replaced MongoDB `verifyITAccess()` with Supabase `getUserById()`
  - Removed MongoDB imports

- **pages/api/profile-update.ts**
  - Replaced MongoDB `updateOne()` with Supabase `updateUser()`
  - Removed MongoDB imports

- **pages/api/get-users-by-ids.ts**
  - Replaced MongoDB `find()` with Supabase `getUsersByIds()`
  - Removed MongoDB imports

### SPF Request APIs
- **pages/api/request/spf-request-create-api.ts**
  - Replaced MongoDB user lookup with `getUserById()` for resolving ReferenceID

- **pages/api/request/spf-request-edit-api.ts**
  - Replaced MongoDB user lookup with `getUserById()` for resolving ReferenceID

- **pages/api/request/spf-request-save-draft-api.ts**
  - Replaced MongoDB user lookup with `getUserById()` for resolving ReferenceID

## Environment Variables Required

Add the following to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Important Notes
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: The service role key from Supabase (NOT the anon key)
  - Get this from: Supabase Dashboard → Project Settings → API
  - This key has admin privileges and bypasses Row Level Security
  - Never share this key publicly

## Supabase Users Table Schema

The Supabase `users` table should have the following structure:

```typescript
{
  id: number;                    // Auto-incrementing ID
  UserId: string;                // User ID (formerly MongoDB _id)
  ReferenceID: string;           // Reference ID (e.g., "AE-NCR-749180")
  Firstname: string;
  Lastname: string;
  Email: string;
  userName: string | null;
  Password: string;              // Bcrypt hash
  Role: string;
  Position: string;
  Department: string;
  Location: string;
  Company: string;
  Status: string;                // "Active", "Locked", "Resigned", "Terminated"
  LoginAttempts: number;
  LockUntil: string | null;      // ISO date string or null
  createdAt: string;
  updatedAt: string;
  // ... other fields
}
```

## Password Hashing

- **Library**: bcryptjs (for better Node.js compatibility)
- **Salt Rounds**: 10
- **Hash Format**: `$2b$10$...`

Password hashing is handled by the IT Portal during account creation. The login system validates passwords using `bcrypt.compare()`.

## Login Flow

1. User submits email and password to `/api/login`
2. API fetches user by email from Supabase using `getUserByEmail()`
3. Validates user status (not Resigned/Terminated)
4. Validates department (Engineering or IT only)
5. Checks account lock status
6. Validates password using `bcrypt.compare()`
7. On success: resets login attempts, sets session cookie with `UserId`
8. On failure: increments login attempts, locks account after 3 failed attempts

## Session Management

- **Cookie Name**: `session`
- **Cookie Value**: User's `UserId` from Supabase
- **Duration**: 24 hours
- **HttpOnly**: true
- **Secure**: true (production)
- **SameSite**: strict

## Account Lockout

- **Threshold**: 3 failed login attempts
- **Lock Duration**: 50 years (effectively permanent until reset)
- **Reset**: Successful login or manual reset by admin

## Master Password

The `IT_MASTER_PASSWORD` environment variable can be used to bypass password validation for emergency access. This password skips the `validateUser()` check but still requires a valid user account.

## Testing

To test the migration:

1. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
2. Restart the dev server
3. Try logging in with a valid user account
4. Check server console for detailed logging:
   - Supabase connection status
   - User lookup results
   - Password comparison results

## Troubleshooting

### 500 Internal Server Error on Login
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Check server console for specific error messages
- Verify Supabase URL is correct

### "Invalid Credentials" Error
- Verify user exists in Supabase users table
- Check that email matches exactly
- Verify password hash is in correct format (`$2b$10$...`)
- Check server console for password comparison logs

### 401 Unauthorized on `/api/me`
- This is expected if login failed (no session cookie set)
- Fix the login issue first

## Dependencies

The following packages are required:
- `@supabase/supabase-js`: ^2.98.0
- `bcryptjs`: ^3.0.3
- `cookie`: ^1.1.1

## MongoDB Legacy

The `lib/mongodb.ts` file still exists but is no longer used for user authentication. It may be used for other non-auth purposes in the application.

## Rollback Plan

If needed, to rollback to MongoDB:
1. Restore original MongoDB imports in all changed files
2. Revert to using `connectToDatabase()` and MongoDB collection operations
3. Remove Supabase-specific code
4. Ensure MongoDB connection is working

## Support

For issues related to this migration, check:
1. Server console logs for detailed error messages
2. Supabase dashboard for connection issues
3. Environment variable configuration
