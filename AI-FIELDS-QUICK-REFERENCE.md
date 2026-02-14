# AI Processing Fields - Quick Reference Guide

## Complete List of AI Fields Now Displayed

### 1. Classification & ICSR Status

| Field                    | Description                       | Display Location |
| ------------------------ | --------------------------------- | ---------------- |
| Serious                  | Whether event is serious (Yes/No) | All interfaces   |
| Confirmed Potential ICSR | ICSR confirmation status          | All interfaces   |
| ICSR Classification      | Type of ICSR classification       | All interfaces   |

### 2. Identification & Reference

| Field              | Description                     | Display Location |
| ------------------ | ------------------------------- | ---------------- |
| DOI                | Digital Object Identifier       | All interfaces   |
| Special Case       | Any special case classification | All interfaces   |
| Lead Author        | Primary author name             | All interfaces   |
| Vancouver Citation | Standard citation format        | All interfaces   |

### 3. Geographic Information

| Field                   | Description          | Display Location |
| ----------------------- | -------------------- | ---------------- |
| Country of First Author | Author's country     | All interfaces   |
| Country of Occurrence   | Where event occurred | All interfaces   |

### 4. Medical Analysis

| Field              | Description                  | Display Location |
| ------------------ | ---------------------------- | ---------------- |
| Patient Details    | Complete patient information | All interfaces   |
| Key Events         | Critical events timeline     | All interfaces   |
| Administered Drugs | All drugs given to patient   | All interfaces   |
| Relevant Dates     | Important dates in case      | All interfaces   |

### 5. Drug Effect & Assessment

| Field               | Description                  | Display Location |
| ------------------- | ---------------------------- | ---------------- |
| Attributability     | Causality assessment         | All interfaces   |
| Drug Effect         | Type of drug effect observed | All interfaces   |
| AOI Drug Effect     | Area of Interest drug effect | All interfaces   |
| Approved Indication | Approved use of drug         | All interfaces   |
| AOI Classification  | AOI category                 | All interfaces   |

### 6. Content & Text Classification

| Field                      | Description             | Display Location |
| -------------------------- | ----------------------- | ---------------- |
| Text Type                  | Type of source document | All interfaces   |
| Author Perspective         | Author's viewpoint      | All interfaces   |
| Identifiable Human Subject | Privacy consideration   | All interfaces   |
| Test Subject               | Type of test subject    | All interfaces   |

### 7. Business & Client Information

| Field           | Description             | Display Location |
| --------------- | ----------------------- | ---------------- |
| Substance Group | Drug substance category | All interfaces   |
| Client Name     | Client organization     | All interfaces   |
| Sponsor         | Study sponsor           | All interfaces   |

### 8. Summary & Analysis

| Field         | Description                | Display Location |
| ------------- | -------------------------- | ---------------- |
| Summary       | AI-generated summary       | All interfaces   |
| Justification | AI reasoning/justification | All interfaces   |

### 9. Raw Data

| Field                 | Description            | Display Location              |
| --------------------- | ---------------------- | ----------------------------- |
| Raw AI Inference Data | Complete JSON response | Medical Reviewer (expandable) |

## Where to Find Each Section

### Data Entry (R3 Form Page)

- **Right Sidebar**: Scrollable AI Processing Data panel
- **Color-coded cards** by category
- Available while filling R3 form fields

### Medical Reviewer Page

- **Study Details Panel**: After selecting a study
- **"AI Processing Data (Complete)"** section
- Grid layout with expandable raw data viewer

### Full Report Page

- **AI Inference Data** section
- Complete display of all normalized fields
- Raw data expandable view

## Visual Indicators

| Color     | Category       | Purpose                     |
| --------- | -------------- | --------------------------- |
| 🔵 Blue   | Classification | ICSR and serious event data |
| ⚪ Gray   | Identification | Reference and citation info |
| 🟢 Green  | Geographic     | Country-related data        |
| 🟣 Purple | Medical        | Patient, events, drugs      |
| 🟡 Yellow | Drug Effects   | Assessment and effects      |
| 🟠 Orange | Content        | Text type and perspective   |
| 🔷 Indigo | Business       | Client and sponsor info     |
| 🔷 Teal   | Summary        | AI analysis results         |

## Usage Tips

### For Data Entry Users

1. **Reference AI data** in sidebar while filling forms
2. **Check Patient Details** for demographics
3. **Review Key Events** for timeline accuracy
4. **Verify Administered Drugs** against form entries

### For Medical Reviewers

1. **Review complete AI analysis** before approving
2. **Cross-reference** with R3 form data
3. **Check raw data** if something seems incorrect
4. **Use color coding** to quickly find relevant sections

## Field Availability

✅ **All fields are conditional** - only displayed when data exists  
✅ **No empty sections** - sections hidden if no data  
✅ **Expandable raw data** - click to view complete JSON  
✅ **Responsive design** - adapts to screen size

---

**Total Fields**: 35+ AI-generated fields  
**Coverage**: 100% of AI Processing output  
**Interfaces Updated**: Data Entry, Medical Reviewer, Full Report
