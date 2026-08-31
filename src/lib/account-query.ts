import type { QueryClient } from "@tanstack/react-query";

import { accountRenameDtoSchema, type AccountRenameDto } from "./accounts";
import {
  financeFetch,
  financeQueryKeys,
  readApiData,
} from "./finance-query";

export type AccountRenameDraft = {
  id: string;
  name: string;
};

type AccountRenameInvalidationScope = {
  monthKey: string;
  viewerId: string;
};

export function toUpdateAccountPayload(draft: AccountRenameDraft) {
  return { name: draft.name.trim() };
}

export async function renameAccountRequest(draft: AccountRenameDraft) {
  const response = await financeFetch(`/api/accounts/${draft.id}`, {
    method: "PATCH",
    body: JSON.stringify(toUpdateAccountPayload(draft)),
  });
  return accountRenameDtoSchema.parse(await readApiData(response));
}

export function accountRenameMutationOptions(
  mutationFn: (draft: AccountRenameDraft) => Promise<AccountRenameDto>,
  invalidate: () => Promise<void>,
) {
  return { mutationFn, onSuccess: invalidate };
}

export async function invalidateAccountRenameResources(
  queryClient: QueryClient,
  scope: AccountRenameInvalidationScope,
) {
  await Promise.all([
    queryClient.invalidateQueries(
      { queryKey: financeQueryKeys.snapshot(scope.viewerId, scope.monthKey) },
      { throwOnError: true },
    ),
    queryClient.invalidateQueries(
      { queryKey: financeQueryKeys.transactionLists(scope.viewerId) },
      { throwOnError: true },
    ),
    queryClient.invalidateQueries(
      { queryKey: financeQueryKeys.transactionDetails(scope.viewerId) },
      { throwOnError: true },
    ),
  ]);
}
