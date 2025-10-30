import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { z } from "zod";
const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";
// Create MCP server instance (stdio-based)
const server = new McpServer({
    name: "weather",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Write a function to sort an array
function sortArray(arr) {
    return arr.sort((a, b) => a - b);
}
// Example usage of sortArray
const unsortedArray = [5, 2, 9, 1, 5, 6];
const sortedArray = sortArray(unsortedArray);
console.log("Sorted Array:", sortedArray);
// Example function to reverse a string
function reverseString(str) {
    return str.split("").reverse().join("");
}
// Example usage of reverseString
const originalString = "hello";
const reversedString = reverseString(originalString);
console.log("Reversed String:", reversedString);
// Optimize the factorial function using memoization to improve efficiency
const factorialMemo = {};
function factorial(n) {
    if (n <= 1)
        return 1;
    if (factorialMemo[n])
        return factorialMemo[n];
    factorialMemo[n] = n * factorial(n - 1);
    return factorialMemo[n];
}
// Register weather tools
server.tool("get-alerts", "Get weather alerts for a state", {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
}, async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await makeNWSRequest(alertsUrl);
    if (!alertsData) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to retrieve alerts data",
                },
            ],
        };
    }
    const features = alertsData.features || [];
    if (features.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: `No active alerts for ${stateCode}`,
                },
            ],
        };
    }
    const formattedAlerts = features.map(formatAlert);
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;
    return {
        content: [
            {
                type: "text",
                text: alertsText,
            },
        ],
    };
});
server.tool("get-forecast", "Get weather forecast for a location", {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe("Longitude of the location"),
}, async ({ latitude, longitude }) => {
    // Get grid point data
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointsData = await makeNWSRequest(pointsUrl);
    if (!pointsData) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
                },
            ],
        };
    }
    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to get forecast URL from grid point data",
                },
            ],
        };
    }
    // Get forecast data
    const forecastData = await makeNWSRequest(forecastUrl);
    if (!forecastData) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to retrieve forecast data",
                },
            ],
        };
    }
    const periods = forecastData.properties?.periods || [];
    if (periods.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "No forecast periods available",
                },
            ],
        };
    }
    // Format forecast periods
    const formattedForecast = periods.map((period) => [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
    ].join("\n"));
    const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;
    return {
        content: [
            {
                type: "text",
                text: forecastText,
            },
        ],
    };
});
// Helper function for making NWS API requests
async function makeNWSRequest(url) {
    const headers = {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
    };
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json());
    }
    catch (error) {
        console.error("Error making NWS request:", error);
        return null;
    }
}
// Format alert data
function formatAlert(feature) {
    const props = feature.properties;
    return [
        `Event: ${props.event || "Unknown"}`,
        `Area: ${props.areaDesc || "Unknown"}`,
        `Severity: ${props.severity || "Unknown"}`,
        `Status: ${props.status || "Unknown"}`,
        `Headline: ${props.headline || "No headline"}`,
        "---",
    ].join("\n");
}
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
const tickets = [];
// Zod schema for ticket creation
const ticketSchema = z.object({
    origin: z
        .string()
        .length(3)
        .transform((s) => s.toUpperCase())
        .refine((s) => /^[A-Z]{3}$/.test(s), { message: "origin must be a 3-letter IATA code" }),
    destination: z
        .string()
        .length(3)
        .transform((s) => s.toUpperCase())
        .refine((s) => /^[A-Z]{3}$/.test(s), { message: "destination must be a 3-letter IATA code" }),
    travelDate: z
        .string()
        .refine((d) => !isNaN(Date.parse(d)), { message: "travelDate must be a valid ISO date" }),
    seatClass: z.enum(["economy", "business", "first"]),
    quantity: z.number().int().positive(),
    passengerNames: z.array(z.string().min(1)).nonempty(),
});
// Express app setup
const app = express();
app.use(express.json());
// Health endpoint
app.get("/health", (_req, res) => {
    const pkgVersion = "1.0.0"; // Could import from package.json with dynamic import if needed
    res.json({
        status: "ok",
        uptimeSeconds: Math.round(process.uptime()),
        version: pkgVersion,
        tickets: tickets.length,
        timestamp: new Date().toISOString(),
    });
});
// Create tickets endpoint
app.post("/tickets", (req, res) => {
    const parseResult = ticketSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            error: "Invalid request body",
            details: parseResult.error.issues.map((i) => ({ path: i.path, message: i.message })),
        });
    }
    const data = parseResult.data;
    if (data.quantity !== data.passengerNames.length) {
        return res.status(400).json({
            error: "quantity must match passengerNames length",
        });
    }
    // Simple ID generator
    const baseId = `${data.origin}-${data.destination}-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const createdTickets = data.passengerNames.map((name, idx) => {
        return {
            id: `${baseId}-${idx + 1}`,
            origin: data.origin,
            destination: data.destination,
            travelDate: data.travelDate,
            seatClass: data.seatClass,
            passengerNames: [name],
            quantity: 1,
            createdAt,
        };
    });
    tickets.push(...createdTickets);
    res.status(201).json({
        message: "Tickets created",
        count: createdTickets.length,
        tickets: createdTickets,
    });
});
// List tickets endpoint (optional convenience)
app.get("/tickets", (_req, res) => {
    res.json({ count: tickets.length, tickets });
});
// Start server only if not under test
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(PORT, () => {
    console.error(`HTTP API server listening on port ${PORT}`);
});
