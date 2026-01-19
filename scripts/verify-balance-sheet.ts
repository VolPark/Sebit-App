
// Script to simulate Balance Sheet aggregation logic and verify Netto VAT calculation

async function main() {
    console.log('--- Verification: Netto VAT Logic ---');

    console.log('Test Case Data (User Provided):');
    // Actual data from user
    // Aktiva (343001) [MD]: 4890.39
    // Pasiva (343003) [D]: 56378.00

    // In our logic (where net = md - d):
    // 343001: md=4890.39, d=0 => net = 4890.39
    // 343003: md=0, d=56378.00 => net = -56378.00

    const balancesStub: Record<string, number> = {
        '343001': 4890.39,
        '343003': -56378.00
    };

    console.log('Balances Stub:', balancesStub);

    let vatSum = 0;

    // Simulate the loop logic
    Object.keys(balancesStub).forEach(account => {
        const net = balancesStub[account];
        if (account.startsWith('343')) {
            console.log(`Processing ${account}: net ${net}`);
            vatSum += net;
        }
    });

    console.log(`\nAggregated vatSum (MD - D): ${vatSum.toFixed(2)}`);

    const result = {
        assets: 0,
        liabilities: 0,
        placement: ''
    };

    if (Math.abs(vatSum) > 0.01) {
        if (vatSum > 0) {
            console.log('Logic: vatSum > 0 -> Placed in Assets Group C');
            result.assets = vatSum;
            result.placement = 'Assets C';
        } else {
            console.log('Logic: vatSum < 0 -> Placed in Liabilities Group B_C');
            result.liabilities = -vatSum; // Positive magnitude
            result.placement = 'Liabilities B_C';
        }
    }

    console.log('\n--- Result ---');
    console.log(`Assets (DPH): ${result.assets.toFixed(2)}`);
    console.log(`Liabilities (DPH): ${result.liabilities.toFixed(2)}`);
    console.log(`Placement: ${result.placement}`);

    // Verification
    const expectedLiability = 51487.61;
    const diff = Math.abs(result.liabilities - expectedLiability);

    if (diff < 0.02) {
        console.log('\n[SUCCESS] Result matches user expectation.');
    } else {
        console.log(`\n[FAIL] Expected ${expectedLiability}, got ${result.liabilities}`);
    }

}

main();
