/**
 * QZ Tray Signed Connection Utility
 *
 * Sets up the digital certificate + RSA private key signature so QZ Tray
 * silently trusts the connection without showing the "Allow/Block" popup.
 *
 * Call `initQZSecurity()` ONCE before any `qz.websocket.connect()` call.
 * It is safe to call multiple times — it checks if already configured.
 */

import qz from "qz-tray";

// ─── Nexova Digital Certificate (issued by Nexova IT Solutions) ───────────────
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIEVTCCAz2gAwIBAgIUc+V1BOb+VcafH4ovPDfhmOD2nicwDQYJKoZIhvcNAQEL
BQAwgbkxCzAJBgNVBAYTAlNMMRkwFwYDVQQIDBBXZXN0ZXJuIFByb3ZpbmNlMRAw
DgYDVQQHDAdDb2xvbWJvMR8wHQYDVQQKDBZOZXhvdmEgUHJpdmF0ZSBMaW1pdGVk
MRMwEQYDVQQLDApUZWNobm9sb2d5MRwwGgYDVQQDDBNOZXhvdmEgSVQgU29sdXRp
b25zMSkwJwYJKoZIhvcNAQkBFhppbmZvQG5leG92YWl0c29sdXRpb25zLmNvbTAe
Fw0yNjA3MTMxNDM2MThaFw0yNzA3MTMxNDM2MThaMIG5MQswCQYDVQQGEwJTTDEZ
MBcGA1UECAwQV2VzdGVybiBQcm92aW5jZTEQMA4GA1UEBwwHQ29sb21ibzEfMB0G
A1UECgwWTmV4b3ZhIFByaXZhdGUgTGltaXRlZDETMBEGA1UECwwKVGVjaG5vbG9n
eTEcMBoGA1UEAwwTTmV4b3ZhIElUIFNvbHV0aW9uczEpMCcGCSqGSIb3DQEJARYa
aW5mb0BuZXhvdmFpdHNvbHV0aW9ucy5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQClPrV/2FSh5l4EeedwcMLmRO4B2B2u+utYYRLWrzlTbq6xVqWb
+Tny/MFyqMJseDCNww/0VKOf3NaBWnoinafDZHGuIy3l8xr2PjXll2AnlWZ4Mo18
K2iHcPoLkP/Kks/7QfuCnDLHAclQFkYSRmJTFClVF4aoasXsAoW8ug9/UO39SQNV
HoWBe8qtorBfhU51iH6JTa1zIKiwdZuVeDNXGg+DXK4w7ma+e1s5vESN1pMiDzNy
BP0AX4Lm+RHujzaS/N2L6gusvCZb9BpvZXvZdPCaEyCSyOIM7szIUlkXmkx6x7kP
NzIcuxPhxgbrdnnNYRWLNrbNhsuOfvH+HvfrAgMBAAGjUzBRMB0GA1UdDgQWBBTa
c3DLARTZ9STCZ3BU/CZxIVrQXjAfBgNVHSMEGDAWgBTac3DLARTZ9STCZ3BU/CZx
IVrQXjAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQA1YxXfR8yk
QTZlEQAsO3SjoQq0h6CFHoXxHUSrIBS8XJXHmM3rQmdkfHmcTO5RBRUgw/N5txs8
8r3x9hoUA+Xl1tRtQfG25djwNsiy9jXYh9nTaltGGLjJbaEu/xujbOVGx+QmmlTd
o2wvG67hnsDOZejG1oktROoXhlMmshsH7NoLz+f/9gr8jI1hWbzdYwosVvkU0UvS
HTnlQCC+wXQgqrnAdDsn4xQRlaYPZDrFUiMgftf5ea0NWV8J3mRdh4fx3gjb052Z
P+N4KEVA6+/KD//l4cscipVYWEva+vFzjD3vgB76qREueodaSDMUeHOgh6cx84AR
jEP0TYhD94xl
-----END CERTIFICATE-----`;

// ─── RSA Private Key (used to sign each QZ Tray challenge) ───────────────────
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQClPrV/2FSh5l4E
eedwcMLmRO4B2B2u+utYYRLWrzlTbq6xVqWb+Tny/MFyqMJseDCNww/0VKOf3NaB
WnoinafDZHGuIy3l8xr2PjXll2AnlWZ4Mo18K2iHcPoLkP/Kks/7QfuCnDLHAclQ
FkYSRmJTFClVF4aoasXsAoW8ug9/UO39SQNVHoWBe8qtorBfhU51iH6JTa1zIKiw
dZuVeDNXGg+DXK4w7ma+e1s5vESN1pMiDzNyBP0AX4Lm+RHujzaS/N2L6gusvCZb
9BpvZXvZdPCaEyCSyOIM7szIUlkXmkx6x7kPNzIcuxPhxgbrdnnNYRWLNrbNhsuO
fvH+HvfrAgMBAAECggEAFHazm2V69aHFuuAt3SrZuBKJNwlAg87nHkbHQnboroBi
eeu1Dp/KoWDTxBNKIIyx1px1eViR+tYqalJ+FZNYl0X1Hg+VO4jjqeMCYbBhZAWI
bxIzm1D03PEMxinqw3dy8ja1ovMdBrAd8iEQBGta+dbhV3xWXLz8TcHyNfEEwktc
b/qiAxbdSfYJfFAuYvfeNuwt5AYHpAuSCNLNI/f8lIZWITQBwDIDdCQxn/nRsknK
9+uuo0tQfjbKVQKSWAjBEOoVtKu0Ng9CjxgAUecLqpZqxCYxGHj4Ljl5Y5giAgqr
bEDCSlfW5P7wkMpRJIU4/2qyMQ1jk7H9+HwRmihLoQKBgQDW4mG+4pznT/1eposX
n7WA0ngA/BJGS7tFELc2c+17l3mHSH5cpO+310zBMwGMlFkT+ApImkjAztkk7A3y
BiThr1rgSuanmVhf+57ynd9CKQ6PPPr9Jjyka7OItGuHFXB1RfLY4O3yNsT4SENE
JFDorHM2ZiPITP9LKdr9zSRTzQKBgQDE3NtYM6VP8Qq9tkpbtaWgAFrnx+diS0Dc
OwiFeC96qnbwNYB7DPLVkcaU2RK7oVApcLeey08atcYxMicTdgHT4+lyAD5I5Lks
P3KSX1wpPEHf1O0TMK2HdwnRu8lfQDfMpFxNeQm/LZGAKoQWdzTJINALcEjprGMc
o+nppiGylwKBgQDNZg7wm0RHhpo1wxPpPOwNeyDiMBB3ySP0XIoELsOuA5hSy+Sd
QbsyC0Z+1faBHbwX7lxGEdPBGPdO56Rc16qhXzCKfI4FXfqvpKDGYElrwDr+h9eR
6t7Ee35dCbhOoxufvYDn9fj8MYYNnWVO2TfNcCmgsfk6GP9eJWACgfhbcQKBgQCP
lvA+g10e1BgbjCzse6/U5q1nxj2VSoKCoGR0xdcLx+59Auk115oAARYxV6v8Q4su
ztJ/9pc6Sj/HfmdWIIrwvJp31omXrY0LIzQ0Y23bfeImmy5ZAvZvinoVCr20xiht
Ea1prNFZKqmoLFqv8D8GPPLChSIJnv2j1EM3cz+8/QKBgDd8diPVh8NJNn+5XiIr
ROqNljdihXo26Sn5VaTBv2Y+yajtpAsopcw0gk/qH+RYO4ki2isqKg99YPm0OjFb
4e0bb5KvMzDBKq4LevTh+7WeQVn2gBmX+bdVVZddLRWam3Ut2cr8MVjK7GP5EDKU
mb5II/VTDNxuKxU5x6QibNQh
-----END PRIVATE KEY-----`;

