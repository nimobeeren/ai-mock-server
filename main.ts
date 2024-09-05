import "dotenv/config";

import { AzureOpenAI } from "openai";
import spec from "./openapi.json";

const responseSchema =
  spec.paths["/products"].get.responses[200].content["application/json"].schema;

console.log(JSON.stringify(responseSchema, null, 2));

const client = new AzureOpenAI();
const completion = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content:
        "You generate mock data for a development server based on an OpenAPI schema. Call the provided function once.",
    },
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "response",
        parameters: {
          type: "object",
          properties: {
            response: responseSchema,
          },
          required: ["firstName", "lastName"],
          additionalProperties: false,
        },
      },
    },
  ],
  tool_choice: "required",
});

const response = JSON.parse(completion.choices[0].message.tool_calls?.[0].function.arguments!);

console.log(response);
