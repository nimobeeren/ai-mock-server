import "dotenv/config";

import $RefParser from "@apidevtools/json-schema-ref-parser";
import express, { type Request, type Response } from "express";
import _ from "lodash";
import { AzureOpenAI } from "openai";

import spec from "./specs/ecommerce.json";

const app = express();

await $RefParser.dereference(spec);

app.all("*", async (req: Request, res: Response) => {
  let path = req.path;
  if (path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  if (!spec.paths[path]) {
    console.log(`[404] ${path}`);
    return res.status(404).send();
  }

  const method = req.method.toLowerCase();
  if (!spec.paths[path][method]) {
    console.log(`[405] ${path}`);
    return res.status(405).send();
  }

  let responseBodySchema =
    spec.paths[path][method].responses[200].content["application/json"].schema;

  // Make some changes to the schema to make it more compatible with OpenAI Structured Output
  responseBodySchema = mergeAllOf(responseBodySchema);
  responseBodySchema = removeUnsupportedProperties(responseBodySchema);
  responseBodySchema = disallowAdditionalProperties(responseBodySchema);
  responseBodySchema = makeAllPropertiesRequired(responseBodySchema);

  const responseSchema = {
    type: "object",
    properties: {
      body: responseBodySchema,
      status: {
        type: "integer",
      },
    },
    required: ["body", "status"],
    additionalProperties: false,
  };

  const client = new AzureOpenAI();
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "Generate realistic mock data for an API.",
      },
      {
        role: "user",
        content: `Query parameters: ${JSON.stringify(req.query)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "response",
        schema: responseSchema,
        strict: true,
      },
    },
  });

  const { body, status } = JSON.parse(completion.choices[0].message.content!);

  console.log(`[200] ${path}`);
  return res.status(status).json(body);
});

app.listen(5010, () => console.log("listening"));

/** Recursively merges allOf schemas and concatenates required fields. */
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

/** Remove properties that are not supported by OpenAI Structured Output */
function removeUnsupportedProperties(schema) {
  const illegalProperties = [
    "minLength",
    "maxLength",
    "format",
    "minItems",
    "maxItems",
    "pattern",
    "minimum",
    "maximum",
  ];

  if (schema.type === "object" && schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      schema.properties[key] = removeUnsupportedProperties(schema.properties[key]);
    });
  } else if (schema.type === "array" && schema.items) {
    schema.items = removeUnsupportedProperties(schema.items);
  }

  // Remove minLength if it exists
  for (const prop of illegalProperties) {
    if (prop in schema) {
      delete schema[prop];
    }
  }

  return schema;
}

function disallowAdditionalProperties(schema) {
  if (schema.type === "object" && schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      schema.properties[key] = disallowAdditionalProperties(schema.properties[key]);
    });
  } else if (schema.type === "array" && schema.items) {
    schema.items = disallowAdditionalProperties(schema.items);
  }

  if (schema.type === "object") {
    schema.additionalProperties = false;
  }

  return schema;
}

function makeAllPropertiesRequired(schema) {
  if (schema.type === "object" && schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      schema.properties[key] = makeAllPropertiesRequired(schema.properties[key]);
    });
  } else if (schema.type === "array" && schema.items) {
    schema.items = makeAllPropertiesRequired(schema.items);
  }

  if (schema.type === "object") {
    schema.required = Object.keys(schema.properties);
  }

  return schema;
}
