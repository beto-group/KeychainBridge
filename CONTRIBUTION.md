# Contribution Guidelines - Keychain Bridge

Welcome to the **Keychain Bridge** project. To contribute, please adhere to the following architecture standards:

## Development Environment
- The project runs as an asynchronous view component inside the Obsidian Datacore environment.
- Any new features must support React/Preact styling and life cycle hooks.

## Rules
1. **Never hardcode secrets**: All credentials must reside in OS Keychains via `dc.app.secretStorage` or within the PBKDF2/AES-GCM encrypted backup files.
2. **Theme compliance**: Do not declare static color hex codes. Always use variables referencing Obsidian's native HSL styling palette (`var(--text-normal)`, `var(--interactive-accent)`).
3. **No absolute paths**: Filesystem pathing within component modules must use relative references from the component root or dynamic vault-relative resolvers like `dc.resolvePath`.
4. **Git Safety**: Never push to the main repository directly. All git operations must be scoped inside the component repository.
