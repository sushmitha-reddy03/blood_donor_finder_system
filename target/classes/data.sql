-- LifeDrop Blood Donor System - Initial Data

-- Initialize Blood Stock levels
INSERT INTO blood_stock (blood_group, units_available) 
SELECT * FROM (
    SELECT 'A+' as bg, 10 as u UNION
    SELECT 'A-', 5 UNION
    SELECT 'B+', 8 UNION
    SELECT 'B-', 3 UNION
    SELECT 'AB+', 4 UNION
    SELECT 'AB-', 2 UNION
    SELECT 'O+', 15 UNION
    SELECT 'O-', 12
) AS tmp
WHERE NOT EXISTS (
    SELECT blood_group FROM blood_stock
) LIMIT 8;

-- Create default Admin user if no users exist
-- Password is 'admin123' encoded with BCrypt
-- INSERT INTO account (username, password, role)
-- SELECT 'admin', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.7uHowLy', 'ADMIN'
-- WHERE NOT EXISTS (SELECT username FROM account WHERE role = 'ADMIN') LIMIT 1;
