-- Cria o bucket public de documentos de pacientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-documents',
  'patient-documents',
  true,
  52428800,  -- 50MB por arquivo
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Política: usuário autenticado pode fazer upload na pasta do seu owner_id
CREATE POLICY "Authenticated users can upload patient documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patient-documents');

-- Política: usuário autenticado pode ver os próprios documentos
CREATE POLICY "Authenticated users can read patient documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'patient-documents');

-- Política: usuário autenticado pode excluir os próprios documentos
CREATE POLICY "Authenticated users can delete patient documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'patient-documents');
