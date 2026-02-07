**\# Product Requirements Document (PRD): Decentralized Debate Arena & AI Evaluation System**

## 1\. Introduction

This document outlines the requirements for developing the **Debate Arena**, a real-time, peer-to-peer competitive environment designed to automate and objectify the process of competitive debating and evaluation.

## 2\. Goals & Objectives

  * To create a structured, rule-enforced "Game Loop" for live, peer-to-peer debates.
  * To solve the bottleneck of *manual grading* in educational/competitive environments by introducing a **Post-Debate AI Analyst**.
  * To position the platform as a potential **infrastructure for B2B platforms** (e.g., Unstop, Hackathon organizers) to automate preliminary screening rounds, opening a high-revenue channel.
  * To drive user retention through an effective "Action-Reward" loop via gamification and instant results.

## 3\. Features & Requirements

### 3.1 Core Debate Arena (The Game Loop)

| ID    | Feature                 | Description                                                                                                                                                    |
| :---- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1.1 | **Room Creation**       | A host must be able to create a room and set key parameters: Topic, Prep Time, and Rewards (Prize Pool).                                                       |
| FR1.2 | **Team Distribution**   | The system must automatically distribute joining participants equally into **Team FOR** and **Team AGAINST**.                                                  |
| FR1.3 | **Side Switching**      | Participants must have the option to switch their side. If a side has fewer participants, turn preference will be given on a FIFO (First-In, First-Out) basis. |
| FR1.4 | **Prep Time Sync**      | A synchronized countdown must run on all screens with millisecond accuracy.                                                                                    |
| FR1.5 | **Microphone Token**    | A system must manage the "Microphone Token" to grant speaking rights during the Turn Rotation phase.                                                           |
| FR1.6 | **Auto-Switch**         | The system must automatically mute the current speaker and pass the token to the opposing team when the allotted time hits 0:00.                               |
| FR1.7 | **Buzzer Interruption** | A "Pass" buzzer must allow a speaker to finish early, instantly triggering a "Turn Switch" event to save time.                                                 |
| FR1.8 | **Global End**          | The Host must be able to click "End Debate," which immediately kills the video room for all participants, preventing unsupervised lingering.                   |

### 3.2 AI Analysis & Automated Scoring (The Killer Feature)

| ID    | Feature                       | Description                                                                                                                                                                                                  |
| :---- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR2.1 | **Real-time Transcription**   | The system must capture audio and convert it to text in real-time during the debate.                                                                                                                         |
| FR2.2 | **Result Generation Trigger** | A Host action ("Generate Results") must trigger the AI analysis process.                                                                                                                                     |
| FR2.3 | **LLM Processing**            | The backend must send the full debate transcript to an LLM Service with a strict prompt to analyze based on **logic, clarity, and rebuttal strength**.                                                       |
| FR2.4 | **Personalized JSON Report**  | The AI must output a personalized JSON report for *every* participant, including: Strengths & Weaknesses (e.g., "Good eye contact, but lacked statistical evidence.") and a Quantified Score (e.g., 8.5/10). |
| FR2.5 | **Winner Determination**      | The system must calculate the average score of Team A vs. Team B to instantly declare the winning team.                                                                                                      |

### 3.3 Rewards & Gamification

| ID    | Feature                      | Description                                                                                                      |
| :---- | :--------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| FR3.1 | **Prize Pool Configuration** | The Host must be able to configure a "Prize Pool" (e.g., 50 Coins) for the room.                                 |
| FR3.2 | **ACID Transaction**         | The backend must perform an **ACID-compliant transaction** to distribute rewards after the AI declares a winner. |
| FR3.3 | **Instant Wallet Update**    | Winning team members must instantly see their wallet balance increase.                                           |

## 4\. User Journey (Workflow)

The debate session is engineered as a strict state-machine for fairness:

**Phase 1: Setup & Distribution**

1.  Host creates a room and sets Topic, Prep Time, and Rewards.
2.  Participants join the room.
3.  System automatically uses Load Balancing logic to distribute participants equally into Team FOR and Team AGAINST.
4.  Participants can optionally request to switch sides (governed by FIFO if the target side has lesser participants).

**Phase 2: The "Game Loop" (Live Debate)**

1.  **State 1: Prep Time:** Synchronized countdown runs on all screens (Powered by **Redis**).
2.  **State 2: Turn Rotation:**
      * System grants the "Microphone Token" to the first speaker.
      * Speaker presents their case.
      * If time expires (0:00), the system automatically mutes the speaker and passes the token (**Auto-Switch**).
      * If the speaker finishes early and hits the "Pass" buzzer, **Socket.io** triggers an instant turn switch (**Buzzer Interruption**).

**Phase 3: Global End & Evaluation**

1.  Host clicks "End Debate."
2.  Server immediately kills the **LiveKit** video room for everyone.
3.  Host clicks "Generate Results."
4.  AI Analysis Flow (Transcription, LLM Processing, Report Generation) is executed.
5.  System performs a reward transaction (**PostgreSQL**) and updates the winning team's wallet balance.

## 5\. Technical Specifications

| Component                   | Purpose                                                                                       | Technology                             |
| :-------------------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------- |
| **Video/Audio Streaming**   | Live debate room and real-time audio capture for transcription.                               | **LiveKit**                            |
| **Real-Time Events**        | Instantaneous "Turn Switch" and "Pass" buzzer events.                                         | **Socket.io**                          |
| **Synchronized Timers**     | Millisecond-accurate countdown for Prep Time.                                                 | **Redis**                              |
| **AI Evaluation**           | Processing the full transcript to generate scores and reports.                                | **LLM Service** (Large Language Model) |
| **Wallet/Rewards Database** | Storing user balances and performing **ACID-compliant transactions** for reward distribution. | **PostgreSQL**                         |

## 6\. Business Strategy & Market Opportunity

  * **Model:** Building a **Hosting Engine** for large-scale, automated competitions.
  * **Target Market:** B2B platforms like **Unstop**, Hackathon organizers, and educational institutions that manage high-volume **Preliminary Rounds**.
  * **Value Proposition:** Organizers can schedule parallel debates on the platform, and the **AI Scorer** automatically ranks and filters teams (e.g., top 10% performance) based on debate performance, drastically reducing the manpower needed for initial screening.
  * **Impact:** Becoming the infrastructure provider for large-scale competitions, enabling a scalable, high-revenue B2B channel.
