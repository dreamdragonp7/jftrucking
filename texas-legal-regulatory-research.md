# Texas Legal & Regulatory Research: J Fudge Trucking TMS

**Research Date:** March 2026
**Business Context:** J Fudge Trucking (prime contractor), CD Hopkins (subcontractor, 1 truck/1 driver), intrastate Texas aggregate hauling (mason sand, cushion sand) for Horton Construction. Building a digital TMS to replace paper-based operations.

---

## Table of Contents

1. [Texas Sales Tax on Hauling Services](#1-texas-sales-tax-on-hauling-services)
2. [Texas Motor Carrier Compliance](#2-texas-motor-carrier-compliance)
3. [Tax Compliance -- Federal and State](#3-tax-compliance--federal-and-state)
4. [Electronic Records and Digital Invoicing](#4-electronic-records-and-digital-invoicing)
5. [Payment Processing Laws](#5-payment-processing-laws)
6. [IFTA (International Fuel Tax Agreement)](#6-ifta-international-fuel-tax-agreement)
7. [Insurance Requirements](#7-insurance-requirements)
8. [TMS Feature Implications Summary](#8-tms-feature-implications-summary)

---

## 1. Texas Sales Tax on Hauling Services

### 1.1 Is Hauling/Transportation of Construction Materials (Sand) Taxable?

**Critical distinction: Standalone hauling services are NOT a taxable service in Texas.**

Texas Tax Code Section 151.0101 enumerates 16 categories of taxable services. Motor freight, transportation, hauling, trucking, delivery, and freight services are **not listed** among them. The taxable services are:

1. Amusement services
2. Cable television services
3. Credit reporting services
4. Data processing services
5. Debt collection services
6. Information services
7. Insurance services
8. Motor vehicle parking and storage
9. Nonresidential real property repair/restoration
10. Personal property maintenance/repair
11. Personal services
12. Real property services
13. Security services
14. Telecommunications services
15. Telephone answering services
16. Utility transmission and distribution services

**Reference:** [Texas Comptroller Publication 96-259 -- Taxable Services](https://comptroller.texas.gov/taxes/publications/96-259.php)

### 1.2 "Selling Sand with Delivery" vs. "Hauling Service Only"

This is the **most critical tax distinction** for J Fudge Trucking's invoicing:

**Scenario A -- Selling Sand with Delivery (TAXABLE delivery charges):**
If J Fudge Trucking were selling sand AND delivering it, the delivery charges would be taxable under 34 TAC Section 3.303, because transportation charges billed by the **seller** of a taxable item are always taxable -- even if separately stated on the invoice.

**Scenario B -- Hauling Service Only / Third-Party Carrier (NOT TAXABLE):**
Under 34 TAC Section 3.303, a **third-party carrier** (separate legal entity from the seller) is not responsible for collecting or remitting sales tax, provided the carrier:
- Only provides transportation
- Does not sell the taxable item being delivered

**For J Fudge Trucking and CD Hopkins:** Since they are hauling sand owned by or purchased by the customer (Horton), and they are NOT the seller of the sand, they are acting as third-party carriers providing a hauling service. Their hauling charges should NOT be subject to Texas sales tax.

**Reference:** [34 TAC Section 3.303 -- Transportation and Delivery Charges](https://www.law.cornell.edu/regulations/texas/34-Tex-Admin-Code-SS-3-303)

### 1.3 How Invoices Should Be Worded

**Recommended invoice language for hauling-only services:**

- Describe the service as "Hauling Services" or "Transportation Services" -- NOT "Delivery of Sand"
- Do NOT list sand as a line item with a material cost
- Clearly indicate that J Fudge Trucking is providing transportation services only and is not the seller of the material
- Example line items:
  - "Hauling Services -- Mason Sand -- [Origin] to [Destination]"
  - "Transportation of Customer Materials -- [X] loads"
- Include the load count, tonnage hauled, and per-load or per-ton rate
- Do NOT bundle material cost with hauling cost on the same invoice

**What to avoid:**
- "Sale of Sand with Delivery" (implies J Fudge is selling the sand)
- Listing "Sand -- $X per ton" + "Delivery Fee -- $Y" (implies a material sale with delivery)

### 1.4 Texas Comptroller Guidance on Freight/Delivery Charges

Key rules from 34 TAC Section 3.303:

1. **Seller's delivery charges = taxable.** When a seller bills delivery charges to a purchaser of a taxable item, those charges are taxable even if stated separately.
2. **Third-party carrier charges = not taxable (for the carrier).** A separate carrier providing only transportation does not collect tax.
3. **Definition is broad.** "Transportation and delivery charges" includes all terms: freight, shipping, delivery, postage.
4. **Effective date.** These rules apply to items sold on or after October 1, 1987.

### 1.5 Sand/Aggregate Taxability and the Westmoreland Decision

**Background:** A 1988 Texas Comptroller administrative decision made unprocessed sand, dirt, gravel, and similar materials nontaxable. Materials that have been merely sorted, sized, screened, washed, and/or dried are considered unprocessed and NOT taxable. Only materials that have been cut, crushed, or mixed with other materials are considered "processed" and taxable.

**Westmoreland Decision (2025):** The Texas Comptroller planned to implement a policy change effective October 1, 2025, based on the Westmoreland court decision, which expanded the definition of "processing" to include excavation, blasting, cutting, and extracting materials intended for sale. However, implementation was **delayed indefinitely** to give the new administration time to review.

**Current status (March 2026):** The pre-Westmoreland policies remain in effect. Unprocessed sand (merely sorted, sized, screened, washed, dried) is NOT taxable as tangible personal property.

**TMS implication:** Since J Fudge is hauling (not selling) sand, and the sand itself may not even be taxable, there is strong basis for not charging sales tax on hauling services. However, the system should be configurable to handle sales tax if the business model ever changes.

**References:**
- [Weaver -- Texas Comptroller Policy Change](https://weaver.com/resources/texas-comptroller-draws-a-new-line-in-the-sand-effective-october-1-2025/)
- [STAR Letter Ruling 9310L1262C07](https://star.comptroller.texas.gov/view/9310L1262C07)

---

## 2. Texas Motor Carrier Compliance

### 2.1 TxDMV Intrastate Operating Authority

**Who must register:** Any entity operating a commercial motor vehicle (or combination) with a gross weight, registered weight, or gross weight rating exceeding 26,000 pounds, used for transportation of cargo in furtherance of a commercial enterprise on Texas roads.

**Requirements to operate:**
1. Obtain a **USDOT Number** from FMCSA (even for intrastate-only operations)
2. Apply for **TxDMV Intrastate Operating Authority** (TxDMV Certificate Number) via [eLINC](https://www.txdmv.gov/elinc)
3. File proof of **commercial liability insurance** (Form E) via insurer
4. View approved certificate in **MCCS** (Motor Carrier Credentialing System)

**Application process:** Online via eLINC. Reviewed within 24-48 business hours. No third-party assistance needed (TxDMV warns against paying solicitors).

**Both J Fudge Trucking AND CD Hopkins need their own:**
- USDOT Number
- TxDMV Certificate Number
- Insurance filed in MCCS

**Maintaining authority:**
- Keep insurance filed and active at all times while holding certificate
- Update FMCSA Form MCS-150 every two years
- Cancel certificate in MCCS if ceasing operations (can reactivate later)

**Reference:** [TxDMV -- Becoming a Texas Motor Carrier](https://www.txdmv.gov/motor-carriers/how-to-be-a-motor-carrier)

### 2.2 Insurance Requirements and Filing

See [Section 7 -- Insurance Requirements](#7-insurance-requirements) for detailed coverage.

**Summary for TxDMV filing:**
- Minimum **$500,000 Combined Single Limit (CSL)** liability coverage for general freight intrastate carriers
- Insurance company files **Form E** (liability) electronically to MCCS
- **Form K** filed for cancellation
- Insurance must remain filed 24/7 while certificate is active
- When switching insurers, new Form E must be filed before previous one expires
- Carriers can be fined for holding authority without active insurance

**Reference:** [TxDMV Motor Carrier Handbook (May 2025)](https://www.txdmv.gov/sites/default/files/body-files/Motor_Carrier_Handbook.pdf)

### 2.3 Vehicle Registration

**Intrastate-only operations:**
- Standard Texas commercial vehicle registration (NOT apportioned/IRP plates)
- IRP (International Registration Plan) apportioned registration is only required for vehicles operating across state lines
- Fleet registration available for businesses with 25+ intrastate vehicles
- Multi-Year Intrastate Fleet Registration Program available online

**If they ever go interstate:**
- Must obtain IRP apportioned registration through TxDMV
- IRP cab card required

**Reference:** [TxDMV -- Apportioned Registration](https://www.txdmv.gov/motor-carriers/commercial-fleet-registration/apportioned-registration)

### 2.4 UCR (Unified Carrier Registration)

**Intrastate-only carriers are EXEMPT from UCR.** UCR applies only to motor carriers operating in interstate or international commerce.

If CD Hopkins or J Fudge ever begins crossing state lines:
- Must register at [ucr.gov](https://plan.ucr.gov/)
- Fee for 0-2 vehicles: **$46/year** (2025-2026 rates)
- Enforcement begins January 1 of each registration year
- Registration opens October 1 of the prior year

**Reference:** [TxDMV -- Unified Carrier Registration](https://www.txdmv.gov/motor-carriers/unified-carrier-registration)

### 2.5 Drug & Alcohol Testing Requirements

**Federal requirements (49 CFR Part 382) apply to ALL CDL drivers, including intrastate:**

**Types of required testing:**
1. **Pre-employment** -- Negative drug test required before operating a CMV
2. **Random** -- 50% of drivers tested for drugs, 10% for alcohol annually
3. **Post-accident** -- After qualifying accidents
4. **Reasonable suspicion** -- Based on trained supervisor observations
5. **Return-to-duty** -- After any violation
6. **Follow-up** -- 1-5 years after return to duty

**Substances tested (5-panel):** Marijuana, opioids, cocaine, amphetamines, PCP

**Owner-operator / small company requirements:**
- Must join a **Consortium/Third-Party Administrator (C/TPA)** for random testing pool (minimum 2 covered employees in pool)
- Must register with the **FMCSA Drug & Alcohol Clearinghouse** at [clearinghouse.fmcsa.dot.gov](https://clearinghouse.fmcsa.dot.gov)
- Owner-operators must register as both employer AND driver
- Must designate a C/TPA before conducting queries or reporting violations
- Employers must query the Clearinghouse for all new hires and conduct annual queries for existing drivers

**CD Hopkins (1 driver, owner-operator) must:**
1. Register in FMCSA Clearinghouse as owner-operator
2. Join a drug testing consortium
3. Designate the consortium as C/TPA in the Clearinghouse
4. Maintain pre-employment, random, and other required testing

**References:**
- [FMCSA Drug & Alcohol Testing Program](https://www.fmcsa.dot.gov/regulations/drug-alcohol-testing-program)
- [FMCSA Clearinghouse -- Owner-Operator Requirements](https://www.fmcsa.dot.gov/regulations/drug-alcohol-testing/how-do-owner-operators-meet-their-clearinghouse-obligations)

### 2.6 Hours of Service (HOS) -- Texas Intrastate Rules

**Texas has MORE LENIENT intrastate HOS rules than federal:**

| Rule | Texas Intrastate | Federal (Interstate) |
|------|-----------------|---------------------|
| Off-duty before driving | 8 consecutive hours | 10 consecutive hours |
| Maximum driving time | 12 hours | 11 hours |
| Maximum on-duty time | 15 hours | 14 hours |
| Weekly cycle | 70 hours / 7 days | 70 hours / 8 days |
| Reset period | 34 hours off | 34 hours off |

**Texas-specific exemptions:**

1. **Short-haul exemption:** Drivers are exempt from HOS regulations AND log-keeping requirements if they:
   - Return to work-reporting location and are released within 12 consecutive hours
   - Have at least 8 consecutive hours off between each 12-hour on-duty period
   - Operate within a **150-air-mile radius** of normal work reporting location

2. **Agricultural exemption:** Drivers transporting agricultural commodities within 150 air-miles during planting/harvesting seasons are exempt from Part 395 regulations.

**ELD (Electronic Logging Device) requirements:**
- Texas ELD exemptions mirror federal FMCSA exemptions
- Short-haul exempt drivers are generally exempt from ELD requirements
- For sand hauling within 150 air-miles with same-day return, the short-haul exemption likely applies

**Legal authority:** 37 TAC Section 4.12; Texas Transportation Code Chapters 541-600, 643, 644

**References:**
- [37 TAC Section 4.12 -- Exemptions and Exceptions](https://www.law.cornell.edu/regulations/texas/37-Tex-Admin-Code-SS-4-12)
- [Understanding Texas HOS Regulations](https://www.gbyrdtrucking.com/understanding-texas-hours-of-service-regulations-for-fleets)

### 2.7 Weight Limits and Permits for Aggregate Hauling

**Legal weight limits (no permit required):**
- **Single axle:** 20,000 lbs
- **Tandem axle** (spaced 40"-96" apart): 34,000 lbs
- **Maximum GVW** on Interstate highways: 80,000 lbs
- Federal Bridge Formula applies statewide

**Overweight permits for aggregate hauling:**
- **Statewide Overweight Permit:** Allows additional 4,000 lbs per trip
- Base fee: $90 + $5 administrative fee + county-specific fees
- Available through TxDMV

**Special provisions for aggregate/sand:**
- Texas Transportation Code Chapter 623 allows vehicles transporting sand, gravel, stones, rock, caliche, or similar commodities to cross the width of a highway from private property to other private property with a GVW up to **110,000 lbs** (unlicensed vehicles transporting these materials between private properties)
- Standard overweight permits available for road travel

**Reference:** [TxDMV -- Texas Size/Weight Limits](https://www.txdmv.gov/motor-carriers/oversize-overweight-permits/texas-size-weight-limits)

---

## 3. Tax Compliance -- Federal and State

### 3.1 1099-NEC Requirements (Paying CD Hopkins as Subcontractor)

**When to file:** When paying a non-employee (subcontractor) **$600 or more** in a calendar year for services performed in the course of your trade or business.

**IMPORTANT: The reporting threshold increases to $2,000 for tax year 2026 and beyond.**

**Filing deadline:**
- **January 31** of the year following payment (e.g., January 31, 2027 for 2026 payments)
- If January 31 falls on a weekend/holiday, due the next business day
- **No extensions available** (except via Form 8809 for specific reasons: disaster, system failure, serious illness)

**Required information (from W-9):**
- Legal name
- Business name (if different)
- Tax classification (individual, LLC, corporation, etc.)
- Address
- Taxpayer Identification Number (SSN or EIN)

**E-filing requirement:** If filing 10 or more information returns during the year, you MUST e-file.

**Penalties for non-compliance:**
| Timing | Penalty per form |
|--------|-----------------|
| Filed within 30 days of deadline | $60 |
| Filed after 30 days but before August 1 | $120 |
| Filed after August 1 or not filed | $310 |
| Intentional disregard | $630+ |

Maximum penalty varies by business size.

**TMS implications:**
- System should collect and store W-9 data for all subcontractors
- Track cumulative payments per subcontractor per calendar year
- Alert when approaching $600 threshold (currently) / $2,000 threshold (2026+)
- Generate 1099-NEC data for filing or export to QuickBooks

**References:**
- [IRS -- Instructions for Forms 1099-MISC and 1099-NEC](https://www.irs.gov/instructions/i1099mec)
- [IRS -- About Form 1099-NEC](https://www.irs.gov/forms-pubs/about-form-1099-nec)

### 3.2 W-9 Collection Requirements

- Collect W-9 from every subcontractor/vendor **before first payment**
- If a subcontractor refuses to provide a W-9, you are required to withhold **24% backup withholding** from payments
- Keep W-9 on file for at least **4 years** after the last tax return using the information
- Request updated W-9 if subcontractor information changes (new address, new EIN, name change)

**TMS feature:** Store W-9 data digitally, track collection status, flag subcontractors without W-9 on file, alert for backup withholding requirement.

### 3.3 Quarterly Estimated Tax Payments

**Texas has no state income tax** -- quarterly estimated payments are federal only.

**Who must pay:** Anyone expecting to owe $1,000 or more in federal tax for the year.

**Due dates:**
| Quarter | Period Covered | Due Date |
|---------|---------------|----------|
| Q1 | Jan 1 - Mar 31 | April 15 |
| Q2 | Apr 1 - May 31 | June 15 |
| Q3 | Jun 1 - Aug 31 | September 15 |
| Q4 | Sep 1 - Dec 31 | January 15 (next year) |

**Self-employment tax rate:** 15.3% (12.4% Social Security + 2.9% Medicare)
**Planning rule of thumb:** Set aside 25-30% of net self-employment income for federal taxes (covers both SE tax and income tax).

**Filed using:** Form 1040-ES
**Reported on:** Schedule SE (Form 1040)

**Reference:** [IRS -- Estimated Taxes](https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes)

### 3.4 Texas Franchise Tax

**Key facts:**
- Texas has no personal income tax, but has a **Franchise Tax** (a business margins tax)
- **Sole proprietorships** are generally **exempt** from franchise tax filing
- **LLCs** (even single-member) are **NOT exempt** and must file regardless of revenue
- General partnerships owned entirely by natural persons are exempt

**No Tax Due Threshold:**
- 2026 reports: **$2.65 million** in annualized total revenue
- 2025 reports: $2.47 million

**If below the threshold:**
- Entity is NOT required to file a No Tax Due Report (effective Jan. 1, 2024)
- Entity IS still required to file a **Public Information Report (PIR)** -- Form 05-102 for corporations/LLCs, or **Ownership Information Report (OIR)** -- Form 05-167 for LPs

**Filing deadline:** May 15 annually

**For J Fudge Trucking:**
- If structured as an LLC, must file PIR annually by May 15 even if revenue is under $2.65M
- If revenue is under $2.65M, no tax is due but PIR filing is mandatory
- If sole proprietorship, generally exempt

**For CD Hopkins:**
- Same analysis applies based on business structure

**Reference:** [Texas Comptroller -- Franchise Tax](https://comptroller.texas.gov/taxes/franchise/)

### 3.5 IRS Record Retention Requirements

| Record Type | Minimum Retention |
|-------------|------------------|
| General tax records | 3 years from filing date |
| Employment tax records | 4 years after tax due or paid |
| Underreported income (>25%) | 6 years |
| Loss from worthless securities/bad debt | 7 years |
| Unfiled or fraudulent returns | Indefinitely |
| Asset/property records | Until disposition + 3 years |

**Specific records to keep:**
- Bank deposit slips and statements
- Invoices (sent and received)
- 1099 forms
- Delivery tickets and load records
- Payment records (checks, ACH confirmations)
- Expense receipts
- Mileage/fuel records

**Practical recommendation:** Keep all business records for **7 years** minimum. This covers the longest standard statute of limitations and protects against most scenarios.

**Reference:** [IRS -- How Long Should I Keep Records?](https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records)

---

## 4. Electronic Records and Digital Invoicing

### 4.1 Texas UETA -- Legal Framework for Electronic Records

**Governing law:** Texas Business and Commerce Code, Chapter 322 -- Uniform Electronic Transactions Act (UETA)

**Enacted:** 77th Legislature (SB 393), effective January 1, 2002

**Key provisions:**

1. **Section 322.007 -- Legal Recognition:** A record, signature, or contract may NOT be denied legal effect or enforceability solely because it is in electronic form. If a law requires a record to be in writing, an electronic record satisfies that law. If a law requires a signature, an electronic signature satisfies that law.

2. **Section 322.005 -- Consent:** UETA only applies if the parties have agreed to conduct the transaction using electronic means. Consent does NOT need to be in a separate agreement -- it may be inferred from factors surrounding the transaction (e.g., both parties regularly using email, a customer paying through an online portal).

3. **Section 322.012 -- Retention of Electronic Records:**
   - If a law requires a record to be retained in original form, an electronic record satisfies that law
   - A record retained as an electronic record satisfies retention requirements for evidentiary, audit, or similar purposes
   - This provision applies unless a law enacted AFTER January 1, 2002 specifically prohibits electronic records for that purpose
   - Government agencies may specify additional retention requirements

4. **Section 322.003 -- Scope/Exclusions:** UETA does NOT apply to:
   - Wills, codicils, and testamentary trusts
   - UCC transactions (except Chapters 2 and 2A -- sales and leases)
   - **Commercial transactions for goods and services (like hauling) ARE covered**

**Reference:** [Texas Business and Commerce Code Chapter 322](https://statutes.capitol.texas.gov/Docs/BC/htm/BC.322.htm)

### 4.2 Can Digital Delivery Confirmations Replace Paper Tickets?

**Yes, with proper implementation.** Under Texas UETA:

- Digital delivery confirmations (timestamps, GPS coordinates, photos) can legally replace paper tickets
- Electronic signatures on delivery confirmations are legally equivalent to handwritten signatures
- The key requirements are:
  1. **Intent to sign** -- the driver/recipient must intend to authenticate the record
  2. **Consent to electronic process** -- parties must agree (can be implied by course of dealing)
  3. **Association** -- the electronic signature must be logically associated with the record
  4. **Attribution** -- the system must be able to attribute the signature to a specific person

**Federal E-SIGN Act** (15 U.S.C. 7001) provides additional backup: electronic signatures and records have the same legal validity as paper in interstate and foreign commerce.

**Best practices for the TMS:**
- Capture driver signature (touch-screen signature or PIN entry)
- Record GPS coordinates at delivery
- Timestamp all events (load, transit, delivery)
- Capture photo confirmation when possible
- Store records in tamper-evident format
- Maintain audit trail of all changes
- Ensure both parties can access electronic copies

### 4.3 Construction Hauling Documentation

**No Texas-specific format requirements** for construction hauling delivery tickets were found beyond general commercial documentation standards.

**Industry standard documentation should include:**
- Date and time of delivery
- Origin and destination
- Material type and quantity (tons/cubic yards)
- Truck/trailer identification
- Driver identification
- Customer/project reference (PO number)
- Receiver signature or acknowledgment
- Load ticket number (sequential)

**E-Ticketing trend:** Multiple state DOTs (Georgia, Alabama, Florida, etc.) are implementing e-ticketing requirements for DOT construction projects. Texas has not mandated e-ticketing yet, but the trend suggests eventual adoption. Building the TMS with digital ticketing now positions the business ahead of this curve.

### 4.4 Record Retention Periods -- State vs. Federal

| Record Type | Texas State | Federal IRS | Recommended |
|-------------|-------------|-------------|-------------|
| General business records | 3 years (UPPBRA) | 3 years | 7 years |
| Tax returns and supporting docs | 3 years | 3-7 years | 7 years |
| Employment/payroll tax records | 4 years | 4 years | 7 years |
| 1099s and related records | 3 years | 4 years | 7 years |
| Delivery tickets/load records | 3 years | 3 years (tax support) | 7 years |
| Insurance certificates | Duration + 3 years | N/A | Duration + 7 years |
| Motor carrier records | Per TxDMV rules | Per FMCSA rules | 7 years |
| Drug/alcohol test records | Per 49 CFR 382 | 5 years (positive), 1 year (negative) | Per regulation |

**Rule of thumb:** The TMS should retain ALL records for a minimum of **7 years** from creation date. This covers the longest standard IRS statute of limitations and exceeds all Texas state requirements.

**References:**
- [Texas State Records Retention Schedule](https://www.tsl.texas.gov/slrm/rrs)
- [IRS -- Recordkeeping](https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping)

---

## 5. Payment Processing Laws

### 5.1 Texas Money Transmitter Laws

**Texas Money Services Modernization Act** (effective September 1, 2023) -- Texas adopted substantially all of the Model Money Transmission Modernization Act (MMTMA) via SB 895 (88th Legislature).

**Is J Fudge Trucking's TMS a money transmitter?**

**Almost certainly NO**, for these reasons:

1. **Agent of Payee Exemption (Section 152.004):** Texas law exempts "a person appointed as an agent of a payee to collect and process a payment from a payor to the payee for goods or services." Requirements:
   - Written agreement between payee (J Fudge) and agent (the TMS platform) directing collection of payments
   - Payee holds agent out to the public as accepting payments on payee's behalf
   - Payment is treated as received by payee upon receipt by agent (payor's obligation extinguished)

2. **Using a Licensed Payment Processor:** If the TMS uses QuickBooks Payments (which is operated by **Intuit Payments Inc.**, a licensed money transmitter), J Fudge is NOT transmitting money -- Intuit is. The TMS merely facilitates invoice presentation and payment initiation.

3. **Payment Processor Exemption:** Companies that provide merchants with a portal to a financial institution with ACH access, acting on behalf of the merchant receiving payments, do not constitute money transmitters.

**Bottom line:** Embedding QuickBooks Payments as a payment processor does NOT make J Fudge Trucking a money transmitter. Intuit handles the money transmission under their own license.

**References:**
- [Texas Department of Banking -- Money Services Businesses](https://www.dob.texas.gov/money-services-businesses)
- [CSBS -- Agent of Payee Exemption Map](https://www.csbs.org/agent-payee-exemption-map)
- [Texas Finance Code Section 152.004 -- Exemptions](https://law.justia.com/codes/texas/finance-code/title-3/subtitle-e/chapter-152/subchapter-a/section-152-004/)

### 5.2 ACH Payment Regulations

**NACHA Operating Rules govern ACH transactions. Key requirements:**

1. **Authorization:** Each ACH debit must be properly authorized by the account holder (written, electronic, or verbal authorization meeting NACHA standards)
2. **Record retention:** Keep proof of authorization for **at least 2 years** after final payment
3. **Return rate monitoring:** If 0.5% or more of debits are disputed/returned, triggers compliance review
4. **Data security:** Account numbers must be rendered unreadable when stored electronically (applies once volume exceeds 2 million entries/year -- unlikely for J Fudge)

**2026 NACHA rule changes (fraud monitoring):**
- Phase 1 (March 20, 2026): Applies to originators with 6M+ ACH volume
- Phase 2 (June 19, 2026): Applies to all remaining non-consumer originators
- Requires monitoring for suspected fraudulent/scam transactions

**For J Fudge's TMS:** Since QuickBooks Payments handles the actual ACH origination, Intuit/QuickBooks bears primary NACHA compliance responsibility. The TMS should:
- Obtain and store customer ACH authorization
- Present clear payment terms on invoices
- Keep authorization records for 2+ years

### 5.3 PCI Compliance

**PCI DSS (Payment Card Industry Data Security Standard) applies only to credit/debit card transactions.**

**If the TMS only processes ACH payments:** PCI compliance is NOT required.

**If the TMS also accepts credit/debit cards:** PCI compliance IS required, but is significantly simplified by using QuickBooks Payments:
- QuickBooks Payments is **PCI compliant** and uses tokenization
- Card data is processed and stored via PCI-compliant systems using tokens
- The TMS never stores, processes, or transmits actual card numbers
- This reduces PCI scope to **SAQ A** (the simplest level -- redirect/iframe payment forms)

**Recommendation:** Use QuickBooks Payments' hosted payment form (iframe) so card data never touches J Fudge's servers. This minimizes PCI scope and compliance burden.

**Reference:** [QuickBooks PCI DSS Compliance FAQs](https://quickbooks.intuit.com/learn-support/en-us/help-article/data-security/quickbooks-pci-service-faqs/L7ipNg7n9_US_en_US)

### 5.4 Customer Payment Data Requirements

- **Never store full credit card numbers** -- use tokenization via QuickBooks Payments
- **ACH account numbers** should be encrypted at rest and masked in the UI (show last 4 digits only)
- **ACH authorization forms** must be retained for 2 years after last payment
- **SSL/TLS encryption** required for all data in transit
- **Access controls** -- limit who can view payment data

---

## 6. IFTA (International Fuel Tax Agreement)

### 6.1 Current Intrastate Exemption

**CD Hopkins and J Fudge are currently EXEMPT from IFTA** because they operate exclusively within Texas (intrastate). IFTA only applies to qualified motor vehicles traveling in more than one U.S. state or Canadian province.

### 6.2 Requirements If They Cross State Lines

**Qualifying vehicles:** Any motor vehicle used, designed, or maintained for transportation of persons or property that:
- Has 2 axles and a GVW or GVWR exceeding 26,000 lbs; OR
- Has 3 or more axles regardless of weight; OR
- Is used in combination, when the combined weight exceeds 26,000 lbs

**If they begin interstate operations, they must:**
1. Apply for IFTA license through Texas Comptroller (Webfile system or Form AP-178)
2. Obtain IFTA decals for each qualifying vehicle
3. File quarterly IFTA returns

**Alternative for occasional interstate trips:** If qualifying vehicles cross state lines fewer than 10 trips per calendar year, trip permits may be used instead of full IFTA credentials.

### 6.3 Filing Requirements and Deadlines

| Quarter | Period | Due Date |
|---------|--------|----------|
| Q1 | Jan-Mar | April 30 |
| Q2 | Apr-Jun | July 31 |
| Q3 | Jul-Sep | October 31 |
| Q4 | Oct-Dec | January 31 |

- Returns due on the last day of the month following the end of the quarter
- If due date falls on weekend/holiday, next business day
- **Texas does NOT accept annual filings** -- must file quarterly
- Late filing penalty: **$50 or 10% of delinquent taxes, whichever is greater**
- Interest: **0.75% per month** on overdue amounts

**Fees:** No fee for Texas IFTA license and decals.

**Texas-specific rule:** All miles traveled in Texas, including both highway and off-highway travel, must be reported as taxable miles.

**Reference:** [Texas Comptroller -- IFTA](https://comptroller.texas.gov/taxes/fuels/ifta.php)

### 6.4 TMS Fuel/Mileage Tracking for Potential IFTA

Even though currently exempt, the TMS should be designed to capture data that would support IFTA reporting if the business expands interstate:

**Data to capture per trip:**
- Odometer readings (start and end)
- Jurisdiction(s) traveled through
- Miles driven per jurisdiction
- Fuel purchases (gallons, location, date, price)
- Fuel receipts/documentation

**Data to capture per fuel purchase:**
- Date
- Location (city, state)
- Vendor name
- Number of gallons
- Fuel type
- Cost per gallon and total cost
- Vehicle/unit number

**IFTA record retention:** Must retain records for **4 years** from the due date of the return or the filing date, whichever is later.

---

## 7. Insurance Requirements

### 7.1 Minimum Liability Coverage -- Texas Intrastate

**$500,000 Combined Single Limit (CSL)** is the minimum for intrastate motor carriers hauling general freight (including aggregate/sand).

This is required under:
- Texas Administrative Code, Title 43, Chapter 218
- Texas Transportation Code, Chapter 643

**Filing:**
- Insurance company files **Form E** (Motor Carrier Bodily Injury and Property Damage Liability Certificate of Insurance) electronically to MCCS
- Insurance must remain active in MCCS at all times
- **Form K** used for cancellation notification
- Lapse in insurance filing can result in fines and suspension of operating authority

### 7.2 Cargo Insurance

- **Not specifically required by TxDMV** for general freight carriers (required only for household goods movers: $5,000 per single shipper / $10,000 per multiple shippers)
- However, cargo insurance is **strongly recommended** and often required contractually by customers
- For aggregate hauling, cargo insurance is typically $100,000+ coverage
- Construction company customers (like Horton) may require proof of cargo coverage in their contracts

### 7.3 Workers' Compensation

**Texas is the ONLY state where private employers can completely opt out of workers' compensation coverage.**

**Key considerations:**
- Workers' comp is optional for private employers in Texas
- However, employers who opt out ("non-subscribers") lose certain legal protections:
  - Cannot use the "fellow employee" defense
  - Cannot use "contributory negligence" defense
  - Cannot use "assumption of risk" defense
- Many construction project owners and general contractors **require** workers' comp as a contract condition
- If Horton requires it, J Fudge and/or CD Hopkins may need coverage regardless of legal optionality

**Coverage verification:** Texas Department of Insurance (TDI) maintains a searchable database for workers' comp coverage verification at [tdi.texas.gov](https://www.tdi.texas.gov/wc/employer/coverage.html).

### 7.4 Certificate of Insurance (COI) Tracking -- TMS Features

**What the TMS should store and track:**

**Per carrier/subcontractor:**
- Insurance carrier name
- Policy number
- Coverage type (liability, cargo, workers' comp, etc.)
- Coverage limits
- Effective date
- Expiration date
- Named insured
- Additional insured status (if applicable)
- Certificate holder information
- COI document (PDF upload)

**Automated alerts the TMS should generate:**
- 60-day advance warning before policy expiration
- 30-day advance warning before policy expiration
- 7-day urgent warning before policy expiration
- Immediate alert on policy expiration
- Alert if coverage drops below minimum required limits
- Alert if insurance is cancelled (Form K received)

**Best practices:**
- Cross-check COI information with TxDMV MCCS filings
- Cross-check workers' comp with TDI database
- Require updated COI before allowing subcontractor dispatching
- Store historical COI records (not just current)
- Track all coverage types in one dashboard

**Standard COI form:** ACORD 25 (Certificate of Liability Insurance) or Texas Form 1560

**References:**
- [Texas Commercial Truck Insurance Requirements](https://thumanninsuranceagency.com/blog/texas-commercial-truck-insurance)
- [TDI -- Workers' Compensation Coverage Verification](https://www.tdi.texas.gov/wc/employer/coverage.html)

---

## 8. TMS Feature Implications Summary

Based on all research above, the TMS should include the following compliance-driven features:

### Invoicing & Tax
- [ ] Default to NO sales tax on hauling-only services (not a taxable service in Texas)
- [ ] Invoice wording templates that clearly describe "hauling/transportation services" (not material sales)
- [ ] Configurable sales tax engine for future changes or different service types
- [ ] Track the Westmoreland decision status for potential tax treatment changes

### Motor Carrier Compliance
- [ ] Store TxDMV Certificate Numbers for all carriers
- [ ] Store USDOT Numbers for all carriers
- [ ] Track MCS-150 biennial update due dates
- [ ] Flag carriers without valid operating authority

### Subcontractor Management
- [ ] W-9 collection and storage for all subcontractors
- [ ] Cumulative payment tracking per subcontractor per calendar year
- [ ] 1099-NEC threshold alerts ($600 for 2025, $2,000 for 2026+)
- [ ] 1099-NEC data export for filing
- [ ] Backup withholding flag if W-9 not received

### Insurance & COI Tracking
- [ ] COI storage per carrier (all coverage types)
- [ ] Expiration date tracking with multi-tier alerts (60/30/7/0 days)
- [ ] Minimum coverage validation ($500K CSL liability)
- [ ] Block dispatching for carriers with expired/insufficient insurance
- [ ] Workers' comp tracking (optional in Texas but may be contractually required)

### Delivery Documentation
- [ ] Digital delivery tickets with all required fields
- [ ] Electronic signature capture (UETA-compliant)
- [ ] GPS coordinate capture at pickup and delivery
- [ ] Timestamp logging for all events
- [ ] Photo capture capability
- [ ] Tamper-evident record storage
- [ ] Sequential ticket numbering

### Payment Processing
- [ ] QuickBooks Payments integration (ACH primary)
- [ ] ACH authorization capture and storage
- [ ] Hosted payment form (iframe) if accepting cards -- avoids PCI scope
- [ ] Payment status tracking and reconciliation
- [ ] No money transmitter license needed (agent of payee + licensed processor)

### Record Retention
- [ ] 7-year minimum retention for all records
- [ ] Automated retention policy enforcement
- [ ] Audit trail for all record modifications
- [ ] Secure backup and disaster recovery

### IFTA Readiness (Future)
- [ ] Trip mileage tracking (start/end odometer)
- [ ] Fuel purchase logging (gallons, location, cost)
- [ ] Jurisdiction tracking per trip
- [ ] IFTA report generation capability (dormant until needed)

### Drug & Alcohol Compliance Tracking
- [ ] Track driver consortium/C/TPA membership
- [ ] Track FMCSA Clearinghouse registration status
- [ ] Track testing dates and results status (not results themselves -- privacy)
- [ ] Alert for overdue random testing
- [ ] Pre-employment test verification before first dispatch

### Hours of Service
- [ ] Texas intrastate HOS rules (12 hrs driving, 15 hrs on-duty, 8 hrs off)
- [ ] Short-haul exemption eligibility tracking (150 air-mile radius)
- [ ] Daily hours logging (if not short-haul exempt)
- [ ] Weekly cumulative hours tracking (70/7 cycle)

### Franchise Tax Reminders
- [ ] May 15 annual filing deadline reminder
- [ ] PIR/OIR filing reminder for LLCs
- [ ] Revenue tracking against no-tax-due threshold ($2.65M for 2026)

### Quarterly Tax Estimates
- [ ] Track quarterly estimated tax payment due dates
- [ ] Calculate estimated payments based on YTD income
- [ ] Payment confirmation tracking

---

## Key Sources and References

### Texas State Sources
- [Texas Comptroller -- Sales and Use Tax](https://comptroller.texas.gov/taxes/sales/)
- [Texas Comptroller -- Taxable Services (Pub. 96-259)](https://comptroller.texas.gov/taxes/publications/96-259.php)
- [Texas Comptroller -- Franchise Tax](https://comptroller.texas.gov/taxes/franchise/)
- [Texas Comptroller -- IFTA](https://comptroller.texas.gov/taxes/fuels/ifta.php)
- [34 TAC Section 3.303 -- Transportation and Delivery Charges](https://www.law.cornell.edu/regulations/texas/34-Tex-Admin-Code-SS-3-303)
- [37 TAC Section 4.12 -- HOS Exemptions](https://www.law.cornell.edu/regulations/texas/37-Tex-Admin-Code-SS-4-12)
- [Texas Business and Commerce Code Ch. 322 -- UETA](https://statutes.capitol.texas.gov/Docs/BC/htm/BC.322.htm)
- [Texas Transportation Code Ch. 623 -- Oversize/Overweight](https://statutes.capitol.texas.gov/Docs/TN/htm/TN.623.htm)
- [TxDMV -- Motor Carriers](https://www.txdmv.gov/motor-carriers)
- [TxDMV -- How to Be a Motor Carrier](https://www.txdmv.gov/motor-carriers/how-to-be-a-motor-carrier)
- [TxDMV Motor Carrier Handbook (May 2025)](https://www.txdmv.gov/sites/default/files/body-files/Motor_Carrier_Handbook.pdf)
- [TxDMV -- Size/Weight Limits](https://www.txdmv.gov/motor-carriers/oversize-overweight-permits/texas-size-weight-limits)
- [Texas Department of Banking -- Money Services](https://www.dob.texas.gov/money-services-businesses)
- [Texas Finance Code Section 152.004 -- MSB Exemptions](https://law.justia.com/codes/texas/finance-code/title-3/subtitle-e/chapter-152/subchapter-a/section-152-004/)
- [TDI -- Workers' Comp Coverage Verification](https://www.tdi.texas.gov/wc/employer/coverage.html)

### Federal Sources
- [IRS -- 1099-NEC Instructions](https://www.irs.gov/instructions/i1099mec)
- [IRS -- Estimated Taxes](https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes)
- [IRS -- Self-Employment Tax](https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes)
- [IRS -- Record Retention](https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records)
- [FMCSA -- Drug & Alcohol Testing Program](https://www.fmcsa.dot.gov/regulations/drug-alcohol-testing-program)
- [FMCSA -- Drug & Alcohol Clearinghouse](https://clearinghouse.fmcsa.dot.gov)
- [FMCSA -- Owner-Operator Clearinghouse Obligations](https://www.fmcsa.dot.gov/regulations/drug-alcohol-testing/how-do-owner-operators-meet-their-clearinghouse-obligations)
- [UCR Registration](https://plan.ucr.gov/)
- [QuickBooks PCI Compliance](https://quickbooks.intuit.com/learn-support/en-us/help-article/data-security/quickbooks-pci-service-faqs/L7ipNg7n9_US_en_US)

### Industry and Analysis Sources
- [Weaver -- Comptroller Sand Policy Change](https://weaver.com/resources/texas-comptroller-draws-a-new-line-in-the-sand-effective-october-1-2025/)
- [CSBS -- Agent of Payee Exemption Map](https://www.csbs.org/agent-payee-exemption-map)
- [Stripe -- NACHA Rules and Compliance](https://stripe.com/resources/more/nacha-rules-explained)
- [Texas Commercial Truck Insurance Guide](https://thumanninsuranceagency.com/blog/texas-commercial-truck-insurance)

---

**DISCLAIMER:** This research document is for informational purposes only and does not constitute legal or tax advice. J Fudge Trucking and CD Hopkins should consult with a qualified Texas attorney and CPA to confirm the application of these laws and regulations to their specific business circumstances. Tax laws, regulations, and administrative interpretations are subject to change.
