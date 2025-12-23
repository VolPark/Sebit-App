-- Recalculate 'celkova_cena' for ALL offers based on their items
UPDATE nabidky n
SET celkova_cena = (
    SELECT COALESCE(SUM(p.celkem), 0)
    FROM polozky_nabidky p
    WHERE p.nabidka_id = n.id
);

-- Verify the update
SELECT n.id, n.nazev, n.celkova_cena, 
       (SELECT SUM(celkem) FROM polozky_nabidky WHERE nabidka_id = n.id) as real_sum
FROM nabidky n
LIMIT 10;
