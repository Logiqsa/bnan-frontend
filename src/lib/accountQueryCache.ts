import type { Query, QueryClient, QueryKey } from "@tanstack/react-query";

const isPublicQueryKey = (queryKey: QueryKey) => {
  const [scope, kind] = queryKey;
  return scope === "public-courses"
    || scope === "public-course"
    || (scope === "courses" && kind === "public");
};

export const isAccountScopedQuery = (query: Query) => !isPublicQueryKey(query.queryKey);

export const clearAccountScopedQueries = async (queryClient: QueryClient) => {
  await queryClient.cancelQueries({ predicate: isAccountScopedQuery });
  queryClient.removeQueries({ predicate: isAccountScopedQuery });
};

