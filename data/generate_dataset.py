"""
CICIDS2017 Dataset Generator for Adaptive Zero Trust AI Framework
Generates a representative sample of network flows containing 78 CICFlowMeter features
and realistic traffic distributions for BENIGN and attack flows (PortScan, DDoS, DoS Hulk, Bot, Infiltration, Brute Force).
"""

import os
from pathlib import Path
import numpy as np
import pandas as pd

np.random.seed(42)

FEATURE_COLUMNS = [
    " Destination Port", " Flow Duration", " Total Fwd Packets", " Total Backward Packets",
    "Total Length of Fwd Packets", " Total Length of Bwd Packets", " Fwd Packet Length Max",
    " Fwd Packet Length Min", " Fwd Packet Length Mean", " Fwd Packet Length Std",
    "Bwd Packet Length Max", " Bwd Packet Length Min", " Bwd Packet Length Mean",
    " Bwd Packet Length Std", "Flow Bytes/s", " Flow Packets/s", " Flow IAT Mean",
    " Flow IAT Std", " Flow IAT Max", " Flow IAT Min", "Fwd IAT Total", " Fwd IAT Mean",
    " Fwd IAT Std", " Fwd IAT Max", " Fwd IAT Min", "Bwd IAT Total", " Bwd IAT Mean",
    " Bwd IAT Std", " Bwd IAT Max", " Bwd IAT Min", "Fwd PSH Flags", " Bwd PSH Flags",
    " Fwd URG Flags", " Bwd URG Flags", " Fwd Header Length", " Bwd Header Length",
    "Fwd Packets/s", " Bwd Packets/s", " Min Packet Length", " Max Packet Length",
    " Packet Length Mean", " Packet Length Std", " Packet Length Variance", "FIN Flag Count",
    " SYN Flag Count", " RST Flag Count", " PSH Flag Count", " ACK Flag Count",
    " URG Flag Count", " CWE Flag Count", " ECE Flag Count", " Down/Up Ratio",
    " Average Packet Size", " Avg Fwd Segment Size", " Avg Bwd Segment Size",
    " Fwd Header Length.1", "Fwd Avg Bytes/Bulk", " Fwd Avg Packets/Bulk",
    " Fwd Avg Bulk Rate", " Bwd Avg Bytes/Bulk", " Bwd Avg Packets/Bulk",
    "Bwd Avg Bulk Rate", "Subflow Fwd Packets", " Subflow Fwd Bytes",
    " Subflow Bwd Packets", " Subflow Bwd Bytes", "Init_Win_bytes_forward",
    " Init_Win_bytes_backward", " act_data_pkt_fwd", " min_seg_size_forward",
    "Active Mean", " Active Std", " Active Max", " Active Min", "Idle Mean",
    " Idle Std", " Idle Max", " Idle Min"
]

