# API Sentinel

API Sentinel is an automated API security testing platform designed to identify common security weaknesses in REST APIs through controlled security checks.

It executes security tests against authorized API targets, evaluates their responses, stores scan results and findings in PostgreSQL, and generates evidence-backed JSON and HTML reports.

## Project Status

**Backend security foundations and initial scanner implementation completed. Scanner and platform enhancements are in progress.**

### Implemented Features

- Automated API security scanner.
- Authentication enforcement testing.
- Broken Object-Level Authorization (BOLA/IDOR) testing.
- Role-based authorization testing.
- Controlled HTTP requests with timeouts and redirect protection.
- Restricted local test target validation.
- Finding classification using PASS, FAIL and ERROR statuses.
- Evidence, severity, confidence and remediation details.
- JSON and HTML report generation.
- HTML output escaping and report validation.
- PostgreSQL integration using Sequelize ORM.
- Persistent scan history and security findings.
- REST APIs for retrieving scan history and individual scan details.
- User registration with bcrypt password hashing.
- User login with JWT authentication.
- Database-backed JWT authentication and account validation.
- Role-based access control for regular users and administrators.
- Admin-only user listing endpoint.
- Scan ownership and user-level scan data isolation.
- Administrative access to all scans, including legacy ownerless scans.
- Centralized API error handling.
- Automated tests using Jest and Supertest.

### Current Scanner Checks

| Check ID | Security Check | Description |
|---|---|---|
| AUTH-001 | Authentication Enforcement | Checks whether a protected endpoint can be accessed without authentication. |
| AUTHZ-001 | BOLA / IDOR | Checks whether one authenticated user can access another user's profile. |
| AUTHZ-002 | Broken Role-Based Authorization | Checks whether a regular user can access an administrator-only endpoint. |

Each check produces one of three outcomes:

- **PASS:** The expected security control was observed.
- **FAIL:** The test identified behavior indicating a potential security weakness.
- **ERROR:** The check could not establish a reliable result.

An ERROR is not automatically treated as a vulnerability.

## Technology Stack

**Backend**
- Node.js
- Express.js
- JavaScript (CommonJS)

**Database**
- PostgreSQL
- Sequelize ORM

**Authentication and Security**
- JSON Web Tokens (JWT)
- bcryptjs
- Role-based access control (RBAC)
- Database-backed account validation
- Target validation
- Request timeouts
- Redirect protection

**Testing**
- Jest
- Supertest

**Development and Deployment**
- Git and GitHub
- Docker and Docker Compose (planned)
- GitHub Actions (planned)

## Architecture

API Sentinel consists of three main components.

### 1. API Sentinel Platform

The main backend application handles:

- User registration and authentication.
- JWT verification and database-backed account validation.
- Role-based authorization.
- Administrative user listing.
- Scan history retrieval.
- Individual scan result retrieval.
- Scan ownership and access isolation.
- Centralized error handling.

Regular users can access only scans associated with their accounts. Administrators can access all scans, including legacy scans without an assigned owner.

The platform uses the user's current database role for authorization rather than trusting role information supplied by the client.

### 2. Security Scanner

The scanner executes security checks against an authorized API target.

Its responsibilities include:

- Validating the target.
- Sending controlled HTTP requests.
- Evaluating API responses.
- Classifying security findings.
- Generating scan summaries.
- Producing JSON and HTML reports.
- Persisting scan results in PostgreSQL.

### 3. Vulnerable Test API

A separate local API provides intentionally vulnerable endpoints for testing the scanner.

It uses synthetic users and test tokens to demonstrate authentication and authorization weaknesses.

The test API currently contains intentional examples of:

- Missing authentication enforcement.
- Broken object-level authorization.
- Missing role-based authorization.

It is designed exclusively for controlled local testing.

