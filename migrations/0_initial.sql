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

    ALTER TABLE users ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT False;

    CREATE TABLE IF NOT EXISTS public.verification_tokens
    (
        user_id integer NOT NULL,
        token uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone DEFAULT now(),
        expires_at timestamp with time zone,
        CONSTRAINT verification_tokens_pkey PRIMARY KEY (user_id),
        CONSTRAINT user_id FOREIGN KEY (user_id)
            REFERENCES public.users (id) MATCH SIMPLE
            ON UPDATE NO ACTION
            ON DELETE CASCADE
    );

COMMIT;
