# Kilter App Test Suite

Automated test suite for the Kilterboard Logbook app. Run these tests after any code changes to ensure existing functionality is not broken.

## Quick Start

### Run Tests in Browser

1. Open `run-tests.html` in your browser:
   ```bash
   start app/tests/run-tests.html
   # or on Mac
   open app/tests/run-tests.html
   ```

2. Click **"Run All Tests"** to run the full test suite

3. Or click **"Quick Tests"** to run only critical path tests

### Test Results

- ✅ **Passed**: Test completed successfully
- ❌ **Failed**: Test failed - click to see details
- ○ **Skipped**: Test not implemented or skipped
- 🔄 **Running**: Test is currently executing

## Test Structure

### Test Suites

1. **Core Functionality**: Database cache, IndexedDB operations, init flow
2. **UI Components**: Screen toggles, modals, filter panels
3. **Data Processing**: Grade conversion, date formatting, filtering

### Test Files

| File | Description |
|------|-------------|
| `run-tests.html` | Main test runner UI |
| `test-framework.js` | Lightweight testing framework |
| `test-cases.js` | All test cases |
| `test-cache-load.html` | Interactive cache behavior demo |

## Adding New Tests

1. Open `test-cases.js`
2. Register a new test:
   ```javascript
   testFramework.register('my_new_test', async (assert) => {
       // Test code here
       assert.equal(actual, expected, 'Error message');
   });
   ```

3. Add test to a suite in `run-tests.html`:
   ```javascript
   await testFramework.runSuite('My Suite', [
       'my_new_test',
       'other_test'
   ], updateStats, log);
   ```

## Available Assertions

```javascript
assert.equal(actual, expected, message)     // Strict equality
assert.notEqual(actual, expected, message)  // Not equal
assert.true(value, message)                 // Is true
assert.false(value, message)                // Is false
assert.exists(value, message)               // Not null/undefined
assert.notExists(value, message)            // Is null/undefined
assert.throws(fn, message)                  // Function throws
assert.contains(haystack, needle, message)  // String contains
assert.greaterThan(a, b, message)           // a > b
assert.lessThan(a, b, message)              // a < b
```

## CI/CD Integration

For automated testing in CI/CD, you can use a headless browser:

```bash
# Using Playwright
npx playwright test tests/

# Using Puppeteer
node run-headless-tests.js
```

## Manual Testing Checklist

If automated tests pass, also verify these manually:

- [ ] File picker opens and loads database
- [ ] Cache loads on refresh (no file picker shown)
- [ ] Filter panel slides in/out smoothly
- [ ] Record cards show correct data
- [ ] Modal opens with correct climb details
- [ ] Grade slider works in filter panel
- [ ] Charts render in statistics page
- [ ] SQL query executes without errors

## Common Issues

### Tests failing after code changes?

1. Check the console output for specific error messages
2. Click on failed test to see stack trace
3. Verify DOM element IDs match between app and tests
4. Check if async operations have proper timeouts

### IndexedDB tests failing?

- Browser privacy mode may block IndexedDB
- Clear site data and try again
- Check browser console for IndexedDB errors

## Development Workflow

1. Make code changes
2. Run tests: `start app/tests/run-tests.html`
3. Fix any failing tests
4. Manual smoke test in main app
5. Commit changes

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support
