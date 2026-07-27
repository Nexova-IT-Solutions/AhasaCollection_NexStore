import { createSearchParamsCache, parseAsInteger, parseAsString } from "nuqs/server";

export const ordersSearchParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsString.withDefault(""),
  payment: parseAsString.withDefault(""),
  type: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const ordersSearchParamsCache = createSearchParamsCache(ordersSearchParsers);
