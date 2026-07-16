# RoyalOS V3 Marketplace setup

RoyalOS now supports three plugin sources:

1. Built-in official catalog.
2. Uploadable RoyalOS plugin ZIP packages.
3. An optional remote HTTPS marketplace catalog.

Set this in `.env.local` to connect a hosted marketplace:

```env
ROYALOS_MARKETPLACE_URL=https://plugins.example.com/catalog.json
```

The endpoint must return either a JSON array of valid RoyalOS manifests or:

```json
{ "plugins": [ /* RoyalOS manifests */ ] }
```

Remote entries are validated with the same schema as built-in plugins. Installing an entry registers its declarative capabilities; credentials remain server-side in `.env.local`.

The included test package is:

`examples/plugins/ROYALOS_AUTHENTICATION_PRO_TEST_PLUGIN.zip`

Do not upload WordPress PHP plugins or arbitrary JavaScript packages. RoyalOS V3 accepts declarative, permission-scoped packages only.
