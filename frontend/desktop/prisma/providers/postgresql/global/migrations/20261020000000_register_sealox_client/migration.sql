-- Register the built-in Sealox public client without overwriting existing registrations.
INSERT INTO "OAuthClient" (
    "id", "clientId", "clientType", "name", "allowedGrantTypes", "redirectUris", "updatedAt"
) VALUES (
    gen_random_uuid(),
    'sealox',
    'PUBLIC',
    'Sealox',
    ARRAY['urn:ietf:params:oauth:grant-type:device_code', 'authorization_code', 'refresh_token'],
    ARRAY['http://127.0.0.1/callback'],
    CURRENT_TIMESTAMP
)
ON CONFLICT ("clientId") DO NOTHING;
