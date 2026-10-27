# API Sentinel

API Sentinel is an automated API security testing platform designed to
identify common REST API security weaknesses through controlled tests,
analyze observed behavior, and generate evidence-backed reports.

## Project Status

Planning and repository initialization.

## Planned Features

- Authentication enforcement checks
- Broken Object-Level Authorization (BOLA/IDOR) checks
- Role-based authorization checks
- Rate-limit verification
- Input-validation checks
- Error-handling and information-disclosure checks
- Scan history and finding remediation tracking
- JSON and HTML reports
- Automated tests and continuous integration

## Technology Stack

- Node.js and Express.js
- PostgreSQL and Sequelize
- React and TypeScript
- Jest and Supertest
- Docker and Docker Compose
- GitHub Actions

## Security Notice

The scanner is intended for systems that you own or have explicit
permission to test. Initial testing will use a dedicated local API
containing synthetic data and intentionally vulnerable endpoints.

Vulnerable test endpoints must not be exposed publicly.

## Development

Setup instructions will be added as the application is implemented.

## License

MIT
