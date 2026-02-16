import { test, expect } from "@playwright/test";

test("トップページが表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/FAM Content Ops/);
});

test("サイドバーのナビゲーションリンクが表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /ダッシュボード/ })).toBeVisible();
});
