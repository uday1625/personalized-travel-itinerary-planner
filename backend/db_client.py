import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache(maxsize=1)
def get_client() -> Client:
    """Return the cached Supabase client using the public anon key."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be configured")

    return create_client(supabase_url, supabase_key)


@lru_cache(maxsize=1)
def get_service_client() -> Client:
    """Return the cached Supabase service-role client for trusted admin tasks."""
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured"
        )

    # The service-role key bypasses RLS. Use this client only for trusted
    # server-side admin tasks; never expose it to browsers or end users.
    return create_client(supabase_url, service_role_key)