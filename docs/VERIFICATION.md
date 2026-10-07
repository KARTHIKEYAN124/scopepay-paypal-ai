# Verification — 4 October 2026

## Functional checks

- Production build passed. All 8 Node tests passed after the final provider and formatting changes.
- Real Ollama generation was exercised from the browser, not replaced with a fixture. Qwen 2.5 0.5B requests completed in about 27–33 seconds on this machine. Larger models were slow to load under limited available RAM, so the local configuration defaults to 0.5B.
- Small-model output was structurally valid and project-specific, but acceptance criteria and assumptions required manual correction. The edited example was reviewed and approved through the actual UI. Treat model output as a draft, not as a verified agreement.
- Browser verification covered connection dialog open/close, status refresh, brief submission/loading state, editable review, approval gating, milestone selection, checkout readiness, Markdown export and project restoration after reload.
- The CLI's final download check reported cancellation. The export now keeps its blob URL alive for a minute and briefly attaches the download anchor to the DOM. A Playwright Chrome check subsequently saved the real download and verified its project title, approved status, milestone amount and edited acceptance criteria. The actual exported example is `example-proposal.md`.
- A fresh store instance loaded the approved proposal from disk with the edited criteria and correct 48,000 / 120,000 / 72,000 cent allocations.
- Payment API tests cover unapproved scope rejection, buyer acceptance, wrong order and amount rejection, concurrent order creation, repeated capture and completed receipt validation. Provider tests verify sandbox-only URLs and idempotency headers.
- Actual PayPal sandbox payment was not tested: client ID and secret are absent. The UI keeps checkout disabled and provides setup instructions. Configured status means credentials are present, not yet validated by PayPal.
- No public GitHub repository, hosted deployment, YouTube video or Devpost submission was created.

## Browser and design checks

Used agent-browser with Chromium. A built-in Browser/IAB connector was unavailable; the installed browser automation skill supplied the CLI. After an initial navigation attempt before the dev server was ready, the page loaded and all checks ran successfully. Final verification showed no browser errors or Vite error overlay. Desktop viewport: 1505 × 1045, the reference image's native size. Mobile: 390 × 844, with no horizontal overflow on brief or payment screens.

Playwright with installed Chrome was used to resolve the CLI download failure because the Browser plugin was unavailable. That check also restored the approved project, captured the final desktop preview and found no runtime errors.

The reference `concept.png` and the latest `desktop.png` were both inspected with `view_image`. The payment and mobile renders were also inspected. The implementation preserves the reference's layout and visual system, with intentional functional deviations listed below.

| Comparison point | Reference and implementation | Adjustment or intentional deviation |
| --- | --- | --- |
| Layout | Left workspace sidebar, heading, three steps, two main panels and bottom connection strip | Reduced top spacing and milestone row padding so the connection strip stays visible at the reference desktop size. |
| Copy | Heading, subtitle, navigation, form labels and primary CTA follow the reference | Replaced misleading escrow/release language with direct sandbox payment wording; explicitly marked the preview as an example. |
| Typography | Inter with bold navy headings, readable form labels and smaller secondary text | Control typography set explicitly; responsive heading and navigation sizes checked. |
| Palette | White canvas, pale-blue preview, cobalt primary actions, gray borders | Preserved the white background and blue panel treatment. No decorative imagery or overlay. |
| Components and spacing | Rounded panels, outline icons, numbered milestone rows, consistent inputs | Milestone spacing tightened after screenshot comparison; review/payment states extend the same tokens. |
| Assets and icons | Typographic S mark and code-native controls | Lucide CPU/wallet/plug icons replace generated provider illustrations. The sandbox indicator is informational and has no dropdown. |
| Responsive behavior | Same content and actions | Sidebar becomes compact horizontal navigation; form and preview stack; checkout remains legible without horizontal scrolling. |

Above-the-fold copy comparison: core navigation, headline, subtitle, form labels and CTA match. Intentional differences are connection readiness, accurate local-processing language, example labeling, sandbox payment wording and numeric budget formatting. The currency input uses a valid numeric value (`2400`) instead of display grouping (`2,400`). No unrequested metrics or hero labels were added.

Product previews retained for documentation: `desktop.png` and `payment.png`. Temporary mobile/review screenshots and download logs were removed after inspection.

## Appwrite preparation ? 2026-10-07

- 12 Node tests pass: original payment lifecycle tests plus owner isolation, durable locking across store instances, Express serverless adaptation with asynchronous persistence, and Groq request/quota handling.
- Hosted Vite production build passed with test configuration. Desktop/mobile browser smoke passed against mocked Appwrite SDK responses, including correct Groq connections and no mobile overflow. This was not a live deployment.
- API archive is built from an explicit source allowlist; local credentials and projects are excluded. Mock Site archive is labelled `scopepay-site-smoke-test.tar.gz` and must not be deployed.
- Appwrite project ID received: `6ac676600032de209d02`. Regional endpoint, CLI authentication, Groq server key and sandbox PayPal credentials remain needed. Live cloud schema provisioning, Function execution and payment capture are pending.

### Live deployment ? 2026-10-07

- Deployed static Site `scopepay`, Node.js 22 Function `scopepay-api`, private TablesDB `scopepay` with projects/locks and owner index. Domain: https://scopepay-6ac67660.appwrite.network.
- Live Chrome verified page rendering, automatic anonymous session creation, authenticated Function `/api/status` and `/api/projects` responses (200). No runtime page errors. An initial unauthenticated account check intentionally returns 401 before the anonymous session is created.
- Live backend reports Groq and PayPal unconfigured. Generation and real sandbox capture remain pending secret variables and redeployment. No paid plan or paid specification was selected.

### Hosted AI enabled ? 2026-10-07

- Groq project-level secret is configured. Function name restored to ScopePay API and authenticated execution/row scopes restored after accidental settings changes.
- Real hosted Groq generation succeeded with the sample brief. Scope approval and Appwrite persistence across reload verified in Chrome. No PayPal payment was attempted; sandbox credentials and capture validation remain pending.
