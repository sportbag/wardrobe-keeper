import { queryOptions } from "@tanstack/react-query";
import { listAppUsers, type AppUserDTO } from "@/lib/users.functions";

export const appUsersQueryOptions = () =>
  queryOptions<AppUserDTO[]>({
    queryKey: ["app-users"],
    queryFn: () => listAppUsers(),
  });
