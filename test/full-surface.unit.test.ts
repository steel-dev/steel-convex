import { beforeEach, describe, expect, test } from "vitest";

import { createMockSteelClient, createSteelTestHarness, steelFunction } from "./sessionTestUtils";

describe("steel full surface unit tests", () => {
  beforeEach(() => {
    createMockSteelClient();
  });

  test("runs sessions utility actions", async () => {
    const t = createSteelTestHarness();
    const ownerId = "tenant-full-sessions";

    const created = await t.fun(steelFunction("sessions:create"), {
      ownerId,
      apiKey: "unit-test-key",
      sessionArgs: { image: "chrome", timeout: 120 },
    });

    const computer = await t.fun(steelFunction("sessions:computer"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: created.externalId,
      commandArgs: { action: "wait", duration: 1 },
    });
    expect(computer).toMatchObject({ action: "computer", sessionId: created.externalId });

    const context = await t.fun(steelFunction("sessions:context"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: created.externalId,
    });
    expect(context).toMatchObject({ action: "context", sessionId: created.externalId });

    const events = await t.fun(steelFunction("sessions:events"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: created.externalId,
    });
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "event" })]));

    const liveDetails = await t.fun(steelFunction("sessions:liveDetails"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: created.externalId,
    });
    expect(liveDetails).toMatchObject({ sessionId: created.externalId });
  });

  test("runs session files and captchas actions", async () => {
    const t = createSteelTestHarness();
    const ownerId = "tenant-full-session-assets";
    const sessionExternalId = "session-live-001";

    const uploadedFile = await t.fun(steelFunction("sessionFiles:upload"), {
      ownerId,
      apiKey: "unit-test-key",
      sessionExternalId,
      url: "https://example.com/file.txt",
      path: "file.txt",
    });
    expect(uploadedFile).toMatchObject({ sessionExternalId, path: "file.txt" });

    const listedFiles = await t.fun(steelFunction("sessionFiles:list"), {
      ownerId,
      apiKey: "unit-test-key",
      sessionExternalId,
    });
    expect(Array.isArray(listedFiles.items)).toBe(true);

    const deleteResult = await t.fun(steelFunction("sessionFiles:delete"), {
      ownerId,
      apiKey: "unit-test-key",
      sessionExternalId,
      path: "file.txt",
    });
    expect(deleteResult).toMatchObject({ ok: true });

    const deleteAllResult = await t.fun(steelFunction("sessionFiles:deleteAll"), {
      ownerId,
      apiKey: "unit-test-key",
      sessionExternalId,
    });
    expect(deleteAllResult).toMatchObject({ ok: true });

    const captchaStatus = await t.fun(steelFunction("captchas:status"), {
      ownerId,
      apiKey: "unit-test-key",
      sessionExternalId,
      pageId: "page-1",
      persistSnapshot: true,
    });
    expect(captchaStatus).toMatchObject({ pageId: "page-1" });

    const solveResult = await t.fun(steelFunction("captchas:solve"), {
      ownerId,
      apiKey: "unit-test-key",
      sessionExternalId,
      pageId: "page-1",
    });
    expect(solveResult).toMatchObject({ solved: true });

    const solveImageResult = await t.fun(steelFunction("captchas:solveImage"), {
      ownerId,
      apiKey: "unit-test-key",
      sessionExternalId,
      imageXPath: "//img[@id='captcha']",
      inputXPath: "//input[@id='captcha']",
    });
    expect(solveImageResult).toMatchObject({ solved: true });
  });

  test("runs profiles credentials extensions and global files actions", async () => {
    const t = createSteelTestHarness();
    const ownerId = "tenant-full-metadata";

    const createdProfile = await t.fun(steelFunction("profiles:create"), {
      ownerId,
      apiKey: "unit-test-key",
      profileArgs: { name: "Test profile" },
    });
    expect(createdProfile.externalId).toBe("profile-new");

    const updatedProfile = await t.fun(steelFunction("profiles:update"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: createdProfile.externalId,
      profileArgs: { name: "Updated profile" },
    });
    expect(updatedProfile.externalId).toBe(createdProfile.externalId);

    const fetchedProfile = await t.fun(steelFunction("profiles:get"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: createdProfile.externalId,
    });
    expect(fetchedProfile.externalId).toBe(createdProfile.externalId);

    const listedProfiles = await t.fun(steelFunction("profiles:list"), {
      ownerId,
      apiKey: "unit-test-key",
    });
    expect(Array.isArray(listedProfiles.items)).toBe(true);

    const createdCredential = await t.fun(steelFunction("credentials:create"), {
      ownerId,
      apiKey: "unit-test-key",
      credentialArgs: {
        label: "login",
        origin: "https://example.com",
        namespace: "default",
        value: { username: "test", password: "secret" },
      },
    });
    expect(createdCredential.externalId).toContain("https://example.com");

    const updatedCredential = await t.fun(steelFunction("credentials:update"), {
      ownerId,
      apiKey: "unit-test-key",
      credentialArgs: {
        label: "login",
        origin: "https://example.com",
        namespace: "default",
      },
    });
    expect(updatedCredential.externalId).toContain("https://example.com");

    const listedCredentials = await t.fun(steelFunction("credentials:list"), {
      ownerId,
      apiKey: "unit-test-key",
      queryArgs: { origin: "https://example.com" },
    });
    expect(listedCredentials.items.length).toBeGreaterThan(0);

    const deletedCredential = await t.fun(steelFunction("credentials:delete"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: createdCredential.externalId,
    });
    expect(deletedCredential).toMatchObject({ success: true });

    const uploadedExtension = await t.fun(steelFunction("extensions:upload"), {
      ownerId,
      apiKey: "unit-test-key",
      url: "https://example.com/ext.crx",
    });
    expect(uploadedExtension.externalId).toBe("ext-new");

    const updatedExtension = await t.fun(steelFunction("extensions:update"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: uploadedExtension.externalId,
      url: "https://example.com/ext-v2.crx",
    });
    expect(updatedExtension.externalId).toBe(uploadedExtension.externalId);

    const downloadedExtension = await t.fun(steelFunction("extensions:download"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: uploadedExtension.externalId,
    });
    expect(downloadedExtension).toBe("extension-binary");

    const deletedExtension = await t.fun(steelFunction("extensions:delete"), {
      ownerId,
      apiKey: "unit-test-key",
      externalId: uploadedExtension.externalId,
    });
    expect(deletedExtension).toMatchObject({ message: "deleted" });

    const deletedAllExtensions = await t.fun(steelFunction("extensions:deleteAll"), {
      ownerId,
      apiKey: "unit-test-key",
    });
    expect(deletedAllExtensions).toMatchObject({ message: "deleted" });

    const uploadedGlobalFile = await t.fun(steelFunction("files:upload"), {
      ownerId,
      apiKey: "unit-test-key",
      url: "https://example.com/asset.txt",
      path: "asset.txt",
    });
    expect(uploadedGlobalFile.path).toBe("asset.txt");

    const listedGlobalFiles = await t.fun(steelFunction("files:list"), {
      ownerId,
      apiKey: "unit-test-key",
    });
    expect(Array.isArray(listedGlobalFiles.items)).toBe(true);

    const downloadedGlobalFile = await t.fun(steelFunction("files:download"), {
      ownerId,
      apiKey: "unit-test-key",
      path: "asset.txt",
    });
    expect(downloadedGlobalFile).toMatchObject({ base64: expect.any(String) });

    const deletedGlobalFile = await t.fun(steelFunction("files:delete"), {
      ownerId,
      apiKey: "unit-test-key",
      path: "asset.txt",
    });
    expect(deletedGlobalFile).toMatchObject({ ok: true });
  });

  test("runs top-level screenshot scrape and pdf actions", async () => {
    const t = createSteelTestHarness();
    const ownerId = "tenant-full-top-level";

    const screenshot = await t.fun(steelFunction("topLevel:screenshot"), {
      ownerId,
      apiKey: "unit-test-key",
      url: "https://example.com",
      delay: 25,
    });
    expect(screenshot).toMatchObject({ url: expect.stringContaining("screenshot") });

    const scrape = await t.fun(steelFunction("topLevel:scrape"), {
      ownerId,
      apiKey: "unit-test-key",
      url: "https://example.com",
      delay: 25,
    });
    expect(scrape).toMatchObject({ metadata: { statusCode: 200 } });

    const pdf = await t.fun(steelFunction("topLevel:pdf"), {
      ownerId,
      apiKey: "unit-test-key",
      url: "https://example.com",
      delay: 25,
    });
    expect(pdf).toMatchObject({ url: expect.stringContaining(".pdf") });
  });
});
