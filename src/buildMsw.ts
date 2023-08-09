import { EndpointConfigForMsw } from "./types";

export const escapeQuotes = (str?: string) =>
  str ? str.replace(/['"`]/g, '') : "";

function replacePlaceholder(inputString: string) {
    // Use regular expression to capture the variable value within ${}
    const match = inputString.match(/\$\{([^}]+)\}/);
    
    if (match) {
        const variableValue = match[1]; // Extract the captured value
        const replacedString = inputString.replace(match[0], ':' + variableValue);
        return replacedString;
    }

    return inputString; // Return unchanged string if no placeholder found
}


export const formatUrl = (configUrl:string) => {
  const base = escapeQuotes(configUrl);

  return replacePlaceholder(base)

};
export const buildMsw = (endpointConfig: EndpointConfigForMsw) => {
  let builder = `import { rest, type RestContext } from "msw";
  import { setupServer } from "msw/node";

  export const getMockedApi = () => setupServer(
`;

  Object.entries(endpointConfig.endpoints).forEach(([hook, config]) => {
    builder += `rest.${escapeQuotes(config.method?.toLowerCase())}("*${formatUrl(
      config.url,
    )}"`;
    builder += `, (_, res, ctx: RestContext) => res(ctx.json({}))),
`;
  });
  builder += `
  rest.all("*", (req, res, ctx: RestContext) => {
    return res(
      ctx.status(500),
      ctx.json({
        message: \`msw post not mocked: \${JSON.stringify(req, null, 2)}\`,
      })
    );
  }),

)`;
  return builder;
};
