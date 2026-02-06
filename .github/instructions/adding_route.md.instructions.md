# Checklist for Adding a New Route

## Core Handler & Logic
- [ ] Create handler file in `src/handlers/` (e.g., `delete_game.ts`)
  - Import required dependencies (StatusCodes, MongoClient, Env, shared utilities)
  - Create database operation function
  - Create handler function with proper signature: `(req: Request, env: Env, origin: string | null, getCorsHeaders: (...) => HeadersInit)`
  - Add parameter validation
  - Implement try-catch with proper error handling
  - Return JSON responses with appropriate status codes and CORS headers

## Tests
- [ ] Create test file in `src/tests/` (e.g., `delete_game.test.ts`)
  - Mock MongoDB utilities
  - Define getCorsHeaders and mockEnv
  - Add parameter validation tests
  - Add successful request tests
  - Add CORS header tests
  - Add error handling tests
  - Add edge case tests

## Validators (if needed)
- [ ] Add validation function to `src/shared/validators.ts` (e.g., `validateGameParameters`)
- [ ] Add validator tests to `src/tests/validators.test.ts`
- [ ] Export validator from `src/shared/index.ts`

## Routing
- [ ] Export handler from `src/handlers/index.ts`
- [ ] Import handler in `src/router.ts`
- [ ] Add route handler in `src/router.ts` with proper method and path
- [ ] Update CORS methods in `getCorsHeaders` if using new HTTP method
- [ ] Update router tests in `src/tests/router.test.ts` (especially CORS tests)

## Scripts (optional)
- [ ] Create script file in `scripts/` (e.g., `delete-game.ts`)
  - Add argument parsing
  - Add safety confirmations for destructive operations
  - Include error handling and connection cleanup
- [ ] Add script to `package.json` scripts section
- [ ] Load environment variables with dotenv if needed

## Verification
- [ ] Run `npm test` - all tests passing
- [ ] Run `npm run lint` - no linting errors
- [ ] Test manually with script or API client
- [ ] Verify CORS headers work correctly
