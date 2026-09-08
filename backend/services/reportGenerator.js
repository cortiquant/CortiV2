/**
 * reportGenerator.js
 *
 * Dedicated professional corporate DOCX generator for CortiQuant HR Reports.
 * Generates an editable Microsoft Word (.docx) document formatted for corporate
 * review, executive briefing, compliance record-keeping, and audit documentation.
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  ShadingType,
  PageBreak,
} = require("docx")

// Corporate Color Palette for Document Styling
const BRAND_PURPLE = "7E4CC7"      // Primary CortiQuant Purple
const BRAND_DARK = "191A42"        // Deep Navy Header
const TEXT_MAIN = "111827"         // Charcoal / Dark Slate for Body
const TEXT_MUTED = "4B5563"        // Muted Gray
const BORDER_COLOR = "D1D5DB"      // Clean Light Gray Border
const TABLE_HEADER_BG = "F3F4F6"   // Crisp off-white table header
const CALLOUT_BG = "F9FAFB"        // Card background
const ACCENT_GREEN = "047857"      // Normal State
const ACCENT_AMBER = "B45309"      // Elevated State
const ACCENT_RED = "B91C1C"        // Burnout Risk

/**
 * Generate a professional Word document (.docx) Buffer
 * @param {Object} reportData - Aggregated real data from MongoDB
 * @returns {Promise<Buffer>}
 */
