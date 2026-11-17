import unittest

from auth_guard import is_loopback_client, piper_authorized


# Reviewed false-positive: literal loopback/nonloopback addresses below are negative
# and positive regression fixtures for the local-auth guard. They are never
# production outbound endpoints; other DevSkim rules and files remain scanned.
class PiperAuthenticationTests(unittest.TestCase):
    def test_local_bypass_only_allows_loopback_without_token(self):
        for host in ('127.0.0.1', '127.23.0.9', '::1'):  # DevSkim: ignore DS162092
            with self.subTest(host=host):
                self.assertTrue(piper_authorized('', True, None, host))

    def test_local_bypass_rejects_remote_missing_and_spoofed_clients(self):
        for host in ('203.0.113.7', '192.168.1.8', '::ffff:127.0.0.1', 'localhost', '', None):  # DevSkim: ignore DS162092
            with self.subTest(host=host):
                self.assertFalse(piper_authorized('', True, None, host))

    def test_forwarded_loopback_request_cannot_use_local_bypass(self):
        self.assertFalse(piper_authorized('', True, None, '127.0.0.1', forwarded=True))  # DevSkim: ignore DS162092

    def test_missing_token_denies_access_without_explicit_bypass(self):
        self.assertFalse(piper_authorized('', False, None, '127.0.0.1'))  # DevSkim: ignore DS162092
        self.assertFalse(piper_authorized('', False, 'Bearer stale', '127.0.0.1'))  # DevSkim: ignore DS162092

    def test_configured_token_is_required_even_for_loopback_and_bypass(self):
        token = 'correct-secret-token'
        self.assertTrue(piper_authorized(token, True, f'Bearer {token}', '203.0.113.7'))
        self.assertTrue(piper_authorized(token, False, f'Bearer {token}', '::1'))
        for header in (None, '', token, f'Basic {token}', 'Bearer wrong', 'bearer correct-secret-token', 'Bearer 🔒'):
            with self.subTest(header=header):
                self.assertFalse(piper_authorized(token, True, header, '127.0.0.1'))  # DevSkim: ignore DS162092

    def test_invalid_client_addresses_fail_closed(self):
        for host in ('', 'not-an-ip', '127.0.0.1.evil.example', None, ' 127.0.0.1'):  # DevSkim: ignore DS162092
            with self.subTest(host=host):
                self.assertFalse(is_loopback_client(host))


if __name__ == '__main__':
    unittest.main()
