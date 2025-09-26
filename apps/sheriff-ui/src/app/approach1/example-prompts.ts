import type { ExamplePrompt } from '../shared/chat-empty-state.component';

/**
 * Example prompts for Approach 1 empty state
 */
export const APPROACH1_EMPTY_STATE_EXAMPLES: ExamplePrompt[] = [
  {
    title: 'Angular IV Project',
    description: 'test-projects/angular-iv with folder structure',
    prompt: `Hi! I need help setting up Sheriff for my Angular project.

Root directory: /Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv
Entry file: src/main.ts

Here's my project structure:

angular-iv/
├── src/
│   ├── app/
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.component.ts
│   │   ├── app.routes.ts
│   │   ├── bookings/
│   │   │   ├── +state/
│   │   │   │   ├── bookings.actions.ts
│   │   │   │   ├── bookings.effects.ts
│   │   │   │   ├── bookings.reducer.ts
│   │   │   │   └── bookings.selectors.ts
│   │   │   ├── bookings.routes.ts
│   │   │   ├── index.ts
│   │   │   └── overview/
│   │   │       ├── overview.component.html
│   │   │       └── overview.component.ts
│   │   ├── customers/
│   │   │   ├── api/
│   │   │   │   └── index.ts
│   │   │   ├── data/
│   │   │   │   ├── customers-repository.service.ts
│   │   │   │   ├── customers.actions.ts
│   │   │   │   ├── customers.effects.ts
│   │   │   │   ├── customers.json
│   │   │   │   ├── customers.reducer.ts
│   │   │   │   ├── customers.selectors.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── provide-customers.ts
│   │   │   ├── feature/
│   │   │   │   ├── components/
│   │   │   │   │   ├── add-customer.component.ts
│   │   │   │   │   ├── customers-container.component.ts
│   │   │   │   │   ├── customers-root/
│   │   │   │   │   │   ├── customers-root.component.html
│   │   │   │   │   │   └── customers-root.component.ts
│   │   │   │   │   └── edit-customer.component.ts
│   │   │   │   ├── customers.routes.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── services/
│   │   │   │       ├── data.guard.ts
│   │   │   │       └── data.ts
│   │   │   ├── model/
│   │   │   │   ├── customer.ts
│   │   │   │   └── index.ts
│   │   │   └── ui/
│   │   │       ├── customer/
│   │   │       │   ├── customer.component.html
│   │   │       │   ├── customer.component.scss
│   │   │       │   └── customer.component.ts
│   │   │       ├── customer.pipe.ts
│   │   │       ├── customers/
│   │   │       │   ├── customers.component.html
│   │   │       │   └── customers.component.ts
│   │   │       └── index.ts
│   │   ├── holidays/
│   │   │   ├── feature/
│   │   │   │   ├── +state/
│   │   │   │   │   ├── holidays.actions.ts
│   │   │   │   │   ├── holidays.effects.ts
│   │   │   │   │   ├── holidays.reducer.ts
│   │   │   │   │   └── holidays.selectors.ts
│   │   │   │   ├── address-lookuper.service.ts
│   │   │   │   ├── address.ts
│   │   │   │   ├── holidays/
│   │   │   │   │   ├── holidays.component.html
│   │   │   │   │   └── holidays.component.ts
│   │   │   │   ├── holidays.routes.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── parse-address.spec.ts
│   │   │   │   ├── parse-address.ts
│   │   │   │   └── request-info/
│   │   │   │       ├── request-info.component.html
│   │   │   │       └── request-info.component.ts
│   │   │   ├── model/
│   │   │   │   ├── holiday.ts
│   │   │   │   └── index.ts
│   │   │   └── ui/
│   │   │       ├── holiday-card/
│   │   │       │   ├── holiday-card.component.html
│   │   │       │   ├── holiday-card.component.scss
│   │   │       │   └── holiday-card.component.ts
│   │   │       └── index.ts
│   │   ├── shared/
│   │   │   ├── config/
│   │   │   │   ├── configuration.ts
│   │   │   │   └── index.ts
│   │   │   ├── form/
│   │   │   │   ├── form-errors.component.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── options.ts
│   │   │   ├── http/
│   │   │   │   ├── base-url.interceptor.ts
│   │   │   │   ├── error-message.context.ts
│   │   │   │   ├── error.interceptor.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── with-error-message-context.ts
│   │   │   ├── master-data/
│   │   │   │   ├── +state/
│   │   │   │   │   └── shared-master-data.actions.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── shared-master-data.provider.ts
│   │   │   ├── ngrx-utils/
│   │   │   │   ├── deep-clone.ts
│   │   │   │   ├── filter-defined.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── load-status.ts
│   │   │   │   ├── noop.action.ts
│   │   │   │   └── safe-concat-map.ts
│   │   │   ├── security/
│   │   │   │   ├── index.ts
│   │   │   │   ├── security.actions.ts
│   │   │   │   ├── security.effects.ts
│   │   │   │   ├── security.provider.ts
│   │   │   │   ├── security.reducer.ts
│   │   │   │   ├── security.selectors.ts
│   │   │   │   └── security.service.ts
│   │   │   ├── testing/
│   │   │   │   ├── assert-type.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── mock-inject.ts
│   │   │   ├── ui/
│   │   │   │   ├── blinker.directive.ts
│   │   │   │   └── index.ts
│   │   │   ├── ui-messaging/
│   │   │   │   ├── index.ts
│   │   │   │   ├── loader/
│   │   │   │   │   ├── loader.component.ts
│   │   │   │   │   ├── loader.service.ts
│   │   │   │   │   ├── loader.state.ts
│   │   │   │   │   ├── loader.store.ts
│   │   │   │   │   └── provide-loader.ts
│   │   │   │   ├── message/
│   │   │   │   │   ├── message.component.html
│   │   │   │   │   ├── message.component.ts
│   │   │   │   │   ├── message.service.ts
│   │   │   │   │   ├── message.state.ts
│   │   │   │   │   ├── message.store.ts
│   │   │   │   │   └── provide-message.ts
│   │   │   │   └── shared-ui-messaging.provider.ts
│   │   │   └── util/
│   │   │       ├── date-utils.ts
│   │   │       ├── index.ts
│   │   │       ├── number-utils.ts
│   │   │       └── string-utils.ts
│   │   └── shell/
│   │       ├── header/
│   │       │   ├── header.component.html
│   │       │   ├── header.component.scss
│   │       │   └── header.component.ts
│   │       ├── home.component.ts
│   │       ├── services/
│   │       │   ├── error-handler.service.ts
│   │       │   └── user-loader.guard.ts
│   │       └── sidemenu/
│   │           ├── sidemenu.component.html
│   │           ├── sidemenu.component.scss
│   │           └── sidemenu.component.ts
│   ├── assets/
│   ├── environments/
│   │   ├── environment.development.ts
│   │   └── environment.ts
│   ├── favicon.ico
│   ├── index.html
│   ├── main.ts
│   └── styles.scss

## Questions to Answer

1. **Shared Access**: Do all sub-modules require access to all shared modules? Verify.
2. **Bookings Feature Access**: Can bookings only access customers' API in its feature module? (Note: bookings has '+state'/'overview', not standard 'feature')
3. **Bookings Structure**: How to handle bookings' non-standard structure (\`+state\`, \`overview\`)?
4. **Single Tag**: How to achieve submodules/domains with only one tag per module? Is this possible?
5. **Cyclic Dependencies**: How does Sheriff prevent circular dependencies when \`feature\` → \`api\` and \`api\` → \`feature\` are both allowed? Explain the logic.

## Constraints
- **Output**: Present final configuration in chat response

## Expected Output
- Complete 'sheriff.config.ts' configuration
- Answers to all 5 questions
- Verification of requirements
- Explanation of cyclic dependency prevention`
  }
];
