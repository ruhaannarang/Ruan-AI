# Ruan AI — Hinglish & Multilingual STT Benchmark Report
*Generated on: 2026-11-03 00:44:16*

## 1. Executive Summary

| Metric | faster-whisper-small | faster-whisper-base | Winner / Balance |
|---|---|---|---|
| **Average WER** | **34.5%** | 28.3% | Base |
| **Average Latency** | 7.92s | **2.35s** | Base (~3-4x faster) |
| **Technical Vocab Retention** | **88.5%** | 92.3% | Base |
| **Total Benchmark Samples** | 15 | 15 | - |

## 2. Detailed Sample Results

| Category | Reference Transcript | Small Output (WER / Latency) | Base Output (WER / Latency) | Tech Words |
|---|---|---|---|---|
| **English** | `Please explain how a linked list works in Java.` | "Please explain how a linked list works in Java."<br>*(WER: 0%, 7.56s)* | "Please explain how a linked list works in Java."<br>*(WER: 0%, 2.25s)* | 2/2 |
| **English** | `My backend server is not starting.` | "My backend server is not starting."<br>*(WER: 0%, 7.87s)* | "My backend server is not starting."<br>*(WER: 0%, 1.94s)* | 2/2 |
| **English** | `Can you help me debug this error?` | "Can you help me debug this error?"<br>*(WER: 0%, 8.11s)* | "Can you help me debug this error?"<br>*(WER: 0%, 2.11s)* | 2/2 |
| **Hindi** | `Mujhe aaj college jaana hai.` | "Mujhe aaj college jaana hai."<br>*(WER: 0%, 7.81s)* | "Mujhe aaj koli jana hai."<br>*(WER: 40%, 2.50s)* | 0/0 |
| **Hindi** | `Aap mujhe ye concept samjha sakte hain?` | "आप मुजे ये कासेप समजा सकते है."<br>*(WER: 100%, 8.64s)* | "Aap mujhe ye kaseept samjha sakti hai."<br>*(WER: 43%, 2.18s)* | 0/1 |
| **Hindi** | `Mera computer properly kaam nahi kar raha.` | "मेरा COMPUTER प्रपरली काम नहीं कर रहा."<br>*(WER: 86%, 8.86s)* | "Mera computer properly kaam nahi kar raha."<br>*(WER: 0%, 2.15s)* | 1/1 |
| **Romanized Hinglish** | `Mujhe Java mein linked list samjhao.` | "Mujhe Java main linked list Sam Chow."<br>*(WER: 50%, 8.31s)* | "Mujhe Java main linked list Sam Chao"<br>*(WER: 50%, 2.67s)* | 2/2 |
| **Romanized Hinglish** | `Kal subah mujhe college jaana hai.` | "Cal Subba, Mujhe College, Johnahai."<br>*(WER: 67%, 8.01s)* | "Cal suba mujhe college jauna hai."<br>*(WER: 50%, 2.34s)* | 0/0 |
| **Romanized Hinglish** | `Mera backend server start nahi ho raha.` | "Mira back-end server start nahi ho rahe."<br>*(WER: 29%, 7.61s)* | "Mira backend server start na hai ho raha."<br>*(WER: 43%, 2.09s)* | 1/2 |
| **Romanized Hinglish** | `Is code mein NullPointerException aa raha hai.` | "Is code main NullPointerException Aaraha hai."<br>*(WER: 43%, 7.96s)* | "Is code main NullPointerException arahaha hai."<br>*(WER: 43%, 2.90s)* | 2/2 |
| **Romanized Hinglish** | `Aaj mujhe React ka component banana hai.` | "Aj Mujhe react co-component banana hai."<br>*(WER: 43%, 7.74s)* | "Aj Mujhe React car component banana hai."<br>*(WER: 29%, 2.12s)* | 2/2 |
| **Technical Hinglish** | `Mujhe API endpoint create karna hai Express mein.` | "Mujhe API endpoint create karna hai Express main."<br>*(WER: 12%, 7.74s)* | "Mujhe API endpoint create karna hai express main."<br>*(WER: 12%, 2.24s)* | 3/3 |
| **Technical Hinglish** | `Database connection fail ho raha hai.` | "Database connection fail ho rahe hai."<br>*(WER: 17%, 7.84s)* | "Database connection, fail ho raha hai."<br>*(WER: 0%, 2.64s)* | 2/2 |
| **Technical Hinglish** | `Linked list reverse karne ka logic explain karo.` | "Linked list reverse karn call logic explain caro."<br>*(WER: 38%, 7.28s)* | "linked list, reverse carne ca logic explain caro."<br>*(WER: 38%, 2.76s)* | 3/3 |
| **Technical Hinglish** | `Mere React component mein state update nahi ho rahi.` | "Mere react component main state update Nahai Ho Rahai."<br>*(WER: 33%, 7.39s)* | "Mure React component mainstate update na hai ho ra hai."<br>*(WER: 78%, 2.31s)* | 4/4 |
