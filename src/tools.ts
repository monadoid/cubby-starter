/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod/v3";

import type { Chat } from "./server";
import { getCurrentAgent } from "agents";
import { scheduleSchema } from "agents/schedule";
import { createClient } from "@cubby/js";

/**
 * Helper to initialize Cubby client with credentials from environment
 */
function getCubbyClient() {
  const baseUrl = process.env.CUBBY_API_BASE_URL;
  const clientId = process.env.CUBBY_CLIENT_ID;
  const clientSecret = process.env.CUBBY_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error(
      "cubby credentials not configured. set CUBBY_API_BASE_URL, CUBBY_CLIENT_ID, and CUBBY_CLIENT_SECRET"
    );
  }

  return createClient({ baseUrl, clientId, clientSecret });
}

/**
 * Weather information tool that requires human confirmation
 * When invoked, this will present a confirmation dialog to the user
 */
const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  inputSchema: z.object({ city: z.string() })
  // Omitting execute function makes this tool require human confirmation
});

/**
 * Local time tool that executes automatically
 * Since it includes an execute function, it will run without user confirmation
 * This is suitable for low-risk operations that don't need oversight
 */
const getLocalTime = tool({
  description: "get the local time for a specified location",
  inputSchema: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    console.log(`Getting local time for ${location}`);
    return "10am";
  }
});

const scheduleTask = tool({
  description: "A tool to schedule a task to be executed at a later time",
  inputSchema: scheduleSchema,
  execute: async ({ when, description }) => {
    // we can now read the agent context from the ALS store
    const { agent } = getCurrentAgent<Chat>();

    function throwError(msg: string): string {
      throw new Error(msg);
    }
    if (when.type === "no-schedule") {
      return "Not a valid schedule input";
    }
    const input =
      when.type === "scheduled"
        ? when.date // scheduled
        : when.type === "delayed"
          ? when.delayInSeconds // delayed
          : when.type === "cron"
            ? when.cron // cron
            : throwError("not a valid schedule input");
    try {
      agent!.schedule(input!, "executeTask", description);
    } catch (error) {
      console.error("error scheduling task", error);
      return `Error scheduling task: ${error}`;
    }
    return `Task scheduled for type "${when.type}" : ${input}`;
  }
});

/**
 * Tool to list all scheduled tasks
 * This executes automatically without requiring human confirmation
 */
const getScheduledTasks = tool({
  description: "List all tasks that have been scheduled",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();

    try {
      const tasks = agent!.getSchedules();
      if (!tasks || tasks.length === 0) {
        return "No scheduled tasks found.";
      }
      return tasks;
    } catch (error) {
      console.error("Error listing scheduled tasks", error);
      return `Error listing scheduled tasks: ${error}`;
    }
  }
});

/**
 * Tool to cancel a scheduled task by its ID
 * This executes automatically without requiring human confirmation
 */
const cancelScheduledTask = tool({
  description: "Cancel a scheduled task using its ID",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to cancel")
  }),
  execute: async ({ taskId }) => {
    const { agent } = getCurrentAgent<Chat>();
    try {
      await agent!.cancelSchedule(taskId);
      return `Task ${taskId} has been successfully canceled.`;
    } catch (error) {
      console.error("error canceling scheduled task", error);
      return `error canceling task ${taskId}: ${error}`;
    }
  }
});

/**
 * Cubby tool to search user's screen and audio history
 * Executes automatically - searches are read-only and low-risk
 */
const searchCubby = tool({
  description:
    "search the user's screen and audio history captured by cubby. use this to find information from their past activity, meetings, conversations, or anything they've seen on their screen.",
  inputSchema: z.object({
    query: z.string().describe("search query"),
    limit: z.number().optional().default(5).describe("number of results"),
    contentType: z
      .enum(["ocr", "audio", "ui", "all"])
      .optional()
      .default("all")
      .describe("type of content to search")
  }),
  execute: async ({ query, limit, contentType }) => {
    try {
      const client = getCubbyClient();

      console.log(`searching cubby: "${query}" (limit: ${limit}, type: ${contentType})`);

      // list devices and use the first one
      const devicesResponse = await client.listDevices();
      if (!devicesResponse?.devices?.length) {
        return "no cubby devices found. user needs to enroll a device first.";
      }

      const deviceId = String(devicesResponse.devices[0].id);
      client.setDeviceId(deviceId);

      const results = await client.search({
        q: query,
        limit,
        content_type: contentType
      });

      if (!results?.data?.length) {
        return `no results found for "${query}"`;
      }

      const formatted = results.data
        .map((item, idx) => {
          const timestamp = item.content.timestamp || "unknown time";
          const text = item.content.text || "";
          const type = item.type || "unknown";
          return `${idx + 1}. [${type}] ${timestamp}\n   ${text.substring(0, 200)}${text.length > 200 ? "..." : ""}`;
        })
        .join("\n\n");

      return `found ${results.pagination.total} results:\n\n${formatted}`;
    } catch (error) {
      console.error("error searching cubby:", error);
      return `error searching cubby: ${error}`;
    }
  }
});

