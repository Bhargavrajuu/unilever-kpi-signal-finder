/* Unilever KPI Signal Finder: sample data generator and algorithm for Unilever. */
const TOOL = {
  num: 12, area: "Business Analytics", product: "Executive Decision Intelligence", seed: 153,
  title: "Unilever KPI Signal Finder", company: "Unilever",
  why: "With hundreds of brands across many countries, Unilever leadership gets a flood of KPIs from every function. This tool tests which ones actually lead changes in margin, drops the noise, and explains the latest quarter in plain words.",
  statement: "Senior management receives hundreds of KPIs from different departments but cannot identify which indicators actually explain changes in business performance. Develop an LLM-powered decision-intelligence system that connects operational KPIs with financial outcomes and generates evidence-based executive insights.",
  dataNote: "One business group: 36 monthly KPIs from 6 functions and operating margin over 48 months (sample data).",
  steps: [
    ["Pull KPIs into one table", "36 KPIs from 6 functions, aligned by month"],
    ["Lead-lag scan", "Correlation with margin at lags of 0 to 3 months"],
    ["Granger-style test", "Does the KPI improve a margin forecast beyond margin's own past?"],
    ["Drop duplicates", "Remove KPIs that move with a stronger one (|r| > 0.85)"],
    ["Driver model", "Regression of margin on the shortlisted drivers at their lags"],
    ["Explain the latest quarter", "Contribution of each driver to the margin change"],
    ["Flag anomalies", "Latest month vs its own 12-month range"],
    ["Executive Q&A", "AI analyst answers questions in plain English"]
  ],
  params: [{ id: "n", label: "Drivers to keep", min: 3, max: 10, step: 1, value: 6, fmt: v => String(v) }],
  questions: ["Why did margin fall last quarter?", "Which 5 KPIs should be on the CEO dashboard?", "Which KPIs can we stop reporting?", "What should supply chain focus on?"],
  generate(r) {
    const T = 48, rw = (s, rho = 0.55) => { let v = 0; return S.range(T).map(() => v = rho * v + r.n(0, s)); }, dw = s => rw(s, 0.85);
    const price = dw(0.6), commod = dw(0.8).map((v, t) => v + (t > 40 ? 1.6 * (t - 40) / 4 : 0)), promo = dw(0.5).map((v, t) => v + (t > 42 ? 0.9 : 0)), osa = dw(0.5).map((v, t) => v - (t > 41 ? 1.2 : 0)), fa = dw(0.6), brand = dw(0.4);
    const lag = (a, l, t) => a[Math.max(0, t - l)];
    const margin = S.range(T).map(t => 16 + 1.1 * lag(price, 0, t) - 1.0 * lag(commod, 1, t) - 0.9 * lag(promo, 0, t) + 0.8 * lag(osa, 1, t) + 0.6 * lag(fa, 2, t) + 0.5 * lag(brand, 3, t) + r.n(0, 0.3));
    const k = [
      ["Sales", "Price realisation %", price, 2.0], ["Sales", "Promo depth %", promo.map(v => v * 0.9 + r.n(0, 0.15)), 18], ["Sales", "Trade promo spend % of sales", promo, 14], ["Sales", "Distribution points", rw(0.5), 82], ["Sales", "Order fill rate", osa.map(v => 0.7 * v + r.n(0, 0.4)), 95], ["Sales", "Key account growth", rw(0.7), 4], ["Sales", "E-commerce share", rw(0.4), 17], ["Sales", "Volume growth", rw(0.6), 2],
      ["Marketing", "Brand power score", brand, 60], ["Marketing", "Share of voice", brand.map((v, t) => lag(brand, 0, t + 1) * 0.6 + r.n(0, 0.4)), 30], ["Marketing", "A&P spend % of sales", rw(0.5), 13], ["Marketing", "Social sentiment", rw(0.6), 70], ["Marketing", "Penetration %", rw(0.4), 45], ["Marketing", "Innovation share of sales", rw(0.5), 12],
      ["Supply chain", "On-shelf availability %", osa, 92], ["Supply chain", "Forecast accuracy %", fa, 78], ["Supply chain", "Commodity cost index", commod, 100], ["Supply chain", "Freight cost per case", commod.map(v => 0.5 * v + r.n(0, 0.6)), 1.4], ["Supply chain", "Inventory days", rw(0.6), 38], ["Supply chain", "OTIF %", osa.map(v => 0.6 * v + r.n(0, 0.5)), 90], ["Supply chain", "Factory OEE %", rw(0.5), 74], ["Supply chain", "Waste %", rw(0.4), 2.5],
      ["HR", "Headcount", rw(0.5), 12000], ["HR", "Attrition %", rw(0.5), 9], ["HR", "Engagement score", rw(0.4), 74], ["HR", "Training hrs per FTE", rw(0.6), 22], ["HR", "Overtime %", rw(0.5), 6],
      ["Finance", "DSO days", rw(0.5), 32], ["Finance", "Capex % of sales", rw(0.4), 3.2], ["Finance", "FX index", rw(0.7), 100], ["Finance", "Working capital % of sales", rw(0.5), -2], ["Finance", "Overheads % of sales", rw(0.4), 11],
      ["Customer", "Complaints per million", rw(0.6), 18], ["Customer", "NPS", rw(0.6), 34], ["Customer", "Returns %", rw(0.4), 1.2], ["Customer", "Customer service level", osa.map(v => 0.5 * v + r.n(0, 0.6)), 96]
    ].map(([fnc, name, s, b]) => ({ fnc, name, raw: s, val: s.map(v => b + v * Math.max(0.2, Math.abs(b) * 0.02)) }));
    const months = S.range(T).map(t => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(t + 9) % 12] + " " + String(22 + Math.floor((t + 9) / 12)).padStart(2, "0"));
    return { kpis: k, margin, months };
  },
  analyze(D, P, r) {
    const Y = D.margin, NT = Y.length, K = D.kpis, L = 3;
    const scan = K.map(k => { let best = { lag: 0, r: 0 }; for (let l = 0; l <= L; l++) { const rr = S.corr(k.val.slice(L - l, NT - l), Y.slice(L)); if (Math.abs(rr) > Math.abs(best.r)) best = { lag: l, r: rr }; } return { ...k, ...best }; });
    // granger-style F test
    const y1 = Y.slice(L), ylag = Y.slice(L - 1, NT - 1);
    const m0 = M.ols(ylag.map(v => [v]), y1);
    scan.forEach(k => { const xl = k.val.slice(L - k.lag, NT - k.lag); const m1 = M.ols(ylag.map((v, i) => [v, xl[i]]), y1); k.F = ((m0.rss - m1.rss) / 1) / (m1.rss / (y1.length - 3)); });
    const ranked = [...scan].sort((a, b) => b.F - a.F);
    const kept = [], dropped = [];
    for (const k of ranked) { const dup = kept.find(c => Math.abs(S.corr(c.val, k.val)) > 0.85); if (dup) dropped.push({ k, dup }); else kept.push(k); }
    const drivers = kept.slice(0, P.n);
    const X = S.range(NT - L).map(i => drivers.map(d => d.val[L + i - d.lag]));
    const model = M.ols(X, y1);
    // last quarter vs previous quarter contributions
    const q = (t0, t1) => S.mean(Y.slice(t0, t1)); const now = q(NT - 3, NT), prev = q(NT - 6, NT - 3);
    const contrib = drivers.map((d, j) => { const xv = t => d.val[t - d.lag]; const a = S.mean([NT - 3, NT - 2, NT - 1].map(xv)), b = S.mean([NT - 6, NT - 5, NT - 4].map(xv)); return { name: d.name, fnc: d.fnc, v: model.beta[j + 1] * (a - b), chg: a - b }; });
    const resid = (now - prev) - S.sum(contrib.map(c => c.v));
    const anomalies = K.map(k => { const w = k.val.slice(NT - 13, NT - 1), z = (k.val[NT - 1] - S.mean(w)) / (S.sd(w) || 1); return { name: k.name, fnc: k.fnc, z, last: k.val[NT - 1] }; }).filter(a => Math.abs(a.z) > 2.2).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    const noise = scan.filter(k => k.F < 1.5 && !drivers.includes(k));
    const fmtv = v => Math.abs(v) >= 1000 ? F.num(v) : v.toFixed(1);
    const c2 = [...contrib].sort((a, b) => a.v - b.v);
    return {
      steps: [`${K.length} KPIs × ${NT} months`, `Strongest lead: ${[...scan].sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0].name} (r ${[...scan].sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0].r.toFixed(2)})`, `${scan.filter(k => k.F > 4).length} KPIs pass F > 4`, `${dropped.length} duplicates removed`, `R² ${model.r2.toFixed(2)} with ${drivers.length} drivers`, `Margin ${F.sgn(now - prev, v => v.toFixed(2) + " pts")} vs prior quarter`, `${anomalies.length} KPIs outside their normal range`, "Ready"],
      kpis: [
        { label: "KPIs reviewed", value: String(K.length), note: "From 6 functions" },
        { label: "Real drivers", value: String(drivers.length), note: `Explain ${F.pct(model.r2, 0)} of margin moves`, tone: "good" },
        { label: "Operating margin", value: now.toFixed(1) + "%", note: `${F.sgn(now - prev, v => v.toFixed(2))} pts vs prior quarter`, tone: now < prev ? "bad" : "good" },
        { label: "Safe to drop", value: String(noise.length + dropped.length), note: "No signal or duplicate", tone: "warn" }
      ],
      sections: [
        { title: "Operating margin", note: "Monthly operating margin %, last 48 months.", chart: C.line(D.months, [{ values: Y, tone: "c1" }], { fmt: v => v.toFixed(0) + "%", every: 6 }) },
        { pair: [
          { title: "Which KPIs lead margin", note: "Granger-style F score: how much each KPI improves next month's margin forecast. Top 12 shown; black = kept as driver.", chart: C.bar(ranked.slice(0, 12).map(k => ({ label: `${k.name} (lag ${k.lag})`, value: k.F, tone: drivers.includes(k) ? "" : "mut" })), { fmt: v => v.toFixed(0), labelW: 210 }) },
          { title: "What moved margin last quarter", note: `Contribution of each driver to the ${F.sgn(now - prev, v => v.toFixed(2))} pt change.`, chart: C.waterfall([{ label: "Prior qtr", value: prev, total: true }, ...c2.map(c => ({ label: c.name, value: c.v })), { label: "Other", value: resid }, { label: "Last qtr", value: now, total: true }], { fmt: v => v.toFixed(1) }) }
        ] },
        { title: "Driver model", html: T.table(["Driver", "Function", "Leads margin by", "Effect per unit", "Correlation", "Last-quarter change", "Margin impact"], drivers.map((d, j) => [d.name, d.fnc, d.lag + " mo", F.sgn(model.beta[j + 1], v => v.toFixed(3)), d.r.toFixed(2), F.sgn(contrib[j].chg, fmtv), T.pill(F.sgn(contrib[j].v, v => v.toFixed(2)) + " pts", contrib[j].v < -0.1 ? "bad" : contrib[j].v > 0.1 ? "good" : "mut")]), { right: [2, 3, 4, 5] }) },
        { pair: [
          { title: "Anomalies this month", html: anomalies.length ? T.table(["KPI", "Function", "Latest", "z-score"], anomalies.slice(0, 8).map(a => [a.name, a.fnc, fmtv(a.last), T.pill(a.z.toFixed(1), Math.abs(a.z) > 3 ? "bad" : "warn")]), { right: [2, 3] }) : "<p>No KPI is outside its usual range.</p>" },
          { title: "KPIs with no signal", note: "These did not help explain margin and duplicate nothing important. Report them quarterly or retire them.", html: `<p>${noise.map(k => esc(k.name)).join(", ")}</p><p class="small">Duplicates removed: ${dropped.map(d => `${esc(d.k.name)} (tracks ${esc(d.dup.name)})`).join(", ")}</p>` }
        ] }
      ],
      recs: [
        ...c2.filter(c => c.v < 0).slice(0, 3).map(c => ({ title: `${c.name} cost ${Math.abs(c.v).toFixed(2)} pts of margin`, body: `It moved ${F.sgn(c.chg, fmtv)} vs the prior quarter. Ask the ${c.fnc} leader for a recovery plan with a monthly target on this KPI.`, impact: c.v.toFixed(2) + " pts", tone: "bad" })),
        { title: `Rebuild the executive dashboard around ${drivers.length} drivers`, body: `${drivers.map(d => d.name).join(", ")} explain ${F.pct(model.r2, 0)} of monthly margin moves. Show each with its lead time so leaders act before margin moves.`, impact: `${K.length} → ${drivers.length} KPIs`, tone: "good" },
        { title: `Retire or demote ${noise.length + dropped.length} KPIs`, body: "They carry no extra signal about margin. Moving them to function-level reports cuts review time in the monthly business review.", impact: "Less noise", tone: "" }
      ],
      context: { margin_last_quarter: +now.toFixed(2), margin_prior_quarter: +prev.toFixed(2), model_r2: +model.r2.toFixed(2), drivers: drivers.map((d, j) => ({ kpi: d.name, function: d.fnc, lead_months: d.lag, correlation: +d.r.toFixed(2), coefficient: +model.beta[j + 1].toFixed(3), last_quarter_change: +contrib[j].chg.toFixed(2), margin_impact_pts: +contrib[j].v.toFixed(2) })), unexplained_pts: +resid.toFixed(2), anomalies: anomalies.map(a => ({ kpi: a.name, z: +a.z.toFixed(1) })), no_signal_kpis: noise.map(k => k.name), duplicates: dropped.map(d => ({ kpi: d.k.name, tracks: d.dup.name })) }
    };
  }
};
