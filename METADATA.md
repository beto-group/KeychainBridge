---
author: beto.group
version: 2.0.0
id: keychain-bridge-82
name: KEYCHAIN BRIDGE
description: Unified secure credential bridge combining native OS keychain storage (SecretStorage) with client-side encrypted PBKDF2/AES-GCM offline backups, snapshot history, and plain-text leak detection.
status: stable
complexity: advanced
category:
  - Developer Tools
  - Security
  - Backup
compatibility:
  - Obsidian >=1.5.0
repository:
  - https://github.com/beto-group/KeychainBridge
missing: []
resources:
  - assets/keychain_bridge_1.webp
  - data/mcp_commands.json
type: DatacoreComponent
target: Datacore
security:
  - NodeFS
  - Network
  - Basic
storage:
  - Vault
network: Offline
runtime: PureJS
entry_point: KEYCHAIN BRIDGE.md
logic: src/index.jsx
contributor: []
---

This file contains the machine-readable packaging manifest and indexing properties for this component.
