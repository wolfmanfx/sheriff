# Playwright E2E Tests

## Running Tests

```bash
# Run all E2E tests (starts servers automatically)
yarn test:e2e

# Run tests with UI mode (interactive)
yarn test:e2e:ui

# Run tests in headed mode (see browser)
yarn test:e2e:headed
```

## Test Scenarios

The `e2e/chat.spec.ts` file contains tests for:

1. **Chat Interface Display** - Verifies the chat UI loads correctly
2. **Message Sending** - Tests sending messages and seeing them in chat
3. **Streaming State** - Verifies input is disabled during streaming
4. **Agent Status** - Checks that agent status component displays
5. **Navigation** - Tests navigation between home and chat pages
6. **Streaming Indicator** - Verifies streaming indicators appear

## Configuration

The `playwright.config.ts` automatically:
- Starts the backend API server (`sheriff-api`) on port 3000
- Starts the frontend UI server (`sheriff-ui`) on port 4200
- Waits for servers to be ready before running tests
- Uses Chromium browser by default

## Notes

- Tests require both backend and frontend servers to be running
- The backend needs LM Studio or another AI provider configured
- Tests may take longer if the AI agent is processing requests
- Timeouts are set generously to account for agent processing time

