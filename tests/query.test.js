import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSearchText } from "../src/utils/query.js";

test("normalizeSearchText normalizes punctuation and spacing", () => {
  assert.equal(
    normalizeSearchText("  Central + Maxwell / Tiong,Bahru  "),
    "central maxwell tiong bahru"
  );
});

test("normalizeSearchText handles null-like input", () => {
  assert.equal(normalizeSearchText(null), "");
});
