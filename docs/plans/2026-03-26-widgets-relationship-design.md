# EveryDayApp — Widgets & Relationship Feature Design
**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Add home screen widgets for all major app features and a relationship/friend system that lets users send photos to close friends (up to 5) that appear on a dedicated Partner widget.

---

## Approach

**Expo development build + config plugins (Approach B)**

Stay in Expo managed workflow but extend it with:
- A custom iOS WidgetKit extension via EAS build config plugin
- `react-native-android-widget` for Android AppWidgets
- Shared data containers (App Group on iOS, SharedPreferences on Android) between the main app and widget extensions
- Supabase Storage + Edge Functions for the relationship image feature
- `expo-notifications` for push-triggered widget refreshes

---

## Architecture

### iOS
A WidgetKit extension is added to the Xcode project via an EAS config plugin. The main app and widget share data through an **App Group** (shared UserDefaults container). When the app updates stats (on open or background refresh), it serializes the latest data to JSON and writes it to the App Group. The WidgetKit extension reads from that container on each refresh cycle. Push notifications from Supabase include a content-available flag to trigger widget timeline reloads.

### Android
`react-native-android-widget` exposes a React Native component tree that renders into an Android AppWidget. Data is passed via SharedPreferences (same pattern as the iOS App Group). A WorkManager periodic job refreshes widget data every 30 minutes and also on app foreground.

### Widget Refresh Cadence
- **iOS:** WidgetKit timeline refreshes every 15–30 min (system-controlled). Also reloads on push notification with `content-available: 1` and when app opens.
- **Android:** WorkManager periodic job every 30 min. Also refreshes on app foreground.

### Relationship Widget Data Flow
1. Sender picks image + writes caption in app
2. Image uploaded to Supabase Storage
3. `partner_posts` row inserted with `image_url`, `caption`, `sender_id`, `recipient_id`
4. Supabase Edge Function `send-partner-post` fires push notification to recipient via `expo-notifications`
5. Push payload includes image URL + notification badge flag
6. Recipient device: push notification shown + widget timeline reload triggered
7. Widget reads latest `partner_posts` row for the user from SharedPreferences/App Group (written by app on last foreground)

---

## Widgets

Six separate widgets, each available in **small (2×2)** size on both platforms. All deep-link into the relevant app tab when tapped.

| Widget | Data shown |
|---|---|
| **Fitness** | Steps today, calories burned, active minutes |
| **Nutrition** | Calories consumed vs goal (ring), water progress |
| **Finance** | Today's net spend, budget status (green/yellow/red) |
| **Habits** | Active habits count, total streak days |
| **Mood** | Today's mood emoji, or "Tap to log" if not yet logged |
| **Partner** | Friend's photo, caption, sender name + timestamp, badge dot when unseen |

Medium (2×4) size variants for Fitness and Partner are post-MVP nice-to-haves.

---

## Friend System

Users can add up to **5 friends**. Designed for close friends and a significant other.

### Flow
1. **Add friend** — search by username or email, send a friend request
2. **Accept/decline** — recipient gets a push notification + in-app badge on the Me tab
3. **Friend list** — shown in a "Friends" section in Settings; each entry shows name, avatar, Remove option
4. **Widget assignment** — the Partner widget defaults to showing the most recent post from any friend; user can pin a specific friend in Settings

### Data Models

```
friend_requests
  id, sender_id, recipient_id, status (pending | accepted | declined), created_at

friends
  id, user_a_id, user_b_id, created_at

partner_posts
  id, sender_id, recipient_id, image_url, caption, created_at, seen_at
```

**RLS policies:**
- `friend_requests`: sender and recipient can read; only sender can insert; only recipient can update status
- `friends`: both users in the row can read; insert only via Edge Function after request accepted
- `partner_posts`: only sender and recipient can read; only sender can insert

---

## New Screens & Components

### Screens
| File | Purpose |
|---|---|
| `app/friends.tsx` | Friends list + pending requests (linked from Settings) |
| `app/add-friend.tsx` | Search by username/email, send friend request |
| `app/partner-post.tsx` | Full-screen partner post view (deep-linked from widget/notification) |

### Components
| File | Purpose |
|---|---|
| `components/friends/FriendRequestBadge.tsx` | Badge on Me tab for pending requests |
| `components/friends/SendPartnerImageModal.tsx` | Pick image, add caption, select recipient, send |
| `components/widgets/FitnessWidget.tsx` | Fitness widget entry point |
| `components/widgets/NutritionWidget.tsx` | Nutrition widget entry point |
| `components/widgets/FinanceWidget.tsx` | Finance widget entry point |
| `components/widgets/HabitsWidget.tsx` | Habits widget entry point |
| `components/widgets/MoodWidget.tsx` | Mood widget entry point |
| `components/widgets/PartnerWidget.tsx` | Partner widget entry point |
| `lib/widgetSync.ts` | Writes latest app data to App Group / SharedPreferences |

### Edge Functions
| Function | Purpose |
|---|---|
| `send-partner-post` | Validates friendship, stores post, sends push notification to recipient |
| `accept-friend-request` | Validates request, creates `friends` row, sends notification to sender |

### Migration
`supabase/migrations/20260326000001_friends.sql` — `friend_requests`, `friends`, `partner_posts` with RLS

---

## Notifications

| Trigger | Message |
|---|---|
| Friend request received | "[Name] wants to be friends" |
| Friend request accepted | "[Name] accepted your friend request" |
| New partner post | "[Name] sent you a photo" |

---

## Key Constraints

- **Development build required:** Widgets cannot run in Expo Go. Users must use a custom development build (via EAS Build) or a production build.
- **App Group ID:** Must match between main app and widget extension targets — configured in `app.json` entitlements.
- **Image size:** Partner post images should be resized to max 1MB before upload to keep widget load fast.
- **Widget data staleness:** Widgets may show data up to 30 min old if the app hasn't been opened. This is a platform constraint, not a bug.

---

## Future Considerations (Post-MVP)
- Medium/large widget size variants
- Reactions to partner posts (heart, etc.) from the widget via interactive widgets (iOS 17+)
- Group posts (send to all friends at once)
- Partner post history / gallery in-app
