import "dotenv/config";

import $RefParser from "@apidevtools/json-schema-ref-parser";
import express, { type Request, type Response } from "express";
import { AzureOpenAI } from "openai";

import spec from "./specs/ecommerce.json";

const app = express();

await $RefParser.dereference(spec);

app.get("*", async (req: Request, res: Response) => {
  let path = req.path;
  if (path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  const specPath = spec.paths[path];
  if (!specPath) {
    console.log(`[404] ${path}`);
    return res.status(404).send();
  }

  console.log(`[200] ${path}`);

  const responseSchema = specPath.get.responses[200].content["application/json"].schema;

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

  const { response } = JSON.parse(
    completion.choices[0].message.tool_calls?.[0].function.arguments!
  );

  return res.json(response);
});

app.listen(5010, () => console.log("listening"));
