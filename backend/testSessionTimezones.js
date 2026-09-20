const assert = require("assert")
const {
  getKolkataNow,
  parseTimeToMinutes,
  getSessionDateString,
  formatDisplayDate,
  getSessionStartTimestamp,
  getSessionEndTimestamp,
} = require("./services/sessionNotificationService")

async function runTests() {
  console.log("=========================================")
  console.log(" RUNNING SESSION TIMEZONE & DISPLAY TESTS")
  console.log("=========================================")

  const kolkataNow = getKolkataNow()
  console.log(`Current Asia/Kolkata date: ${kolkataNow.todayStr}`)
  console.log(`Current Asia/Kolkata tomorrow: ${kolkataNow.tomorrowStr}`)
  console.log(`Current Asia/Kolkata time: ${kolkataNow.currentTimeStr}`)

  // TEST 1: Session scheduled for Today in Asia/Kolkata
  console.log("\n[Test 1] Session scheduled for TODAY (formatDisplayDate & getSessionStartTimestamp)")
  const todaySession = {
    sessionId: "TEST_TODAY",
    date: kolkataNow.todayStr,
    time: "10:10",
    startTime: "10:10",
    scheduledDate: new Date(`${kolkataNow.todayStr}T10:10:00+05:30`),
    duration: 10,
    durationMinutes: 10,
  }

  const displayToday = formatDisplayDate(todaySession)
  console.log(`- formatDisplayDate: "${displayToday}"`)
  assert.strictEqual(displayToday, "Today", "Today session should display 'Today'")

  const startMsToday = getSessionStartTimestamp(todaySession)
  const expectedStartMsToday = new Date(`${kolkataNow.todayStr}T10:10:00+05:30`).getTime()
  console.log(`- Start timestamp: ${startMsToday} (expected: ${expectedStartMsToday})`)
  assert.strictEqual(startMsToday, expectedStartMsToday, "Start timestamp must match exact 10:10 AM IST")

  // TEST 2: Session scheduled for TOMORROW in Asia/Kolkata
  console.log("\n[Test 2] Session scheduled for TOMORROW (formatDisplayDate & getSessionStartTimestamp)")
  const tomorrowSession = {
    sessionId: "TEST_TOMORROW",
    date: kolkataNow.tomorrowStr,
    time: "10:10",
    startTime: "10:10",
    scheduledDate: new Date(`${kolkataNow.tomorrowStr}T10:10:00+05:30`),
    duration: 10,
    durationMinutes: 10,
  }

  const displayTomorrow = formatDisplayDate(tomorrowSession)
  console.log(`- formatDisplayDate: "${displayTomorrow}"`)
  assert.strictEqual(displayTomorrow, "Tomorrow", "Tomorrow session should display 'Tomorrow'")

  const startMsTomorrow = getSessionStartTimestamp(tomorrowSession)
  const expectedStartMsTomorrow = new Date(`${kolkataNow.tomorrowStr}T10:10:00+05:30`).getTime()
  console.log(`- Start timestamp: ${startMsTomorrow} (expected: ${expectedStartMsTomorrow})`)
  assert.strictEqual(startMsTomorrow, expectedStartMsTomorrow, "Start timestamp must match exact tomorrow 10:10 AM IST")

  // TEST 3: Legacy session booked yesterday for today with date: "Tomorrow" (User Bug Scenario)
  console.log("\n[Test 3] Session booked yesterday with date: 'Tomorrow' (User Bug Scenario)")
  const yesterdayDate = new Date(kolkataNow.raw.getTime() - 24 * 60 * 60 * 1000)
  const legacyBookedYesterdaySession = {
    sessionId: "SES142793",
    date: "Tomorrow",
    time: "10:10",
    startTime: "10:10",
    createdAt: yesterdayDate, // Booked yesterday
    duration: 10,
  }

  const legacyDateStr = getSessionDateString(legacyBookedYesterdaySession)
  console.log(`- Resolved scheduled date: ${legacyDateStr} (expected today: ${kolkataNow.todayStr})`)
  assert.strictEqual(legacyDateStr, kolkataNow.todayStr, "Legacy session booked yesterday for tomorrow must resolve to TODAY's date")

  const legacyDisplay = formatDisplayDate(legacyBookedYesterdaySession)
  console.log(`- formatDisplayDate: "${legacyDisplay}"`)
  assert.strictEqual(legacyDisplay, "Today", "Legacy session booked yesterday for tomorrow must now display 'Today'")

  const legacyStartMs = getSessionStartTimestamp(legacyBookedYesterdaySession)
  console.log(`- Start timestamp: ${legacyStartMs} (expected: ${expectedStartMsToday})`)
  assert.strictEqual(legacyStartMs, expectedStartMsToday, "Start timestamp must correctly reflect today at 10:10 AM IST")

  // TEST 4: Past Session (expired end timestamp)
  console.log("\n[Test 4] Past Session detection")
  const pastSession = {
    sessionId: "TEST_PAST",
    date: "2026-09-01",
    time: "09:00",
    duration: 10,
  }
  const pastEndMs = getSessionEndTimestamp(pastSession)
  const isPast = pastEndMs < Date.now()
  console.log(`- Past session end: ${new Date(pastEndMs).toISOString()}, isPast: ${isPast}`)
  assert.strictEqual(isPast, true, "Past session must have endTimestamp in the past")

  // TEST 5: UTC vs Asia/Kolkata (+05:30) conversion accuracy
  console.log("\n[Test 5] UTC vs Asia/Kolkata (+05:30) Conversion Verification")
  const testIso = `${kolkataNow.todayStr}T10:10:00+05:30`
  const epoch = new Date(testIso).getTime()
  const utcDate = new Date(epoch)
  const kolkataParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(utcDate)

  console.log(`- IST String input: ${testIso}`)
  console.log(`- Stored UTC representation: ${utcDate.toISOString()}`)
  console.log(`- Converted back to Asia/Kolkata: ${kolkataParts}`)
  assert.strictEqual(kolkataParts, "10:10", "Stored UTC timestamp must convert back to exactly 10:10 in Asia/Kolkata")

  console.log("\n=========================================")
  console.log(" ALL TIMEZONE & DISPLAY TESTS PASSED! ✓")
  console.log("=========================================")
}

runTests().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
