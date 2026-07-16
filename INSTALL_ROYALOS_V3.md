# Install RoyalOS V3 Plugin Platform

1. Stop the current RoyalOS server with `Ctrl + C`.
2. Keep your current working folder as a backup.
3. Extract this ZIP into a new empty folder.
4. Copy your private `.env.local` into the new `royalos-app` folder. Never overwrite it with `.env.example`.
5. Copy any logos or avatars that were added only to the old folder.
6. From the new project folder run:

```bash
npm install
npm run dev
```

7. Open `http://localhost:3000`.
8. Test these pages in order: Dashboard, Settings, Workspaces, Missions, Plugins, Michael P Records, Messages, Ifeoluwa, Nova Studio.
9. Open **Plugins → Upload Plugin ZIP** and test the included example package.

## Production validation commands

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Private configuration

Real API keys belong only in `.env.local`. The ZIP contains placeholders, not secrets.
