import "dotenv/config";
import http from "node:http";
import { agent } from "./agent.js";
import { HumanMessage } from "@langchain/core/messages";

const PORT = Number(process.env.AGENT_PORT || process.env.PORT || 3001);

/**
 * Executes a query against the agent and prints intermediate tool calls and final response.
 */
export async function runQuery(query: string, threadId = "default-thread") {
  console.log(`\n[Agent Query]: "${query}" (thread: ${threadId})\n`);

  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  const stream = await agent.stream(
    {
      messages: [new HumanMessage(query)],
    },
    {
      ...config,
      streamMode: "updates",
    }
  );

  let finalResponse = "";

  for await (const chunk of stream) {
    // Inspect chunk for node updates
    const updates = chunk as Record<string, { messages?: Array<any> }>;
    for (const [nodeName, nodeState] of Object.entries(updates)) {
      if (!nodeState?.messages) continue;
      for (const msg of nodeState.messages) {
        if (msg._getType?.() === "ai" || msg.type === "ai") {
          if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
            for (const tc of msg.tool_calls) {
              console.log(`  → [Tool Call]: ${tc.name}(${JSON.stringify(tc.args)})`);
            }
          }
          if (typeof msg.content === "string" && msg.content.trim()) {
            finalResponse = msg.content;
          }
        } else if (msg._getType?.() === "tool" || msg.type === "tool") {
          const preview =
            typeof msg.content === "string"
              ? msg.content.slice(0, 120).replace(/\n/g, " ")
              : JSON.stringify(msg.content).slice(0, 120);
          console.log(`  ← [Tool Result]: ${msg.name} => ${preview}...`);
        }
      }
    }
  }

  console.log("\n[Agent Answer]:\n" + finalResponse + "\n");
  return finalResponse;
}

/**
 * HTTP Service for Cartograph Agent.
 * Listens on AGENT_PORT (default 3001) and streams tool calls and response tokens.
 */
export function startAgentServer(port = PORT): http.Server {
  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Enable CORS for local Cartograph Next.js app
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cartograph-credential");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", name: "cartograph-agent", toolsCount: 6 }));
      return;
    }

    if (req.method === "POST" && (url.pathname === "/chat" || url.pathname === "/stream")) {
      let body = "";
      req.on("data", (chunk: Buffer | string) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const message = payload.message || payload.query;
          const threadId = payload.threadId || payload.thread_id || `thread-${Date.now()}`;

          if (!message || typeof message !== "string") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing 'message' field" }));
            return;
          }

          // Server-Sent Events (SSE) streaming response
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });

          const config = {
            configurable: {
              thread_id: threadId,
            },
          };

          const stream = await agent.stream(
            {
              messages: [new HumanMessage(message)],
            },
            {
              ...config,
              streamMode: "updates",
            }
          );

          for await (const chunk of stream) {
            const updates = chunk as Record<string, { messages?: Array<any> }>;
            for (const [nodeName, nodeState] of Object.entries(updates)) {
              if (!nodeState?.messages) continue;
              for (const msg of nodeState.messages) {
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                  for (const tc of msg.tool_calls) {
                    res.write(
                      `event: tool_call\ndata: ${JSON.stringify({
                        tool: tc.name,
                        args: tc.args,
                        id: tc.id,
                      })}\n\n`
                    );
                  }
                }
                if (msg._getType?.() === "tool" || msg.type === "tool") {
                  res.write(
                    `event: tool_result\ndata: ${JSON.stringify({
                      name: msg.name,
                      result: msg.content,
                    })}\n\n`
                  );
                }
                if ((msg._getType?.() === "ai" || msg.type === "ai") && typeof msg.content === "string" && msg.content) {
                  res.write(
                    `event: token\ndata: ${JSON.stringify({
                      content: msg.content,
                    })}\n\n`
                  );
                }
              }
            }
          }

          res.write(`event: done\ndata: ${JSON.stringify({ threadId })}\n\n`);
          res.end();
        } catch (err: unknown) {
          console.error("[Agent Server Error]:", err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          } else {
            res.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`);
            res.end();
          }
        }
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  });

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(` Cartograph Deep Agent Service running on http://localhost:${port}`);
    console.log(` Health check: http://localhost:${port}/health`);
    console.log(` Stream endpoint: POST http://localhost:${port}/chat`);
    console.log(`======================================================\n`);
  });

  return server;
}

// If invoked from CLI directly:
const args = process.argv.slice(2);
const isServerMode = args.includes("--server") || args.length === 0;

if (isServerMode) {
  startAgentServer(PORT);
} else {
  const query = args.join(" ");
  runQuery(query)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
