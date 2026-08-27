# Evidence-Based Source Code Audit Instructions

## Goal
Perform a complete evidence-based source-code audit and implementation pass. Verify every finding directly from source before reporting it, fix only confirmed issues, preserve existing behavior where practical, and align claims with the Base Paper *AI-Enabled Multi-Factor Authentication (MFA) Systems for Private and Public Cloud Security* and the Major Project Proposal *Adaptive Zero Trust-AI Framework for Continuous Multi-Factor Authentication in Hybrid Cloud Security*.

## Evidence rules
Read all source, configuration, dependency, migration, React, FastAPI, AI/ML, SQL, and documentation files. Do not infer implementation from README files, folder names, comments, proposals, or filenames. Every finding must include severity, file, function/class, line numbers when available, source evidence, impact, recommended fix, and whether the fix was implemented. Use only these severities: Critical, Major, Minor, Suggestion.

## Audit phases
1. Project structure: architecture, naming, duplicates, dead code, configuration, dependencies, environment variables, documentation, and hygiene.
2. Build verification: frontend install/build/type-check/lint, backend syntax/imports/routes, migration loading, and static analysis.
3. Frontend: React components, pages, routing, protected routes, authentication, forms, validation, API contracts, loading/error states, state management, responsive behavior, broken imports, duplicate API prefixes, missing primitives, and redirect loops.
4. Backend: FastAPI routes, JWT, authorization, middleware, validation, Pydantic models, dependency injection, logging, configuration, response models, exceptions, duplicate routes, and missing endpoints.
5. Authentication: login, logout, refresh, active sessions, revocation, password reset/change, MFA setup/verification, TOTP validation, pending secrets, session invalidation, audit logging, and secret/token exposure.
6. Database: PostgreSQL connectivity, ORM usage, Alembic/migration order, schema consistency, indexes, foreign keys, constraints, pooling, audit/session/refresh/trust/risk/report tables, and conflicts.
7. API contracts: compare every frontend request with backend routes, request/response models, status codes, authentication, and ownership checks.
8. AI/ML: dataset loading, cleaning, encoding, scaling, feature engineering/selection, PCA, training, evaluation, inference, persistence, loading, and metrics. Clearly label simulated behavior.
9. Zero Trust: trust/risk engines, adaptive trust, continuous session validation, policy decision/enforcement, least privilege, behavior, and device trust.
10. Continuous MFA: password, email OTP if implemented, TOTP if implemented, behavior/device signals, risk challenges, location/time checks, session timeout, adaptive authentication, and re-authentication.
11. Security: password hashing, JWT, secrets, SQL injection, XSS, CSRF, validation, bypasses, authorization, rate limiting, sensitive data exposure, and OWASP alignment.
12. Performance: slow APIs, repeated calls, blocking code, memory, database connections, ML cost, and logging overhead.
13. Hybrid cloud: deployment scripts, Docker, cloud configuration, scalability, environment separation, and explicit simulation boundaries.
14. Code quality: unused/dead code, duplication, large functions/classes, naming, comments, documentation, maintainability, readability, and SOLID concerns.
15. Repository hygiene: ignore rules, cache/bytecode, generated artifacts, environment files, model artifacts, and test output.
16. Implementation: fix only confirmed issues, avoid breaking changes, use secure defaults, and preserve compatibility.
17. Verification: rerun all available checks. If a database, credential, external API, or infrastructure is unavailable, state that validation was not possible.
18. Limitations: never claim TensorFlow, real federated learning, genuine SHAP/LIME, production hybrid cloud, production failover, or distributed ML unless implemented and validated. Do not add biometrics, expose secrets/reset tokens, or run live migrations without confirmation.

## Required final report
Include: executive summary; build verification; Base Paper/Proposal/source compliance matrix; critical, major, minor, security, frontend, backend, authentication, API, database, AI/ML, Zero Trust, continuous MFA, and hygiene findings; simulated components; modified files; tests; verification results; remaining debt; scores out of 100 for completeness, frontend, backend, database, security, authentication, API consistency, AI/ML, Zero Trust, continuous MFA, code quality, documentation, Base Paper compliance, Major Project compliance, and overall quality; and exactly one recommendation: **Ready for Submission**, **Ready After Minor Fixes**, **Needs Major Improvements**, or **Not Ready for Submission**.

Biometric authentication is explicitly out of scope unless separately required and implemented by the proposal.
