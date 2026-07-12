import assert from "node:assert/strict";
import test from "node:test";
import { dealDescriptionMaxCharacters, getDealDescriptionValidationError } from "../lib/dealDescriptionValidation.ts";

test("requires a meaningful deal description", () => {
  assert.equal(getDealDescriptionValidationError("<p>Short</p>", "Short"), "Add a little more detail.");
  assert.equal(getDealDescriptionValidationError("<p>A useful description with delivery details.</p>", "A useful description with delivery details."), "");
});

test("enforces the server text limit", () => {
  const text = "a".repeat(dealDescriptionMaxCharacters + 1);
  assert.match(getDealDescriptionValidationError(`<p>${text}</p>`, text), /characters or fewer/);
});

test("enforces the rich-description image limit", () => {
  const images = Array.from({ length: 11 }, (_, index) => `<img src="https://shop.example/image-${index}.jpg">`).join("");
  assert.equal(getDealDescriptionValidationError(`<p>A useful description with enough text.</p>${images}`, "A useful description with enough text."), "Description can include up to 10 images.");
});
