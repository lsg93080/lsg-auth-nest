
# Auth Service

This project is an authentication service for the LifeSync Games framework built with [NestJS](https://github.com/nestjs/nest). It provides authentication features and integrates with Firebase for secure user management.

## Requirements

- Node.js (v20 or higher recommended)
- npm (v10 or higher recommended)

## Project Setup

### Install Dependencies

```bash
npm install
```


### Firebase Configuration

1. Download the Firebase Service Account Key from your Firebase Console (it will be a JSON file).
2. Place the file in the root directory of the project and rename it to `firebaseServiceAccountKey.json`.
3. **Important:** If you use a different file name, add it to `.gitignore` to prevent accidental commits.
4. **Never commit this file to version control.** It contains sensitive credentials.


## Compile and Run the Project

```bash
# Development
npm run start

# Watch mode
npm run start:dev

# Production mode
npm run start:prod
```

## Run Tests

```bash
# Unit tests
npm run test

# End-to-end (e2e) tests
npm run test:e2e

# Test coverage
npm run test:cov
```