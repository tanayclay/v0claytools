import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 30 // seconds
const TOOLS_URL = "https://brown-sarita-51.tiiny.site/clay-tools.json"

const RecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      tool_name: z.string(),
      relevance_score: z.number().min(0).max(1),
      reasoning: z.string(),
    }),
  ),
})

export async function POST(req: Request) {
  console.log("=== API Route Started ===")

  // --- 1. Validate API key --------------------------------------------------
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is missing")
    return Response.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 })
  }

  // --- 2. Parse user request -------------------------------------------------
  const { query } = await req.json()
  console.log("User query:", query)

  if (!query || typeof query !== "string" || !query.trim()) {
    console.error("Invalid query:", query)
    return Response.json({ error: "Missing or empty query." }, { status: 400 })
  }

  // --- 3. Fetch tools list on the server ------------------------------------
  let rawTools: any[] = []
  try {
    console.log("Fetching tools from:", TOOLS_URL)
    const res = await fetch(TOOLS_URL)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const json = await res.json()
    console.log("Raw JSON structure:", Object.keys(json))

    // Try different possible structures
    if (Array.isArray(json)) {
      rawTools = json
    } else if (json.tools && Array.isArray(json.tools)) {
      rawTools = json.tools
    } else if (json.data && Array.isArray(json.data)) {
      rawTools = json.data
    } else {
      // Find first array property
      const arrayValue = Object.values(json).find((val) => Array.isArray(val))
      if (arrayValue) {
        rawTools = arrayValue as any[]
      }
    }

    console.log("Raw tools found:", rawTools.length)
    if (rawTools.length > 0) {
      console.log("First raw tool sample:", rawTools[0])
    }

    if (!Array.isArray(rawTools) || rawTools.length === 0) {
      throw new Error("No tools array found in JSON")
    }
  } catch (e) {
    console.error("Tool-list fetch error:", e)
    return Response.json({ error: "Failed to load tools list." }, { status: 500 })
  }

  // --- 4. Normalize tools and build lookup map ------------------------------
  const tools: any[] = []
  const toolMap = new Map<string, any>()
  const toolNames: string[] = []

  rawTools.forEach((rawTool, index) => {
    // Handle different possible name fields
    const name = rawTool["Name Of Tool"] || rawTool.name || rawTool.Name || rawTool.title
    const description = rawTool.Description || rawTool.description || rawTool.desc || ""
    const url = rawTool.Url || rawTool.url || rawTool.website || ""
    const gtmUseCases = rawTool["GTM Use Cases"] || rawTool.use_cases || rawTool.useCases || ""
    const clayIntegration = rawTool["Clay Integration Overview"] || rawTool.integration || ""

    if (name && typeof name === "string" && name.trim()) {
      const normalizedTool = {
        name: name.trim(),
        description: description,
        website: url,
        category: "Clay Integration",
        use_cases: gtmUseCases ? gtmUseCases.split(",").map((s: string) => s.trim()) : [],
        integration_difficulty: "Medium",
        pricing_model: "Varies",
        clay_integration: clayIntegration,
      }

      tools.push(normalizedTool)
      toolMap.set(name.trim().toLowerCase(), normalizedTool)
      toolNames.push(name.trim())
    } else {
      console.warn(`Tool at index ${index} has invalid name:`, rawTool)
    }
  })

  console.log("Normalized tools:", tools.length)
  console.log("Valid tools mapped:", toolMap.size)
  console.log("Sample tool names:", toolNames.slice(0, 5))

  if (tools.length === 0) {
    return Response.json({ error: "No valid tools found in the data" }, { status: 500 })
  }

  // --- 5. Call OpenAI with STRICT constraints -------------------------------
  try {
    console.log("Calling OpenAI...")

    const { object } = await generateObject({
      model: openai("gpt-4o", { apiKey: process.env.OPENAI_API_KEY! }),
      schema: RecommendationSchema,
      prompt: `
You are a Clay workflow consultant helping users find the right tools.

User request: "${query.trim()}"

You MUST ONLY recommend tools from this exact list. Use the EXACT tool names as they appear:

${toolNames.map((name, i) => `${i + 1}. ${name}`).join("\n")}

Tool details for context:
${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

RULES:
1. ONLY use tool names from the numbered list above
2. Recommend 3-5 most relevant tools
3. Calculate relevance score 0-1 based on how well each tool matches the user's needs
4. Provide clear reasoning for each recommendation
5. Use the EXACT tool name as it appears in the list

Analyze the user's request and recommend the most relevant tools.
`,
    })

    console.log("OpenAI response:", object)

    // --- 6. Filter to guaranteed-real tools -----------------------------------
    const validRecommendations = object.recommendations
      .map((rec, index) => {
        console.log(`Processing recommendation ${index + 1}:`, rec.tool_name)

        if (!rec.tool_name || rec.tool_name === "undefined") {
          console.warn("Recommendation has undefined tool_name:", rec)
          return null
        }

        const lowerToolName = rec.tool_name.toLowerCase()
        const matchedTool = toolMap.get(lowerToolName)

        if (!matchedTool) {
          console.warn(`Tool not found in map: "${rec.tool_name}" (lowercase: "${lowerToolName}")`)
          console.log("Available keys sample:", Array.from(toolMap.keys()).slice(0, 10))
          return null
        }

        return {
          tool: matchedTool,
          relevance_score: rec.relevance_score,
          reasoning: rec.reasoning,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.relevance_score - a!.relevance_score)

    console.log("Valid recommendations:", validRecommendations.length)

    const MIN_RELEVANCE = 0.3
    const hasStrongMatch = validRecommendations.some(
      (rec) => rec!.relevance_score >= MIN_RELEVANCE
    )

    if (validRecommendations.length === 0 || !hasStrongMatch) {
      return Response.json({
        message:
          "Sorry we couldn't recommend a tool for this use case. You can submit your use case to tanay@claybootcamp.com or check out the whole list of tools at https://remarkable-lily-32f8dd.netlify.app/",
      })
    }

    return Response.json({ recommendations: validRecommendations })
  } catch (aiError) {
    console.error("OpenAI error:", aiError)
    return Response.json({ error: "AI processing failed" }, { status: 500 })
  }
}
