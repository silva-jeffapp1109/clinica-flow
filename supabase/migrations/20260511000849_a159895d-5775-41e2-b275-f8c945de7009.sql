
-- Patients
DROP POLICY IF EXISTS "admin insert patients" ON public.patients;
DROP POLICY IF EXISTS "admin update patients" ON public.patients;
CREATE POLICY "workspace insert patients" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (owner_id = current_owner_id() AND created_by = auth.uid());
CREATE POLICY "workspace update patients" ON public.patients FOR UPDATE TO authenticated
  USING (owner_id = current_owner_id());

-- Categories
DROP POLICY IF EXISTS "admin insert categories" ON public.categories;
DROP POLICY IF EXISTS "admin update categories" ON public.categories;
CREATE POLICY "workspace insert categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (owner_id = current_owner_id() AND created_by = auth.uid());
CREATE POLICY "workspace update categories" ON public.categories FOR UPDATE TO authenticated
  USING (owner_id = current_owner_id());

-- Patient schedules
DROP POLICY IF EXISTS "admin insert schedules" ON public.patient_schedules;
DROP POLICY IF EXISTS "admin update schedules" ON public.patient_schedules;
CREATE POLICY "workspace insert schedules" ON public.patient_schedules FOR INSERT TO authenticated
  WITH CHECK (owner_id = current_owner_id() AND created_by = auth.uid());
CREATE POLICY "workspace update schedules" ON public.patient_schedules FOR UPDATE TO authenticated
  USING (owner_id = current_owner_id());
