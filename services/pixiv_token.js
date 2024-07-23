const puppeteer = require('puppeteer');
const axios = require('axios');
const crypto = require('crypto');
const base64url = require('base64url');

const USER_AGENT = "PixivIOSApp/7.13.3 (iOS 14.6; iPhone13,2)";
const REDIRECT_URI = "https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback";
const LOGIN_URL = "https://app-api.pixiv.net/web/v1/login";
const AUTH_TOKEN_URL = "https://oauth.secure.pixiv.net/auth/token";
const CLIENT_ID = "MOBrBDS8blbauoSck0ZfDbtuzpyT";
const CLIENT_SECRET = "lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj";

function s256(buffer) {
    return base64url(crypto.createHash('sha256').update(buffer).digest());
}

function oauth_pkce() {
    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = s256(Buffer.from(codeVerifier));
    return { codeVerifier, codeChallenge };
}

async function login() {
    const { codeVerifier, codeChallenge } = oauth_pkce();
    const loginParams = {
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        client: "pixiv-android",
    };

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(`${LOGIN_URL}?${new URLSearchParams(loginParams).toString()}`);

    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    let code = null;
    client.on('Network.requestWillBeSent', (params) => {
        if (params.request.url.startsWith('pixiv://')) {
            const url = new URL(params.request.url);
            code = url.searchParams.get('code');
        }
    });

    // Wait for the login redirection
    while (true) {
        const currentUrl = await page.url();
        if (currentUrl.startsWith("https://accounts.pixiv.net/post-redirect")) {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Allow time for the network event to be captured
    await new Promise(resolve => setTimeout(resolve, 1000));

    await browser.close();

    if (code) {
        console.log("[INFO] Get code:", code);
        try {
            const response = await axios.post(AUTH_TOKEN_URL, new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                code_verifier: codeVerifier,
                grant_type: "authorization_code",
                include_policy: "true",
                redirect_uri: REDIRECT_URI,
            }).toString(), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "user-agent": USER_AGENT,
                    "app-os-version": "14.6",
                    "app-os": "ios",
                },
            });

            const data = response.data;
            console.log("access_token:", data.access_token);
            console.log("refresh_token:", data.refresh_token);
            console.log("expires_in:", data.expires_in);
        } catch (error) {
            console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
        }
    } else {
        console.error("Error: Authorization code not found.");
    }
}

async function refresh(refreshToken) {
    try {
        const response = await axios.post(AUTH_TOKEN_URL, new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: "refresh_token",
            include_policy: "true",
            refresh_token: refreshToken,
        }).toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "user-agent": USER_AGENT,
                "app-os-version": "14.6",
                "app-os": "ios",
            },
        });

        const data = response.data;
        console.log("access_token:", data.access_token);
        console.log("refresh_token:", data.refresh_token);
        console.log("expires_in:", data.expires_in);
    } catch (error) {
        console.error('Error refreshing token:', error.response ? error.response.data : error.message);
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: node script.js login|refresh [refresh_token]');
        return;
    }

    const command = args[0];
    if (command === 'login') {
        await login();
    } else if (command === 'refresh' && args.length > 1) {
        const refreshToken = args[1];
        await refresh(refreshToken);
    } else {
        console.log('Invalid arguments');
    }
}

main();
