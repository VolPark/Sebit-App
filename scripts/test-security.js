/**
 * Security Test Script
 * 
 * This script tests that:
 * 1. Unprotected endpoints now return 401 for unauthenticated requests
 * 2. Endpoints work properly when authenticated
 * 
 * Usage: node scripts/test-security.js
 */

const BASE_URL = 'http://localhost:3000';

// List of endpoints to test
const endpoints = [
    // GET endpoints
    { method: 'GET', path: '/api/accounting/analytics', name: 'Analytics' },
    { method: 'GET', path: '/api/accounting/analytics/burn-rate', name: 'Burn Rate' },
    { method: 'GET', path: '/api/accounting/analytics/vat', name: 'VAT' },
    { method: 'GET', path: '/api/aml/sanctions/sync', name: 'AML Sanctions Sync (GET)' },
    { method: 'GET', path: '/api/debug-tax-date', name: 'Debug Tax Date' },

    // POST endpoints (need body)
    { method: 'POST', path: '/api/chat', name: 'Chat', body: { messages: [] } },
    { method: 'POST', path: '/api/accounting/sync/journal', name: 'Journal Sync', body: {} },
    { method: 'POST', path: '/api/accounting/sync-currency', name: 'Sync Currency', body: { docId: 1 } },
    { method: 'POST', path: '/api/accounting/settings/accounts/rename', name: 'Account Rename', body: { code: 'test', name: 'Test' } },
    { method: 'POST', path: '/api/accounting/bank-accounts/update', name: 'Bank Account Update', body: { bank_account_id: 'test' } },
];

async function testUnprotected() {
    console.log('\\n=== Testing UNAUTHENTICATED Requests (should return 401/403/404) ===\\n');

    let passed = 0;
    let failed = 0;

    for (const endpoint of endpoints) {
        try {
            const options = {
                method: endpoint.method,
                headers: { 'Content-Type': 'application/json' },
            };

            if (endpoint.body) {
                options.body = JSON.stringify(endpoint.body);
            }

            const response = await fetch(`${BASE_URL}${endpoint.path}`, options);

            // Expected: 401 (Unauthorized), 403 (Forbidden for disabled features), or 404 (debug endpoint)
            const isProtected = response.status === 401 || response.status === 403 || response.status === 404;

            if (isProtected) {
                console.log(`✅ ${endpoint.name}: ${response.status} (Protected)`);
                passed++;
            } else {
                console.log(`❌ ${endpoint.name}: ${response.status} (VULNERABLE - expected 401/403/404)`);
                failed++;
            }
        } catch (error) {
            console.log(`⚠️  ${endpoint.name}: Connection error - ${error.message}`);
            failed++;
        }
    }

    console.log(`\\n📊 Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
}

async function testAuthenticated(authToken) {
    console.log('\\n=== Testing AUTHENTICATED Requests (should succeed or return valid errors) ===\\n');

    // For authenticated tests, we only test GET endpoints as POST modifications would affect data
    const safeEndpoints = endpoints.filter(e => e.method === 'GET' && !e.path.includes('debug'));

    let passed = 0;
    let failed = 0;

    for (const endpoint of safeEndpoints) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint.path}`, {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
            });

            // Expected: 200, 400 (for disabled modules like AML), or other non-401 codes
            const isAuthenticated = response.status !== 401;

            if (isAuthenticated) {
                console.log(`✅ ${endpoint.name}: ${response.status} (Authenticated)`);
                passed++;
            } else {
                console.log(`❌ ${endpoint.name}: ${response.status} (Still unauthorized)`);
                failed++;
            }
        } catch (error) {
            console.log(`⚠️  ${endpoint.name}: Connection error - ${error.message}`);
            failed++;
        }
    }

    console.log(`\\n📊 Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
}

async function main() {
    console.log('🔒 Security Test Script');
    console.log('========================');
    console.log(`Testing against: ${BASE_URL}`);

    // Test 1: Unauthenticated requests
    const unauthResult = await testUnprotected();

    // Test 2: If AUTH_TOKEN env var is provided, test authenticated requests
    const authToken = process.env.AUTH_TOKEN;
    if (authToken) {
        console.log('\\n🔑 AUTH_TOKEN provided, testing authenticated requests...');
        await testAuthenticated(authToken);
    } else {
        console.log('\\n💡 Tip: Set AUTH_TOKEN env var to test authenticated requests');
        console.log('   Example: AUTH_TOKEN=your_supabase_access_token node scripts/test-security.js');
    }

    console.log('\\n✨ Testing complete!');

    if (!unauthResult) {
        process.exit(1);
    }
}

main().catch(console.error);