## Project Structure

    api-sentinel/
    ├── scanner/
    │   ├── src/
    │   │   ├── cli.js
    │   │   ├── persistence.js
    │   │   ├── report.js
    │   │   ├── scanner.js
    │   │   └── target.js
    │   └── tests/
    │       ├── report.test.js
    │       └── scanner.test.js
    ├── src/
    │   ├── config/
    │   │   └── database.js
    │   ├── database/
    │   │   └── migrations/
    │   ├── middleware/
    │   │   ├── auth.middleware.js
    │   │   ├── error.middleware.js
    │   │   ├── notFound.middleware.js
    │   │   └── role.middleware.js
    │   ├── models/
    │   │   ├── finding.model.js
    │   │   ├── index.js
    │   │   ├── scan.model.js
    │   │   └── user.model.js
    │   ├── routes/
    │   │   ├── admin.routes.js
    │   │   ├── auth.routes.js
    │   │   └── scans.routes.js
    │   ├── app.js
    │   └── server.js
    ├── tests/
    │   ├── app.test.js
    │   ├── auth.test.js
    │   ├── admin.routes.test.js
    │   ├── error-handling.test.js
    │   ├── role.middleware.test.js
    │   └── scans.test.js
    ├── vulnerable-api/
    │   ├── src/
    │   │   ├── data/
    │   │   ├── routes/
    │   │   ├── app.js
    │   │   └── server.js
    │   └── tests/
    ├── scripts/
    │   └── migrate.js
    ├── reports/
    │   └── generated/
    ├── .env.example
    ├── .gitignore
    ├── package.json
    ├── package-lock.json
    └── README.md

## Getting Started

### Prerequisites

- Node.js
- npm
- PostgreSQL

### 1. Clone the Repository

    git clone https://github.com/spandanse/api-sentinel.git
    cd api-sentinel

### 2. Install Dependencies

    npm install

### 3. Configure Environment Variables

Create your local environment file:

    cp .env.example .env

Configure the following variables in `.env`:

    NODE_ENV=development
    PORT=3000

    DB_HOST=127.0.0.1
    DB_PORT=5432
    DB_NAME=api_sentinel
    DB_USER=api_sentinel_user
    DB_PASSWORD=your_database_password
    DB_DIALECT=postgres

    JWT_SECRET=your_secure_random_secret

Use a strong, randomly generated JWT secret. Never commit `.env` or expose database credentials and signing secrets.

### 4. Create the PostgreSQL Database

Create a PostgreSQL database and a database user with appropriate permissions.

For example:

    CREATE USER api_sentinel_user WITH PASSWORD 'your_database_password';
    CREATE DATABASE api_sentinel OWNER api_sentinel_user;

Use the same database credentials in `.env`.

### 5. Run Database Migrations

    npm run db:migrate

The migrations create and update the required database structures:

- `001-create-scans-and-findings.js`: Creates the scans and findings tables.
- `002-create-users.js`: Creates the users table.
- `003-add-user-roles.js`: Adds the user role column.
- `004-add-scan-ownership.js`: Adds the nullable scan ownership relationship.

Migrations are tracked in the `schema_migrations` table.

## Running the Application

API Sentinel currently has three separate execution components.

### 1. Start the Vulnerable Test API

    node vulnerable-api/src/server.js

The local vulnerable API runs on:

`http://127.0.0.1:4001`

### 2. Start the API Sentinel Platform

    npm start

The main backend application runs on:

`http://localhost:3000`

Health endpoint:

`GET /api/v1/health`

### 3. Execute a Security Scan

Ensure PostgreSQL and the vulnerable test API are running.

Then execute:

    npm run scan

The scanner validates the configured local test target, executes its security checks, generates reports and persists the results in PostgreSQL.

The initial scanner is restricted to the local vulnerable test API at `http://127.0.0.1:4001`.

The current CLI scan workflow does not associate scans with a platform user. Such scans are stored without an owner and are accessible through the platform only to administrators.

## Available API Endpoints

Base URL: `http://localhost:3000`

### Health

| Method | Endpoint | Authentication |
|---|---|---|
| GET | `/api/v1/health` | Not required |

### Authentication

| Method | Endpoint | Authentication |
|---|---|---|
| POST | `/api/v1/auth/register` | Not required |
| POST | `/api/v1/auth/login` | Not required |

Registration accepts a name, email and password.

New accounts receive the regular `user` role by default. A client cannot assign itself the administrator role through registration.

Login returns a signed JWT access token. The token must be supplied as a Bearer token when accessing protected endpoints.

