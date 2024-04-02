BEGIN;

    CREATE TABLE IF NOT EXISTS public.users
    (
        id int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        email text NOT NULL,
        password text NOT NULL,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT unique_email UNIQUE NULLS NOT DISTINCT (email)
    );

    CREATE INDEX IF NOT EXISTS users_email
        ON users USING btree
        (email ASC NULLS LAST)
        WITH (deduplicate_items=True);

COMMIT;
