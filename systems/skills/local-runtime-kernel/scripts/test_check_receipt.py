
import importlib.util
import pathlib
import unittest

P = pathlib.Path(__file__).resolve().parent / "check_receipt.py"
spec = importlib.util.spec_from_file_location("receipt_validator", P)
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)

def actor(name):
    return {"status":"PROVEN", "actor":name,
            "identity":["signed:id"], "action":["trace:action"], "authority":["receipt:auth"]}

def valid():
    return {
        "state":"VERIFIED", "phase":"PROVE",
        "must":["WHAT","WHERE","WHEN"],
        "prospective_authority":{"status":"PROVEN", "evidence":["receipt:authorized"]},
        "slots":{s:{"status":"PROVEN","evidence":["trace:observed"]} for s in ("WHAT","WHERE","WHEN")},
        "who":{"EXECUTED":actor("operator"), "VERIFIED":actor("independent-observer")},
    }

class TestReceiptSecurity(unittest.TestCase):
    def test_valid_verified_receipt(self):
        self.assertEqual(v.check(valid()), [])
    def test_must_not_verify_at_declare_without_evidence(self):
        r=valid()
        r.update({"phase":"DECLARE","must":[],"slots":{}})
        r.pop("prospective_authority")
        self.assertTrue(v.check(r))
    def test_proven_evidence_must_be_nonempty_array(self):
        r=valid()
        r["slots"]["WHAT"]["evidence"]="just-a-string"
        self.assertTrue(v.check(r))
    def test_authority_evidence_must_be_nonempty_array(self):
        r=valid()
        r["prospective_authority"]["evidence"]="not-an-array"
        self.assertTrue(v.check(r))
    def test_proven_actor_binding_must_be_array(self):
        r=valid()
        r["who"]["EXECUTED"]["identity"]="string"
        self.assertTrue(v.check(r))
    def test_why_causal_false_string_is_not_true(self):
        r=valid()
        r["slots"]["WHY"]={"status":"PROVEN","evidence":["timing"],"causal":"false"}
        self.assertTrue(v.check(r))
    def test_missing_when_from_must_fails_closed(self):
        r=valid()
        r["must"]=["WHAT","WHERE"]
        self.assertTrue(v.check(r))
    def test_broken_root_type_does_not_crash(self):
        self.assertTrue(v.check(None))
    def test_broken_slots_type_does_not_crash(self):
        r=valid()
        r["slots"]=[]
        self.assertTrue(v.check(r))
    def test_same_executor_and_verifier_rejected(self):
        r=valid()
        r["who"]["VERIFIED"]["actor"]="operator"
        self.assertTrue(v.check(r))

if __name__ == "__main__":
    unittest.main()
