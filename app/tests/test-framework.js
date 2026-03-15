/**
 * Kilter App Test Framework
 * Lightweight testing framework for browser-based testing
 */

const testFramework = (function() {
    // Test registry
    const tests = {};
    
    // Results tracking
    let results = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        completed: 0,
        running: false
    };
    
    // Current suite element
    let currentSuiteEl = null;
    
    /**
     * Register a test case
     */
    function register(name, fn) {
        tests[name] = fn;
    }
    
    /**
     * Assert helpers
     */
    const assert = {
        equal: (actual, expected, message) => {
            if (actual !== expected) {
                throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
            }
        },
        
        notEqual: (actual, expected, message) => {
            if (actual === expected) {
                throw new Error(`${message || 'Assertion failed'}: expected not ${expected}`);
            }
        },
        
        true: (value, message) => {
            if (value !== true) {
                throw new Error(message || 'Expected true, got false');
            }
        },
        
        false: (value, message) => {
            if (value !== false) {
                throw new Error(message || 'Expected false, got true');
            }
        },
        
        exists: (value, message) => {
            if (value === null || value === undefined) {
                throw new Error(message || 'Expected value to exist');
            }
        },
        
        notExists: (value, message) => {
            if (value !== null && value !== undefined) {
                throw new Error(message || 'Expected value to not exist');
            }
        },
        
        throws: async (fn, message) => {
            let threw = false;
            try {
                await fn();
            } catch (e) {
                threw = true;
            }
            if (!threw) {
                throw new Error(message || 'Expected function to throw');
            }
        },
        
        contains: (haystack, needle, message) => {
            if (!haystack.includes(needle)) {
                throw new Error(`${message || 'Assertion failed'}: expected "${haystack}" to contain "${needle}"`);
            }
        },
        
        greaterThan: (actual, expected, message) => {
            if (!(actual > expected)) {
                throw new Error(`${message || 'Assertion failed'}: expected ${actual} > ${expected}`);
            }
        },
        
        lessThan: (actual, expected, message) => {
            if (!(actual < expected)) {
                throw new Error(`${message || 'Assertion failed'}: expected ${actual} < ${expected}`);
            }
        }
    };
    
    /**
     * Run a single test
     */
    async function runTest(name, updateCallback, logCallback) {
        const testFn = tests[name];
        if (!testFn) {
            return { status: 'skip', name, message: 'Test not registered' };
        }
        
        const startTime = performance.now();
        
        try {
            await testFn(assert);
            const duration = (performance.now() - startTime).toFixed(0);
            return { status: 'pass', name, duration, message: 'Test passed' };
        } catch (error) {
            const duration = (performance.now() - startTime).toFixed(0);
            return { status: 'fail', name, duration, message: error.message, stack: error.stack };
        }
    }
    
    /**
     * Run a suite of tests
     */
    async function runSuite(suiteName, testNames, updateCallback, logCallback) {
        // Create suite element
        const suiteEl = document.createElement('div');
        suiteEl.className = 'test-suite';
        suiteEl.innerHTML = `
            <div class="suite-header">
                <span class="suite-name">${suiteName}</span>
                <span class="suite-status status-running">Running</span>
            </div>
            <div class="test-list"></div>
        `;
        document.getElementById('test-suites').appendChild(suiteEl);
        currentSuiteEl = suiteEl.querySelector('.test-list');
        
        results.total += testNames.length;
        results.running = true;
        
        let suitePassed = 0;
        let suiteFailed = 0;
        
        for (const testName of testNames) {
            if (logCallback) logCallback(`Running: ${testName}`, 'info');
            
            // Show as running
            const testEl = createTestElement(testName, 'running');
            currentSuiteEl.appendChild(testEl);
            
            // Run the test
            const result = await runTest(testName, updateCallback, logCallback);
            
            // Update element with result
            updateTestElement(testEl, result);
            
            // Update stats
            results.completed++;
            if (result.status === 'pass') {
                results.passed++;
                suitePassed++;
            } else if (result.status === 'fail') {
                results.failed++;
                suiteFailed++;
            } else {
                results.skipped++;
            }
            
            if (updateCallback) updateCallback();
            
            // Small delay between tests for visual feedback
            await new Promise(r => setTimeout(r, 50));
        }
        
        // Update suite status
        const statusEl = suiteEl.querySelector('.suite-status');
        if (suiteFailed > 0) {
            statusEl.className = 'suite-status status-fail';
            statusEl.textContent = `${suiteFailed} Failed`;
        } else {
            statusEl.className = 'suite-status status-pass';
            statusEl.textContent = 'Passed';
        }
        
        results.running = false;
        if (updateCallback) updateCallback();
    }
    
    /**
     * Create a test element
     */
    function createTestElement(name, status) {
        const el = document.createElement('div');
        el.className = 'test-item';
        el.innerHTML = `
            <div class="test-icon icon-${status}">${status === 'running' ? '○' : '○'}</div>
            <div class="test-info">
                <div class="test-name">${name}</div>
                <div class="test-message">Running...</div>
            </div>
            <div class="test-time">-</div>
        `;
        el.onclick = () => el.classList.toggle('expanded');
        return el;
    }
    
    /**
     * Update test element with result
     */
    function updateTestElement(el, result) {
        const iconMap = {
            pass: { icon: '✓', class: 'icon-pass' },
            fail: { icon: '✗', class: 'icon-fail' },
            skip: { icon: '○', class: 'icon-skip' }
        };
        
        const iconEl = el.querySelector('.test-icon');
        iconEl.className = `test-icon ${iconMap[result.status].class}`;
        iconEl.textContent = iconMap[result.status].icon;
        
        el.querySelector('.test-message').textContent = result.message;
        el.querySelector('.test-time').textContent = `${result.duration}ms`;
        
        // Add detail section if failed
        if (result.status === 'fail' && result.stack) {
            const detailEl = document.createElement('div');
            detailEl.className = 'test-detail';
            detailEl.textContent = result.stack;
            el.after(detailEl);
        }
    }
    
    /**
     * Get current results
     */
    function getResults() {
        return { ...results };
    }
    
    /**
     * Reset all results
     */
    function reset() {
        results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            completed: 0,
            running: false
        };
        currentSuiteEl = null;
    }
    
    // Public API
    return {
        register,
        runSuite,
        getResults,
        reset,
        tests
    };
})();
