import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeDealImageDataUrl,
  getDealImageFileName,
  getDealMediaChanges,
  isDealImageDataUrl,
} from "../lib/dealImageData.ts";

const onePixelPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("decodes supported deal image data for server upload", () => {
  const image = decodeDealImageDataUrl(onePixelPng);

  assert.equal(isDealImageDataUrl(onePixelPng), true);
  assert.equal(image?.mime, "image/png");
  assert.equal(image?.extension, "png");
  assert.ok((image?.bytes.length ?? 0) > 0);
});

test("rejects unsupported, malformed, and oversized image data", () => {
  assert.equal(decodeDealImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(decodeDealImageDataUrl("data:image/png;base64,not-valid***"), null);
  assert.equal(decodeDealImageDataUrl(`data:image/jpeg;base64,${"A".repeat(2_100_000)}`), null);
});

test("creates safe unique media-library filenames", () => {
  const fileName = getDealImageFileName("My Product (Final)!.PNG", 0, "jpg");

  assert.match(fileName, /^my-product-final-[a-f0-9-]{8}\.jpg$/);
  assert.doesNotMatch(fileName, /[()!\s]/);
});

test("retains, adds, and removes only media tracked by the deal", () => {
  const changes = getDealMediaChanges(
    [
      { id: 11, url: "https://media.example/keep.jpg" },
      { id: 12, url: "https://media.example/remove.jpg" },
    ],
    ["https://media.example/keep.jpg", "https://external.example/stored.jpg", "https://media.example/new.jpg"],
    [{ id: 13, url: "https://media.example/new.jpg" }],
  );

  assert.deepEqual(changes, {
    storedFiles: [
      { id: 11, url: "https://media.example/keep.jpg" },
      { id: 13, url: "https://media.example/new.jpg" },
    ],
    removedFileIds: [12],
  });
});
