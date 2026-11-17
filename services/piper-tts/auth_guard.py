"""Dependency-free authorization guard for the Piper voice service."""

from hmac import compare_digest
from ipaddress import IPv6Address, ip_address


def is_loopback_client(client_host: str | None) -> bool:
    """Reject hostnames, non-loopback addresses and mapped IPv4 peers."""
    if not isinstance(client_host, str) or not client_host:
        return False
    try:
        address = ip_address(client_host)
        return address.is_loopback and not (
            isinstance(address, IPv6Address) and address.ipv4_mapped is not None
        )
    except ValueError:
        return False


def piper_authorized(
    api_token: str,
    allow_insecure_local: bool,
    authorization: str | None,
    client_host: str | None,
    *,
    forwarded: bool = False,
) -> bool:
    """Never grant the no-token local mode to a remote or proxied client."""
    if not api_token:
        return allow_insecure_local and not forwarded and is_loopback_client(client_host)
    if not isinstance(authorization, str):
        return False
    return compare_digest(
        authorization.encode('utf-8'),
        f'Bearer {api_token}'.encode('utf-8'),
    )
