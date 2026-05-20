## You said: Hey, I want to estimate prices for our future cloud service, and I'll need to find all the things that go into place, and estimate those (± range).

{ "sizes": \[ { "id": "b-1-500mb-10", "name": "Basic 1-500mb-25GB",
"description": null, "memory": 0.5, "vcpus": 1, "disk": 10, "transfer":
0.5, "units": 1, "category": "basic", "disk_type": "nvme",
"architecture": "

pasted

Hey, I want to estimate prices for our future cloud service, and I'll
need to find all the things that go into place, and estimate those (±
range). I need to know the prices of basic things, then compose those to
get the real prices here (+ some margin for profit)

That should also include the spending on power, worker salaries ... etc.
I know that's naive; you can do better.

Step A.0: Let's first catalog all what plays into that. And let's gather
some data;

Actually, let's get some more insight from you, so we can get a better
and improved step A &gt; A.0

2:03 PM

## Claude responded: Good timing to pause before jumping into a catalog — a few structural insights first that'll make A.

Architected layered cost framework before cataloging components

Architected layered cost framework before cataloging components

Good timing to pause before jumping into a catalog — a few structural
insights first that'll make A.0 much sharper.

---

### Before A.0: Framing Questions That Change Everything

**1. What's your cost model shape?**

There are two fundamentally different starting points:

- **CapEx-heavy**: You own/colocate physical servers → your cost is
  amortized hardware + opex. Every idle VM slot is waste.
- **CapEx-light**: You rent from a hyperscaler/AT infrastructure and
  re-sell with margin → your cost floor is their price + your overhead.

OpenScaler is almost certainly a hybrid right now, but the model changes
the math dramatically. Which is closer to your reality?

**2. Oversubscription is where the money is**

On "Shared CPU" plans (which is what your screenshot shows), you don't
sell 1 vCPU = 1 physical core. A typical ratio is **4–20:1**. The
`units` field in your JSON is interesting — it scales with RAM (roughly
1 unit ≈ 1 GiB RAM). That suggests you've already defined your internal
pricing atom. What does one unit _physically_ map to?

**3. Algeria-specific distortions**

- Electricity in Algeria is **heavily subsidized** → power costs will be
  anomalously low vs. global benchmarks. This is a genuine competitive
  advantage if you're on-premise or colocated locally.
- Hardware arrives with **import duties** (potentially 15–30% on server
  equipment).
- Salaries are in DZD, hardware in USD/EUR → exchange rate risk is a
  real cost factor.
- AT partnership: does this mean you get rack space, transit, or
  hardware from them? That changes your cost structure at the
  foundation.

**4. The reference in the screenshot is DigitalOcean-style pricing**

Your JSON structure (`s-1vcpu-1gb`, pricing tiers, transfer limits)
looks DO-inspired. But DO prices reflect US datacenter costs, US
salaries, and global transit rates — none of which apply to you. You
probably have lower power + labor costs but higher hardware acquisition
costs. The net might actually be favorable.

---

### Recommended A.0 Structure (improved)

Rather than a flat catalog, organize into **three layers** with
different uncertainty profiles:

Layer

Components

Uncertainty

**Hardware**

Servers, networking gear, storage

Medium — one-time quotes

**Infrastructure**

Power, cooling, colocation/rack, transit/bandwidth

Low–Medium (AT deal matters here)

**Operating**

Salaries, support, tooling licenses, legal, insurance

Low (you know your team)

**Business**

Churn buffer, free tier cost, margin target, currency risk

High

---

So before we build the catalog: can you answer these?

1.  Do you own physical hardware, colocate, or are you provisioning on
    top of AT/other infrastructure?
2.  What does Algérie Télécom actually provide — bandwidth, rack space,
    hardware, or something else?
3.  Is there an existing cost per server you can ballpark, or are we
    estimating from scratch?

That'll let A.0 be precise rather than generic.

## You said: I'd like to explore different scenarios, and to have an algorithm or protocol to follow so we can estimate each; but I'll tell you the most likely scenario:

I'd like to explore different scenarios, and to have an algorithm or
protocol to follow so we can estimate each; but I'll tell you the most
likely scenario:

1.  We'll have to start with AT hardware, which is super expensive
    "2000,000 DZD per server", those are ready servers, not our
    assembled ones ... and as I talked with founder, this route might be
    exclusively for free trial, so we won't start with these prices, or
    it'll destroy our image
2.  Later on, we'll have to start working with our own hardware, we
    import raw hardware (RAMs, CPUs, Motherboards, ... etc.) and
    assemble servers ourselves with our own blueprint. This is what I'd
    like to focus on.

In both cases, AT needs to provide (at least initially):

- rack space (at least initially)
- bandwidth and network infrastructure (cables between datacenters);
  this is a must and a long living one, we can't do this ourselves, even
  long term

Show more

2:13 PM

## Claude responded: Good — this is a much cleaner picture.

Architected cost estimation framework for hardware scenarios

Architected cost estimation framework for hardware scenarios

Good — this is a much cleaner picture. Two scenarios, one protocol that
covers both, with Phase 2 being the real target.

Let me lay out the estimation algorithm first, then identify every input
variable we need to populate.

---

### The Protocol (Scenario-Agnostic)

The core idea: **everything eventually reduces to a monthly cost per
server, then you divide that by how many VMs it can host.**

    Monthly Cost per Server
    = (Amortized Hardware) + (Rack) + (Power) + (Bandwidth) + (OpEx Allocation)
                                                        ↓
                                  ÷ Effective VM slots (after oversubscription model)
                                                        ↓
                                        = Break-even price per VM slot
                                                        ↓
                                        × (1 + margin%) = Sale price

Each of those inputs has a **scenario variant**:

Input

Phase 1 (AT hardware)

Phase 2 (self-assembled)

Amortized hardware

`2,000,000 DZD ÷ amort. months`

`Σ(component costs + duties) ÷ amort. months`

Rack

Included or separate charge from AT

Same (AT rack, initially)

Power

AT datacenter rate or subsidized grid

Same

Bandwidth

AT transit price

Same — long-term dependency

OpEx

Your team's time × allocated %

Same

---

### The Variables Catalog

#### 🔩 A. Hardware (Phase 2 focus)

Per server blueprint, you need to cost each component **+ import
duties**:

- CPUs × quantity (e.g. dual-socket vs single)
- RAM DIMMs × quantity (DDR4/DDR5, ECC — server RAM, not desktop)
- Motherboard (server-grade, IPMI/iDRAC support)
- NVMe SSDs × quantity
- NIC (10GbE minimum, 25GbE ideally)
- Chassis + PSU (redundant PSU is standard)
- Rails, cables, misc
- **Import duty rate** on each category (Algeria customs HS codes differ
  per component)
- **Shipping cost** (weight-based, from where — EU? China? UAE?)
- Assembly labor (your time or a tech's time, costed)
- **Amortization period**: typically 36–60 months for servers

> One number to nail down early: **what target spec is your reference
> server?** That's the blueprint everything else derives from. Probably
> something like: 2× AMD EPYC or Xeon, 256GB ECC RAM, 4–8× NVMe drives,
> dual 25GbE NIC.

---

#### 🏢 B. AT-Provided Infrastructure (both phases)

- **Rack space**: price per U/month, or per full rack/month? You need to
  know AT's rack rental rate.
- **Power allocation**: price per kW or kWh? Or bundled with rack?
  Algerian subsidized electricity is ~4–6 DZD/kWh for industrial — but
  AT may bill differently inside their DC.
- **Cooling**: usually bundled with datacenter pricing (PUE factor —
  typically 1.3–1.6 for mid-tier DCs)
- **Bandwidth/transit**: this is the big one.
  - Price per Mbps/month committed? Or per GB transferred?
  - International vs domestic distinction (AT's AS2609 peers differently
    for each)
  - This is your **longest-lived AT dependency** and your biggest
    pricing risk — if they raise transit rates, your margin collapses.

---

#### 👷 C. OpEx — Human & Operational

- **Salaries**: You + co-founder + Khaled (how much of their time is
  infrastructure ops vs product?)
- **Allocated per-server**: total team cost ÷ number of servers = salary
  burden per server/month
- **Tooling & licenses**: monitoring, backup software, etc.
- **Legal/accounting**: amortized monthly
- **Spare parts buffer**: servers fail. Budget ~2–5% of hardware
  cost/year for replacements.
- **Insurance**: on hardware (especially imported equipment)

---

#### 📊 D. Business Layer (the non-obvious costs)

- **Oversubscription ratio**: how many vCPUs do you sell per physical
  core? (Your JSON's `units` field suggests you already have a model —
  worth making explicit)
- **Target utilization**: you won't run at 100%. Budget for ~60–70%
  sustained utilization as the realistic revenue-generating base.
- **Free tier cost absorption**: if Phase 1 AT hardware is only for free
  trials, that's a marketing cost — needs to be absorbed somewhere.
- **Currency risk buffer**: hardware in USD/EUR, revenue in DZD. Build
  in a % buffer or re-price quarterly.
- **Profit margin target**: what % do you want? 30%? 50%? This is a
  business decision, not a cost one — but it determines whether your
  prices are competitive.

---

### What I Need From You to Run Phase 2 Numbers

To go from protocol → actual estimates, the high-priority unknowns are:

1.  **Target server blueprint** — rough specs (cores, RAM, storage)
2.  **AT rack + power pricing** — even a rough figure
3.  **AT bandwidth price** — per Mbps or per GB?
4.  **Import duty rate** — do you have any experience importing
    components, or should we estimate from Algerian customs schedules?
5.  **Team cost allocation** — rough monthly salary total for
    ops-involved people

Once you give me those, we can run actual numbers for both phases and
build a sensitivity table that shows how margin shifts with utilization
rate and oversubscription ratio.

## You said: I don't know the target server blueprint, you'll have to guess

1.  I don't know the target server blueprint, you'll have to guess
2.  Same here, you can guess based on information available online
3.  Same
4.  Same
5.  For team, we can say like 150000 DZD per month, for each person, for
    a "small" team (idk; but way less than 100 people)

2:18 PM

## Claude responded: Good, I have enough data.

Architected interactive cost calculator with parametric server economics
model

Architected interactive cost calculator with parametric server economics
model

The user wants me to research and estimate all these costs. Let me
search for relevant data points:

- AT (Algérie Télécom) pricing for rack space and bandwidth
- Algerian electricity costs in datacenters
- Import duties in Algeria for server hardware
- Server component costs (to design a reference blueprint)
- General datacenter pricing benchmarks

Let me search for some of this information.

Show more

Algérie Télécom datacenter colocation rack space pricing 2024

6 results

<a href="https://encoradvisors.com/data-center-pricing/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Understanding Colocation Data Center Pricing in 2025 - ENCOR Advisors

encoradvisors.com

<a href="https://www.servermania.com/kb/articles/server-colocation-cost"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

2026 Colocation Costs & Pricing Overview | ServerMania

www.servermania.com

<a href="https://brightlio.com/colocation-pricing/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Colocation Pricing in 2026: Rack, Cabinet & Data Center Costs

brightlio.com

<a href="https://hostarts.dz/colocation-rack-space-algerie"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Colocation & Rack Space - DATACENTER ALGERIE

hostarts.dz

<a
href="https://lightyear.ai/resources/ultimate-guide-to-colocation-pricing"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

The Ultimate Guide to Colocation Pricing - Lightyear.ai

lightyear.ai

<a
href="https://markets.financialcontent.com/dowtheoryletters/article/bizwire-2025-11-4-middle-east-and-africa-colocation-data-center-portfolio-report-2025-2029-existing-and-upcoming-white-floor-space-current-and-future-it-capacity-retail-colocation-pricing-wholesale-colocation-pricing-researchandmarketscom"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

bizwire 2025 11 4 middle east and africa colocation data center
portfolio report 2025 2029 existing and upcoming white floor space
current and future it capacity retail colocation pricing wholesale
colocation pricing researchandmarketscom

markets.financialcontent.com

Algeria electricity price per kWh industrial tariff 2024 DZD

10 results

<a href="https://www.globalpetrolprices.com/Algeria/electricity_prices/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria electricity prices, June 2025 | GlobalPetrolPrices.com

www.globalpetrolprices.com

<a
href="https://www.statista.com/statistics/1283693/price-of-electricity-among-households-and-businesses-in-algeria/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria: electricity prices 2023| Statista

www.statista.com

<a href="https://www.globalpetrolprices.com/Algeria/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria energy prices | GlobalPetrolPrices.com

www.globalpetrolprices.com

<a
href="https://www.ceicdata.com/en/algeria/environmental-environmental-policy-taxes-and-transfers-non-oecd-member-annual/dz-residential-electricity-price-usd-per-kwh"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria DZ: Residential Electricity Price: USD per kWh | Economic
Indicators | CEIC

www.ceicdata.com

<a href="https://www.enerdata.net/estore/country-profiles/algeria.html"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria Energy Market Report | Energy Market Research in Algeria

www.enerdata.net

<a
href="https://www.jonesday.com/en/insights/2015/04/newly-updated-renewable-energy-program-in-algeria"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Newly Updated Renewable Energy Program in Algeria | Insights | Jones Day

www.jonesday.com

<a href="https://asjp.cerist.dz/en/downArticle/126/12/1/205040"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Forecasting Electricity Consumption in Algeria Using ...

asjp.cerist.dz

<a href="https://www.global-climatescope.org/markets/algeria"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Climatescope 2025 | Algeria

www.global-climatescope.org

<a
href="https://data.worldbank.org/indicator/EG.USE.ELEC.KH.PC?locations=DZ"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Electric power consumption (kWh per capita) - Algeria | Data

data.worldbank.org

<a href="https://egyptera.org/en/TarrifAug2024.aspx"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

CurrentElectricity Tariff

egyptera.org

Algeria import duties customs tariff server hardware CPU RAM motherboard
2024

10 results

<a
href="https://aztinformatique.com/blog/navigating-algerian-import-regulations-for-it-hardware-a-guide-for-b2b-success-2024-update/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Navigating Algerian Import Regulations for IT Hardware: A Guide for B2B
Success (2024 Update)

aztinformatique.com

<a
href="https://www.trade.gov/country-commercial-guides/algeria-customs-regulations"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria - Customs Regulations

www.trade.gov

<a
href="https://www.trade.gov/country-commercial-guides/algeria-import-tariffs"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria - Import Tariffs

www.trade.gov

<a
href="https://www.wto.org/english/res_e/statis_e/daily_update_e/tariff_profiles/DZ_E.pdf"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria Part A.1 Tariffs and imports: Summary and duty ranges Total Ag
Non-Ag

www.wto.org

<a href="https://www.douane.gov.dz/?lang=en"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algerian Customs

www.douane.gov.dz

<a
href="https://www.freightamigo.com/en/blog/logistics/understanding-import-taxes-and-duties-a-comprehensive-guide-for-shipping-to-algeria/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Understanding Import Taxes and Duties: A Comprehensive ...

www.freightamigo.com

<a href="https://taxsummaries.pwc.com/algeria/corporate/other-taxes"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria - Corporate - Other taxes - Worldwide Tax Summaries

taxsummaries.pwc.com

<a href="https://wits.worldbank.org/tariff/trains/en/country/DZA"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria Tariff Schedule - World Integrated Trade Solution (WITS)

wits.worldbank.org

<a href="https://www.easyship.com/duties-and-taxes-calculator/algeria"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Algeria Import Duty And Taxes Calculator From United States

www.easyship.com

<a
href="https://www.freightamigo.com/en/blog/logistics/understanding-algeria-customs-a-guide-for-international-shippers/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Understanding Algeria Customs: A Guide for International ...

www.freightamigo.com

dual socket server build cost 2024 AMD EPYC components price USD

9 results

<a
href="https://www.servethehome.com/amd-epyc-7c13-is-a-surprisingly-cheap-and-good-cpu/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

AMD EPYC 7C13 is a Surprisingly Cheap and Good CPU

www.servethehome.com

<a
href="https://hostkey.com/dedicated-servers/powerful/epyc-dual-socket/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

AMD EPYC Dual Socket Servers | HOSTKEY

hostkey.com

<a
href="https://www.amd.com/en/products/processors/server/epyc/9005-series/amd-epyc-9965.html"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

AMD EPYC™ 9965

www.amd.com

<a href="https://www.broadberry.com/dual-amd-epyc-rackmount-servers"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

AMD EPYC Servers, Dual Processor - Configure Online

www.broadberry.com

<a href="https://www.walmart.com/c/kp/processor-for-server"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Processor For Server

www.walmart.com

<a href="https://www.walmart.com/c/kp/server-cpu"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Server Cpu

www.walmart.com

<a href="https://www.newegg.com/p/370-002E-00037"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

• $3,773.88

www.newegg.com

<a href="https://www.walmart.com/c/kp/amd-epyc"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Amd Epyc(68)

www.walmart.com

<a href="https://secure.newegg.com/wishlist/pd/32294598"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

secure.newegg.com

secure.newegg.com

internet bandwidth transit price per Mbps Africa Algeria 2024

10 results

<a
href="https://www.africanexponent.com/top-10-african-countries-with-the-affordable-broadband-markets-in-2025/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Top 10 African Countries with the Affordable Broadband Markets in 2025

www.africanexponent.com

<a
href="https://resources.telegeography.com/ip-transit-price-erosion-significant-regional-differences-remain"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

IP Transit Pricing in 2025: More Competition, More Price Erosion

resources.telegeography.com

<a
href="https://www.visualcapitalist.com/internet-costs-by-country-in-2025/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Who’s Paying the Most for Internet in 2025?

www.visualcapitalist.com

<a
href="https://www2.telegeography.com/hubfs/assets/product-tear-sheets/product-page-content-samples/global-internet-geography/telegeography-global-internet-geography-executive-summary.pdf"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

IP Networks Research Service Executive Summary

www2.telegeography.com

<a
href="https://atuuat.africa/wp-content/uploads/2024/11/Africa-Broadband-Outlook-2024-v1-00-DRAFT-FINAL-08.11.2024.pdf"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Africa Broadband Outlook 2024

atuuat.africa

<a
href="https://www.oafrica.com/broadband/comparing-african-fixed-broadband-prices/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Comparing African fixed broadband prices | oAfrica Mobile

www.oafrica.com

<a href="https://blog.cloudflare.com/bandwidth-costs-around-the-world/"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

Bandwidth Costs Around the World

blog.cloudflare.com

<a
href="https://www.brookings.edu/wp-content/uploads/2017/01/global_20170109_foresight_africa_figure-3-2-full.pdf"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

global 20170109 foresight africa figure 3 2 full

www.brookings.edu

<a href="https://statista.com/chart/29144/cost-of-mobile-data-in-africa"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

cost of mobile data in africa

statista.com

<a
href="https://www.statista.com/chart/amp/29144/cost-of-mobile-data-in-africa"
class="flex flex-row gap-3 items-center px-2 py-1.5 w-full rounded-md cursor-pointer transition-colors hover:bg-bg-200"
target="_blank" rel="noopener noreferrer"></a>

mobile data

www.statista.com

Now I have enough data to build a comprehensive cost estimation. Let me
put together the full model.

Key data points gathered:

- Electricity (business): 4.68 DZD/kWh (~$0.036/kWh)
- Customs: 0-30% on hardware, +19% TVA, +2-5% statistical fees →
  effective ~30-50% on top of CIF for electronics
- USD/DZD exchange rate: roughly 135-138 DZD/USD (need to verify)
- Server hardware (AMD EPYC based, single socket for cost efficiency):
  - AMD EPYC 7713 (64 cores, 3rd gen): ~$1,500 used / $2,000+ new
  - For budget: AMD EPYC 7413 (24 cores) ~$700-800 new; EPYC 7543P (32
    cores) ~$1,700
  - Let me design a reference server: single socket, 32 cores, 256GB
    RAM, 4x 3.84TB NVMe, dual 10GbE
- Rack space in Algeria: need to estimate. The Hostarts.dz page shows a
  small datacenter but no pricing. Global colos: ~$100-200/U/month in
  US. Algeria/AT would likely be lower but uncertain.
- IP Transit: AT wholesale pricing - Algeria end-user pays
  $0.57/Mbps/month retail. Wholesale to OpenScaler would be much
  cheaper, maybe $1-5/Mbps/month at small volumes.

Let me also think about the DZD/USD rate. Currently around 135 DZD = 1
USD (approximately).

Now let me design the reference server blueprint:

**Reference Server Blueprint (Phase 2 target)**: Single socket for
simplicity and lower cost initially:

- CPU: AMD EPYC 7543P (32 cores, 64 threads, 225W TDP) - ~$1,700 new,
  ~$800 used
- Motherboard: Supermicro H12SSL-i (single socket SP3) - ~$500-700
- RAM: 8× 32GB DDR4 ECC RDIMM = 256GB - ~$50-80/DIMM → ~$400-640
- NVMe: 4× Samsung PM9A3 3.84TB U.2 NVMe - ~$400-600 each →
  ~$1,600-2,400
- Chassis: 2U rackmount with redundant PSU - ~$400-600
- NIC: Mellanox/NVIDIA ConnectX-4 25GbE dual port - ~$200-300
- PSU: Redundant (often included with chassis)
- IPMI/iDRAC: Often onboard with server motherboard
- Cables, rails, misc: ~$100-200

Total component cost (USD, new): ~$5,000-7,000 Used/refurb route (e.g.,
EPYC 7002 series): ~$2,500-4,000

…

Show less

Now I have all the data I need to build the interactive calculator. Let
me design a comprehensive cost estimation model with sliders for key
parameters. I'll structure it clearly:

1.  Server hardware costs (with import overhead)
2.  Power costs
3.  Rack costs
4.  Bandwidth costs
5.  Team/OpEx costs
6.  Business metrics (oversubscription, utilization, margin)

Then show: break-even per server, break-even per VM slot, and compare to
the current pricing in the screenshot.

Let me design the React-style interactive widget.

Key numbers I'll use as defaults:

- Reference server components: $4,000 USD (mid-range AMD EPYC single
  socket build)
- Customs overhead: 35% (5-15% duty + 19% TVA + 2% stat + broker)
- USD/DZD rate: 135
- Amortization: 48 months
- Server TDP: 300W, PUE 1.4 → 420W from wall
- Monthly power: 420W × 720h = 302 kWh × 4.68 DZD = 1,414 DZD
- Rack cost per U: 3,000 DZD (guess)
- Server = 2U = 6,000 DZD/month rack
- Bandwidth: 5 DZD/Mbps/month (AT wholesale estimate) - this is tricky,
  will present as platform-level
- Team: 2 ops people × 150,000 = 300,000 DZD/month

For the VM capacity model:

- Server: 24 cores, 128GB RAM
- CPU oversubscription: 4:1 → 96 vCPUs sellable
- RAM oversubscription: 1.2:1 → ~106GB sellable
- Binding constraint is usually RAM
- Average VM: let's say 2GiB RAM mix → 53 VMs possible per server
- At 70% utilization: 37 paying VMs

I'll make all these adjustable.

For the widget, I'll make a clean interactive calculator with:

- Left side: cost inputs (hardware, power, rack, team, bandwidth)
- Right side: output metrics
- Bottom: comparison chart showing break-even vs your current prices

Let me write the HTML widget now.

Actually, let me think about what's most useful here. The user wants to
understand:

1.  What does a server cost per month?
2.  How many VMs can it host?
3.  What does each VM cost to serve?
4.  What margin do current prices give?

The calculator should let them adjust key unknowns and see the impact.

Let me structure it as: …

Show less

Done

Good, I have enough data. Let me now build the full cost model. This
will be a long but structured response — I'll follow it with an
interactive calculator artifact.

Here's what I found before building the model. The key data points:

Business electricity in Algeria is 4.68 DZD/kWh — genuinely one of the
cheapest in the world (22% of the world average), which is a real
structural advantage for you.
<a href="https://www.globalpetrolprices.com/Algeria/electricity_prices/"
class="group/tag relative h-[18px] rounded-full inline-flex items-center overflow-hidden -translate-y-px cursor-pointer"
target="_blank">GlobalPetrolPrices</a><a href="https://www.globalpetrolprices.com/Algeria/electricity_prices/"
class="group/tag relative h-[18px] rounded-full inline-flex items-center overflow-hidden -translate-y-px cursor-pointer"
target="_blank">GlobalPetrolPrices</a>

On customs: Algerian imports face customs duties of 0%, 5%, 15%, 30%, or
60% depending on category, and server electronics typically fall in the
5–15% bracket (HS 8471/8542). Then TVA at 19% applies post-duty, plus
2–5% statistical fees — so on a $1,000 electronics import at 20% duty,
you'd pay roughly $428 in total taxes. Effective landed cost multiplier:
~1.30–1.45×.
<a href="https://taxsummaries.pwc.com/algeria/corporate/other-taxes"
class="group/tag relative h-[18px] rounded-full inline-flex items-center overflow-hidden -translate-y-px cursor-pointer"
target="_blank">PwC</a><a
href="https://www.freightamigo.com/en/blog/logistics/understanding-import-taxes-and-duties-a-comprehensive-guide-for-shipping-to-algeria/"
class="group/tag relative h-[18px] rounded-full inline-flex items-center overflow-hidden -translate-y-px cursor-pointer"
target="_blank">FreightAmigo</a>

On bandwidth, the retail picture is good (Algeria averages $0.57/Mbps
retail broadband), but wholesale transit in Africa is significantly more
expensive — Africa transit prices are among the highest in the world,
roughly 14× the European benchmark. Your AT partnership is therefore
genuinely load-bearing for this cost. <a
href="https://www.africanexponent.com/top-10-african-countries-with-the-affordable-broadband-markets-in-2025/"
class="group/tag relative h-[18px] rounded-full inline-flex items-center overflow-hidden -translate-y-px cursor-pointer"
target="_blank">African Exponent</a><a href="https://blog.cloudflare.com/bandwidth-costs-around-the-world/"
class="group/tag relative h-[18px] rounded-full inline-flex items-center overflow-hidden -translate-y-px cursor-pointer"
target="_blank">Cloudflare</a>

Now — the calculator. Every number is adjustable; the defaults are my
best-estimate midpoints.

V

visualize

You are out of free <a
href="https://support.claude.com/en/articles/11647753-understanding-usage-and-length-limits"
class="inline underline underline-offset-[3px] [&amp;:not(:is(:hover,:focus))]:decoration-[color-mix(in_srgb,currentColor,transparent_60%)] cursor-pointer"
target="_blank" rel="noreferrer">messages</a> until 7:00 PM

<a href="https://claude.ai/upgrade?hide_free=true&amp;from=ratelimit"
class="inline underline underline-offset-[3px] [&amp;:not(:is(:hover,:focus))]:decoration-[color-mix(in_srgb,currentColor,transparent_60%)] cursor-pointer text-sm">Upgrade</a>

Sonnet 4.6 Adaptive

<a
href="https://support.anthropic.com/en/articles/8525154-claude-is-providing-incorrect-or-misleading-responses-what-s-going-on"
class="hover:text-text-300 transition" target="_blank"
rel="noopener noreferrer">Claude is AI and can make mistakes. Please
double-check cited sources.</a>

Share

### Content

{ "sizes": \[ { "id": "b-1-500mb-10", "name": "Basic 1-500mb-25GB",
"description": null, "memory": 0.5, "vcpus": 1, "disk": 10, "transfer":
0.5, "units": 1, "category": "basic", "disk_type": "nvme",
"architecture": "

pasted
