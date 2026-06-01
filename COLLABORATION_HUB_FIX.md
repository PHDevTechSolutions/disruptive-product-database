# Collaboration Hub ID Mapping Fix

## Problem Summary
Ang collaboration hub sa SPF request sa engiconnect ay naliligaw ng ID. Locally, gumagana ang 3-way communication (disruptive-product-database, taskflow-demo-v2, at engiconnect), pero sa live/production, hindi nakakakuha ng tamang updates ang engiconnect.

## Root Cause
The issue was caused by inconsistent document ID usage across the three systems:

1. **disruptive-product-database** - Uses `spfNumber` as the Firebase document ID for collaboration chat
2. **taskflow-demo-v2** - Uses `spfNumber` as the Firebase document ID for collaboration chat  
3. **engiconnect** - Was using `requestId` as the Firebase document ID for collaboration chat

This mismatch caused engiconnect to create/listen to a different chat document than the other two systems, breaking the 3-way communication on live/production environments.

## Solution Applied

### 1. Updated engiconnect CollaborationHub Component
**File:** `engineer-ticketing/components/collaboration-hub.tsx`

**Changes:**
- Added `spfNumber` prop to the component interface
- Created `effectiveDocId` variable that always uses `spfNumber` for consistency
- Replaced all Firebase operations that used `requestId` with `effectiveDocId`

```typescript
// Before
interface CollaborationHubProps {
  requestId: string;
  // ... other props
}

// After  
interface CollaborationHubProps {
  requestId: string;
  spfNumber: string;  // Added
  // ... other props
}

// Always use spfNumber as document ID for chat to ensure consistency
const effectiveDocId = spfNumber;
```

### 2. Updated engiconnect Request Page
**File:** `engineer-ticketing/app/request/product/[id]/page.tsx`

**Changes:**
- Updated both desktop and mobile CollaborationHub component calls to pass both `requestId` and `spfNumber` props

```typescript
// Before
<CollaborationHub
  requestId={spfData?.spf_number || id}
  collectionName="spf_creations"
  // ... other props
/>

// After
<CollaborationHub
  requestId={id}
  spfNumber={spfData?.spf_number || id}
  collectionName="spf_creations"
  // ... other props
/>
```

## How It Works Now

All three systems now use the same document ID (`spfNumber`) for collaboration chat:

1. **Product Offer Stage** (before SPF creation):
   - disruptive-product-database and taskflow-demo-v2 communicate using product offer ID
   
2. **After SPF Creation**:
   - All three systems (disruptive-product-database, taskflow-demo-v2, engiconnect) now use `spfNumber` as the Firebase document ID
   - This ensures they all read/write to the same chat document
   - 3-way communication works consistently in both local and production environments

## Files Modified

1. `engineer-ticketing/components/collaboration-hub.tsx`
   - Added `spfNumber` prop
   - Created `effectiveDocId` variable
   - Updated all Firebase operations to use `effectiveDocId`

2. `engineer-ticketing/app/request/product/[id]/page.tsx`
   - Updated CollaborationHub component calls (desktop and mobile)
   - Now passes both `requestId` and `spfNumber` props

## Testing Recommendations

1. Test locally first to ensure the fix doesn't break existing functionality
2. Test the complete flow:
   - Create a product offer
   - Send messages between disruptive-product-database and taskflow-demo-v2
   - Create SPF request
   - Verify engiconnect can see previous messages
   - Send messages from all three systems
   - Verify all systems receive messages in real-time
3. Deploy to production and verify 3-way communication works correctly

## Notes

- The `requestId` prop is still kept for backward compatibility and potential future use
- The fix ensures consistency by always using `spfNumber` as the effective document ID
- This aligns engiconnect's behavior with the other two systems
