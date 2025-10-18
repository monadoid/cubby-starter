# cubby + cloudflare agents starter

<a href="https://deploy.workers.cloudflare.com/?url=https://github.com/monadoid/cubby-starter"><img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare"/></a>

a cloudflare worker starter template that combines ai chat agents with cubby integration!

## features

- 💬 ai chat agent powered by openai gpt-4
- 🧠 cubby integration: search screen and audio history
- 🔔 send desktop notifications to your devices
- 🚀 open applications and urls on your devices (with confirmation)
- 📅 task scheduling (one-time, delayed, and recurring via cron)
- 🛠️ human-in-the-loop tool confirmations for sensitive operations
- 🌓 dark/light theme ui
- ⚡️ real-time streaming responses
- 💾 durable objects for chat persistence

## prerequisites

- cloudflare account
- openai api key ([get one here](https://platform.openai.com/api-keys))
- cubby account and credentials ([get them at cubby.sh/dashboard](https://cubby.sh/dashboard))

## quick start

### option 1: deploy to cloudflare (one-click)

1. click the "deploy to cloudflare" button above
2. follow the prompts to create a new repository and deploy
3. add your secrets via wrangler (see production deployment below)

### option 2: clone and deploy manually

1. clone this repository:
```bash
git clone https://github.com/yourusername/cubby-starter
cd cubby-starter
```

2. install dependencies:
```bash
pnpm install
```

3. create your `.dev.vars` file:
```bash
cp .dev.vars.example .dev.vars
```

4. edit `.dev.vars` and add your credentials:
```env
OPENAI_API_KEY=sk-...
CUBBY_API_BASE_URL=https://api.cubby.sh
CUBBY_CLIENT_ID=your-client-id
CUBBY_CLIENT_SECRET=your-client-secret
```

5. run locally:
```bash
pnpm start
```

6. visit `http://localhost:8787` and start chatting!

## using cubby tools

once running, you can ask the agent to:

- **search your memory**: "search my screen for project deadline"
- **send notifications**: "notify me that the build is complete"
- **open apps**: "open slack" (requires confirmation)
- **open urls**: "open github.com" (requires confirmation)
- **schedule tasks**: "remind me in 30 minutes to check email"

the agent has access to your cubby personal memory system and can search through your screen captures and audio transcriptions.

## production deployment

deploy to cloudflare workers:

```bash
pnpm deploy
```

then set your production secrets:

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put CUBBY_API_BASE_URL
wrangler secret put CUBBY_CLIENT_ID
wrangler secret put CUBBY_CLIENT_SECRET
```

## project structure

```
├── src/
│   ├── app.tsx              # chat ui (react)
│   ├── server.ts            # chat agent logic
│   ├── tools.ts             # tool definitions (weather, cubby, scheduling)
│   ├── components/          # ui components
│   └── ...
├── wrangler.jsonc           # cloudflare worker config
├── package.json             # dependencies
└── .dev.vars.example        # environment variables template
```

## customization

### adding new tools

edit `src/tools.ts` to add new tools:

```typescript
// auto-executing tool (no confirmation needed)
const myAutoTool = tool({
  description: "does something automatically",
  inputSchema: z.object({
    param: z.string()
  }),
  execute: async ({ param }) => {
    // your implementation
    return "result";
  }
});

// confirmation-required tool
const mySensitiveTool = tool({
  description: "does something that needs approval",
  inputSchema: z.object({
    param: z.string()
  })
  // no execute = requires confirmation
});

// add to tools export
export const tools = {
  // ... existing tools
  myAutoTool,
  mySensitiveTool
};

// add execution handler for confirmation-required tools
export const executions = {
  // ... existing executions
  mySensitiveTool: async ({ param }: { param: string }) => {
    // implementation after user confirms
    return "result";
  }
};
```

then update `src/app.tsx` to add sensitive tools to the confirmation list:

```typescript
const toolsRequiringConfirmation: (keyof typeof tools)[] = [
  "getWeatherInformation",
  "openApplication",
  "openUrl",
  "mySensitiveTool" // add your new tool here
];
```

### customizing the ui

- modify theme colors in `src/styles.css`
- edit components in `src/components/`
- adjust chat interface in `src/app.tsx`

### customizing the agent

edit the system prompt in `src/server.ts`:

```typescript
system: `you are a helpful assistant that can do various tasks.

you have access to the user's cubby - a personal memory system...

// add your custom instructions here
`,
```

## cubby setup

to use cubby features, you need:

1. a cubby account ([sign up at cubby.sh](https://cubby.sh))
2. the cubby desktop app running and capturing your screen/audio
3. at least one enrolled device
4. api credentials from the [cubby dashboard](https://cubby.sh/dashboard)

cubby captures your screen and audio locally, then syncs to the cloud so you can search through your past activity.

## development

```bash
# start dev server with hot reload
pnpm start

# run type checking
pnpm check

# format code
pnpm format

# run tests
pnpm test

# generate wrangler types
pnpm types
```

## links

- **cubby docs**: [cubby.sh/docs](https://cubby.sh/docs)
- **cubby sdk**: [@cubby/js on npm](https://npmjs.com/@cubby/js)
- **cloudflare agents**: [developers.cloudflare.com/agents](https://developers.cloudflare.com/agents/)
- **cloudflare workers**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)

## license

MIT
