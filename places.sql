CREATE TABLE places (
  country_code text NOT NULL,
  postal_code text NOT NULL,
  place_name text NOT NULL,
  admin_name1 text NOT NULL,
  admin_code1 text NOT NULL,
  admin_name2 text NOT NULL,
  admin_code2 text NOT NULL,
  admin_name3 text NOT NULL,
  admin_code3 text NOT NULL,
  latitude double NOT NULL,
  longitude double NOT NULL,
  accuracy int(11) NOT NULL
);
