
CREATE POLICY "Staff read murti photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'murti-photos');
CREATE POLICY "Staff upload murti photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'murti-photos');
CREATE POLICY "Staff update murti photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'murti-photos');
CREATE POLICY "Staff delete murti photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'murti-photos');
