import "dotenv/config";

import { AzureOpenAI } from "openai";

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
        name: "returnData",
        parameters: {
          type: "object",
          properties: {
            firstName: {
              type: "string",
            },
            lastName: {
              type: "string",
            },
          },
          required: ["firstName", "lastName"],
          additionalProperties: false,
        },
      },
    },
  ],
  tool_choice: "required",
});

console.log(
  JSON.stringify(completion.choices[0].message.tool_calls?.[0], null, 2)
);
