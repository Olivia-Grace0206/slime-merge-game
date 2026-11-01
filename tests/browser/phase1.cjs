/* Isolated test tool: PLAYWRIGHT_MODULE=/absolute/path/to/playwright node tests/browser/phase1.cjs */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const fs = require('node:fs')
const assert = require('node:assert/strict')
const path = require('node:path')
const artifactDir = process.env.BROWSER_ARTIFACT_DIR || path.join(require('node:os').tmpdir(), 'slime-phase1-browser')
fs.mkdirSync(artifactDir, { recursive: true })
async function choosePreset(page, label) {
  await page.getByRole('button', { name: '検証', exact: true }).click()
  await page.getByRole('button', { name: label, exact: true }).click()
}
const checks = [],
  errors = []
async function check(name, action) {
  try {
    await action()
    checks.push({ name, result: 'PASS' })
  } catch (e) {
    checks.push({ name, result: 'FAIL', error: String(e) })
    throw e
  }
}
async function placements(page) {
  return page
    .locator('[data-slime-id]')
    .evaluateAll((nodes) =>
      nodes
        .map((n) => ({ id: n.dataset.slimeId, tier: +n.dataset.tier, cell: n.dataset.cell }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    )
}
async function center(page, selector) {
  const box = await page.locator(selector).boundingBox()
  assert(box)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
async function run() {
  const server = process.env.GAME_URL
    ? null
    : require('node:child_process').spawn(
        process.execPath,
        [
          'node_modules/vite/bin/vite.js',
          'preview',
          '--host',
          '127.0.0.1',
          '--port',
          '5173',
          '--strictPort',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      )
  if (server)
    await new Promise((resolve, reject) => {
      server.stdout.on('data', (data) => {
        if (String(data).includes('Local:')) resolve()
      })
      server.on('exit', (code) => reject(Error('Preview server exited ' + code)))
      server.stderr.on('data', (data) => process.stderr.write(data))
    })
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  let browserVersion = browser.version()
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 1440 ? 1100 : 950 },
        isMobile: width !== 1440,
        hasTouch: width !== 1440,
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      page.on('pageerror', (e) => errors.push(String(e)))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      page.on('requestfailed', (r) => errors.push(r.url() + ': ' + r.failure()?.errorText))
      const response = await page.goto(
        process.env.GAME_URL || 'http://127.0.0.1:5173/slime-merge-game/',
      )
      assert.equal(response.status(), 200)
      await choosePreset(page, '5体マージ')
      await page.locator('[data-slime-id="drag"]').waitFor()
      const cdp = await context.newCDPSession(page)
      const input = {
        async start(p) {
          if (width === 1440) {
            await page.mouse.move(p.x, p.y)
            await page.mouse.down()
          } else
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ ...p, id: 0 }],
            })
        },
        async move(p) {
          if (width === 1440) await page.mouse.move(p.x, p.y, { steps: 6 })
          else
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ ...p, id: 0 }],
            })
        },
        async end() {
          if (width === 1440) await page.mouse.up()
          else await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
          await page.waitForTimeout(40)
        },
        async cancel() {
          if (width === 1440) {
            await page
              .locator('[data-testid="viewport"]')
              .dispatchEvent('pointercancel', { pointerId: 1 })
            await page.mouse.up()
          } else
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
          await page.waitForTimeout(30)
        },
      }
      for (const [label, expectedCount, outputTier, remainder] of [
        ['3体マージ', 1, 2, 0],
        ['5体マージ', 2, 2, 0],
        ['8体マージ', 3, 2, 0],
        ['11体マージ', 5, 2, 1],
        ['斜め連結', 2, 2, 0],
        ['高Tier試験', 4, 40, 0],
      ]) {
        await check(
          `${width}px ${label}: ${width === 1440 ? 'mouse' : 'trusted touch'} preview/commit equality`,
          async () => {
            await choosePreset(page, label)
            const before = await placements(page)
            const source = await center(page, '[data-slime-id="drag"]'),
              dest = await center(page, '[data-cell="2,2"]')
            await input.start(source)
            await input.move(dest)
            await page.waitForTimeout(40)
            assert.deepEqual(await placements(page), before, 'preview must not change placements')
            const preview = await page
              .locator('[data-group]')
              .evaluateAll((nodes) =>
                nodes.map((n) => ({ id: n.dataset.slimeId, group: n.dataset.group })),
              )
            const keep = await page
              .locator('[data-remainder]')
              .evaluateAll((nodes) =>
                nodes.map((n) => ({
                  id: n.dataset.slimeId,
                  cell: n.dataset.cell,
                  tier: +n.dataset.tier,
                })),
              )
            const outputs = await page
              .locator('[data-output]')
              .evaluateAll((nodes) => nodes.map((n) => n.dataset.cell).sort())
            assert(preview.length >= 3)
            assert.equal(new Set(preview.map((p) => p.id)).size, preview.length)
            assert.equal(keep.length, remainder)
            assert.match(
              await page.getByTestId('status').innerText(),
              new RegExp('Tier ' + outputTier),
            )
            if (label === '11体マージ') {
              assert.equal(preview.filter((p) => p.group === '1').length, 5)
              assert.equal(preview.filter((p) => p.group === '2').length, 5)
            }
            if (width === 1440 && label === '11体マージ')
              await page.screenshot({
                path: path.join(artifactDir, 'desktop-preview.png'),
                fullPage: true,
              })
            if (width === 390 && label === '11体マージ')
              await page.screenshot({
                path: path.join(artifactDir, 'mobile-preview.png'),
                fullPage: true,
              })
            await input.end()
            const after = await placements(page)
            assert.equal(after.length, expectedCount)
            assert(
              preview.every((p) => !after.some((s) => s.id === p.id)),
              'all and only planned inputs consumed',
            )
            for (const k of keep)
              assert.deepEqual(
                after.find((s) => s.id === k.id),
                k,
              )
            const oldIds = new Set(before.map((s) => s.id)),
              created = after.filter((s) => !oldIds.has(s.id))
            assert.deepEqual(created.map((s) => s.cell).sort(), outputs)
            assert(created.every((s) => s.tier === outputTier))
            assert.equal(new Set(after.map((s) => s.cell)).size, after.length)
            assert.match(await page.getByTestId('status').innerText(), /マージ成功/)
            await page
              .locator('[data-testid="viewport"]')
              .dispatchEvent('pointerup', {
                pointerId: 1,
                isPrimary: true,
                clientX: dest.x,
                clientY: dest.y,
              })
            assert.deepEqual(await placements(page), after, 'duplicate up must do nothing')
          },
        )
      }
      await check(`${width}px Tier40 swap without consumption`, async () => {
        await choosePreset(page, '高Tier試験')
        const before = await placements(page)
        await input.start(await center(page, '[data-slime-id="cap-0"]'))
        await input.move(await center(page, '[data-slime-id="cap-1"]'))
        await input.end()
        const after=await placements(page); assert.deepEqual(after.map(s=>[s.id,s.tier]), before.map(s=>[s.id,s.tier])); assert.equal(after.find(s=>s.id==='cap-0').cell,before.find(s=>s.id==='cap-1').cell); assert.match(await page.getByTestId('status').innerText(), /交換/)
      })
      await check(`${width}px different-tier drop exchanges positions`, async () => {
        const before = await placements(page)
        await input.start(await center(page, '[data-slime-id="drag"]'))
        await input.move(await center(page, '[data-slime-id="cap-1"]'))
        await input.end()
        const after=await placements(page);assert.equal(after.find(s=>s.id==='drag').cell,before.find(s=>s.id==='cap-1').cell);assert.equal(after.find(s=>s.id==='cap-1').cell,before.find(s=>s.id==='drag').cell)
      })
      await check(`${width}px empty cell moves without merging`, async () => {
        await choosePreset(page, '3体マージ')
        await input.start(await center(page, '[data-slime-id="drag"]'))
        await input.move(await center(page, '[data-cell="2,3"]'))
        await input.end()
        const after = await placements(page)
        assert.equal(after.length, 3)
        assert(after.every((s) => s.tier === 1))
        assert.equal(after.find((s) => s.id === 'drag').cell, '2,3')
      })
      await check(`${width}px cancelled drag preserves state`, async () => {
        await choosePreset(page, '11体マージ')
        const before = await placements(page)
        await input.start(await center(page, '[data-slime-id="drag"]'))
        await input.move(await center(page, '[data-cell="2,2"]'))
        await input.cancel()
        assert.deepEqual(await placements(page), before)
        assert.equal(await page.locator('[data-group]').count(), 0)
      })
      await check(`${width}px outside drop preserves state`, async () => {
        const before = await placements(page)
        await input.start(await center(page, '[data-slime-id="drag"]'))
        await input.move({ x: 5, y: 5 })
        await input.end()
        assert.deepEqual(await placements(page), before)
      })
      await check(
        `${width}px panning does not move any slime and conversion remains correct`,
        async () => {
          const before = await placements(page),
            oldBox = await page.getByTestId('board').boundingBox()
          const start = await center(page, '[data-cell="5,0"]')
          await input.start(start)
          await input.move({ x: start.x + 20, y: start.y + 20 })
          await input.end()
          const newBox = await page.getByTestId('board').boundingBox()
          assert(Math.abs(newBox.x - oldBox.x - 20) < 1)
          assert.deepEqual(await placements(page), before)
          await input.start(await center(page, '[data-slime-id="drag"]'))
          await input.move(await center(page, '[data-cell="2,2"]'))
          await input.end()
          assert.equal((await placements(page)).length, 5)
          await page.getByRole('button', { name: '設定', exact: true }).click()
          await page.getByRole('button', { name: '表示リセット' }).click()
          await page.getByRole('button', { name: '閉じる', exact: true }).click()
        },
      )
      await check(`${width}px keyboard and Escape`, async () => {
        await choosePreset(page, '3体マージ')
        await page.locator('[data-slime-id="drag"]').focus()
        await page.keyboard.press('Enter')
        await page.keyboard.press('Escape')
        assert.equal(await page.locator('.selected').count(), 0)
        await page.locator('[data-slime-id="drag"]').focus()
        await page.keyboard.press('Enter')
        await page.locator('[data-cell="2,2"]').focus()
        await page.keyboard.press('Enter')
        assert.equal((await placements(page)).length, 1)
      })
      await check(`${width}px unknown pointer cancel/up is ignored and focus loss cancels`, async () => {
        await choosePreset(page, '11体マージ')
        const before = await placements(page)
        await input.start(await center(page, '[data-slime-id="drag"]'))
        await input.move(await center(page, '[data-cell="2,2"]'))
        await page
          .getByTestId('viewport')
          .dispatchEvent('pointercancel', { pointerId: 999, isPrimary: false })
        await page
          .getByTestId('viewport')
          .dispatchEvent('pointerup', { pointerId: 999, isPrimary: false })
        assert.equal(await page.locator('[data-group]').count(), 10)
        await page.evaluate(() => window.dispatchEvent(new Event('blur')))
        await input.end()
        assert.deepEqual(await placements(page), before)
      })
      await check(`${width}px reset during drag invalidates pending operation`, async () => {
        await choosePreset(page, '11体マージ')
        await input.start(await center(page, '[data-slime-id="drag"]'))
        await input.move(await center(page, '[data-cell="2,2"]'))
        await page.getByRole('button', {name:'検証',exact:true}).evaluate(button => button.click())
        await page
          .getByRole('button', { name: '3体マージ', exact: true })
          .evaluate((button) => button.click())
        const reset = await placements(page)
        await input.end()
        assert.deepEqual(await placements(page), reset)
        assert.equal(reset.length, 3)
      })
      await check(
        `${width}px Tier1 green Tier2 blue Tier3 red and highest-tier progression`,
        async () => {
          await choosePreset(page, '8体マージ')
          assert.equal(
            await page
              .locator('[data-slime-id="drag"] .slime-art')
              .evaluate((n) => n.style.getPropertyValue('--slime-color')),
            '#82d963',
          )
          await input.start(await center(page, '[data-slime-id="drag"]'))
          await input.move(await center(page, '[data-cell="2,2"]'))
          await input.end()
          assert.equal(
            await page
              .locator('[data-tier="2"] .slime-art')
              .first()
              .evaluate((n) => n.style.getPropertyValue('--slime-color')),
            '#6ebff4',
          )
          const blues = await placements(page)
          await input.start(await center(page, `[data-slime-id="${blues[0].id}"]`))
          await input.move(await center(page, `[data-slime-id="${blues[1].id}"]`))
          await input.end()
          assert.equal((await placements(page)).length, 1)
          assert.equal(
            await page
              .locator('[data-tier="3"] .slime-art')
              .evaluate((n) => n.style.getPropertyValue('--slime-color')),
            '#fb828a',
          )
          assert.match(await page.getByTestId('highest-tier').innerText(), /Tier 3/)
        },
      )
      await check(`${width}px merge animation respects reduced-motion preference`, async () => {
      assert.equal(await page.locator('.born').first().evaluate(n => getComputedStyle(n).animationName), 'pop-in')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      assert.equal(await page.locator('.born').first().evaluate(n => getComputedStyle(n).animationName), 'none')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
    })
    await check(`${width}px viewport has no horizontal overflow and reset is safe`, async () => {
        await choosePreset(page, '盤面リセット')
        assert.equal((await placements(page)).length, 5)
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        await page.screenshot({
          path: path.join(artifactDir, `screen-${width}.png`),
          fullPage: true,
        })
      })
      await context.close()
    }
    assert.deepEqual(errors, [])
  } finally {
    fs.writeFileSync(
      path.join(artifactDir, 'results.json'),
      JSON.stringify(
        {
          browserVersion,
          playwright: require((process.env.PLAYWRIGHT_MODULE || 'playwright') + '/package.json')
            .version,
          checks,
          errors,
        },
        null,
        2,
      ),
    )
    await browser.close()
    if (server) server.kill()
  }
  console.log(
    JSON.stringify(
      {
        passed: checks.filter((c) => c.result === 'PASS').length,
        failed: checks.filter((c) => c.result === 'FAIL').length,
        browserVersion,
        errors,
        artifactDir,
      },
      null,
      2,
    ),
  )
}
run().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