Example:

    Authorization: Bearer YOUR_ACCESS_TOKEN

The platform verifies the token and checks that the associated user account still exists. The current role is retrieved from the database.

### Scan Management

| Method | Endpoint | Authentication | Access |
|---|---|---|---|
| GET | `/api/v1/scans` | Required | User: own scans; Admin: all scans |
| GET | `/api/v1/scans/:id` | Required | User: own scan; Admin: any scan |

The scan listing endpoint supports pagination.

Query parameters:

- `page`: Page number (default: 1).
- `limit`: Number of records per page (default: 10, maximum: 50).

The scan detail endpoint returns the selected scan and its associated findings.

A regular user receives a 404 response when requesting a scan belonging to another user. This avoids revealing whether another user's scan exists.

### Administration

| Method | Endpoint | Authentication | Access |
|---|---|---|---|
| GET | `/api/v1/admin/users` | Required | Admin only |

The administrative user listing endpoint returns a maximum of 50 users, including their IDs, names, email addresses, roles and account creation timestamps.

Password hashes and other authentication secrets are never included in the response.

Regular users receive a 403 Forbidden response when attempting to access administrative endpoints.

## Reports

The scanner generates two report formats.

### JSON Report

Contains structured scan information, including:

- Target information.
- Scan timestamp.
- Scan duration.
- Number of checks executed.
- PASS, FAIL and ERROR summary.
- Individual findings.
- Evidence and remediation recommendations.

### HTML Report

Provides a readable report containing the scan summary and individual security findings.

The report generator validates report data and escapes user-controlled content before including it in HTML.

Generated reports are stored under:

`reports/generated/`

## Database Models

The platform currently uses three primary models.

| Model | Purpose |
|---|---|
| User | Stores registered platform users, password hashes and roles. |
| Scan | Stores scan metadata, status, target, summary and optional owner. |
| Finding | Stores individual security check results and remediation details. |

A scan can have multiple associated findings.

A scan may belong to a platform user through its nullable `user_id` foreign key. The relationship uses `ON DELETE SET NULL`, preserving historical scan records if an account is deleted.

## Running Tests

Execute the complete automated test suite:

    npm test

The test suite covers:

- Scanner behavior and target restrictions.
- Security finding classification.
- Request failures and timeout handling.
- Report generation and validation.
- User registration and password hashing.
- Protection against client-supplied administrator roles.
- Login and JWT verification.
- Database-backed authentication.
- Role-based authorization.
- Administrative endpoint access.
- Scan ownership and data isolation.
- Scan listing, pagination and retrieval.
- Error handling.
- Vulnerable test API behavior.

**Current test status: 82 passing tests across 10 test suites.**

## Security Roadmap

The following are planned extensions. They are not yet implemented scanner capabilities.

### Authentication and Authorization

- Privilege escalation testing.
- Expanded object-level and function-level authorization checks.
- Additional JWT security checks.

### Injection Testing

- SQL injection.
- NoSQL injection.
- Command injection.
- Input and parameter manipulation.

### API Configuration and Information Exposure

- Security header checks.
- CORS configuration checks.
- Sensitive information disclosure.
- Verbose error response detection.
- Unsafe HTTP method checks.

### Abuse and Resource Protection

- Rate-limit verification.
- Brute-force protection checks.
- Unrestricted resource consumption.
- Pagination and request-size limit checks.

### Platform Enhancements

- Authenticated scan creation and execution.
- Target registration and management.
- Modular and extensible scanner engine.
- Background scan execution and scheduling.
- Scan history and finding remediation tracking.
- Improved risk scoring and report presentation.
- React and TypeScript frontend.
- Docker-based deployment.
- GitHub Actions CI integration.

## Security Notice

API Sentinel is intended exclusively for APIs that you own or have explicit authorization to test.

The initial scanner is restricted to a dedicated local vulnerable API containing synthetic data and intentionally vulnerable endpoints.

Do not expose the vulnerable test API publicly or use the scanner against systems without permission.

The current scanner implements a limited set of security checks. Its results should not be interpreted as proof that an API is completely secure.

## License

This project is licensed under the MIT License.
