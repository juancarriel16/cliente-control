
CREATE POLICY "Public read articulos images" ON storage.objects FOR SELECT USING (bucket_id = 'articulos');
CREATE POLICY "Auth upload articulos images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'articulos' AND owner = auth.uid());
CREATE POLICY "Auth update articulos images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'articulos' AND owner = auth.uid());
CREATE POLICY "Auth delete articulos images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'articulos' AND owner = auth.uid());
