-- Lets a customer delete their own support tickets from the account page ("Espace compte ->
-- Support"). Same conditions as reading them (support_tickets_select_own): their own rows, and a
-- session that passed the account's security checks. The page warns before deleting a ticket the
-- team hasn't closed yet; a closed one goes without a warning.

drop policy if exists support_tickets_delete_own on public.support_tickets;
create policy support_tickets_delete_own on public.support_tickets
  for delete to authenticated
  using ((user_id = auth.uid()) and (select public.sec_session_ok()));

grant delete on public.support_tickets to authenticated;
