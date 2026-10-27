# LifeLink — Emergency Organ Donation Coordination Platform
## Real-Time Cadaveric Coordination, Green Corridor Telemetry & Transparent Logistics Funding

LifeLink is an emergency medical logistics platform designed to coordinate cadaveric organ retrieval, statutory 4-doctor brain death certifications (Form 8 & Form 10), legal heir witness verification (Form 6), real-time police green corridor dispatch, and transparent crowdfunding for cold-chain equipment and transit fuel under the **Transplantation of Human Organs and Tissues Act (THOTA), 1994**.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Java:** JDK 21+ (Tested and verified with Oracle JDK 26 using `--release 21`)
- **Maven:** Apache Maven 3.9+ (Installed at `C:\Users\SNEHITH\apache-maven-3.9.6`)
- **Database:** H2 In-Memory (Zero configuration, enabled by default in `dev` profile) or MySQL 8.0+

---

### 1. Start the Spring Boot Backend
Open a terminal and navigate to `lifelink/backend`:
```powershell
C:\Users\SNEHITH\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```
- The backend initializes on: `http://localhost:8080`
- REST APIs are mounted under: `http://localhost:8080/api`
- In-Memory H2 Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:lifelink_db`, User: `sa`, Password: empty)

---

### 2. Launch the Frontend
Open another terminal and serve `lifelink/frontend` with any web server:
```powershell
npx serve lifelink/frontend -p 3000
```
Open your browser at:
```
http://localhost:3000/index.html
```

---

## 👥 Demo Personas (Pre-Seeded)
All accounts share the password: **`Password@123`**
- **Transplant Coordinator:** `coordinator@lifelink.org`
- **ICU Intensivist Doctor:** `icu.doctor@lifelink.org`
- **Traffic Police Lead:** `police.traffic@lifelink.org`
- **Organ Transport Driver:** `driver.fast@lifelink.org`
- **Bereavement Counselor:** `counselor@lifelink.org`
- **Finance Reviewer:** `finance@lifelink.org`
- **Public Contributor:** `donor.family@lifelink.org`

*(Tip: On `login.html`, click any of the 1-click persona quick-switch buttons for instant authentication).*

---

## 🧪 Running Automated Tests
To run all 13 JUnit 5 integration and unit tests:
```powershell
C:\Users\SNEHITH\apache-maven-3.9.6\bin\mvn.cmd test -f lifelink\backend\pom.xml
```

---

## 📋 Project Documentation
- [LIFELINK_INITIAL_AUDIT.md](../LIFELINK_INITIAL_AUDIT.md) — Baseline Architecture & Directory Blueprint
- [LIFELINK_FUNCTIONALITY_AUDIT.md](../LIFELINK_FUNCTIONALITY_AUDIT.md) — Functionality & Feature Verification
- [LIFELINK_SECURITY_AUDIT.md](../LIFELINK_SECURITY_AUDIT.md) — DPDP Act, Zero-Knowledge UPI & OWASP Matrix
- [LIFELINK_TRANSPORT_INTEGRATION_REPORT.md](../LIFELINK_TRANSPORT_INTEGRATION_REPORT.md) — Live GPS Telemetry & Police Green Corridor Protocol
- [LIFELINK_FUNDING_AND_PAYMENT_REPORT.md](../LIFELINK_FUNDING_AND_PAYMENT_REPORT.md) — Crowdfunding, Itemized Budgets & SHA-256 Receipts
- [LIFELINK_TEST_REPORT.md](../LIFELINK_TEST_REPORT.md) — Automated Test Results (100% Pass Rate)
- [LIFELINK_FINAL_IMPLEMENTATION_REPORT.md](../LIFELINK_FINAL_IMPLEMENTATION_REPORT.md) — Master Implementation Summary

---

## ⚖️ Statutory Compliance Notice
LifeLink strictly adheres to **Section 18 of the Transplantation of Human Organs and Tissues Act, 1994**. The commercial buying, selling, or offering of any reward for human organs is strictly prohibited. All monetary contributions are dedicated solely to medical cold-chain equipment and rapid transportation logistics.
