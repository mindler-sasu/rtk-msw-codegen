import { rest, type RestContext } from "msw";
import { setupServer } from "msw/node";

export const getMockedApi = () => setupServer(
    rest.get("*pokemon/:name", (_, res, ctx: RestContext) => res(ctx.json({}))),
    rest.get("*pokemons", (_, res, ctx: RestContext) => res(ctx.json({}))),

    rest.all("*", (req, res, ctx: RestContext) => {
        return res(
            ctx.status(500),
            ctx.json({
                message: `msw req not mocked: ${JSON.stringify(req, null, 2)}`,
            })
        );
    }),

)