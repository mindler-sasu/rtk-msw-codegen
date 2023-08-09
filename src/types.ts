import { FetchArgs } from "@reduxjs/toolkit/dist/query";

export type EndpointConfig = FetchArgs & { query: [string, string][] };

export interface NestedObject {
  [key: string]: NestedObject | string;
}

export interface EndpointConfigForMsw {
  baseUrl: string,
  endpoints: Record<string, EndpointConfig>
}