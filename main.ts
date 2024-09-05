import "dotenv/config";

import $RefParser from "@apidevtools/json-schema-ref-parser";
import express, { type Request, type Response } from "express";
import _ from "lodash";
import { AzureOpenAI } from "openai";

import spec from "./specs/timetracking.json";

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

  let responseSchema = specPath.get.responses[200].content["application/json"].schema;

  responseSchema = mergeAllOf(responseSchema);

  console.log("after merge", JSON.stringify(responseSchema, null, 2));

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

// Function to recursively merge allOf schemas and concatenate required fields
function mergeAllOf(schema) {
  if (schema.allOf) {
    const merged = schema.allOf.reduce((acc, subschema) => {
      const mergedSubschema = mergeAllOf(subschema);
      const combinedRequired = _.union(acc.required || [], mergedSubschema.required || []);
      const combinedDescription = [acc.description, mergedSubschema.description]
        .filter(Boolean)
        .join(" ");
      return _.merge(acc, mergedSubschema, {
        required: combinedRequired,
        description: combinedDescription,
      });
    }, {});

    return _.omit({ ...schema, ...merged }, "allOf");
  }

  if (schema.type === "object" && schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      schema.properties[key] = mergeAllOf(schema.properties[key]);
    });
  } else if (schema.type === "array" && schema.items) {
    schema.items = mergeAllOf(schema.items);
  }

  return _.cloneDeep(schema);
}
