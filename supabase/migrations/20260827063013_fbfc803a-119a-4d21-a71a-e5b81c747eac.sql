DROP POLICY IF EXISTS loans_delete_admin ON public.loans;

CREATE POLICY loans_delete_admin ON public.loans
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;