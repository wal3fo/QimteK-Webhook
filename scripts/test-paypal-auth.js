import 'dotenv/config';
// Native fetch is available in Node.js 18+

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID?.replace(/^"|"$/g, '').trim();
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET?.replace(/^"|"$/g, '').trim();

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error('❌ Missing PayPal credentials in .env');
    process.exit(1);
}

async function testAuth(envName, url) {
    console.log(`\nTesting ${envName} (${url})...`);
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    try {
        const response = await fetch(`${url}/v1/oauth2/token`, {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.ok) {
            console.log(`✅ SUCCESS: Credentials are valid for ${envName}!`);
            return true;
        } else {
            const text = await response.text();
            console.log(`❌ FAILED: ${response.status} - ${text}`);
            return false;
        }
    } catch (err) {
        console.error(`❌ ERROR: ${err.message}`);
        return false;
    }
}

async function run() {
    console.log('🔍 Diagnosing PayPal Credentials...');
    console.log(`Client ID: ${PAYPAL_CLIENT_ID.substring(0, 10)}...`);

    const isSandbox = await testAuth('SANDBOX', 'https://api-m.sandbox.paypal.com');
    const isLive = await testAuth('LIVE', 'https://api-m.paypal.com');

    console.log('\n---------------------------------------------------');
    if (isSandbox) {
        console.log('✅ CONCLUSION: These are SANDBOX credentials.');
        console.log('   Ensure NODE_ENV=development in your .env file.');
    } else if (isLive) {
        console.log('✅ CONCLUSION: These are LIVE (Production) credentials.');
        console.log('   You must set NODE_ENV=production in your .env file.');
    } else {
        console.log('❌ CONCLUSION: These credentials failed in BOTH environments.');
        console.log('   Please check if they are copied correctly from the PayPal Dashboard.');
    }
    console.log('---------------------------------------------------');
}

run();
