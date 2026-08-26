import { queryOptions } from "@tanstack/react-query";
import { getPersonDetail, listGarments, listLoans, listPersons } from "@/lib/verleih.functions";
import type { HistoryFilter } from "@/lib/verleih.schemas";

export const personsQueryOptions = () =>
  queryOptions({
    queryKey: ["persons"],
    queryFn: () => listPersons(),
  });

export const garmentsQueryOptions = () =>
  queryOptions({
    queryKey: ["garments"],
    queryFn: () => listGarments(),
  });

export const loansQueryOptions = (filter: Partial<HistoryFilter> = {}) =>
  queryOptions({
    queryKey: ["loans", filter],
    queryFn: () => listLoans({ data: filter }),
  });

export const personDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["person-detail", id],
    queryFn: () => getPersonDetail({ data: { id } }),
  });
