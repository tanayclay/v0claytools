"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Zap, Target, CheckCircle, Sparkles, ExternalLink, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Tool {
  name: string
  description: string
  category: string
  use_cases: string[]
  integration_difficulty: string
  pricing_model: string
  website?: string
}

interface Recommendation {
  tool: Tool
  relevance_score: number
  reasoning: string
}

interface RecommendationResponse {
  recommendations: Recommendation[]
}

export default function ClayToolsRecommender() {
  const [tools, setTools] = useState<Tool[]>([])
  const [query, setQuery] = useState("")
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [toolsLoading, setToolsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Load tools on component mount
  useEffect(() => {
    const loadTools = async () => {
      try {
        console.log("Fetching tools from JSON...")
        const response = await fetch("https://brown-sarita-51.tiiny.site/clay-tools.json")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Raw JSON data:", data)

        // Try different possible structures
        let toolsArray: Tool[] = []

        if (Array.isArray(data)) {
          // If the root is an array
          toolsArray = data
        } else if (data.tools && Array.isArray(data.tools)) {
          // If tools are nested under 'tools' key
          toolsArray = data.tools
        } else if (data.data && Array.isArray(data.data)) {
          // If tools are nested under 'data' key
          toolsArray = data.data
        } else {
          // Try to find any array in the object
          const firstArrayValue = Object.values(data).find((value) => Array.isArray(value))
          if (firstArrayValue) {
            toolsArray = firstArrayValue as Tool[]
          }
        }

        console.log("Processed tools array:", toolsArray)
        console.log("Number of tools found:", toolsArray.length)

        if (toolsArray.length === 0) {
          setLoadError("No tools found in the JSON file")
        } else {
          setTools(toolsArray)
          setLoadError(null)
        }
      } catch (error) {
        console.error("Failed to load tools:", error)
        setLoadError(`Failed to load tools: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setToolsLoading(false)
      }
    }

    loadTools()
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setRecommendations(null) // Clear previous results

    try {
      console.log("Sending search request:", query)

      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error:", errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: RecommendationResponse = await response.json()
      console.log("Received recommendations:", data)

      setRecommendations(data)
    } catch (error) {
      console.error("Failed to get recommendations:", error)
      alert("Failed to get recommendations. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const exampleQueries = [
    "find qualified prospects for my startup",
    "automate LinkedIn outreach",
    "verify email addresses",
    "enrich leads with company data",
    "set up automated email sequences",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-6">
            <Zap className="w-8 h-8 text-orange-500" />
          </div>

          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Tools That Supercharge <span className="text-orange-500">Clay</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover the perfect integrations for your workflow with AI-powered recommendations
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Target className="w-4 h-4 mr-2" />
              {toolsLoading ? "Loading..." : `${tools.length}+ Curated Tools`}
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              Clay Bootcamp Approved
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {loadError && (
          <Alert className="mb-8 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{loadError}</AlertDescription>
          </Alert>
        )}

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-8 p-4 bg-gray-100 rounded-lg text-sm">
            <p>
              <strong>Debug Info:</strong>
            </p>
            <p>Tools loading: {toolsLoading.toString()}</p>
            <p>Tools count: {tools.length}</p>
            <p>Load error: {loadError || "None"}</p>
            {tools.length > 0 && <p>First tool: {JSON.stringify(tools[0], null, 2)}</p>}
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-center mb-6">What challenge can Clay help you solve?</h2>
          <p className="text-gray-600 text-center mb-8">
            Describe your workflow needs and AI will find the perfect tools
          </p>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <div className="flex items-center rounded-xl border-2 border-gray-200 focus-within:border-orange-300">
                <span className="pl-6 text-base md:text-lg whitespace-nowrap select-none">
                  Today, I want Clay to
                </span>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="help me find qualified prospects for my startup"
                  className="flex-1 text-base md:text-lg py-4 md:py-6 pl-2 pr-4 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={loading || toolsLoading}
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || toolsLoading || !query.trim()}
              className="px-8 py-6 text-lg rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Search className="w-5 h-5 mr-2" />
              Search
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Try these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(example)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 text-orange-600">
                <Sparkles className="w-5 h-5 animate-spin" />
                <span className="text-lg font-medium">AI is analyzing your request...</span>
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results */}
        {recommendations && !loading && recommendations.recommendations?.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matching tools found</h3>
            <p className="text-gray-600">Try rephrasing your request or using different keywords.</p>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && !loading && recommendations.recommendations?.length > 0 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Perfect Tools for Your Workflow</h3>
              <p className="text-gray-600">
                Here are the top {recommendations.recommendations.length} tools recommended by AI
              </p>
            </div>

            {recommendations.recommendations.map((rec, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{rec.tool.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(rec.relevance_score * 100)}% match
                        </Badge>
                      </div>
                      <CardDescription className="text-base">{rec.tool.description}</CardDescription>
                    </div>
                    {rec.tool.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={rec.tool.website} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Why this tool fits:</h4>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">{rec.reasoning}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Category:</span>
                        <p className="text-gray-600">{rec.tool.category || "N/A"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Difficulty:</span>
                        <p className="text-gray-600">{rec.tool.integration_difficulty || "N/A"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Pricing:</span>
                        <p className="text-gray-600">{rec.tool.pricing_model || "N/A"}</p>
                      </div>
                    </div>

                    {rec.tool.use_cases && rec.tool.use_cases.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 text-sm">Use Cases:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rec.tool.use_cases.slice(0, 3).map((useCase, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {useCase}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-gray-200">
          <p className="text-gray-600">
            Made with ♥ by{' '}
            <a
              href="https://www.linkedin.com/in/tanay-mishra-ai-automation/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-orange-500"
            >
              Tanay
            </a>{' '}
            from{' '}
            <a
              href="https://www.claybootcamp.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-orange-500"
            >
              Clay Bootcamp
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
