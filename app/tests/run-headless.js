#!/usr/bin/env node
/**
 * Headless Test Runner for CI/CD
 * Uses Playwright to run tests in headless browser
 */

const { chromium } = require('playwright');
const path = require('path');

async function runTests() {
    console.log('🧪 Starting Kilter App Test Suite...\n');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Load test page
    const testUrl = `file://${path.resolve(__dirname, 'run-tests.html')}`;
    await page.goto(testUrl);
    
    // Wait for page to load
    await page.waitForSelector('#test-suites');
    
    // Run all tests
    await page.click('text=Run All Tests');
    
    // Wait for tests to complete (with timeout)
    const maxWait = 60000; // 60 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
        const status = await page.evaluate(() => {
            const statusEl = document.getElementById('overall-status');
            return statusEl ? statusEl.textContent : '';
        });
        
        // Check if tests completed
        if (status === '✅' || status === '❌') {
            break;
        }
        
        await new Promise(r => setTimeout(r, 500));
    }
    
    // Get results
    const results = await page.evaluate(() => {
        const total = document.getElementById('total-count').textContent;
        const passed = document.getElementById('pass-count').textContent;
        const failed = document.getElementById('fail-count').textContent;
        const skipped = document.getElementById('skip-count').textContent;
        
        // Get console output
        const consoleLines = Array.from(document.querySelectorAll('.console-line'))
            .map(el => el.textContent);
        
        return { total, passed, failed, skipped, consoleLines };
    });
    
    await browser.close();
    
    // Print results
    console.log('Test Results:');
    console.log('='.repeat(40));
    console.log(`Total:   ${results.total}`);
    console.log(`Passed:  ${results.passed} ✅`);
    console.log(`Failed:  ${results.failed} ❌`);
    console.log(`Skipped: ${results.skipped} ○`);
    console.log('='.repeat(40));
    
    // Print console output
    console.log('\nConsole Output:');
    console.log('-'.repeat(40));
    results.consoleLines.forEach(line => console.log(line));
    
    // Exit with appropriate code
    const failedCount = parseInt(results.failed);
    if (failedCount > 0) {
        console.log('\n❌ Tests failed');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed');
        process.exit(0);
    }
}

// Check if Playwright is installed
try {
    require('playwright');
} catch (e) {
    console.error('Playwright not installed. Installing...');
    console.error('Run: npm install --save-dev playwright');
    process.exit(1);
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