/**
 * Cubby tool to send desktop notification to user's device
 * Executes automatically - notifications are helpful and low-risk
 */
const notifyCubby = tool({
  description:
    "send a desktop notification to the user's device via cubby. use this to alert them about important information, reminders, or task completions.",
  inputSchema: z.object({
    title: z.string().describe("notification title"),
    body: z.string().describe("notification body text")
  }),
  execute: async ({ title, body }) => {
    try {
      const client = getCubbyClient();

      console.log(`sending cubby notification: ${title}`);

      // list devices and use the first one
      const devicesResponse = await client.listDevices();
      if (!devicesResponse?.devices?.length) {
        return "no cubby devices found. user needs to enroll a device first.";
      }

      const deviceId = String(devicesResponse.devices[0].id);
      client.setDeviceId(deviceId);

      await client.notify({ title, body });

      return `notification sent: "${title}"`;
    } catch (error) {
      console.error("error sending cubby notification:", error);
      return `error sending notification: ${error}`;
    }
  }
});

/**
 * Cubby tool to open an application on user's device
 * Requires confirmation - opening apps is a sensitive action
 */
const openApplication = tool({
  description:
    "open an application on the user's device. examples: 'slack', 'visual studio code', 'chrome'",
  inputSchema: z.object({
    appName: z.string().describe("name of the application to open")
  })
  // no execute function = requires human confirmation
});

/**
 * Cubby tool to open a URL in user's browser
 * Requires confirmation - opening URLs is a sensitive action
 */
const openUrl = tool({
  description:
    "open a url in the user's web browser. optionally specify which browser to use.",
  inputSchema: z.object({
    url: z.string().describe("url to open (must include https:// or http://)"),
    browser: z
      .string()
      .optional()
      .describe("browser name (optional, e.g. 'safari', 'chrome')")
  })
  // no execute function = requires human confirmation
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  getWeatherInformation,
  getLocalTime,
  scheduleTask,
  getScheduledTasks,
  cancelScheduledTask,
  // cubby tools
  searchCubby,
  notifyCubby,
  openApplication,
  openUrl
} satisfies ToolSet;

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 */
export const executions = {
  getWeatherInformation: async ({ city }: { city: string }) => {
    console.log(`getting weather information for ${city}`);
    return `the weather in ${city} is sunny`;
  },
  openApplication: async ({ appName }: { appName: string }) => {
    try {
      const client = getCubbyClient();

      console.log(`opening application: ${appName}`);

      // list devices and use the first one
      const devicesResponse = await client.listDevices();
      if (!devicesResponse?.devices?.length) {
        return "no cubby devices found. user needs to enroll a device first.";
      }

      const deviceId = String(devicesResponse.devices[0].id);
      client.setDeviceId(deviceId);

      await client.device.openApplication(appName);

      return `opened application: ${appName}`;
    } catch (error) {
      console.error("error opening application:", error);
      return `error opening application: ${error}`;
    }
  },
  openUrl: async ({ url, browser }: { url: string; browser?: string }) => {
    try {
      const client = getCubbyClient();

      console.log(`opening url: ${url}${browser ? ` in ${browser}` : ""}`);

      // list devices and use the first one
      const devicesResponse = await client.listDevices();
      if (!devicesResponse?.devices?.length) {
        return "no cubby devices found. user needs to enroll a device first.";
      }

      const deviceId = String(devicesResponse.devices[0].id);
      client.setDeviceId(deviceId);

      await client.device.openUrl(url, browser);

      return `opened url: ${url}${browser ? ` in ${browser}` : ""}`;
    } catch (error) {
      console.error("error opening url:", error);
      return `error opening url: ${error}`;
    }
  }
};