let _securityConfigured = false;

/**
 * Configures QZ Tray's security handlers so every WebSocket connection is
 * signed with the Nexova private key and verified against the Nexova certificate.
 * This eliminates the manual "Allow" popup for the client.
 */
export function initQZSecurity(): void {
  if (_securityConfigured) return; // Already set up — don't register twice

  // 1. Provide the certificate to QZ Tray
  qz.security.setCertificatePromise((_resolve: (cert: string) => void, _reject: (err: any) => void) => {
    _resolve(CERTIFICATE);
  });

  // 2. Sign each challenge QZ Tray sends, using the RSA private key via WebCrypto
  qz.security.setSignatureAlgorithm("SHA512"); // Must match the key algorithm
  qz.security.setSignaturePromise((toSign: string) => {
    return (_resolve: (sig: string) => void, _reject: (err: any) => void) => {
      // Use the browser's native WebCrypto API to sign the challenge
      (async () => {
        try {
          // Parse the PEM private key — strip headers and decode base64
          const pemBody = PRIVATE_KEY
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replace(/\s+/g, "");
          const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

          // Import as a CryptoKey
          const cryptoKey = await window.crypto.subtle.importKey(
            "pkcs8",
            binaryDer.buffer,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
            false,
            ["sign"]
          );

          // Sign the challenge string
          const encoder = new TextEncoder();
          const signatureBuffer = await window.crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            cryptoKey,
            encoder.encode(toSign)
          );

          // Convert the signature to Base64 for QZ Tray
          const signatureBytes = new Uint8Array(signatureBuffer);
          const base64Signature = btoa(String.fromCharCode(...signatureBytes));
          _resolve(base64Signature);
        } catch (err) {
          console.error("[QZ] Signing failed:", err);
          _reject(err);
        }
      })();
    };
  });

  _securityConfigured = true;
  console.log("[QZ] Security configured — signed connection ready.");
}
