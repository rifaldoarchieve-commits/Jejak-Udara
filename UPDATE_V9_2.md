# Jejak Udara V9.2 — Cluster Focus & Absolute Context

V9.2 is based on V9.1. The 2025 PM2.5 K-Medoids + WDTW results and all other dashboard tabs are unchanged.

## What changed

**01 — Shape Clustering**
- **SEMUA** displays the monthly mean Z-score profiles of K1–K6 (or K1–K3 in comparison mode).
- **DETAIL Kx** displays only one cluster: a thick cluster-mean line, thinner lines for **all its member stations**, a dashed line for the medoid (unless it is selected), and a pale highlight for the selected station.
- The compact cluster selector chooses K1–K6. In SEMUA mode, clicking a cluster legend item opens its detailed plot.
- The legend displays **actual station names** in DETAIL mode. Clicking a station selects it in the global station filter and updates the map.
- Clicking a cluster in **Membership & Medoid** or **Absolute Context** opens its detail plot and synchronizes the global station filter to that cluster's medoid if the previous station belongs to another cluster.

**04 — Absolute Context**
- The six original concentration values are arranged as **two columns × three rows**, using compact value-and-bar cards. All six are present; no scroll inside the card is required.
- K=3 comparison uses three full-width rows.
- Values are cluster-average **original PM2.5 concentrations in µg/m³**, not the standardized series used to form clusters.
- The selected cluster summary and selected medoid remain below the cards.

## Reproducibility

- K=6: 20 eligible sites, six groups (7, 6, 3, 2, 1, 1), WDTW silhouette = 0.6493.
- K=3: three groups (2, 11, 7), WDTW silhouette = 0.5546.
- Fixed clustering period: Jan–Dec 2025, 20 eligible AQMS stations, Z-score within each station.
- Values and station membership are loaded from `data/wdtw.js`, unchanged from V9.1.

## How to use

1. Open `index.html` in Chrome and choose **Advanced Analytics**.
2. Click **DETAIL K3**, then choose **Klaster K4 (2)** in the small selector to compare Palangka Raya and Sampit within that cluster.
3. Select station names below the chart. The selected station changes in the global filter and map.
4. Click **SEMUA** to return to cluster-level comparison, or switch between **K=6** and **K=3** using the existing toggle.
5. Look at **Absolute Context**: each K1–K6 card should be visible at once, including K6.

## Validation status

JavaScript syntax and dynamic-rendering checks passed, including switching overview/detail modes, selection of all six clusters, singleton detail, six original concentration cards, cluster-to-medoid synchronization, and K=3 comparison. Automated visual browser verification was **not possible** in the execution environment due to its administrator browser policy blocking navigation, so final visual clipping at your specific viewport/browser zoom should be checked manually.

## Limitations

This is an exploratory grouping of synthetic air-quality time-series shapes. It is **not** a ranking of pollution severity or proof of causal relationships. Singleton silhouettes are assigned zero. The chart shows the average Z-score of each cluster and the Z-score of each station; **Absolute Context** is shown separately to preserve the information about absolute concentration.
