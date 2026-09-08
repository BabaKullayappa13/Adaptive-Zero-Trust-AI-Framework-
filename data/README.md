# CICIDS2017 Dataset Documentation

## 1. Dataset Overview
This dataset contains representative network flow traffic captured according to the **Canadian Institute for Cybersecurity (CIC) - University of New Brunswick (UNB) CICIDS2017** benchmark standard.

- **Primary Source:** [UNB CICIDS2017 Dataset](https://www.unb.ca/cic/datasets/ids-2017.html)
- **Feature Extractor:** CICFlowMeter (v2 / v3)
- **Total Flow Features:** 78 bidirectional statistical network features + 1 `Label` column.
- **Total Records:** 6,000 network flows.
- **Binary Encoding:**
  - `BENIGN` = 0 (Normal legitimate user and enterprise cloud traffic)
  - `ATTACK` = 1 (Malicious / unauthorized threat access traffic)

---

## 2. Class Distribution
| Category | Flow Label | Samples | Percentage |
| :--- | :--- | :--- | :--- |
| **Benign Traffic** | `BENIGN` | 3,600 | 60.0% |
| **Port Scanning** | `PortScan` | 600 | 10.0% |
| **Distributed Denial of Service** | `DDoS` | 600 | 10.0% |
| **Application Layer DoS** | `DoS Hulk` | 400 | 6.7% |
| **Botnet C2 Traffic** | `Bot` | 300 | 5.0% |
| **Lateral Infiltration** | `Infiltration` | 250 | 4.2% |
| **Web Brute Force** | `Web Attack - Brute Force` | 250 | 4.2% |
| **Total** | | **6,000** | **100.0%** |

---

## 3. Directory Layout
```
data/
├── README.md                          # Dataset specifications & feature catalogue
├── generate_dataset.py                # Dataset generator reproducing CICIDS2017 statistical distributions
├── raw/
│   └── CICIDS2017/
│       └── cicids2017_sample.csv      # Raw CSV flow records (78 features + Label)
├── processed/
│   ├── features_metadata.json         # Feature definitions, scaling parameters, RFE selected features
│   └── full_processed.csv             # Cleaned, standardized flow data with binary labels
├── train/
│   └── train.csv                      # Stratified training split (70%, 4,200 flows)
├── validation/
│   └── val.csv                        # Stratified validation split (15%, 900 flows)
└── test/
    └── test.csv                       # Stratified held-out test split (15%, 900 flows)
```

---

## 4. Key Flow Features
1. **Time & Duration:** `Flow Duration`, `Flow IAT Mean`, `Flow IAT Std`, `Flow IAT Max`, `Flow IAT Min`, `Fwd IAT...`, `Bwd IAT...`
2. **Packet Counts & Lengths:** `Total Fwd Packets`, `Total Backward Packets`, `Total Length of Fwd/Bwd Packets`, `Fwd/Bwd Packet Length Mean/Std/Max/Min`
3. **Rates & Throughput:** `Flow Bytes/s`, `Flow Packets/s`, `Fwd Packets/s`, `Bwd Packets/s`
4. **TCP Flags & Control:** `FIN`, `SYN`, `RST`, `PSH`, `ACK`, `URG`, `CWE`, `ECE` Flag Counts
5. **Flow Dynamics:** `Init_Win_bytes_forward`, `Init_Win_bytes_backward`, `Down/Up Ratio`, `Active/Idle Mean/Std/Max/Min`

---

## 5. Machine Learning Pipeline
1. **Cleaning:** Replaces $\pm\infty$ and imputes/drops missing values; trims column whitespace.
2. **Standardization:** `StandardScaler` fitted exclusively on training set to prevent data leakage.
3. **Dimensionality Reduction:**
   - **PCA (Principal Component Analysis):** Reduces 78 features to 10 orthogonal principal components.
   - **RFE (Recursive Feature Elimination):** Selects top 15 most discriminative network flow features using a Random Forest estimator.
4. **Model Training:** Random Forest, Support Vector Machine (SGD Modified Huber), and Gradient Boosting.
