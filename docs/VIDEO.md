# Functional demo plan (target 2 minutes 40 seconds)

Run `node scripts/record-demo.mjs` to record a captioned browser preview of the real hosted AI, approval and persistence workflow. It saves `.artifacts/video/scopepay-preview.webm`. This preview explicitly labels payment verification as pending; it is not the final submission video. Add verified sandbox checkout and receipt footage before uploading the final cut.

Record the actual website on a desktop browser. Use English narration or captions. Hide API secrets and buyer passwords, and avoid unlicensed music or decorative third-party logos. A recording made before payments work is a preview, not the final submission video.

| Time      | Show                                              | Explain                                                                    |
| --------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| 0:00-0:15 | Sample client brief                               | Clear deliverables connect to milestone payments.                          |
| 0:15-0:40 | Generate actual AI proposal                       | Groq drafts the scope; local Ollama is also supported.                     |
| 0:40-1:05 | Edit criteria, review allocation and approve      | A human reviews AI; payment amounts are deterministic.                     |
| 1:05-1:45 | Actual sandbox buyer approval, return and capture | PayPal handles buyer approval; the server checks the order before capture. |
| 1:45-2:05 | Actual capture receipt                            | Only a completed verified capture marks a milestone paid.                  |
| 2:05-2:25 | Reload, Saved projects and export                 | Appwrite persists a private browser workspace.                             |
| 2:25-2:40 | Product and public source link                    | Clear work, approved payments, runnable open-source code.                  |

Trim idle waits while preserving the actual request and response. Upload the final file to YouTube with visibility Public and add the link to Devpost. Do not submit until payment footage and all demonstrated behavior are verified.