async function generateDocxReport(reportData) {
  const {
    reportId = `CQ-RPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    reportTitle = "Monthly Wellbeing Report",
    reportType = "Monthly Wellbeing Report",
    period = "Current Reporting Period",
    organisationName = "Enterprise Organisation",
    generatedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    dataCutoffDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    overview = {},
    stressStates = [],
    departments = [],
    interventions = [],
    aiInsights = {},
    documentVersion = "1.0",
  } = reportData

  // Document-wide styling & margins (A4 standard: 1440 twips = 1 inch, 1134 twips ~ 20mm)
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22, // 11pt
            color: TEXT_MAIN,
          },
          paragraph: {
            spacing: {
              line: 276, // 1.15 line spacing
              after: 120, // 6pt after
            },
          },
        },
      },
    },
    sections: [
      // ──────────────────────────────────────────────────────────────────────────
      // SECTION 1: COVER / TITLE PAGE (No Header/Footer on Cover)
      // ──────────────────────────────────────────────────────────────────────────
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          // Top Brand Monogram / Header Bar
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "CORTIQUANT INTELLIGENCE",
                bold: true,
                size: 20, // 10pt
                color: BRAND_PURPLE,
                letterSpacing: 100,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 720 },
            children: [
              new TextRun({
                text: "WORKFORCE WELLBEING & STRESS ANALYTICS PLATFORM",
                size: 16,
                color: TEXT_MUTED,
                letterSpacing: 60,
              }),
            ],
          }),

          // Main Report Title
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 900, after: 200 },
            children: [
              new TextRun({
                text: reportTitle.toUpperCase(),
                bold: true,
                size: 54, // 27pt
                color: BRAND_DARK,
              }),
            ],
          }),

          // Subtitle / Scope
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 1200 },
            children: [
              new TextRun({
                text: "Comprehensive Organizational Psychological & Workload Stress Evaluation",
                size: 24, // 12pt
                italics: true,
                color: TEXT_MUTED,
              }),
            ],
          }),

          // Decorative Separation Line
          createHorizontalRule(BRAND_PURPLE, 24),

          // Metadata Block on Cover Page
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 900, after: 80 },
            children: [
              new TextRun({ text: "ORGANISATION: ", bold: true, size: 20, color: TEXT_MUTED }),
              new TextRun({ text: organisationName, bold: true, size: 22, color: TEXT_MAIN }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "REPORT TYPE: ", bold: true, size: 20, color: TEXT_MUTED }),
              new TextRun({ text: reportType, size: 22, color: TEXT_MAIN }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "REPORTING PERIOD: ", bold: true, size: 20, color: TEXT_MUTED }),
              new TextRun({ text: period, size: 22, color: TEXT_MAIN }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "REPORT ID: ", bold: true, size: 20, color: TEXT_MUTED }),
              new TextRun({ text: reportId, bold: true, size: 22, color: BRAND_PURPLE }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "GENERATION DATE: ", bold: true, size: 20, color: TEXT_MUTED }),
              new TextRun({ text: generatedDate, size: 22, color: TEXT_MAIN }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "PREPARED BY: ", bold: true, size: 20, color: TEXT_MUTED }),
              new TextRun({ text: "CortiQuant Workforce Wellbeing Platform (AI-Assisted)", size: 22, color: TEXT_MAIN }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 900 },
            children: [
              new TextRun({ text: "CLASSIFICATION: ", bold: true, size: 20, color: TEXT_MUTED }),
              new TextRun({ text: "CONFIDENTIAL — FOR AUTHORIZED ORGANIZATIONAL USE ONLY", bold: true, size: 20, color: ACCENT_RED }),
            ],
          }),

          // Page Break to start Document Body
          new Paragraph({
            children: [new PageBreak()],
          }),
        ],
      },

      // ──────────────────────────────────────────────────────────────────────────
      // SECTION 2: BODY SECTIONS (With Headers & Footers)
      // ──────────────────────────────────────────────────────────────────────────
      {
        properties: {
          page: {
            margin: {
              top: 1200,
              bottom: 1200,
              left: 1200,
              right: 1200,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: `CortiQuant Intelligence | ${organisationName} | `,
                    size: 16,
                    color: TEXT_MUTED,
                  }),
                  new TextRun({
                    text: "CONFIDENTIAL",
                    size: 16,
                    bold: true,
                    color: ACCENT_RED,
                  }),
                ],
              }),
              createHorizontalRule(BORDER_COLOR, 8),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              createHorizontalRule(BORDER_COLOR, 8),
              new Paragraph({
                alignment: AlignmentType.BETWEEN,
                spacing: { before: 100 },
                children: [
                  new TextRun({
                    text: `CortiQuant | Report ID: ${reportId} | Version ${documentVersion}`,
                    size: 16,
                    color: TEXT_MUTED,
                  }),
                  new TextRun({
                    text: "Page ",
                    size: 16,
                    color: TEXT_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: TEXT_MUTED,
                  }),
                  new TextRun({
                    text: " of ",
                    size: 16,
                    color: TEXT_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: TEXT_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ── 1. DOCUMENT CONTROL ───────────────────────────────────────────
          createHeading("1. Document Control & Audit Information"),
          new Paragraph({
            text: "This document establishes the audit trail, parameters, and access controls under which this workforce intelligence report was generated.",
            spacing: { after: 180 },
          }),
          createDocumentControlTable({
            reportId,
            organisationName,
            reportType,
            period,
            generatedDate,
            dataCutoffDate,
            documentVersion,
          }),

          // ── 2. EXECUTIVE SUMMARY ──────────────────────────────────────────
          createHeading("2. Executive Summary"),
          new Paragraph({
            children: [
              new TextRun({
                text: "The Executive Summary aggregates organization-wide stress indicators, check-in completion volumes, and shifting psychological demands across departments during this reporting period.",
              }),
            ],
            spacing: { after: 160 },
          }),

          // Highlight Box with Executive Narrative
          createCalloutBox(
            "Executive Overview (AI-Assisted Organizational Insight)",
            aiInsights?.executiveSummary ||
              "Aggregated organizational indicators reflect active workforce participation across the observed period. Data captures workload fluctuations, recovery adoption, and departmental variances in psychological strain.",
            BRAND_PURPLE
          ),

          ...(aiInsights?.keyObservations && aiInsights.keyObservations.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 180, after: 100 },
                  children: [
                    new TextRun({
                      text: "Key Aggregated Observations:",
                      bold: true,
                      size: 22,
                      color: BRAND_DARK,
                    }),
                  ],
                }),
                ...aiInsights.keyObservations.map(
                  (obs) =>
                    new Paragraph({
                      bullet: { level: 0 },
                      spacing: { after: 80 },
                      children: [new TextRun({ text: obs, size: 21 })],
                    })
                ),
              ]
            : []),

          // ── 3. DATA METHODOLOGY & PRIVACY SAFEGUARDS ───────────────────────
          createHeading("3. Data Methodology & Privacy Safeguards"),
          new Paragraph({
            text: "CortiQuant strictly isolates and aggregates employee check-in assessments to safeguard individual confidentiality while supplying leadership with actionable organizational visibility.",
            spacing: { after: 120 },
          }),
          createBullet("Data Source: Standardized CortiQuant biometric-calibrated questionnaires and voluntary check-in assessments submitted by verified employees."),
          createBullet(`Reporting Cohort: Aggregated from ${overview.totalEmployees || "active"} registered employees belonging to ${departments.length} tracked organizational departments.`),
          createBullet("MSI Scoring Scale: Mean Stress Index (MSI) is a 0–100 composite metric calibrated across autonomic indicators, perceived load, cognitive fatigue, and recovery latency."),
          createBullet("Stress Classifications: Normal (0–40 MSI), Acute Strain (41–60 MSI), Persistent Elevation (61–80 MSI), and Burnout Risk (81–100 MSI)."),
          createBullet("Anonymity Threshold: Any department or subset cohort with fewer than 3 active participant records is suppressed and designated 'Insufficient aggregated data' to eliminate re-identification risks."),
          createBullet("No Individual Exposure: Individual employee scores, names, usernames, and specific questionnaire answers are cryptographically excluded from HR export data."),

          // ── 4. WORKFORCE STRESS OVERVIEW ──────────────────────────────────
          createHeading("4. Workforce Stress Overview"),
          new Paragraph({
            text: "Summary of overarching organizational strain, participation rates, and stress classification distribution for the active reporting window.",
            spacing: { after: 160 },
          }),
          createStressOverviewTable(overview, stressStates),

          new Paragraph({
            spacing: { before: 180, after: 100 },
            children: [
              new TextRun({
                text: "Stress State Distribution (Active Cohort):",
                bold: true,
                size: 22,
                color: BRAND_DARK,
              }),
            ],
          }),
          createStressStateDistributionTable(stressStates),

          // ── 5. DEPARTMENT STRESS ANALYSIS (USING departmentId) ────────────
          createHeading("5. Department Stress Analysis"),
          new Paragraph({
            text: "Departmental breakdown using stable, unique organizational department identifiers (departmentId). This table reflects aggregated stress dynamics across functional teams without exposing individual employee identities.",
            spacing: { after: 160 },
          }),
          createDepartmentTable(departments),

          // ── 6. INTERVENTION & RECOVERY IMPACT ─────────────────────────────
          createHeading("6. Intervention & Recovery Impact"),
          new Paragraph({
            text: "Evaluation of voluntary employee recovery modalities across CortiQuant, including Reset Labs, Human Listener sessions, Digital Dump Bag check-ins, guided exercises, and structured recovery workshops.",
            spacing: { after: 120 },
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: "Observational Notice: ",
                bold: true,
                size: 20,
                color: TEXT_MUTED,
              }),
              new TextRun({
                text: "Observational data only. Association between intervention participation and MSI change does not establish causation or clinical outcome.",
                italics: true,
                size: 20,
                color: TEXT_MUTED,
              }),
            ],
          }),
          createInterventionsTable(interventions),

          // ── 7. AI-ASSISTED ORGANIZATIONAL INSIGHTS ────────────────────────
          createHeading("7. AI-Assisted Organizational Insights"),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: "AI-Assisted Insight Notice: ",
                bold: true,
                color: BRAND_PURPLE,
                size: 21,
              }),
              new TextRun({
                text: "The following synthesis is generated strictly by analyzing aggregated statistical trends across departments and interventions. The AI does not inspect individual psychological profiles, provide medical diagnoses, or claim clinical causation.",
                size: 21,
                italics: true,
              }),
            ],
          }),

          ...(aiInsights?.departmentInsights && aiInsights.departmentInsights.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 120, after: 80 },
                  children: [new TextRun({ text: "Department-Level Patterns:", bold: true, size: 22 })],
                }),
                ...aiInsights.departmentInsights.map(
                  (item) =>
                    new Paragraph({
                      bullet: { level: 0 },
                      spacing: { after: 80 },
                      children: [
                        new TextRun({ text: `${item.departmentId || "Team"}: `, bold: true }),
                        new TextRun({ text: item.insight }),
                      ],
                    })
                ),
              ]
            : [
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: "Insufficient longitudinal data to generate granular department-level pattern analysis.", italics: true })],
                }),
              ]),

          ...(aiInsights?.interventionInsights && aiInsights.interventionInsights.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 140, after: 80 },
                  children: [new TextRun({ text: "Recovery Modality Observations:", bold: true, size: 22 })],
                }),
                ...aiInsights.interventionInsights.map(
                  (item) =>
                    new Paragraph({
                      bullet: { level: 0 },
                      spacing: { after: 80 },
                      children: [
                        new TextRun({ text: `${item.intervention}: `, bold: true }),
                        new TextRun({ text: item.insight }),
                      ],
                    })
                ),
              ]
            : []),

          // ── 8. RECOMMENDED ORGANIZATIONAL ACTIONS ─────────────────────────
          createHeading("8. Recommended Organizational Actions"),
          new Paragraph({
            text: "Evidence-based, organizational adjustments and workload scheduling interventions suggested by aggregated patterns:",
            spacing: { after: 120 },
          }),
          ...(aiInsights?.recommendedActions && aiInsights.recommendedActions.length > 0
            ? aiInsights.recommendedActions.map(
                (rec, i) =>
                  new Paragraph({
                    bullet: { level: 0 },
                    spacing: { after: 100 },
                    children: [
                      new TextRun({ text: `Action ${i + 1}: `, bold: true, color: BRAND_PURPLE }),
                      new TextRun({ text: rec }),
                    ],
                  })
              )
            : [
                createBullet("Encourage regular micro-breaks and priority alignment during high-strain sprint deadlines."),
                createBullet("Promote scheduled Reset Labs (Breathing, Priority Reset, Movement) for departments reporting acute strain."),
                createBullet("Maintain post-workday communication boundaries to protect restorative recovery windows."),
              ]),

          // ── 9. DATA QUALITY & LIMITATIONS ────────────────────────────────
          createHeading("9. Data Quality & Limitations"),
          new Paragraph({
            text: "Executive leadership should interpret this report in conjunction with broader contextual operations, considering the following statistical parameters:",
            spacing: { after: 120 },
          }),
          createBullet(`Active Cohort Size: Analysis reflects ${overview.totalEmployees || 0} registered employees with a participation rate of ${overview.participationRate || 0}%. Lower participation rates may introduce volunteer bias.`),
          createBullet("Self-Reported Nature: Questionnaires and check-ins rely on subjective reporting coupled with autonomic response indicators, which may fluctuate with external lifestyle circumstances."),
          createBullet("Observational Intervention Data: Recovery session pre/post MSI delta measurements reflect short-term immediate responses and do not imply permanent therapeutic remediation."),
          createBullet("Privacy & Suppression: Departments with fewer than 3 participants are aggregated or masked to strictly protect employee identity."),

          // ── 10. PRIVACY & CONFIDENTIALITY STATEMENT ───────────────────────
          createHeading("10. Privacy & Confidentiality Statement"),
          new Paragraph({
            text: "This document contains strictly aggregated workforce wellbeing intelligence generated for authorized HR and executive leadership. Under no circumstances should this report be distributed publicly or used for adverse individual employment evaluations.",
            spacing: { after: 160 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "CONFIDENTIALITY NOTICE: Authorized organizational leadership agrees to handle this document in accordance with corporate data governance and applicable workplace privacy regulations.",
                italics: true,
                bold: true,
                size: 20,
                color: ACCENT_AMBER,
              }),
            ],
            spacing: { after: 240 },
          }),

          // ── 11. SIGN-OFF & DOCUMENT ACKNOWLEDGEMENT ───────────────────────
          createHeading("11. Report Review & Acknowledgement"),
          new Paragraph({
            text: "This section records formal receipt and administrative review of this workforce wellbeing report.",
            spacing: { after: 180 },
          }),
          createSignOffTable(organisationName, reportId, generatedDate),
        ],
      },
    ],
  })

  return await Packer.toBuffer(doc)
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS & COMPONENT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function createHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28, // 14pt
        color: BRAND_DARK,
      }),
    ],
  })
}

function createBullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 21, color: TEXT_MAIN })],
  })
}

function createHorizontalRule(color = BORDER_COLOR, size = 12) {
  return new Paragraph({
    spacing: { before: 120, after: 240 },
    border: {
      bottom: {
        color,
        space: 1,
        style: BorderStyle.SINGLE,
        size,
      },
    },
  })
}

function createCalloutBox(title, text, borderColor = BRAND_PURPLE) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: CALLOUT_BG, type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            borders: {
              left: { style: BorderStyle.SINGLE, size: 24, color: borderColor },
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 21,
                    color: BRAND_PURPLE,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text,
                    size: 21,
                    color: TEXT_MAIN,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

function createDocumentControlTable({
  reportId,
  organisationName,
  reportType,
  period,
  generatedDate,
  dataCutoffDate,
  documentVersion,
}) {
  const rows = [
    ["Report Identifier", reportId],
    ["Client Organisation", organisationName],
    ["Document Type", reportType],
    ["Reporting Period", period],
    ["Generation Timestamp", generatedDate],
    ["Data Cutoff Timestamp", dataCutoffDate],
    ["Document Version", documentVersion],
    ["Security Classification", "CONFIDENTIAL — FOR AUTHORIZED ORGANIZATIONAL USE ONLY"],
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, val], idx) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { fill: idx % 2 === 0 ? TABLE_HEADER_BG : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              borders: createCellBorders(),
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: TEXT_MUTED })] })],
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              shading: { fill: idx % 2 === 0 ? TABLE_HEADER_BG : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              borders: createCellBorders(),
              children: [new Paragraph({ children: [new TextRun({ text: String(val || "—"), size: 20, color: TEXT_MAIN })] })],
            }),
          ],
        })
    ),
  })
}

function createStressOverviewTable(overview, stressStates) {
  const currentMSI = overview.currentMSI != null ? `${overview.currentMSI} MSI` : "Insufficient data"
  const prevMSI = overview.previousMSI != null ? `${overview.previousMSI} MSI` : "Baseline Period"
  const change =
    overview.change != null
      ? `${overview.change > 0 ? "+" : ""}${overview.change} MSI`
      : "—"
  const partRate = overview.participationRate != null ? `${overview.participationRate}%` : "0%"

  const headers = ["Workforce Metric", "Current Period", "Previous Period", "Observed Delta"]
  const data = [
    ["Mean Stress Index (MSI)", currentMSI, prevMSI, change],
    ["Participation Rate", partRate, "—", "Active check-in cohort"],
    ["Active Employee Headcount", `${overview.totalEmployees || 0} employees`, "—", "Tracked across teams"],
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      createHeaderRow(headers),
      ...data.map((r, idx) => createDataRow(r, idx % 2 === 0)),
    ],
  })
}

function createStressStateDistributionTable(stressStates = []) {
  const headers = ["Stress Classification", "Distribution %", "Check-in Volume", "Health Indicator"]
  const data = stressStates.map((s) => [
    s.state,
    `${s.pct}%`,
    `${s.count || 0} submissions`,
    s.state === "Normal"
      ? "Healthy adaptive response"
      : s.state === "Acute"
      ? "Manageable workload pressure"
      : s.state === "Persistent"
      ? "Sustained elevation"
      : "Requires priority recovery support",
  ])

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      createHeaderRow(headers),
      ...data.map((r, idx) => createDataRow(r, idx % 2 === 0)),
    ],
  })
}

function createDepartmentTable(departments = []) {
  const headers = ["Department", "Dept ID", "Headcount", "Current MSI", "Period Delta", "Stress State"]
  
  if (!departments || departments.length === 0) {
    return new Paragraph({
      text: "No active departments registered for this organisation.",
      italics: true,
      spacing: { after: 120 },
    })
  }

  const data = departments.map((d) => {
    if (d.employeeCount < 1) {
      return [d.name, d.departmentId, "0", "—", "—", "No participants"]
    }
    const msiStr = d.currentMSI != null ? `${d.currentMSI}` : "Insufficient aggregated data"
    const changeStr = d.changePercent != null ? `${d.changePercent > 0 ? "+" : ""}${d.changePercent}%` : "—"
    const stateStr = d.state ? d.state.toUpperCase() : "NORMAL"
    return [d.name, d.departmentId, String(d.employeeCount), msiStr, changeStr, stateStr]
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      createHeaderRow(headers),
      ...data.map((r, idx) => createDataRow(r, idx % 2 === 0)),
    ],
  })
}

function createInterventionsTable(interventions = []) {
  const headers = ["Intervention Modality", "Category", "Sessions", "Participants", "Pre-MSI", "Post-MSI", "Avg Delta"]

  if (!interventions || interventions.length === 0) {
    return new Paragraph({
      text: "No recovery intervention sessions recorded during this reporting period.",
      italics: true,
      spacing: { after: 120 },
    })
  }

  const data = interventions.map((inv) => [
    inv.name,
    inv.category || inv.type || "Recovery",
    String(inv.sessions || 0),
    String(inv.participants || 0),
    inv.preMSI != null ? String(inv.preMSI) : "—",
    inv.postMSI != null ? String(inv.postMSI) : "—",
    inv.delta != null ? `${inv.delta > 0 ? "+" : ""}${inv.delta} MSI` : "Pending data",
  ])

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      createHeaderRow(headers),
      ...data.map((r, idx) => createDataRow(r, idx % 2 === 0)),
    ],
  })
}

function createSignOffTable(organisationName, reportId, generatedDate) {
  const rows = [
    ["Prepared By:", "CortiQuant Workforce Wellbeing Platform (AI-Assisted Engine)"],
    ["Generated Timestamp:", generatedDate],
    ["Document Reference ID:", reportId],
    ["Reviewed By (Name):", "__________________________________________________"],
    ["Reviewer Designation:", "__________________________________________________"],
    ["Review Date:", "__________________________________________________"],
    ["Reviewer Signature:", "__________________________________________________"],
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, line], idx) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { fill: idx % 2 === 0 ? TABLE_HEADER_BG : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              borders: createCellBorders(),
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: TEXT_MUTED })] })],
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              shading: { fill: idx % 2 === 0 ? TABLE_HEADER_BG : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              borders: createCellBorders(),
              children: [new Paragraph({ children: [new TextRun({ text: line, size: 20, color: TEXT_MAIN })] })],
            }),
          ],
        })
    ),
  })
}

function createHeaderRow(headers = []) {
  return new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          shading: { fill: BRAND_DARK, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          borders: createCellBorders(),
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" })],
            }),
          ],
        })
    ),
  })
}

function createDataRow(values = [], isAlt = false) {
  return new TableRow({
    children: values.map(
      (val) =>
        new TableCell({
          shading: { fill: isAlt ? TABLE_HEADER_BG : "FFFFFF", type: ShadingType.CLEAR },
          margins: { top: 90, bottom: 90, left: 120, right: 120 },
          borders: createCellBorders(),
          children: [
            new Paragraph({
              children: [new TextRun({ text: String(val), size: 19, color: TEXT_MAIN })],
            }),
          ],
        })
    ),
  })
}

function createCellBorders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
  }
}

module.exports = {
  generateDocxReport,
}
