# VetPaw - AI Dog Care App

A comprehensive mobile application for pet care with AI-powered coaching, health assessment, and premium subscription features.

## 🚀 Features

- **AI Chat Assistant**: Get instant answers about pet care
- **Live Video Coaching**: Real-time sessions with AI veterinarian Dr. James
- **Health Symptom Checker**: AI-powered health assessments
- **Premium Subscriptions**: Powered by RevenueCat
- **User Profiles & Badges**: Track achievements and progress
-  **Cross-Platform**: Works on iOS, Android, and Web

## 📱 Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Database**: Supabase
- **Payments**: RevenueCat
- **AI**: Gemini API
- **UI**: Custom components with Lucide icons

## 🔧 Setup Instructions

### Prerequisites

- Node.js 16+
- Expo CLI
- RevenueCat account

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with required API keys
4. Start the development server: `npm start`

### RevenueCat Setup

1. Create a RevenueCat account
2. Set up your products in App Store Connect / Google Play Console
3. Configure products in RevenueCat dashboard
4. Add your RevenueCat API keys to the `.env` file

## 📄 Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=your_revenuecat_apple_key
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=your_revenuecat_google_key
```

## 🏗️ Project Structure

- `/app`: All routes and screens
- `/components`: Reusable UI components
- `/hooks`: Custom React hooks
- `/lib`: Service classes and utilities
- `/constants`: App-wide constants
- `/assets`: Images and other static assets

## 📱 Building for Production

### iOS/Android

```bash
eas build --platform ios
eas build --platform android
```

### Web

```bash
npm run build:web
```

## 🔒 License

This project is proprietary and confidential.