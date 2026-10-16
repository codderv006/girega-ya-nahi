# Girega Ya Nahi?

> G maane Genius. D maane Dunk.

Point your phone at a Parle-G and your chai. A 10-stage physics pipeline predicts, to the decimal second, how long the biscuit survives the dunk. Then you dunk for real, log the time, and get a share card (or a death certificate).

Source: https://github.com/codderv006/girega-ya-nahi

Built for the GDG MAD "useless engineering" contest. The engineering is real. The problem is not.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000  (Turbopack)
npm test           # physics unit tests
npm run typecheck
```

**It needs no keys.** Without them:
- Vision uses a deterministic offline heuristic, so the same photo always gets the same analysis.
- Storage is in-memory. Results, the leaderboard and the learning loop reset when the server restarts.

Optional `.env.local` (see `.env.example`):

| Variable | Effect |
|---|---|
| `GEMINI_API_KEY` | Real Gemini vision analysis of the biscuit and chai photos |
| `GEMINI_MODEL` | Override the model (default `gemini-2.5-flash`) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Persistent leaderboard, results and Bayesian learning |
| `NEXT_PUBLIC_SITE_URL` | Absolute URL for OG tags once deployed |

To test on your phone over Wi-Fi, open `http://<your-PC-LAN-IP>:3000`. The camera input works over plain HTTP because it uses a file picker, not `getUserMedia`.

## Map

```
app/
  page.tsx                landing (3D hero, scroll-driven demo death)
  dunk/page.tsx           scan → setup → predict → test → share
  leaderboard/page.tsx
  r/[id]/page.tsx         public result page with OG tags
  api/predict             SSE pipeline (10 stages)
  api/result              log actual time, update boards + Bayesian posterior
  api/leaderboard
  api/og                  share card / death certificate PNGs (story 1080×1350, wide 1200×630)
lib/
  physics/                washburn, fluid, thermal, structural, model, montecarlo, bayes, rng
  pipeline/orchestrator   the stages and the events they emit
  vision/gemini.ts        Gemini call + offline fallback
  store/                  Upstash Redis or in-memory
  mascot.ts               "Biskit", one SVG source for the browser and the share image
components/
  three/                  procedural biscuit, chai cup, steam, ripples
  BackendConsole.tsx      live SSE console
  steps/                  one component per screen
tests/physics.test.ts
```

---

## Technical Whitepaper

*On the Predictive Modelling of Glucose Biscuit Structural Failure in Indian Chai Systems*

### Abstract

The dunking of glucose biscuits in chai is a daily event with no reliable forecasting infrastructure. Prior work (Fisher, 1999) addressed British biscuits in British tea and was rightly recognised with an Ig Nobel Prize. It did not consider kadak chai, kulhads, office vending machines or the human wrist. We present a ten-stage pipeline that closes this gap.

### 1. Request Intake & Validation

Payloads are validated against a strict Zod schema. A SHA-256 digest of the parameters and images seeds every random process downstream, so identical dunks receive identical predictions. Requests are notionally routed to `ap-south-1` (Mumbai), because chai.

### 2. Vision Analysis

The biscuit photograph (and optionally the chai) goes to Gemini with a JSON response schema. It returns whether the specimen is a glucose biscuit, a count of broken edges, estimated thickness, a defect score and the chai's milkiness. If no key is configured, or the model fails or takes over 12 s, a deterministic heuristic keyed on the image hash takes over. The biscuit is never told.

### 3. Material Profiling

Starting from a reference biscuit (56 × 42 × 4.8 mm, 5.4 g, porosity 0.42, effective pore radius 0.45 µm, tortuosity 3.2, dry flexural strength 0.9 MPa), we adjust:

- r = r₀ (1 + 0.4·defect): cracks open wider capillaries
- σ_dry = σ₀ (1 − 0.06·edges)(1 − 0.25·defect)
- length and mass shrink 5% per broken edge

### 4. Fluid Dynamics

Chai viscosity follows the Vogel–Fulcher–Tammann form for water, scaled by a per-variety milk multiplier:

  η(T) = 2.414×10⁻⁵ · 10^(247.8 / (T − 140)) · μ_milk  [Pa·s, T in K]

Surface tension decreases linearly with temperature from a per-variety 20 °C reference, and milk fat raises the contact angle on starch. Office-machine chai gets a −8 °C honesty correction.

### 5. Washburn Capillary Model

Penetration of the wet front (Washburn, 1921):

  L(t) = √(γ · r · cosθ · t / 2η)

The critical depth is the tortuous half-thickness for two-sided wicking, or the full thickness for Fisher's one-sided horizontal method. Inverting gives the saturation time t_sat = 2η L_c² / (γ r cosθ). Spiral dunking adds forced convection, raising effective r by 25%.

### 6. Thermal Softening

Each vessel loses some heat on pouring, then cools by Newton's law (ambient 30 °C, Mumbai). Kulhads lose 6 °C on contact and cool fastest; steel holds heat like a grudge. Starch gelatinisation and sugar-glass softening follow an Arrhenius ratio relative to 60 °C (Eₐ = 25 kJ/mol), and the wet-shell softening rate is k = k₀ √S.

### 7. Structural Failure

The submerged section is a cantilever under its own weight plus absorbed chai, loaded by a moment arm (tilt) and a dynamic amplification factor for wrist tremor during extraction:

  σ_bend = M / Z,  M = ½ w L² · arm · DAF,  Z = b h² / 6

Remaining strength is a shrinking dry core plus an exponentially softening wet shell:

  σ_wet(s) = σ_dry · [(1 − s)² + e^(−k s)] / 2

Bisection finds the saturation s* where σ_wet = σ_bend. Since s = √(t / t_sat), the time to failure is t* = t_sat · s*². If the biscuit survives full saturation, a sugar-dissolution phase finishes it off.

### 8. Monte Carlo Ensemble

5,000 simulations perturb pore radius (lognormal, 15%), temperature (±2.5 °C), dry strength (12%), tortuosity (8%), dunk depth (6%, doubled for spiral) and thickness (5%). We report the median and the 90% interval [p₀₅, p₉₅], plus a 24-bin histogram drawn live in the console. With a fixed seed, results are bit-for-bit reproducible.

### 9. Bayesian Community Correction

Each chai variety has a multiplicative correction c, learned in log space with a conjugate Normal–Normal model (prior N(0, 0.25²), observation noise 0.35):

  y = log(actual / predicted),  posterior precision = 1/σ₀² + n/σ²

A fall counts as a full observation. Surviving past the prediction counts as a conservative lower bound. Pulling the biscuit out early teaches nothing and is excluded.

### 10. Verdict Synthesis

The prediction is median × c with its 90% interval. The optimal dunk ("abhi daal, abhi nikaal") is 0.85 × p₀₅, survivable with 95% confidence. The cause of death depends on the dunk style: structural collapse (vertical), dignified delamination (horizontal) or centrifugal disintegration (spiral).

### Validation

`npm test` checks that Washburn penetration scales with √t and inverts exactly, that water viscosity matches reference values at 20 °C and 100 °C, that strength decreases monotonically with saturation, that deeper and hotter dunks fail sooner, that Fisher's horizontal method lasts several times longer (consistent with his findings), that Monte Carlo is deterministic under a fixed seed, and that the Bayesian update matches the closed form.

### Limitations

Peer-reviewed by nobody. Trusted by everybody.

---

*A fan-made, unserious project. Not affiliated with or endorsed by any biscuit company. The mascot and visuals are original. Dunk responsibly.*