def generate_benign_samples(n_samples: int = 3600) -> pd.DataFrame:
    """Generate realistic Benign / normal HTTPS, HTTP, SSH, DNS flows"""
    ports = np.random.choice([443, 80, 53, 22, 8080, 8443, 5353], size=n_samples, p=[0.55, 0.20, 0.12, 0.05, 0.04, 0.02, 0.02])
    duration = np.random.exponential(scale=3500000.0, size=n_samples) + 1000.0
    fwd_pkts = np.random.geometric(p=0.15, size=n_samples).clip(1, 150)
    bwd_pkts = np.random.geometric(p=0.12, size=n_samples).clip(1, 180)
    
    fwd_len_mean = np.random.normal(loc=120.0, scale=40.0, size=n_samples).clip(20, 1460)
    bwd_len_mean = np.random.normal(loc=650.0, scale=250.0, size=n_samples).clip(40, 1460)
    fwd_len_total = fwd_pkts * fwd_len_mean
    bwd_len_total = bwd_pkts * bwd_len_mean
    
    flow_bytes_s = (fwd_len_total + bwd_len_total) / (duration / 1000000.0)
    flow_pkts_s = (fwd_pkts + bwd_pkts) / (duration / 1000000.0)
    flow_iat_mean = duration / np.maximum(1, (fwd_pkts + bwd_pkts - 1))
    
    df = pd.DataFrame(index=range(n_samples))
    df[" Destination Port"] = ports
    df[" Flow Duration"] = duration
    df[" Total Fwd Packets"] = fwd_pkts
    df[" Total Backward Packets"] = bwd_pkts
    df["Total Length of Fwd Packets"] = fwd_len_total
    df[" Total Length of Bwd Packets"] = bwd_len_total
    df[" Fwd Packet Length Max"] = fwd_len_mean * np.random.uniform(1.2, 2.5, n_samples)
    df[" Fwd Packet Length Min"] = np.random.uniform(0, 40, n_samples)
    df[" Fwd Packet Length Mean"] = fwd_len_mean
    df[" Fwd Packet Length Std"] = fwd_len_mean * np.random.uniform(0.1, 0.6, n_samples)
    df["Bwd Packet Length Max"] = bwd_len_mean * np.random.uniform(1.2, 2.2, n_samples)
    df[" Bwd Packet Length Min"] = np.random.uniform(0, 60, n_samples)
    df[" Bwd Packet Length Mean"] = bwd_len_mean
    df[" Bwd Packet Length Std"] = bwd_len_mean * np.random.uniform(0.1, 0.7, n_samples)
    df["Flow Bytes/s"] = flow_bytes_s
    df[" Flow Packets/s"] = flow_pkts_s
    df[" Flow IAT Mean"] = flow_iat_mean
    df[" Flow IAT Std"] = flow_iat_mean * np.random.uniform(0.2, 0.8, n_samples)
    df[" Flow IAT Max"] = flow_iat_mean * np.random.uniform(1.5, 4.0, n_samples)
    df[" Flow IAT Min"] = np.random.uniform(1, 100, n_samples)
    df["Fwd IAT Total"] = duration * np.random.uniform(0.7, 0.98, n_samples)
    df[" Fwd IAT Mean"] = df["Fwd IAT Total"] / np.maximum(1, fwd_pkts)
    df[" Fwd IAT Std"] = df[" Fwd IAT Mean"] * 0.5
    df[" Fwd IAT Max"] = df[" Fwd IAT Mean"] * 2.0
    df[" Fwd IAT Min"] = np.random.uniform(1, 50, n_samples)
    df["Bwd IAT Total"] = duration * np.random.uniform(0.6, 0.95, n_samples)
    df[" Bwd IAT Mean"] = df["Bwd IAT Total"] / np.maximum(1, bwd_pkts)
    df[" Bwd IAT Std"] = df[" Bwd IAT Mean"] * 0.4
    df[" Bwd IAT Max"] = df[" Bwd IAT Mean"] * 1.8
    df[" Bwd IAT Min"] = np.random.uniform(1, 40, n_samples)
    df["Fwd PSH Flags"] = np.random.choice([0, 1], size=n_samples, p=[0.9, 0.1])
    df[" Bwd PSH Flags"] = np.zeros(n_samples)
    df[" Fwd URG Flags"] = np.zeros(n_samples)
    df[" Bwd URG Flags"] = np.zeros(n_samples)
    df[" Fwd Header Length"] = fwd_pkts * 20
    df[" Bwd Header Length"] = bwd_pkts * 20
    df["Fwd Packets/s"] = fwd_pkts / (duration / 1000000.0)
    df[" Bwd Packets/s"] = bwd_pkts / (duration / 1000000.0)
    df[" Min Packet Length"] = np.random.uniform(0, 20, n_samples)
    df[" Max Packet Length"] = np.maximum(df[" Fwd Packet Length Max"], df["Bwd Packet Length Max"])
    df[" Packet Length Mean"] = (fwd_len_total + bwd_len_total) / (fwd_pkts + bwd_pkts)
    df[" Packet Length Std"] = df[" Packet Length Mean"] * 0.6
    df[" Packet Length Variance"] = df[" Packet Length Std"] ** 2
    df["FIN Flag Count"] = np.random.choice([0, 1], size=n_samples, p=[0.85, 0.15])
    df[" SYN Flag Count"] = np.random.choice([0, 1], size=n_samples, p=[0.88, 0.12])
    df[" RST Flag Count"] = np.random.choice([0, 1], size=n_samples, p=[0.96, 0.04])
    df[" PSH Flag Count"] = np.random.choice([0, 1], size=n_samples, p=[0.75, 0.25])
    df[" ACK Flag Count"] = np.random.choice([0, 1], size=n_samples, p=[0.1, 0.9])
    df[" URG Flag Count"] = np.zeros(n_samples)
    df[" CWE Flag Count"] = np.zeros(n_samples)
    df[" ECE Flag Count"] = np.zeros(n_samples)
    df[" Down/Up Ratio"] = (bwd_pkts / np.maximum(1, fwd_pkts)).round()
    df[" Average Packet Size"] = df[" Packet Length Mean"] * 1.05
    df[" Avg Fwd Segment Size"] = df[" Fwd Packet Length Mean"]
    df[" Avg Bwd Segment Size"] = df[" Bwd Packet Length Mean"]
    df[" Fwd Header Length.1"] = df[" Fwd Header Length"]
    df["Fwd Avg Bytes/Bulk"] = np.zeros(n_samples)
    df[" Fwd Avg Packets/Bulk"] = np.zeros(n_samples)
    df[" Fwd Avg Bulk Rate"] = np.zeros(n_samples)
    df[" Bwd Avg Bytes/Bulk"] = np.zeros(n_samples)
    df[" Bwd Avg Packets/Bulk"] = np.zeros(n_samples)
    df["Bwd Avg Bulk Rate"] = np.zeros(n_samples)
    df["Subflow Fwd Packets"] = fwd_pkts
    df[" Subflow Fwd Bytes"] = fwd_len_total
    df[" Subflow Bwd Packets"] = bwd_pkts
    df[" Subflow Bwd Bytes"] = bwd_len_total
    df["Init_Win_bytes_forward"] = np.random.choice([29200, 8192, 65535, 14600], size=n_samples)
    df[" Init_Win_bytes_backward"] = np.random.choice([29200, 8192, 65535, 14600], size=n_samples)
    df[" act_data_pkt_fwd"] = np.maximum(0, fwd_pkts - 2)
    df[" min_seg_size_forward"] = np.random.choice([20, 32], size=n_samples)
    df["Active Mean"] = np.random.exponential(scale=50000.0, size=n_samples).clip(0, 1000000)
    df[" Active Std"] = df["Active Mean"] * 0.2
    df[" Active Max"] = df["Active Mean"] * 1.5
    df[" Active Min"] = df["Active Mean"] * 0.8
    df["Idle Mean"] = np.random.exponential(scale=2000000.0, size=n_samples).clip(0, 30000000)
    df[" Idle Std"] = df["Idle Mean"] * 0.2
    df[" Idle Max"] = df["Idle Mean"] * 1.4
    df[" Idle Min"] = df["Idle Mean"] * 0.7
    df["Label"] = "BENIGN"
    return df

