"""
Security and SSRF prevention utilities.

Enforces:
1. Scheme validation (http/https only).
2. Hostname safety (rejecting localhost, 0.0.0.0, internal names).
3. DNS resolution IP checking:
   - 127.0.0.0/8 (loopback)
   - 10.0.0.0/8 (private class A)
   - 172.16.0.0/12 (private class B)
   - 192.168.0.0/16 (private class C)
   - 169.254.0.0/16 (link-local & AWS/GCP/Azure instance metadata 169.254.169.254)
   - 0.0.0.0/8 (current network)
   - 100.64.0.0/10 (carrier-grade NAT)
   - IPv6 loopback (::1), link-local (fe80::/10), unique local (fc00::/7)
"""

import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import HTTPException, status


PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("fc00::/7"),
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "metadata.google.internal",
    "169.254.169.254",
    "instance-data",
}


def validate_url_ssrf_safe(url: str, enforce_https: bool = False) -> str:
    """
    Validates a URL against Server-Side Request Forgery (SSRF) vulnerabilities.
    Raises HTTPException(400) if unsafe or invalid.
    Returns cleaned URL.
    """
    if not url or not isinstance(url, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product URL cannot be empty.",
        )

    parsed = urlparse(url.strip())

    if parsed.scheme.lower() not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported protocol '{parsed.scheme}'. Only HTTP and HTTPS URLs are permitted.",
        )

    if enforce_https and parsed.scheme.lower() != "https":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Production security policy requires HTTPS URLs.",
        )

    hostname = (parsed.hostname or "").lower().strip()
    if not hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL: Missing hostname.",
        )

    if hostname in BLOCKED_HOSTNAMES or hostname.endswith(".internal") or hostname.endswith(".local"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Access to internal, loopback, or private hostnames is strictly forbidden.",
        )

    # Check direct IP literals
    try:
        ip_obj = ipaddress.ip_address(hostname)
        if any(ip_obj in net for net in PRIVATE_NETWORKS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Access to private/internal IP address '{hostname}' is forbidden.",
            )
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Private network access is not permitted.",
            )
    except ValueError:
        # Not a literal IP address; proceed to DNS resolution check
        pass

    # Resolve hostname to verify destination IP addresses
    try:
        resolved_addresses = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in resolved_addresses:
            ip_str = sockaddr[0]
            ip_obj = ipaddress.ip_address(ip_str)
            if any(ip_obj in net for net in PRIVATE_NETWORKS) or ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Resolved host '{hostname}' routes to private/restricted IP '{ip_str}'. Request blocked.",
                )
    except socket.gaierror:
        # If hostname does not resolve, that's fine to fail gracefully later during fetch
        pass

    return url.strip()
