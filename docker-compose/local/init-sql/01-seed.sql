INSERT IGNORE INTO bank (id, address, city, state, zipcode, routing_number)
VALUES (1, '123 Aline Financial St.', 'New York', 'New York', '10001', '123456789');

INSERT IGNORE INTO branch (id, name, phone, address, city, state, zipcode, bank_id)
VALUES (1, 'Main Branch', '(800) 123-4567', '123 Aline Financial St.', 'New York', 'New York', '10001', 1);

INSERT INTO merchant (code, name)
VALUES ("None", "None");

INSERT INTO account_sequence (next_val)
VALUES (1);
