# package.json — edits to make after importing the Lovable repo into Replit

Your Lovable repo already has a `package.json` (it's a Vite app). Make these three small edits so Replit builds the front end and runs the Express server.

## 1. Add `express` to dependencies

In the `"dependencies"` block, add:

```json
"express": "^4.19.2"
```

## 2. Make sure the project is ESM

The `server.js` uses `import` syntax. Confirm the top level of `package.json` has:

```json
"type": "module"
```

(Vite projects usually already have this. If it's missing, add it.)

## 3. Set the scripts

Replace the `"scripts"` block so `build` produces the Vite `dist/` and `start` runs the server:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "start": "node server.js"
}
```

That's it. Replit's `build` step runs `vite build` (creating `dist/`), and the `run` step runs `node server.js`, which serves that `dist/` and proxies `/api/*` to Supabase.