def generate_attack_samples(attack_type: str, n_samples: int) -> pd.DataFrame:
    """Generate realistic network flow distributions matching CICIDS2017 attack profiles"""
    df = pd.DataFrame(index=range(n_samples))
    
    if attack_type == "PortScan":
        ports = np.random.randint(20, 65535, size=n_samples)
        duration = np.random.exponential(scale=50000.0, size=n_samples) + 20.0
        fwd_pkts = np.random.choice([1, 2, 3], size=n_samples, p=[0.7, 0.2, 0.1])
        bwd_pkts = np.zeros(n_samples, dtype=int)
        fwd_len_mean = np.random.choice([0.0, 24.0, 44.0], size=n_samples)
        bwd_len_mean = np.zeros(n_samples)
        syn_flags = np.ones(n_samples)
        ack_flags = np.zeros(n_samples)
        init_win_fwd = np.random.choice([1024, 2048, 4096], size=n_samples)
        init_win_bwd = np.full(n_samples, -1)
    elif attack_type == "DDoS":
        ports = np.random.choice([80, 443, 8080], size=n_samples)
        duration = np.random.uniform(5000000.0, 60000000.0, size=n_samples)
        fwd_pkts = np.random.randint(200, 3000, size=n_samples)
        bwd_pkts = np.random.randint(0, 10, size=n_samples)
        fwd_len_mean = np.random.normal(loc=40.0, scale=5.0, size=n_samples).clip(20, 120)
        bwd_len_mean = np.random.normal(loc=10.0, scale=5.0, size=n_samples).clip(0, 60)
        syn_flags = np.random.choice([0, 1], size=n_samples, p=[0.3, 0.7])
        ack_flags = np.random.choice([0, 1], size=n_samples, p=[0.6, 0.4])
        init_win_fwd = np.full(n_samples, 256)
        init_win_bwd = np.full(n_samples, 0)
    elif attack_type == "DoS Hulk":
        ports = np.random.choice([80, 8080], size=n_samples)
        duration = np.random.uniform(1000000.0, 15000000.0, size=n_samples)
        fwd_pkts = np.random.randint(5, 50, size=n_samples)
        bwd_pkts = np.random.randint(4, 45, size=n_samples)
        fwd_len_mean = np.random.normal(loc=350.0, scale=60.0, size=n_samples).clip(150, 900)
        bwd_len_mean = np.random.normal(loc=180.0, scale=40.0, size=n_samples).clip(50, 600)
        syn_flags = np.zeros(n_samples)
        ack_flags = np.ones(n_samples)
        init_win_fwd = np.full(n_samples, 29200)
        init_win_bwd = np.full(n_samples, 29200)
    elif attack_type == "Bot":
        ports = np.random.choice([8080, 6667, 4444, 80], size=n_samples)
        duration = np.random.uniform(8000000.0, 45000000.0, size=n_samples)
        fwd_pkts = np.random.randint(10, 80, size=n_samples)
        bwd_pkts = np.random.randint(8, 70, size=n_samples)
        fwd_len_mean = np.random.normal(loc=180.0, scale=30.0, size=n_samples).clip(40, 500)
        bwd_len_mean = np.random.normal(loc=220.0, scale=50.0, size=n_samples).clip(40, 700)
        syn_flags = np.zeros(n_samples)
        ack_flags = np.ones(n_samples)
        init_win_fwd = np.full(n_samples, 8192)
        init_win_bwd = np.full(n_samples, 8192)
    elif attack_type == "Infiltration":
        ports = np.random.choice([445, 139, 3389, 22], size=n_samples)
        duration = np.random.uniform(2000000.0, 20000000.0, size=n_samples)
        fwd_pkts = np.random.randint(8, 120, size=n_samples)
        bwd_pkts = np.random.randint(6, 90, size=n_samples)
        fwd_len_mean = np.random.normal(loc=260.0, scale=70.0, size=n_samples).clip(50, 1100)
        bwd_len_mean = np.random.normal(loc=400.0, scale=120.0, size=n_samples).clip(60, 1200)
        syn_flags = np.random.choice([0, 1], size=n_samples, p=[0.7, 0.3])
        ack_flags = np.ones(n_samples)
        init_win_fwd = np.full(n_samples, 65535)
        init_win_bwd = np.full(n_samples, 65535)
    else:
        ports = np.random.choice([80, 443, 8080], size=n_samples)
        duration = np.random.uniform(500000.0, 8000000.0, size=n_samples)
        fwd_pkts = np.random.randint(12, 60, size=n_samples)
        bwd_pkts = np.random.randint(10, 50, size=n_samples)
        fwd_len_mean = np.random.normal(loc=420.0, scale=40.0, size=n_samples).clip(200, 800)
        bwd_len_mean = np.random.normal(loc=280.0, scale=50.0, size=n_samples).clip(100, 700)
        syn_flags = np.zeros(n_samples)
        ack_flags = np.ones(n_samples)
        init_win_fwd = np.full(n_samples, 29200)
        init_win_bwd = np.full(n_samples, 29200)

    fwd_len_total = fwd_pkts * fwd_len_mean
    bwd_len_total = bwd_pkts * bwd_len_mean
    flow_bytes_s = (fwd_len_total + bwd_len_total) / (duration / 1000000.0)
    flow_pkts_s = (fwd_pkts + bwd_pkts) / (duration / 1000000.0)
    flow_iat_mean = duration / np.maximum(1, (fwd_pkts + bwd_pkts - 1))

    df[" Destination Port"] = ports
    df[" Flow Duration"] = duration
    df[" Total Fwd Packets"] = fwd_pkts
    df[" Total Backward Packets"] = bwd_pkts
    df["Total Length of Fwd Packets"] = fwd_len_total
    df[" Total Length of Bwd Packets"] = bwd_len_total
    df[" Fwd Packet Length Max"] = fwd_len_mean * 1.8
    df[" Fwd Packet Length Min"] = np.random.uniform(0, 20, n_samples)
    df[" Fwd Packet Length Mean"] = fwd_len_mean
    df[" Fwd Packet Length Std"] = fwd_len_mean * 0.4
    df["Bwd Packet Length Max"] = bwd_len_mean * 1.8
    df[" Bwd Packet Length Min"] = np.random.uniform(0, 20, n_samples)
    df[" Bwd Packet Length Mean"] = bwd_len_mean
    df[" Bwd Packet Length Std"] = bwd_len_mean * 0.4
    df["Flow Bytes/s"] = flow_bytes_s
    df[" Flow Packets/s"] = flow_pkts_s
    df[" Flow IAT Mean"] = flow_iat_mean
    df[" Flow IAT Std"] = flow_iat_mean * 0.5
    df[" Flow IAT Max"] = flow_iat_mean * 2.5
    df[" Flow IAT Min"] = np.random.uniform(0, 10, n_samples)
    df["Fwd IAT Total"] = duration * 0.95
    df[" Fwd IAT Mean"] = df["Fwd IAT Total"] / np.maximum(1, fwd_pkts)
    df[" Fwd IAT Std"] = df[" Fwd IAT Mean"] * 0.5
    df[" Fwd IAT Max"] = df[" Fwd IAT Mean"] * 2.0
    df[" Fwd IAT Min"] = np.random.uniform(0, 10, n_samples)
    df["Bwd IAT Total"] = duration * 0.8
    df[" Bwd IAT Mean"] = df["Bwd IAT Total"] / np.maximum(1, bwd_pkts)
    df[" Bwd IAT Std"] = df[" Bwd IAT Mean"] * 0.4
    df[" Bwd IAT Max"] = df[" Bwd IAT Mean"] * 1.8
    df[" Bwd IAT Min"] = np.random.uniform(0, 10, n_samples)
    df["Fwd PSH Flags"] = np.random.choice([0, 1], size=n_samples, p=[0.8, 0.2])
    df[" Bwd PSH Flags"] = np.zeros(n_samples)
    df[" Fwd URG Flags"] = np.zeros(n_samples)
    df[" Bwd URG Flags"] = np.zeros(n_samples)
    df[" Fwd Header Length"] = fwd_pkts * 20
    df[" Bwd Header Length"] = bwd_pkts * 20
    df["Fwd Packets/s"] = fwd_pkts / (duration / 1000000.0)
    df[" Bwd Packets/s"] = bwd_pkts / (duration / 1000000.0)
    df[" Min Packet Length"] = np.random.uniform(0, 10, n_samples)
    df[" Max Packet Length"] = np.maximum(df[" Fwd Packet Length Max"], df["Bwd Packet Length Max"])
    df[" Packet Length Mean"] = (fwd_len_total + bwd_len_total) / np.maximum(1, (fwd_pkts + bwd_pkts))
    df[" Packet Length Std"] = df[" Packet Length Mean"] * 0.5
    df[" Packet Length Variance"] = df[" Packet Length Std"] ** 2
    df["FIN Flag Count"] = np.random.choice([0, 1], size=n_samples, p=[0.95, 0.05])
    df[" SYN Flag Count"] = syn_flags
    df[" RST Flag Count"] = np.random.choice([0, 1], size=n_samples, p=[0.9, 0.1])
    df[" PSH Flag Count"] = np.random.choice([0, 1], size=n_samples, p=[0.8, 0.2])
    df[" ACK Flag Count"] = ack_flags
    df[" URG Flag Count"] = np.zeros(n_samples)
    df[" CWE Flag Count"] = np.zeros(n_samples)
    df[" ECE Flag Count"] = np.zeros(n_samples)
    df[" Down/Up Ratio"] = (bwd_pkts / np.maximum(1, fwd_pkts)).round()
    df[" Average Packet Size"] = df[" Packet Length Mean"] * 1.05
    df[" Avg Fwd Segment Size"] = df[" Fwd Packet Length Mean"]
    df[" Avg Bwd Segment Size"] = df[" Bwd Packet Length Mean"]
    df[" Fwd Header Length.1"] = df[" Fwd Header Length"]
    df["Fwd Avg Bytes/Bulk"] = np.zeros(n_samples)
    df[" Fwd Avg Packets/Bulk"] = np.zeros(n_samples)
    df[" Fwd Avg Bulk Rate"] = np.zeros(n_samples)
    df[" Bwd Avg Bytes/Bulk"] = np.zeros(n_samples)
    df[" Bwd Avg Packets/Bulk"] = np.zeros(n_samples)
    df["Bwd Avg Bulk Rate"] = np.zeros(n_samples)
    df["Subflow Fwd Packets"] = fwd_pkts
    df[" Subflow Fwd Bytes"] = fwd_len_total
    df[" Subflow Bwd Packets"] = bwd_pkts
    df[" Subflow Bwd Bytes"] = bwd_len_total
    df["Init_Win_bytes_forward"] = init_win_fwd
    df[" Init_Win_bytes_backward"] = init_win_bwd
    df[" act_data_pkt_fwd"] = np.maximum(0, fwd_pkts - 2)
    df[" min_seg_size_forward"] = np.random.choice([20, 32], size=n_samples)
    df["Active Mean"] = np.random.exponential(scale=30000.0, size=n_samples).clip(0, 800000)
    df[" Active Std"] = df["Active Mean"] * 0.15
    df[" Active Max"] = df["Active Mean"] * 1.3
    df[" Active Min"] = df["Active Mean"] * 0.7
    df["Idle Mean"] = np.random.exponential(scale=1000000.0, size=n_samples).clip(0, 20000000)
    df[" Idle Std"] = df["Idle Mean"] * 0.15
    df[" Idle Max"] = df["Idle Mean"] * 1.3
    df[" Idle Min"] = df["Idle Mean"] * 0.7
    df["Label"] = attack_type
    return df

def main():
    data_dir = Path(__file__).resolve().parent / "raw" / "CICIDS2017"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = data_dir / "cicids2017_sample.csv"
    print(f"Generating CICIDS2017 sample dataset at: {output_file}")
    
    df_benign = generate_benign_samples(3600)
    df_portscan = generate_attack_samples("PortScan", 600)
    df_ddos = generate_attack_samples("DDoS", 600)
    df_dos_hulk = generate_attack_samples("DoS Hulk", 400)
    df_bot = generate_attack_samples("Bot", 300)
    df_infiltration = generate_attack_samples("Infiltration", 250)
    df_brute_force = generate_attack_samples("Web Attack – Brute Force", 250)
    
    combined_df = pd.concat([
        df_benign, df_portscan, df_ddos, df_dos_hulk, df_bot, df_infiltration, df_brute_force
    ], ignore_index=True)
    
    combined_df = combined_df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    combined_df.to_csv(output_file, index=False)
    print(f"Dataset generated successfully! Shape: {combined_df.shape}")
    print("Class distribution:")
    print(combined_df["Label"].value_counts())

if __name__ == "__main__":
    main()
