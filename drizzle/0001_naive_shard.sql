CREATE UNIQUE INDEX `idx_gym_records_customer_phone` ON `gym_records` (json_extract(`payload`, '$.phone')) WHERE `kind` = 'customer';
