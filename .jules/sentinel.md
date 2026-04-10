## 2024-05-18 - Missing Security Headers
**Vulnerability:** The Express server (`server.ts`) lacked fundamental security headers like `X-Content-Type-Options` and `X-Frame-Options`. The `x-powered-by` header was also enabled, leaking information about the technology stack (Express). This increases the risk of attacks like clickjacking and XSS.
**Learning:** Default Express configurations are not secure for production. Fundamental security headers and disabling fingerprinting are required.
**Prevention:** Implement a middleware setting standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security`) and call `app.disable('x-powered-by')` when setting up Express.
