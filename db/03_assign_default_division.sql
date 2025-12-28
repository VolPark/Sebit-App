-- Assign Division 2 (Interiéry (dveře a podlahy)) to ALL existing projects (akce)

UPDATE public.akce
SET division_id = 2; -- ID 2 matches "Interiéry" from the screenshot
