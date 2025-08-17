# UserTokenData Interface Changes

## Summary of Changes

The `UserTokenData` interface has been updated to change the field name from `username` to `userurn` and remove the `email` parameter.

### Interface Changes

**Before:**
```typescript
export interface UserTokenData {
    sub: string;
    username: string;
    email?: string;
    roles?: string[];
}
```

**After:**
```typescript
export interface UserTokenData {
    sub: string;
    userurn: string;
    roles?: string[];
}
```

### Files Updated

1. **`service/jwt.service.ts`**
   - Updated `UserTokenData` interface definition
   - Modified `generateToken` method to use `userurn` instead of `username`
   - Removed `email` from JWT payload generation

2. **`strategy/jwt.strategy.ts`**
   - Updated `JwtPayload` interface to remove `email` field
   - Modified `validate` method to remove email from returned payload

3. **`examples/auth-example.controller.ts`**
   - Updated example usage to use `userurn` instead of `username`
   - Removed `email` from example token data

4. **`tests/jwt.service.spec.ts`**
   - Updated all test cases to use `userurn` instead of `username`
   - Removed `email` from test data and assertions
   - Updated expectations to match new interface

5. **`README.md`**
   - Updated documentation examples to reflect the new interface
   - Modified JwtPayload interface documentation
   - Updated example usage in test code

### Key Points

- The JWT payload still contains a `username` field internally, but this now maps to the `userurn` value from `UserTokenData`
- All existing functionality is preserved, only the interface field names have changed
- The `email` field has been completely removed from both interfaces and all related code
- All tests pass and the project builds successfully

### Migration Notes

If you have existing code that uses the old interface, you'll need to:

1. Change `username` to `userurn` when creating `UserTokenData` objects
2. Remove any `email` properties from `UserTokenData` objects
3. Update any code that expects an `email` field in JWT payloads

The internal JWT token structure remains the same for backward compatibility, with the `username` field in the JWT payload now containing the value from the `userurn` field.
