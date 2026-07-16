# RoyalOS V3 Plugin Developer Guide

## What the plugin system does

RoyalOS V3 includes a WordPress-style plugin workflow:

1. Open **Plugins** in the RoyalOS sidebar.
2. Browse the built-in Marketplace or select **Upload Plugin ZIP**.
3. Review the plugin name, version, permissions, employee assignments, required environment variables, and actions.
4. Install and enable the plugin.
5. Configure any required credentials in `.env.local` and restart RoyalOS.
6. The plugin appears in the registry and its capabilities become available to the assigned employees without editing RoyalOS source files.

RoyalOS plugins are RoyalOS-compatible packages. A WordPress plugin ZIP cannot be uploaded directly because WordPress plugins use PHP and a different runtime. A developer can create a RoyalOS adapter plugin for the same service.

## Security model

RoyalOS V3 accepts declarative plugins only. Uploaded packages cannot contain JavaScript, TypeScript, executables, shell scripts, PHP, Python, or arbitrary server code. This prevents a ZIP from silently taking control of the RoyalOS server.

The installer enforces:

- one `royalos-plugin.json` manifest
- maximum ZIP size of 25 MB
- RoyalOS V3 compatibility
- strict manifest validation
- path traversal protection
- approved file extensions only
- declared permissions
- HTTPS-only external actions
- blocking of localhost and private-network webhook destinations
- environment-variable health checks
- SHA-256 package checksums
- enable, disable, health-check, and uninstall controls

## ZIP structure

```text
my-plugin/
├── royalos-plugin.json
├── README.md
├── icon.png
└── optional-static-template.html
```

All files must be inside the same folder as the manifest.

## Example manifest

```json
{
  "schemaVersion": 1,
  "id": "vendor.business-plugin",
  "name": "Business Plugin",
  "version": "1.0.0",
  "description": "Adds a controlled business workflow to RoyalOS.",
  "author": "Vendor Name",
  "category": "Productivity",
  "royalosVersion": ">=3.0.0",
  "permissions": ["missions:write", "knowledge:read"],
  "capabilities": ["Business report generation"],
  "assignedEmployees": ["Atlas"],
  "requiredEnvironment": ["VENDOR_API_KEY"],
  "actions": [
    {
      "id": "create-report",
      "label": "Create report",
      "kind": "report",
      "employee": "Atlas",
      "promptTemplate": "Create a report about: {{input}}",
      "approvalRequired": false
    }
  ]
}
```

## Action types

### `workflow`
Runs a RoyalOS employee workflow using the configured prompt template. Use `{{input}}` where the user's instruction should appear.

### `report`
Runs a RoyalOS employee workflow intended to return a structured report.

### `webhook`
Calls a declared HTTPS endpoint. Use `authEnvironment` to provide a bearer token from `.env.local`. Private-network destinations are blocked.

### `open_url`
Returns a validated HTTPS destination for RoyalOS to open in a new browser tab.

## Important boundary

Installing a plugin registers it automatically, but an external service cannot work until its own developer credentials, subscription, OAuth consent, and provider permissions are valid. RoyalOS never fabricates credentials or treats a visual “connected” badge as proof that a provider action succeeded.

## Included sample

Upload:

```text
examples/plugins/ROYALOS_EXAMPLE_BUSINESS_RESEARCH_PLUGIN.zip
```

It adds an Atlas-powered research action and demonstrates the full ZIP installation path.
